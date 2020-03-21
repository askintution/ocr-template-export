var POST_URL = "https://6b7ysmo64m.execute-api.cn-northwest-1.amazonaws.com.cn/prod/ocr"


var CMD_SAVE_TEMPLATE = 'save_template'


function postData(cmd, data){

    var param = {}
    param['cmd'] = cmd
    param['data'] = data
    requestData(param)
}

function requestData( data){
      $.ajax({
              async:true,
              type:"post",
              data:JSON.stringify(data),
              contentType : "application/json;charset=UTF-8", //类型必填
              url:POST_URL,
              dataType:"json",
              success:function(data){
                    console.log("from server :\n");
                    console.log(JSON.stringify(data));
//                   JSON.parse(data.body)
                    show_message("操作成功")


              },
              error:function(data){
                  console.log('error')
                  console.log(data);
                  show_message("操作失败 "+ JSON.stringify(data))
              }
     })

}