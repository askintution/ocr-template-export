var vue ;
$(function(){

    vue = new Vue({
            el: '#main',
            data:{
                blockItemList:[],
                currentField:{},
                fieldList:[],
                pageCount:0,
                data:{},
                pageNo:0,

             },methods:{
                get_json:function(){
                    url = $("#json_url_input").val()
                    get_data(url)
                },
                export_template:function(){
                    export_template()
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
                }
             }
    })

//    get_data("https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/ocr-demo.json")
    get_data("https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json")
});



function get_data(url){
    console.log('url: ', url)

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
            console.log('tops %f ; left %f ---> [%s]  ', blockItem['top'],
                            blockItem['left'], blockItem['text'] )

             console.log(' [%f, %f]  [%f, %f]   ', blockItem['newPoly'][0]['x'], blockItem['newPoly'][0]['y']
                                  ,    blockItem['newPoly'][1]['x'],blockItem['newPoly'][1]['y']   )
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
        //FIXME 画不同的颜色
    }else if(status==1){
        vue.currentField['key_block_item'] = blockItem
        blockItem['blockType'] = 2
        draw_block_inside(ctx, blockItem)
        vue.currentField['status'] = 2
        $("#block_key").val(blockItem['text'])
        //FIXME 画不同的颜色
    }else {

        alert("请先保存当前选择的字段")
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


function export_template(){

    if(vue.fieldList == null || vue.fieldList.length==0){
        show_message('还没有添加业务字段， 请先新建业务字段')
        return ;
    }
    var itemList = new Array()

    /**
    分两个表保存内容， 一个是模板汇总信息， 一个是field 字段
    */

    for (index in vue.fieldList){
        var field = vue.fieldList[index]

        var item = {}


        item['pageNo'] = field['pageNo']
        item['business_field'] = field['business_field']
        item['key_text'] = field['key_block_item']['text']
        item['value_text'] = field['value_block_item']['text']


        console.log('-----TODO: ', item )

        itemList.push(item)

    }

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

    console.log("---------------   redraw_blockItem ")
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
    console.log("---------------   redraw_blockItem  2")
    for(var i=0; i<fieldList.length; i++){


        field = fieldList[i]
        if(field['pageNo'] != pageNo){
            continue;
        }
        console.log('field %s ', field['value_block_item']['text'])

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