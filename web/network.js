var POST_URL = "https://94qmp9fmc3.execute-api.cn-northwest-1.amazonaws.com.cn/prod/ocr"


var CMD_SAVE_TEMPLATE = 'save_template'
var CMD_GET_FIELD_LIST = 'get_field_list'
var CMD_GET_TEMPLATE_LIST = 'get_template_list'



function get_template_list(){
        var param = {}
        param['cmd'] = 'get_template_list'
        param['template_type'] = 'default'
//        console.log('get_template_list  send data: \n ', JSON.stringify(param))

        $.ajax({
              async:true,
              type:"post",
              data:JSON.stringify(param),
              contentType : "application/json;charset=UTF-8", //类型必填
              url:POST_URL,
              dataType:"json",
              success:function(data){
                    console.log("get_template_list :\n");
                    console.log(JSON.stringify(data.data));
                    vue.templateList = data.data

              },
              error:function(data){
                  console.log('error')
                  console.log(data);
                  show_message("操作失败 "+ JSON.stringify(data))
              }
        })


}

function postData(cmd, data){

    var param = {}
    param['cmd'] = cmd
    param['data'] = data
    requestData(param)

    console.log('send data: \n ', JSON.stringify(param))
}

function requestData( param){
      $.ajax({
              async:true,
              type:"post",
              data:JSON.stringify(param),
              contentType : "application/json;charset=UTF-8", //类型必填
              url:POST_URL,
              dataType:"json",
              success:function(data){
                    console.log("from server :\n");
                    console.log(JSON.stringify(data.data));
//                   JSON.parse(data.body)
                    show_message("操作成功")
                    get_template_list()


              },
              error:function(data){
                  console.log('error')
                  console.log(data);
                  show_message("操作失败 "+ JSON.stringify(data))
              }
     })

}