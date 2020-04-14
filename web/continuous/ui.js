var vue ;
$(function(){

    vue = new Vue({
            el: '#main',
            data:{
                blockItemList:[], //当前页面解析的block元素
                pageCount:0,
                tableBlockList:[],
                currentTableBlock:{},
                data_url:"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/ocr/test2.json",
                data:{}

             },methods:{
                get_json:function(){
                    url = $("#json_url_input").val()
                    alert(url)
                    get_data(url)
                },
                add_table_block:function(){
                    add_table_block()
                },
                delete_table_block:function(e){
                    table_block_id = e.currentTarget.name
                    delete_table_block(table_block_id)
                }
             }
    })


//    reset_canvas()
    get_data(vue.data_url)
//    testInitTableBlockList()
//    get_template_list()
});


function testInitTableBlockList(){

    var tableBlockList = []

    for (var i=0; i<2; i++ ){

        var tableBlock = {}
        tableItems = new Array()
        for (var t =0; t<2; t++){

            var tableItem = {}
            var rowList = new Array()
            for (var j=0; j<3; j++ ){
                var row = new Array()
                var td1 = {'type': 0, 'value': '2342'}
                var td2 = {'type': 0, 'value': 'name '+j}
                var td3 = {'type': 1, 'value': "Ask a home buyer to describe their dream house, and they probably won't begin with the height of the basement ceiling or the proximity to an east-west railroad. "}
                var td4 = {'type': 0, 'value': '23.89'}
                row.push(td1)
                row.push(td2)
                row.push(td3)
                row.push(td4)
                rowList.push(row)
            }
            tableItem['rowList'] = rowList

            tableItems.push(tableItem)
        }


        tableBlock['thItems'] = ['Id', 'Name', 'Info', 'price']
        tableBlock['tableItems'] = tableItems
        tableBlock['id']= uuid(8, 16)
        tableBlock['item_width'] = 100 / tableBlock['thItems'].length
        tableBlockList.push(tableBlock)
    }


    vue.tableBlockList = tableBlockList

}


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

             console.log('id=%s,  [x=%f, y=%f]  ', blockItem['id'], blockItem['x'], blockItem['y'])

            if(selected == 0){

                if(add_block_to_current_table(blockItem)){
                    blockItem['selected'] = 1
                    blockItem['blockType'] = 1
                    draw_block_inside(ctx, blockItem)
                }

            }else {
//                blockItem['selected'] = 0
            }
          }
        }//end for

    }

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



function add_table_block(){

    var tableBlock = {}
    tableBlock['id']= uuid(8, 16)

    tableBlock['thItems'] = new Array()
    vue.currentTableBlock = tableBlock

    vue.tableBlockList.push(tableBlock)

}


function add_block_to_current_table(blockItem){


    if(vue.currentTableBlock == null || vue.currentTableBlock['id'] == null
      || vue.tableBlockList.length == 0){
        show_message(" 请先创建表格 ")
        return false;
    }
    var thItems = vue.currentTableBlock['thItems']
    thItems.push(blockItem)
    console.log(JSON.stringify(blockItem))
    vue.currentTableBlock['thItems'] =  thItems
    return true;
}




function delete_table_block(table_block_id){

    vue.tableBlockList = vue.tableBlockList.filter(function(item) {
        return item['id'] != table_block_id
    });
}