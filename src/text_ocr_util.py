# -*-coding:utf8-*-
"""
author: liangzhang@nwcdcloud.cn


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
        print("----init")
        self._textract = boto3.client('textract')
        self._s3 = boto3.client('s3')
        self._bucket_name = bucket_name

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        self._output_dir = output_dir

    def parse_file_list(self, pdf_file_path):

        filenames = []
        for index, filename in enumerate(glob.glob(pdf_file_path)):
            filenames.append(filename)
            print('index ={} filename : {}'.format(index, filename))

        for file_name in filenames:

            new_file_name = file_name.split('/')[-1].split('.')[0]
            upload_data = open(file_name, mode='rb')
            file_obj = self._s3.put_object(Bucket=self._bucket_name, Key=file_name, Body=upload_data, Tagging='ocr')
            print('---------- file_obj: {}'.format(file_obj))

            respones = self._textract.start_document_analysis(
                DocumentLocation={
                    'S3Object': {
                        'Bucket': self._bucket_name,
                        'Name': file_name
                    }
                },
                FeatureTypes=['TABLES','FORMS']
            )
            status = 'IN_PROGRESS'

            while status == 'IN_PROGRESS':
                time.sleep(3)
                print("file_name {} ------------------status {}  ".format(file_name, status))
                status = self._textract.get_document_analysis(JobId=respones['JobId'])['JobStatus']

                if status != 'IN_PROGRESS':
                    with open(os.path.join(self._output_dir, new_file_name+'.json'), 'w') as f:
                        f.write(json.dumps(self._textract.get_document_analysis(JobId=respones['JobId'])))



if __name__ == "__main__":

    # 生成json 保存的文件
    output = '../target'

    #s3 bucket name
    s3_bucket_name = 'dikers.nwcd'

    #需要解析的文件路径和 后缀名称
    pdf_file_path = '../dataset/pdf/*.pdf'

    #aws profile name
    profile_name = 'g'

    text_ocr_utl = TextOcrUtil(profile_name, s3_bucket_name, output)
    text_ocr_utl.parse_file_list(pdf_file_path)


