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
        #rotate = int(0)
        # 每个尺寸的缩放系数为1.3，这将为我们生成分辨率提高2.6的图像。
        # 此处若是不做设置，默认图片大小为：792X612, dpi=96
        #zoom_x = 3 #(1.33333333-->1056x816)   (2-->1584x1224)
        #zoom_y = 3
        #mat = fitz.Matrix(zoom_x, zoom_y).preRotate(rotate)
        #pix = page.getPixmap(matrix=mat, alpha=False)

        pix = pdfDoc.getPagePixmap(pg)

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
        save_name = pdfPath.split('/')[-1].replace(".pdf","")
        pyMuPDF_fitz(pdfPath, savePath, save_name)
        print("Convert PDF to PNG finished!")
    else:
        print("Not a valid pdf file!")
