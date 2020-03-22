var vue ;
$(function(){

    vue = new Vue({
            el: '#main',
            data:{
                blockItemList:[], //当前页面解析的block元素
                currentField:{}, //用户新建的字段信息
                fieldList:[],   //用户已经选取的业务字段
                templateList:[],  // 模板列表L
                pageCount:0,
//                data_url:"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/ocr-demo.json",
                data_url:"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json",
                data:{},
                pageNo:0,

             },methods:{
                get_json:function(){
                    url = $("#json_url_input").val()
                    alert(url)
                    get_data(url)
                },
                clean_current_field:function(){
                    clean_current_field()
                },
                add_field:function(){
                    add_field();
                },
                parse_data_by_page:function(e){
                    pageIndex = e.currentTarget.name
                    parse_data_by_page(pageIndex)
                },
                save_template:function(){
                    save_template()
                },
                select_template_display:function(e){
                    select_template_display(e.currentTarget._value)
                }
             }
    })

    get_data(vue.data_url)
    get_template_list()
});



function get_data(url){

    if(url == null || url == ''){
        show_message(" 请填写 url ")
        return ;
    }
    $("#loading-icon").show()
    $.getJSON(url, function (data) {
        parse_data(data)
        vue.data_url = url
        $("#loading-icon").hide()
        init_current_field()

    })
    var canvas=document.getElementById("myCanvas");
    canvas.onmousedown = function(e){

//        console.log(e)
//        console.log('offsetX: %d offsetY :%d ',e['offsetX'],  e['offsetY'])
        var offsetX = parseInt(e['offsetX'])
        var offsetY = parseInt(e['offsetY'])
        var c=document.getElementById("myCanvas");
        var ctx=c.getContext("2d");

        for ( i=0 ; i<vue.blockItemList.length; i++) {
            blockItem = vue.blockItemList[i]
//          console.log(key + ' = ' + blockItem['top'] +'   offsetX: %d offsetY :%d ',  e['offsetX'],  e['offsetY']);
          if(check_inside(blockItem, offsetX, offsetY)){
            var selected = blockItem['selected']
            console.log('tops %f ; left %f --->id [%s] [%s]  ', blockItem['top'],
                            blockItem['left'], blockItem['id'], blockItem['text'] )

             console.log(' [x=%f, y=%f]  ', blockItem['x'], blockItem['y']
                                  )
            if(selected == 0){
                blockItem['selected'] = 1
                dealWithSelectBlock(ctx, blockItem)

            }else {
//                blockItem['selected'] = 0
            }
          }
        }//end for

    }

}

function dealWithSelectBlock(ctx, blockItem){
    var status = vue.currentField['status']
    if(status == 0 ){
        vue.currentField['value_block_item'] = blockItem
        blockItem['blockType'] = 1
        draw_block_inside(ctx, blockItem)
        vue.currentField['status'] = 1

        $("#block_value").val(blockItem['text'])
    }else if(status==1){
        vue.currentField['key_block_item'] = blockItem
        blockItem['blockType'] = 2
        draw_block_inside(ctx, blockItem)
        vue.currentField['status'] = 2
        $("#block_key").val(blockItem['text'])
    }else {

        show_message("请先保存当前选择的字段")
    }
}

function clean_current_field(){

    var c=document.getElementById("myCanvas");
    var ctx=c.getContext("2d");
    keyBlockItem = vue.currentField['key_block_item']
    valueBlockItem = vue.currentField['value_block_item']

    if(keyBlockItem !=null){
        keyBlockItem['selected'] = 0
        draw_block_inside(ctx, keyBlockItem)
    }
    if(valueBlockItem !=null){
        valueBlockItem['selected'] = 0
        draw_block_inside(ctx, valueBlockItem)
    }
    $("#block_value").val('')
    $("#block_key").val('')
    $("#business_field").val('')
    $("#block_pre_value").val('')
    init_current_field()
}



