# ocr-template-export
导出OCR 识别的模板文件



## CDK 新建基础环境

```
cd cdk
cdk deploy
```


## 部署web 页面

cdk 会输出Api gateway 的访问地址， 替换掉./web/index.js 里面的api 地址。 

./web 目录下的文件部署到服务器上， 或者在本地打开， 进行操作。 
