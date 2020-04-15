# ocr-template-export
导出OCR 识别的模板文件



## CDK 新建基础环境

```
cd cdk
cdk deploy
```


## PDF/Image 生成json   

调用AWS Textract 服务， 将PDF image 里面的文本进行识别，以json格式返回结果。 
 [请参考](./src/text_ocr_util.py)
 
如果第一次使用CDK ，请先阅读以下两个文档. 

[CDK 官方文档 ](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
  
[CDK Workshop](https://cdkworkshop.com/)   



## 部署web 页面

cdk 会输出Api gateway 的访问地址， 替换掉./web/index.js 里面的api 地址。 

./web 目录下的文件部署到服务器上， 或者在本地打开， 进行操作。 

```
./web/index.html              是固定页数的模板设置
./web/client/index.html       是客户端进行匹配的demo
./web/continuous/index.html   是连续页面的模板设置

```