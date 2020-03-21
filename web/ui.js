var vue ;
var MIN_KEY_BLOCK_COUNT = 2 //最少的定位元素
$(function(){

    vue = new Vue({
            el: '#main',
            data:{
                blockItemList:[],
                currentField:{},
                fieldList:[],
                pageCount:0,
//                data_url:"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/ocr-demo.json",
                data_url:"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json",
                data:{},
                pageNo:0,

             },methods:{
                get_json:function(){
                    url = $("#json_url_input").val()
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
                }
             }
    })

    get_data(vue.data_url)
});



function get_data(url){
    console.log('url: ', url)
    vue.data_url = url
    if(url == null || url == ''){
        return ;
    }
    $("#loading-icon").show()
    $.getJSON(url, function (data) {
        parse_data(data)
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
    //开始添加
    currentField = {}

    currentField['status']  = vue.currentField['status']
    currentField['value_block_item']  = deepClone(vue.currentField['value_block_item'])



    currentField['business_field']  = $("#business_field").val()
    currentField['pageNo'] = vue.pageNo
    currentField['pre_label_text'] = block_pre_value

    currentField['value_block_item']['text']  = currentField['value_block_item']['text'].substring(block_pre_value.length)

    currentField['key_block_item']  = deepClone(vue.currentField['key_block_item'])
    if(currentField['key_block_item'] !=null){
        currentField['key_label_text'] = vue.currentField['key_block_item']['text']
    }else {
        currentField['key_label_text'] = null
    }

    vue.fieldList.push(currentField)

    vue.currentField['status'] = 0
    vue.currentField['key_block_item'] = null
    vue.currentField['value_block_item'] = null
    $("#block_value").val('')
    $("#block_key").val('')
    $("#business_field").val('')
    $("#block_pre_value").val('')
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

        if(field['pre_label_text'] == null || field['pre_label_text'].length ==0){
            locationItem['label_text'] = field['pre_label_text']
            locationItem['x'] = field['value_block_item']['x']
            locationItem['y'] = field['value_block_item']['x']
            locationItem['block_type'] = 0 //定位的类型， 用当前的元素位置和前缀字符串定位
        }else {
            locationItem['label_text'] = field['key_block_item']['text']
            locationItem['x'] = field['key_block_item']['x']
            locationItem['y'] = field['key_block_item']['x']
            locationItem['block_type'] = 1  //定位的类型， 用额外的元素定位
        }

        locationItemList.push(locationItem)

    }


    var template = {}
    template['name'] = template_name
    template['data_url'] = vue.data_url
    template['location_items'] = locationItemList


    var data = {}
    data['template'] = template;
    data['fields'] = create_field_list();


    postData(CMD_SAVE_TEMPLATE, data)
//    console.log("from server :\n");
//    console.log(JSON.stringify(data));

    show_message("正在保存中，请稍后")


}

/**
导出业务字段
*/
function create_field_list(){

    var itemList = new Array()

    /**
    分两个表保存内容， 一个是模板汇总信息， 一个是field 字段
    */

    for (index in vue.fieldList){
        var field = vue.fieldList[index]

        var item = {}


        item['page_no'] = field['pageNo']
        item['business_field'] = field['business_field']

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

        item['pre_label_text'] = field['pre_label_text']

        console.log('-----TODO: ', item )

        itemList.push(item)

    }

    console.log(JSON.stringify(itemList))
//    getData(itemList)

    return itemList


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
        if(field['pageNo'] != pageNo){
            continue;
        }
//        console.log('field %s ', field['value_block_item']['text'])

        var value_block_item = field['value_block_item']
        if(value_block_item != null){
            _redraw_block(ctx, value_block_item)
        }

        var key_block_item = field['key_block_item']
        if(key_block_item != null){
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