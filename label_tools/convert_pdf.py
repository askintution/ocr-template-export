from multiprocessing import Pool
import matplotlib.pyplot as plt
from pathlib import Path
from PIL import Image
import shutil
import boto3
import time
import fitz
import json
import cv2
import io
import os
import re


def pyMuPDF_fitz(pdfPath, imagePath,imgName):
    """
    pdf文件转换为png，存储到指定路径和指定名称
    :param pdfPath: 读入pdf文件路径
    :param imagePath: 保存路径
    :param imgName: 保存名称
    """
    pdfDoc = fitz.open(pdfPath)
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

        if not os.path.exists(imagePath):#判断存放图片的文件夹是否存在
            os.makedirs(imagePath) # 若图片文件夹不存在就创建

        pix.writePNG(imagePath+'/'+'%s.png'%(imgName))#将图片写入指定的文件夹内

def convert_pdf(pdfPath,savePath):
    """
    文件路径中pdf文件转换为png，转存到新的路径
    :param pdfPath: 读入文件路径
    :param savePath: 保存路径
    """
    if not os.path.exists(savePath):  # 保存路径不存在，则创建路径
        os.makedirs(savePath)

    if 'pdf' in pdfPath:
        save_name = pdfPath.split('/')[-1].replace(".pdf", "")
        pyMuPDF_fitz(pdfPath, savePath, save_name)
        print("Convert PDF to PNG finished!")
    else:
        print("Not a valid pdf file!")



def load(jsonfile):
    """
    load json data from file
    :param jsonfile: 读入json文件路径
    """
    with open(jsonfile,'r') as f:
        data = json.load(f)
        return data


def cut_one_img(base_dir):
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
        if not block['BlockType'] == "WORD":
            box = block['Geometry']['BoundingBox']
            left = int(width * box['Left'] - 2)
            top = height * box['Top']
            c_img = save_img[int(top): int(top + (height * box['Height'])),
                    left: int(left + (width * box['Width'])) + 5]
            name = str(i).zfill(3)+"_"+block['BlockType']+"_"+block['Id']+".png"

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


base_dir = '../target/test001_png_adb43ecd'

cut_one_img(base_dir)

#convert_pdf("../temp/test001.pdf", '../temp/')