var vue ;
var POST_URL = "https://7imr48wed1.execute-api.cn-northwest-1.amazonaws.com.cn/prod/ocr"
$(function(){
    vue = new Vue({
            el: '#main',
            data:{
                data_url: "https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/ocr_output/image02.json",
                total_count:0,
                log_text_area: '',
            },methods:{
                 match_template:function(){
                    match_template()
                 }
            }
    })
});


function match_template(){

        var param = {}
        param['cmd'] = 'match_template'
        param['template_type'] = 'default'
        param['data_url'] = vue.data_url

        console.log('get_template_list  send data: \n ', JSON.stringify(param))

        $.ajax({
              async:true,
              type:"post",
              data:JSON.stringify(param),
              contentType : "application/json;charset=UTF-8", //类型必填
              url:POST_URL,
              dataType:"json",
              success:function(data){
                    console.log("get_template_list :\n");
                    console.log(JSON.stringify(data));
                    vue.log_text_area = JSON.stringify(data.data)

              },
              error:function(data){
                  console.log('error')
                  console.log(data);
              }
        })
}