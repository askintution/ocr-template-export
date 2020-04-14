# -*-coding:utf8-*-
"""
author: liangzhang@nwcdcloud.cn
1. 读取本地文件夹的PDF 文件
2. 将pdf 上传到Global S3中
3. 对Global S3 中的文件 调用AWS Textract 服务
4. 将返回结果保存到本地
5. 将本地文件上传到国内服务器上， 并且打开访问权限， 供测试使用

"""
import boto3
import json
import os
import glob
import time


class TextOcrUtil:

    def __init__(self,  profile_name, bucket_name, output_dir):
        """
            初始化
        """
        boto3.setup_default_session(profile_name=profile_name)
        print("----init start")
        self._textract = boto3.client('textract')
        self._s3 = boto3.client('s3')
        self._bucket_name = bucket_name
        print("----init end")

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        self._output_dir = output_dir

    def parse_file_list(self, pdf_file_path, s3_file_prefix):

        filenames = []
        for index, filename in enumerate(glob.glob(pdf_file_path)):
            filenames.append(filename)
            print('No: {} file : {}'.format(index+1, filename))

        json_file_list = []
        for file_name in filenames:

            new_file_name = file_name.split('/')[-1].split('.')[0]
            postfix = file_name.split('/')[-1].split('.')[1]


            upload_data = open(file_name, mode='rb')

            key = s3_file_prefix + '/' + new_file_name+'.'+postfix
            file_obj = self._s3.put_object(Bucket=self._bucket_name,
                                           Key=key,
                                           Body=upload_data, Tagging='ocr')
            print('Upload pdf {}  返回结果: {}'.format(new_file_name, file_obj))

            response = self._textract.start_document_analysis(
                DocumentLocation={
                    'S3Object': {
                        'Bucket': self._bucket_name,
                        'Name': key
                    }
                },
                FeatureTypes=['TABLES', 'FORMS']
            )
            status = 'IN_PROGRESS'

            while status == 'IN_PROGRESS':
                time.sleep(5)
                # print("file_name {} ------------------status {}  ".format(file_name, status))
                status = self._textract.get_document_analysis(JobId=response['JobId'])['JobStatus']

                if status != 'IN_PROGRESS':
                    json_file = os.path.join(self._output_dir, new_file_name+'.json')
                    with open(json_file, 'w') as f:
                        f.write(json.dumps(self._textract.get_document_analysis(JobId=response['JobId'])))

                    print("Save json to local [{}] ".format(json_file))
                    json_file_list.append((json_file, new_file_name+'.json'))

        return json_file_list

    def upload_json_file_to_cn(self, json_file_list, profile_name, bucket_name, s3_json_file_prefix):

        boto3.setup_default_session(profile_name=profile_name)
        s3 = boto3.client('s3')

        for item in json_file_list:

            json_file = item[0]
            file_name = item[1]
            upload_data = open(json_file, mode='rb')

            key = s3_json_file_prefix + file_name
            file_obj = s3.put_object(Bucket=bucket_name, Key=key, Body=upload_data, Tagging='ocr')
            s3.put_object_acl(ACL='public-read', Bucket=bucket_name, Key=key)
            print("Upload json 返回结果: {} ".format(file_obj))
            print("https://{}.s3.cn-northwest-1.amazonaws.com.cn/{}\n".format(bucket_name, key))

if __name__ == "__main__":

    # 生成json 保存的文件
    output = '../target'


    s3_json_file_prefix = 'ocr/'
    #需要解析的文件路径和 后缀名称
    pdf_file_path = '../dataset/pdf/*.pdf'

    #aws profile name
    profile_name = 'g'
    #s3 bucket name
    s3_bucket_name = 'dikers.nwcd'

    #国内profile 名称
    cn_profile_name = 'default'
    #国内S3桶
    cn_bucket_name = 'dikers-html'

    text_ocr_utl = TextOcrUtil(profile_name, s3_bucket_name, output)
    json_file_list = text_ocr_utl.parse_file_list(pdf_file_path, s3_json_file_prefix)


    text_ocr_utl.upload_json_file_to_cn(json_file_list, cn_profile_name, cn_bucket_name,  s3_json_file_prefix)


