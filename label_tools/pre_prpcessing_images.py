from multiprocessing import Pool
from pathlib import Path
from PIL import Image
import argparse
import shutil
import errno
import time
import uuid
import fitz
import json
import boto3
import glob
import cv2
import os





class PreProcessingImage(object):

    def __init__(self):
        self.file_map = {}
        self.output_dir = ''
        self.global_profile_name = ''
        self.global_s3_name = ''

    def parse_arguments(self):
        """
            Parse the command line arguments of the program.
        """

        parser = argparse.ArgumentParser(
            description="对图片中的文字区域进行裁剪"
        )
        parser.add_argument(
            "-o",
            "--output_dir",
            type=str,
            nargs="?",
            help="输出文件的本地路径",
            required=True
        )
        parser.add_argument(
            "-i",
            "--input_dir",
            type=str,
            nargs="?",
            help="输入文件路径",
            required=True
        )
        parser.add_argument(
            "-p",
            "--prefix_s3",
            type=str,
            nargs="?",
            help="s3 保存文件的前缀",
            required=True
        )

        parser.add_argument(
            "-gs",
            "--global_s3_name",
            type=str,
            nargs="?",
            help="AWS 全球 s3",
            required=True
        )
        parser.add_argument(
            "-gp",
            "--global_profile_name",
            type=str,
            nargs="?",
            help="AWS 全球 profile name ",
            required=True
        )

        parser.add_argument(
            "-cs",
            "--cn_s3_name",
            type=str,
            nargs="?",
            help="国内 s3",
            required=True
        )
        parser.add_argument(
            "-cp",
            "--cn_profile_name",
            type=str,
            nargs="?",
            help="AWS 国内 profile name ",
            required=True
        )


        return parser.parse_args()

    def pyMuPDF_fitz(self, pdf_path, image_path, image_name):
        """
        pdf文件转换为png，存储到指定路径和指定名称
        :param pdf_path: 读入pdf文件路径
        :param image_path: 保存路径
        :param image_name: 保存名称
        """
        pdfDoc = fitz.open(pdf_path)
        for pg in range(pdfDoc.pageCount):
            page = pdfDoc[pg]
            rotate = int(0)
            # 每个尺寸的缩放系数为1.3，这将为我们生成分辨率提高2.6的图像。
            # 此处若是不做设置，默认图片大小为：792X612, dpi=96
            zoom_x = 3 #(1.33333333-->1056x816)   (2-->1584x1224)
            zoom_y = 3
            mat = fitz.Matrix(zoom_x, zoom_y).preRotate(rotate)
            pix = page.getPixmap(matrix=mat, alpha=False)

            # pix = pdfDoc.getPagePixmap(pg)

            if not os.path.exists(image_path):#判断存放图片的文件夹是否存在
                os.makedirs(image_path) # 若图片文件夹不存在就创建

            pix.writePNG(image_path+'/'+'%s.png'%(image_name))#将图片写入指定的文件夹内

    def convert_pdf(self, pdf_path, savePath):
        """
        文件路径中pdf文件转换为png，转存到新的路径
        :param pdfPath: 读入文件路径
        :param savePath: 保存路径
        """
        if not os.path.exists(savePath):  # 保存路径不存在，则创建路径
            os.makedirs(savePath)

        if 'pdf' in pdf_path:
            save_name = pdf_path.split('/')[-1].replace(".pdf", "")
            self.pyMuPDF_fitz(pdf_path, savePath, 'image')
            print("Convert PDF to PNG finished!")
        else:
            print("Not a valid pdf file!")


    def read_local_image_file(self, input_dir, output_dir):
        """
        生成临时文件夹， 保存原始图片 json 和裁剪的图片
        :param input_dir:
        :param output_dir:
        :return:
        """
        # the tuple of file types
        types = ('*.pdf', '*.jpg', '*.png', '*.jpeg')
        files_grabbed = []
        for files in types:
            files_grabbed.extend(glob.glob(os.path.join(input_dir, files)))

        for file in files_grabbed:
            suid = ''.join(str(uuid.uuid4()).split('-'))

            file_output_dir = os.path.join(output_dir,
                                           file.split('/')[-1].replace('.', '_').replace('.', '') + '_' + suid[0:8])

            os.makedirs(file_output_dir)

            out_image_path = os.path.join(file_output_dir, 'image.png')
            if file.lower().endswith('pdf'):
                self.convert_pdf(file, file_output_dir)
            else:
                shutil.copy(file, out_image_path)

            self.file_map[file_output_dir] = out_image_path

        print(self.file_map)

    def parse_file_list(self,  s3_file_prefix):
        """
        调用Textract 进行文本识别
        :param s3_file_prefix:
        :return: json_file_list
        """
        if self.file_map is None or len(self.file_map) == 0:
            print("Warning:  没有要处理的图片")
            return

        index = 0
        json_file_list = []
        boto3.setup_default_session(profile_name=self.global_profile_name)
        textract_client = boto3.client('textract')
        s3_client = boto3.client('s3')

        for file_item in self.file_map.items():
            index += 1
            print('No: {}  Path: {}  file: {} '.format(index,  file_item[0], file_item[1]))
            file_name = file_item[1]
            file_output_path = file_item[0]

            new_file_name = file_output_path.split('/')[-1]
            postfix = file_name.split('/')[-1].split('.')[1]


            upload_data = open(file_name, mode='rb')

            key = s3_file_prefix + '/' + new_file_name+'.'+postfix
            print('global_bucket_name {}  key {} '.format(self.global_s3_name, key, ))
            file_obj = s3_client.put_object(Bucket=self.global_s3_name,
                                           Key=key,
                                           Body=upload_data, Tagging='ocr')
            print('Upload pdf {}  返回结果: {}'.format(new_file_name, file_obj))

            response = textract_client.start_document_analysis(
                DocumentLocation={
                    'S3Object': {
                        'Bucket': self.global_s3_name,
                        'Name': key
                    }
                },
                FeatureTypes=['TABLES', 'FORMS']
            )
            status = 'IN_PROGRESS'

            json_file_name = 'data.json'
            while status == 'IN_PROGRESS':
                time.sleep(8)
                #print("file_name {} ------------------status {}  ".format(file_name, status))
                status = textract_client.get_document_analysis(JobId=response['JobId'])['JobStatus']

                if status != 'IN_PROGRESS':
                    json_file = os.path.join(file_output_path, json_file_name)
                    with open(json_file, 'w') as f:
                        f.write(json.dumps(textract_client.get_document_analysis(JobId=response['JobId'])))

                    print("Save json to local [{}] ".format(json_file))
                    json_file_list.append((json_file, json_file_name))

        return json_file_list

    def cut_one_img(self, base_dir):
        """
        单张image按照bbox切割为子图
        :param base_dir: cv2读入img文件
        """
        print('cut_one_img    base_dir {} '.format(base_dir))
        img_name = 'image.png'
        save_img = cv2.imread(os.path.join(base_dir, img_name))
        save_path = os.path.join(base_dir, 'images')
        json_file = os.path.join(base_dir, 'data.json')
        print('---------------- json_file ', json_file)
        with open(json_file, 'r') as f:
            data = json.load(f)

        image = Image.open(os.path.join(base_dir, img_name))

        if not os.path.exists(save_path):
            os.makedirs(save_path)

        width, height = image.size

        pool = Pool(processes=10)
        pool_result = []
        # save image bounding box/polygon the detected lines/text
        for i, block in enumerate(data['Blocks']):
            # Draw box around entire LINE
            if block['BlockType'] == "LINE" or block['BlockType'] == "CELL":
                box=block['Geometry']['BoundingBox']
                left = int(width * box['Left'] - 2)
                top = height * box['Top']
                c_img = save_img[int(top): int(top + (height * box['Height'])),
                        left: int(left + (width * box['Width'])) + 5]
                name = str(i).zfill(3)+"_"+block['Id']+".png"

                f = os.path.join(save_path, name)
                Path(save_path).mkdir(parents=True, exist_ok=True)
                block['cut_image_name'] = name
                cv2.imwrite(f, c_img)
                print('Image Shape: {}'.format(c_img.shape))

        pool.close()
        # wait for processes are completed.
        for r in pool_result:
            r.get(timeout=400)

        new_json_file = os.path.join(base_dir, 'data_new.json')
        with open(new_json_file, "w") as f:
            json.dump(data, f)
            print(' [{}] 文件保存成功 '.format(new_json_file))




    def main(self):
        time_start = time.time()
        # Argument parsing
        args = self.parse_arguments()


        if os.path.exists(args.output_dir):
            shutil.rmtree(args.output_dir)

        try:
            os.makedirs(args.output_dir)
        except OSError as e:
            if e.errno != errno.EEXIST:
                raise
        self.output_dir = args.output_dir
        self.global_profile_name = args.global_profile_name
        self.global_s3_name = args.global_s3_name

        if not os.path.exists(args.input_dir):
            print("输入路径不能为空  input_dir[{}] ".format(args.input_dir))
            return
        # step 1 . 生成文件夹
        self.read_local_image_file(args.input_dir, args.output_dir)

        # step 2 .  textract

        self.parse_file_list(args.prefix_s3)

        # step 3 .  切分图片按

        for file_item in self.file_map.items():
            file_output_path = file_item[0]
            self.cut_one_img(file_output_path)

        # step 4 . copy 到国内s3 上


        # Create the directory if it does not exist.

        time_elapsed = time.time() - time_start
        print('The code run {:.0f}m {:.0f}s'.format(time_elapsed // 60, time_elapsed % 60))


if __name__ == "__main__":
    preProcessingImage = PreProcessingImage()
    preProcessingImage.main()