function init_current_field(){


    vue.currentField = {}
    /*
    // 0 第一步 key_block 和value_block 都未选取
       1 第二步 已经选取  key_block
       2 第三步 已经选取  key_block 和 value_block
    */
    vue.currentField['status'] = 0
    vue.currentField['key_block_item'] = null
    vue.currentField['value_block_item'] = null
    vue.currentField['business_field'] = ""
}

function add_field(){


    var block_value = $("#block_value").val()
    var block_pre_value = $("#block_pre_value").val()
    var original_text = vue.currentField['value_block_item']['text']

    if(block_pre_value+block_value !== original_text){
        show_message("前缀字符串填写不正确， 请检查")
        return ;
    }
    //判断是否都有值
   var status = vue.currentField['status']
   if( status == 0){
        show_message("请在页面上点击需要提取的元素")
        return ;
   }else if(status == 1 && block_pre_value.length==0){
        show_message("<h5>没有添加定位信息</h5> <ul><li>请选择辅助定位的元素, 该元素的文本需要固定不变</li>"+
        "<li>提取前缀字符串</li></ul>")
        return ;
   }

   var business_field = $("#business_field").val()

   if(business_field == null ||business_field == "" ){
    show_message("请填写对应的业务字段。")
    return ;
   }

    vue.fieldList.push(create_single_filed())

    vue.currentField['status'] = 0
    vue.currentField['key_block_item'] = null
    vue.currentField['value_block_item'] = null
    $("#block_value").val('')
    $("#block_key").val('')
    $("#business_field").val('')
    $("#block_pre_value").val('')
}

function create_single_filed(){

        var item = {}
        var field = vue.currentField

        item['status']  = field['status']
        item['page_no'] = vue.pageNo
        item['business_field'] = $("#business_field").val()

        var value_block = field['value_block_item'];
        item['value_block'] = {'id':value_block['id'],
                               'text':value_block['text'],
                                'x':value_block['x'],
                                'y':value_block['y']}

        var key_block = field['key_block_item'];

        if(key_block == null){
            item['key_block'] = ''
        }else {

            item['key_block'] = {'id':key_block['id'],
                               'text':key_block['text'],
                                'x':key_block['x'],
                                'y':key_block['y']}
        }
        item['pre_label_text'] = $("#block_pre_value").val()

        console.log(JSON.stringify(item))

        return item
}


function check_inside(blockItem, offsetX, offsetY){
        if( offsetX>blockItem['left'] && offsetX< blockItem['left'] + blockItem['width'] &&
            offsetY>blockItem['top'] && offsetY< blockItem['top'] + blockItem['height'] ){
            return true
         }else{
            return false;
         }
}

function show_message(message){
    $("#myModalContent").html(message)
    $('#myModal').modal('show')
}



