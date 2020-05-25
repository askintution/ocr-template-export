var vue ;
$(function(){

    vue = new Vue({
            el: '#main',
            data:{
                blockItemList:[], //当前页面解析的block元素
                pageCount:0,
                tableBlockList:[],
                currentTableBlock:{},
                data_url:"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/ocr_output/2020_05_05_pdf.json",
                data:{}

             },methods:{
                get_json:function(){
                    url = $("#json_url_input").val()
                    //alert(url)
                    get_data(url)
                },
                add_table_block:function(){
                    add_table_block()
                },
                create_table_split_th:function(){
                    create_table_split_th()
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
--tableBlockList[]                  //一共发现多少个相同的表格模板
  --tableBlock{}
    --id  //text
    --thItems[]                     //【用户输入】 模板的定位元素， 用户点击选择的Block  首位两端的就可以， 最少两个
                                    // [ {left, right, top, bottom}, {left, right, top, bottom}]
    --th_count                      //【用户输入】 【需要保存的内容】   实际表格列数， 用户自己填入， 用户生成分割线
    --row_max_height                //【用户输入】 【需要保存的内容】   用户输入的行最大的可能高度， 辅助进行识别
    --save_location_items           // 【需要保存的内容】

    --status                        // 当前状态 0:新创建  1: 生成了分割线  2:生成了这个表格匹配的模板
    --col_poz_list                  // 用来分割表头元素横线的 X 坐标 集合
    --row_poz_list                  // 用来分割行元素横线的 Y 坐标 集合
*/


function get_data(url){
    if(url == null || url == ''){
        show_message(" 请填写 url ")
        return ;
    }
    vue.tableBlockList = new Array()
    //TODO: 从本地数据库加载数据
    vue.currentTableBlock = {}

    $("#loading-icon").show()
    $.getJSON(url, function (data) {
        parse_data(data)
        vue.data_url = url
        $("#loading-icon").hide()

    })

}

/**
新加一种类型的 tableBlock模板
*/
function add_table_block(){
    if (vue.tableBlockList.length >0 && vue.currentTableBlock['status'] !=2 ){
        show_message("请先完成前一个表格[ "+vue.currentTableBlock['id']+" ]的制作")
        return false;
    }

    var tableBlock = {}
    tableBlock['id']= uuid(8, 16)
    tableBlock['thItems'] = new Array()
    tableBlock['save_location_items'] = new Array()

    tableBlock['th_count'] = 0                      //默认表格列数
    tableBlock['row_max_height'] = 100
    tableBlock['status'] = 0
    vue.currentTableBlock = tableBlock
    vue.tableBlockList.push(tableBlock)
}




/**
将页面元素添加到 表格中， 作为表格定位元素
*/
function add_block_to_current_table(blockItem){

//    console.log("blockItem id: ", blockItem['id'])
    if( !has_current_table_block()){
            return false;
    }
    if (vue.currentTableBlock['status'] !=0 ){
        show_message("已经选取完元素， 如果希望重新选择， 请点击删除")
        return false;
    }

    var thItems = vue.currentTableBlock['thItems']
    blockItem['blockType']= 1 // 0 未选中 1 表头; 2 表格中的值
    blockItem['table_id']= vue.currentTableBlock['id']
    thItems.push(blockItem)

    var save_location_items = copy_block_item(blockItem)
    vue.currentTableBlock['save_location_items'].push(save_location_items)

    vue.currentTableBlock['th_count'] = thItems.length
//    console.log('add_block_to_current_table : ', JSON.stringify(blockItem))
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

    vue.currentTableBlock = {}
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
生成划分表格列的 分割线
*/
function create_table_split_th(){
    if( !has_current_table_block()){
        return ;
    }

    var thItems = vue.currentTableBlock['thItems']
    if(thItems.length<2){
        show_message("定位元素 列数最少为2个")
        return ;
    }
    redraw_canvas()
    vue.currentTableBlock['status'] = 1

    var box = get_thItems_box(thItems, vue.currentTableBlock['th_count'])

    var row_max_height = vue.currentTableBlock['row_max_height']
    create_split_thItems_line(box, row_max_height)

}



/**
根据已经划分的表头  创建表格模板
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

    vue.currentTableBlock['status'] =2
    thItems.sort(sort_block_by_x);

    //step 1.  找到表头元素 列划分
    var tableItems = new Array()
    var col_poz_list = find_table_items_by_th_items(thItems)

    //step 2.  找到行划分  TODO:  可以让用户自己选按照哪一列划分行， 目前选第一列， 因为一般情况下第一列不为空
    var row_poz_list =  find_split_row_poz_list(col_poz_list[0])

    //step 3. 利用行列 进行拆分
    vue.currentTableBlock['col_poz_list'] = col_poz_list
    vue.currentTableBlock['row_poz_list'] = row_poz_list

    split_td_by_col_row(vue.currentTableBlock['id'], col_poz_list, row_poz_list)
    redraw_canvas()

}


/**
根据行和列的值划分表格
*/

function split_td_by_col_row(table_id, col_poz_list, row_poz_list){


    for(var i=0; i<row_poz_list.length; i++ ){
        var row = row_poz_list[i]

        for(var j=0; j< col_poz_list.length; j++ ){
            var col = col_poz_list[j]

//            console.log("[left=%d,  right=%d, top=%d, bottom=%d]" ,  col['left'], col['right'] , row['top'], row['bottom']  )
            var box = {'left': col['left'], 'right': col['right'] ,
                        'top': row['top'], 'bottom': row['bottom'] }
            console.log(  "row: [%d]  col: [%d]  ----  %s", i, j, merge_td_text_by_box_poz(table_id, box) )
        }
    }
}


/**
 通过分割线找到表头元素
*/
function  find_table_items_by_th_items (old_th_items){
    var th_x_poz_list = vue.currentTableBlock['th_x_poz_list']

    var single_item_list = []  //include word and line block
    for(var item of old_th_items){
        single_item_list.push(item)
    }

    var item_index = 0

    var col_poz_list = []
    for (var i=1; i<th_x_poz_list.length ; i++){
//        console.log(th_x_poz_list[i-1] , th_x_poz_list[i])
        while(item_index< single_item_list.length){

            var new_item = {}
            new_item['left'] = single_item_list[item_index]['left']
            new_item['top'] = single_item_list[item_index]['top']
            new_item['bottom'] = single_item_list[item_index]['bottom']
            new_item['text'] =  ''

            for (var j= item_index; j<single_item_list.length; j++  ){
//                console.log(" th_x_poz_list: [%d] item_index  %d , j= [%d]   [%s]", i, item_index , j, single_item_list[j]['text'])
                if (single_item_list[j]['x'] > th_x_poz_list[i-1]  &&
                    single_item_list[j]['x'] < th_x_poz_list[i] ){
                    new_item['text'] += ' '+ single_item_list[j]['text']
                    new_item['right'] = single_item_list[j]['right']


                    if( single_item_list[j]['bottom'] > new_item['bottom'] ){
                        new_item['bottom'] = single_item_list[j]['bottom']
                    }

                    if( single_item_list[j]['top'] < new_item['top'] ){
                        new_item['top'] = single_item_list[j]['top']
                    }
                    item_index += 1
                }else {
                    break;
                }
            }

            new_item['left'] = th_x_poz_list[i-1]
            new_item['right'] = th_x_poz_list[i]
            new_item['x'] = parseInt((new_item['left'] + new_item['right'])/ 2)
            new_item['y'] = parseInt((new_item['bottom'] + new_item['top'])/ 2)

            new_item['height'] = new_item['bottom'] - new_item['top']
            new_item['width'] = new_item['right'] - new_item['left']
            console.log("new_item  [%s] x=%d, y=%d left=%d, right=%d, height=%d", new_item['text'],new_item['x'], new_item['y'],
                new_item['left'], new_item['right'], new_item['height'])
            col_poz_list.push(new_item)
            break;
        }
    }   //end for

    return col_poz_list

}


function find_td_item_x_boundary(column_poz_list, j){
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

    return {'left':left, 'right': right}

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

    var row_max_height = parseInt(vue.currentTableBlock['row_max_height']) - blockItem['height']
//    console.log('find_split_row_poz_list ---- [%s]  [x=%d, y=%d, left=%d, right=%d, height=%d]  row_max_height: [%d]', blockItem['text'], blockItem['x'], blockItem['y'],
//    blockItem['left'], blockItem['right'] , blockItem['height'], row_max_height)

    var last_item_y = blockItem['bottom']
    var row_y_pos_list = new Array()

//    row_y_pos_list.push(last_item_y)

    for(var i=0; i< vue.blockItemList.length; i++ ){

        var tempBlockItem = vue.blockItemList[i]

        if(tempBlockItem['raw_block_type'] == "LINE"){
            continue
        }

        if(tempBlockItem['top'] > blockItem['bottom']  &&
         tempBlockItem['left'] >= blockItem['left']  &&
         tempBlockItem['right'] <= blockItem['right']){


            //下一个行和上一个行差距太大， 就结束查找 ， 最后一个元素作为区分表格的底部
            if(tempBlockItem['bottom'] - last_item_y > row_max_height ){
                console.log(" ** 找到行元素结尾 [%s]  y = ", tempBlockItem['text'], tempBlockItem['top'])
                break;
            }
            if(tempBlockItem['bottom'] - last_item_y < tempBlockItem['bottom'] - tempBlockItem['top'] ){
//                console.log("###### ", tempBlockItem['text'], last_item_y)
                continue;
            }
//            console.log('find ---- [%s]  [x=%d, y=%d, left=%d, right=%d]', tempBlockItem['text'], tempBlockItem['x'], tempBlockItem['y'],
//                        tempBlockItem['left'], tempBlockItem['right'])

            last_item_y = tempBlockItem['bottom']
            row_y_pos_list.push(tempBlockItem['top'])
        }

    }//end for

//    for(var poz of row_y_pos_list){
//        console.log(" 找到的 y 坐标 用于划分行---------------- %d ", poz)
//    }

    var row_poz_list = new Array()
    if(row_y_pos_list.length ==0 ){
        console.log('未找到表格元素')
    }else if(row_y_pos_list.length == 1){
        //150 经验值， 一个表格最大的高度
        row_poz_list.push({'top':row_y_pos_list[0], 'bottom':row_y_pos_list[0] + row_max_height })
    }else {

        for(var i=1; i<row_y_pos_list.length; i++){
            row_poz_list.push({'top':row_y_pos_list[i-1], 'bottom':row_y_pos_list[i] })
        }
        var last_y = row_y_pos_list[row_y_pos_list.length -1]
        row_poz_list.push({'top':last_y, 'bottom':last_y + row_max_height })
    }

    console.log('row_poz_list  length: %d', row_poz_list.length)

//    for(var poz of row_poz_list){
//            console.log(" 找到的 y 坐标 用于划分行------ [%d   ---    %d] ", poz['top'], poz['bottom'])
//    }
    return  row_poz_list
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

