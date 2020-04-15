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
                create_table_template:function(){
                    create_table_template()
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


/**

--tableBlockList
  --tableBlock
    --id
    --item_width
    --thItems  // 列名称
    --tableItems
      --rowList
        --row
          --td
            --type
            --value


*/


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


/**
将页面元素添加到 表格中， 作为一列
*/
function add_block_to_current_table(blockItem){


    if( !has_current_table_block()){
            return false;
    }
    var thItems = vue.currentTableBlock['thItems']
    blockItem['multi_line'] = false
    thItems.push(blockItem)
    console.log(JSON.stringify(blockItem))
    vue.currentTableBlock['thItems'] =  thItems
    return true;
}



/**
删除一个表格
1. Vue 中删除
2. UI 上删除
3. 恢复初始状态
*/
function delete_table_block(table_block_id){

    vue.tableBlockList = vue.tableBlockList.filter(function(item) {
        return item['id'] != table_block_id
    });
    //TODO: 删除相关UI 元素
}


/**

创建表格模板


*/
function create_table_template(){

    if( !has_current_table_block()){
        return ;
    }
    var thItems = vue.currentTableBlock['thItems']

    if(thItems.length<2){
        show_message("表格列数最少为2个")
        return ;
    }



    thItems.sort(sort_block_by_x);
//    for(var i=0; i<thItems.length; i++){
//        console.log('sort %d ==  %s   multi_line:  %s',i,  thItems[i]['text'], thItems[i]['multi_line'])
//    }

    var row_poz_list = find_split_row_poz_list(thItems[0])
    var column_poz_list = find_split_column_poz_list(thItems)

    if(row_poz_list.length ==0 ){
        show_message("["+thItems[0]['text']+"]未发现相关元素")
        return ;
    }


    var total_same_x_block_item_list = new Array()
    for (var j=0; j<thItems.length ; j++ ){

        var same_x_block_item_list = find_same_x_block_item_list(thItems[j])

//        console.log('****   ', same_x_block_item_list)
        total_same_x_block_item_list.push(same_x_block_item_list)
    }

    var row_td_text_list = new Array()


    var tableItems = new Array()
    var tableItem = {}   //TODO:   一个页面里面会有多个该表头开始的表格
    var rowList = new Array();
    for(var i=0; i< row_poz_list.length ; i++ ){
//        console.log('i=%d, [start=%d,   end=%d]', i, row_poz_list[i]['start'], row_poz_list[i]['end'])


        var find_all_td_in_row_flag = true // 某一行是否全部发现了元素
        var row = new Array()
        for(var j=0; j<total_same_x_block_item_list.length; j++){
            var td = find_td_block_item( row_poz_list[i], total_same_x_block_item_list[j], j, column_poz_list, thItems)
            row.push(td)
            if (td == null ){
                find_all_td_in_row_flag = false
            }
        }//end for
        if (!find_all_td_in_row_flag){
            break;
        }
        rowList.push(row)

    }//end for

    console.log(row_td_text_list)
    tableItem['rowList'] = rowList
    tableItems.push(tableItem)
    vue.currentTableBlock['tableItems'] = tableItems

}

function find_td_block_item( row_poz, same_x_block_item_list, j, column_poz_list, thItems ){

    var left =0;
    var right = 0;
    if(j == 0 ){
        left = 0;
        right = column_poz_list[j+1]['start']
    }else if (j== column_poz_list.length-1){
        left = column_poz_list[j-1]['end']
        right = page_width+1
    }else {
        left = column_poz_list[j-1]['end']
        right = column_poz_list[j+1]['start']

    }

    console.log('[top=%d, bottom=%d] [left=%d,right=%d]  multi_line=%s ' ,
        row_poz['start'], row_poz['end'], left, right, thItems[j]['multi_line'])


    var temp_text = ''
    for (var i=0; i<same_x_block_item_list.length; i++){
        var tempBlock = same_x_block_item_list[i]

//        console.log('i=%d -----[top=%d, bottom=%d] [left=%d,right=%d] ' ,i,
//          tempBlock['top'], tempBlock['bottom'], tempBlock['left'],tempBlock['right'])


        if(tempBlock['left'] >= left &&
           tempBlock['right'] < right &&
           tempBlock['y'] >= row_poz['start'] &&
           tempBlock['y'] < row_poz['end'] ){

                temp_text += tempBlock['text']
           }


    }
    var type = 0 ;

    if(thItems[j]['multi_line']){
        type = 1
    }
    if (temp_text == ''){
        return null;
    }

    return {'type': type, 'value': temp_text}
}



/**
进行列分割
会返回以下格式数据， 用于进行划分表格
0: {start: 51, end: 79}
1: {start: 211, end: 274}
2: {start: 369, end: 411}
3: {start: 855, end: 907}
*/

function find_split_column_poz_list(thItems){


    var column_x_pos_list = new Array()
    for(var i=0; i< thItems.length; i++){
        column_x_pos_list.push({'start':thItems[i]['left'], 'end':thItems[i]['right'] })
    }
//    console.log(column_x_pos_list)
    return column_x_pos_list;

}

/**
用第一行的数据 找到分割线
会返回以下格式数据， 用于进行划分表格
0: {start: 268, end: 392}
1: {start: 392, end: 488}
2: {start: 488, end: 543}
3: {start: 543, end: 722}
*/
function find_split_row_poz_list(blockItem){
    console.log('\n blockItem = [%s]  [x=%d, y=%d, left=%d, right=%d]',
    blockItem['text'], blockItem['x'], blockItem['y'], blockItem['left'], blockItem['right'])

    var row_y_pos_list = new Array()
    for(var i=0; i< vue.blockItemList.length; i++ ){

        var tempBlockItem = vue.blockItemList[i]
        if(tempBlockItem['y'] > blockItem['y']  &&
         tempBlockItem['left']< blockItem['right']  &&  tempBlockItem['right']> blockItem['left']){

//            console.log('find ---- [%s]  [x=%d, y=%d, left=%d, right=%d]', tempBlockItem['text'], tempBlockItem['x'], tempBlockItem['y'],
//            tempBlockItem['left'], tempBlockItem['right'])

            row_y_pos_list.push(tempBlockItem['top'])
        }

    }//end for

    console.log(row_y_pos_list)

    var row_poz_list = new Array()
    if(row_y_pos_list.length ==0 ){
        console.log('未找到表格元素')
    }else if(row_y_pos_list.length == 1){
        //150 经验值， 一个表格最大的高度
        row_poz_list.push({'start':row_y_pos_list[0], 'end':row_y_pos_list[0] + 150 })
    }else {

        for(var i=1; i<row_y_pos_list.length; i++){
            row_poz_list.push({'start':row_y_pos_list[i-1], 'end':row_y_pos_list[i] })
        }
    }

//    console.log(row_poz_list)
    return  row_poz_list
}


/**
找到一个表头元素  下方的所有元素
*/
function find_same_x_block_item_list(blockItem){
//    console.log('\n blockItem = [%s]  [x=%d, y=%d, left=%d, right=%d]',
//    blockItem['text'], blockItem['x'], blockItem['y'], blockItem['left'], blockItem['right'])

    var same_x_block_item_list = new Array()
    for(var i=0; i< vue.blockItemList.length; i++ ){

        var tempBlockItem = vue.blockItemList[i]
        if(tempBlockItem['y'] > blockItem['y']  &&
         tempBlockItem['left']< blockItem['right']  &&  tempBlockItem['right']> blockItem['left']){

//            console.log('find ---- [%s]  [x=%d, y=%d, left=%d, right=%d]', tempBlockItem['text'],
//              tempBlockItem['x'], tempBlockItem['y'],tempBlockItem['left'], tempBlockItem['right'])
            same_x_block_item_list.push(tempBlockItem)
        }
    }//end for
    return  same_x_block_item_list
}



/**
对 表头列元素进行排序
*/
function sort_block_by_x(a,b) {
    return a['x']-b['x'];
}

/**
判断是否创建了 表格模板
*/

function has_current_table_block(){

    if(vue.currentTableBlock == null || vue.currentTableBlock['id'] == null
      || vue.tableBlockList.length == 0){
        show_message(" 请先创建表格 ")
        return false;
    }
    return true
}