function save_template(){

    if(vue.fieldList == null || vue.fieldList.length<MIN_KEY_BLOCK_COUNT){
        var template = "需要至少添加{0}个定位字段";
        var message = String.format(template, MIN_KEY_BLOCK_COUNT);
        show_message(message)
        return ;
    }

    var template_name = $("#template_name_id").val()

    if(template_name == null || template_name.length<=0){
        show_message("请添加模板名称")
        $("#template_name_id").focus()
        return ;
    }


    //locationItemList 用来定位模板的元素
    var locationItemList = []
    for(var i=0; i<MIN_KEY_BLOCK_COUNT; i++){
        var locationItem = {}
        field = vue.fieldList[i]


        console.log(" {}  ---------{}------- {} ", i, field['pre_label_text'], JSON.stringify(field['key_block']))
        locationItem['page_no'] = field['page_no']
        locationItem['business_field'] = field['business_field']
        if(field['pre_label_text'] != null && field['pre_label_text'].length >0){
            console.log("----------------- 1")
            locationItem['label_text'] = field['pre_label_text']
            locationItem['x'] = field['value_block']['x']
            locationItem['y'] = field['value_block']['y']
            locationItem['id'] = field['value_block']['id']
            locationItem['block_type'] = 0 //定位的类型， 用当前的元素位置和前缀字符串定位
        }else  if(field['key_block'] != null && field['key_block']['text'] !=null){
            console.log("----------------- 2")
            locationItem['label_text'] = field['key_block']['text']
            locationItem['x'] = field['key_block']['x']
            locationItem['y'] = field['key_block']['y']
            locationItem['id'] = field['key_block']['id']
            locationItem['block_type'] = 1  //定位的类型， 用额外的元素定位
        }else {

            show_message("字段出错， 请检查")
        }

        locationItemList.push(locationItem)

    }


    var template = {}
    template['template_type'] = 'default'   //TODO: 分区键， 以后模板可以先分大类， 然后再查询
    template['name'] = template_name
    template['data_url'] = vue.data_url
    template['location_items'] = locationItemList


    var data = {}
    data['template'] = template;
    data['fields'] = vue.fieldList;


    postData(CMD_SAVE_TEMPLATE, data)

    show_message("正在保存中，请稍后")


}
/***
将文本框的前缀元素提取出来， 用来进行定位
*/
function input_pre_key(){

    var block_value = $("#block_value").val()
    var block_pre_value = $("#block_pre_value").val()
    var value_block_item = vue.currentField['value_block_item']

    if(block_value==null || block_value.length ==0  || value_block_item ==null){
        show_message("请先选择要提取的元素")
        $("#block_pre_value").val('')
        return
    }
    if(block_pre_value== null || block_pre_value.length ==0 ){
        return
    }
    original_text = value_block_item['text']
    var index = original_text.indexOf(block_pre_value)
//    console.log(" %s, %s ", block_value , block_pre_value , index)
    if(index ==0){
        $("#block_value").val(original_text.substring(block_pre_value.length, original_text.length))
    }
}

/**
翻页过程中， 保存
*/
function redraw_blockItem(){

    var pageNo = vue.pageNo ;
    var fieldList = vue.fieldList;
    if(fieldList == null || fieldList.length ==0 ){
        return ;
    }

    var blockItemList = vue.blockItemList;
    if(blockItemList == null || blockItemList.length == 0){
        return
    }
    var c=document.getElementById("myCanvas");
    var ctx=c.getContext("2d");
    for(var i=0; i<fieldList.length; i++){


        field = fieldList[i]
        if(field['page_no'] != pageNo){
            continue;
        }
        var value_block_item = findBlockItemById(field['value_block']['id'])
        if(value_block_item != null){
            value_block_item['selected'] = 1
            value_block_item['blockType'] = 1
            _redraw_block(ctx, value_block_item)
        }

        var key_block_item = findBlockItemById(field['key_block']['id'])
        if(key_block_item != null){
            key_block_item['selected'] = 1
            key_block_item['blockType'] = 2
            _redraw_block(ctx, key_block_item)
        }

    }



}

function _redraw_block(ctx, saveBlockItem){

    if(saveBlockItem == null || saveBlockItem['id'] == null){
        return ;
    }
    var blockItem = findBlockItemById(saveBlockItem['id'])
    if(blockItem == null){
        return ;
    }
    blockItem['selected'] = saveBlockItem['selected']
    blockItem['blockType'] = saveBlockItem['blockType']

    draw_block_inside(ctx, blockItem)
}


function findBlockItemById(id ){
    var blockItemList = vue.blockItemList
    if(blockItemList == null || blockItemList.length==0 ){
        return
    }
    for(var i=0; i<blockItemList.length; i++){
        if(id == blockItemList[i]['id']){
            return blockItemList[i]
        }
    }
    return null
}

/**
通过URL获取template 保存的field 数据
*/
function select_template_display(template_id){
    get_field_list(template_id)
}

function re_init_field_list(fieldList, template_id){
    vue.fieldList = fieldList
    var templateList = vue.templateList;

    for (var i=0; i<templateList.length; i++){
        if(templateList[i]['id'] == template_id){
            url = templateList[i]['data_url']
            get_data(url)
            break;
        }
    }

}


