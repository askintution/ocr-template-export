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
    get_data(vue.data_url)
});


/**

Vue  对象的结构
--tableBlockList[]
  --tableBlock{}
    --id  //text
    --item_width  //int
    --thItems[]   // 列名称
      --blockItem{}   [.text, .multi_line：是否多行显示]
    --tableItems[] // 一个表头，可以在页面里面找到多个匹配的表格。
      --tableItem{}
          --rowList[]
            --row[]
              --td{}
                --type
                --value


*/



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
    blockItem['blockType']= 1 // 0 未选中 1 表头; 2 表格中的值
    blockItem['table_id']= vue.currentTableBlock['id']
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

    for(i =0 ; i<vue.blockItemList.length; i++){
        var blockItem = vue.blockItemList[i]
        if(blockItem['table_id'] == table_block_id){
            blockItem['selected'] = 0
            blockItem['blockType'] = 0 //1 表头; 2 表格中的值
            blockItem['table_id']= ''
        }
    }
    redraw_canvas()
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

    var tableItems = new Array()
    //TODO:   一个页面里面会有多个该表头开始的表格, 使用 thItems 再找相同的表头
    var tableItem = find_table_items_by_th_items (thItems)

    tableItems.push(tableItem)
    vue.currentTableBlock['tableItems'] = tableItems
    redraw_canvas()

}

function  find_table_items_by_th_items (thItems){

    var tableItem = {}
    var row_poz_list = find_split_row_poz_list(thItems[0])
    var column_poz_list = find_split_column_poz_list(thItems)

    if(row_poz_list.length ==0 ){
        show_message("["+thItems[0]['text']+"]未发现相关元素")
        return ;
    }


    var total_same_x_block_item_list = new Array()
    for (var j=0; j<thItems.length ; j++ ){
        var same_x_block_item_list = find_same_x_block_item_list(thItems[j])
        total_same_x_block_item_list.push(same_x_block_item_list)
    }
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

    tableItem['rowList'] = rowList
    return tableItem;
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

//    console.log('[top=%d, bottom=%d] [left=%d,right=%d]  multi_line=%s ' ,
//        row_poz['start'], row_poz['end'], left, right, thItems[j]['multi_line'])


    var temp_text = ''
    for (var i=0; i<same_x_block_item_list.length; i++){
        var tempBlock = same_x_block_item_list[i]

        if(tempBlock['left'] >= left &&
           tempBlock['right'] < right &&
           tempBlock['y'] >= row_poz['start'] &&
           tempBlock['y'] < row_poz['end'] ){

                temp_text += tempBlock['text']
                tempBlock['selected']= 1
                tempBlock['blockType']= 2 // 0 未选中 1 表头; 2 表格中的值
                tempBlock['table_id']= vue.currentTableBlock['id']
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


