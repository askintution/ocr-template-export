var vue ;
$(function(){

    vue = new Vue({
            el: '#main',
            data:{
                blockItemList:[], //当前页面解析的block元素
                pageCount:0,
                tableBlockList:[],
                templateList:[],
                current_template_name: 'vertical001',
                data_url:"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/ocr_output/2020_05_05_pdf.json",
                data:{}

             },methods:{
                get_json:function(){
                    url = $("#json_url_input").val()
                    get_data(url)
                },
                select_template_display:function(e){
                    select_template_display()

                },
             }
    })
    get_data(vue.data_url)
});


/**

Vue  对象的结构
--tableBlockList[]                  //一共发现多少个相同的表格模板
  --tableBlock{}
    --id  //text
    --name
    --table_type                    //0: 横向表格   1: 纵向表格
    --th_count                      //【用户输入】 【需要保存的内容】   实际表格列数， 用户自己填入， 用户生成分割线
    --row_max_height                //【用户输入】 【需要保存的内容】   用户输入的行最大的可能高度， 辅助进行识别
    --save_location_items           // 【需要保存的内容】
    --status                        // 当前状态 0:新创建  1: 生成了分割线  2:生成了这个表格匹配的模板
    --total_poz_list
        --col_poz_list                  // 用来分割表头元素横线的 X 坐标 集合
        --row_poz_list                  // 用来分割行元素横线的 Y 坐标 集合
        --table_row_list                // 表格的文本内容
*/


function get_data(url){
    if(url == null || url == ''){
        show_message(" 请填写 url ")
        return ;
    }
    vue.tableBlockList = new Array()
    vue.currentTableBlock = {}

    vue.templateList = load_template_list()

    $("#loading-icon").show()
    $.getJSON(url, function (data) {
        parse_data(data)
        vue.data_url = url
        $("#loading-icon").hide()

        select_template_display()

    })

}

function select_template_display(){
    if(vue.current_template_name == ''){
        return
    }
    load_data_from_local(vue.current_template_name)
    redraw_canvas()

}

/**
根据已经划分的表头  创建表格模板
*/
function create_table_template(thItems, th_x_poz_list , tableBlock){

    var row_max_height =  tableBlock['row_max_height']
    thItems.sort(sort_block_by_x);

    console.log(th_x_poz_list)

    //step 1.  找到表头元素 列划分
    var tableItems = new Array()

    var col_poz_list = []
    var row_poz_list = []
    var table_row_list = []

    if(tableBlock['table_type'] == 0){
        col_poz_list = find_table_items_by_th_items(thItems, th_x_poz_list)
            //step 2.  找到行划分
        row_poz_list =  find_split_row_poz_list(col_poz_list[0], row_max_height)

        table_row_list = split_td_by_col_row( col_poz_list, row_poz_list)

    }else {
        col_poz_list = find_table_items_by_th_items_vertical(thItems, th_x_poz_list)
         //step 2.  找到行划分
        row_poz_list =  find_split_row_poz_list_vertical(thItems, row_max_height)

        table_row_list = split_td_by_col_row_vertical(thItems, col_poz_list, row_poz_list)

    }

    console.log("********** ", table_row_list)
    return {'row_poz_list': row_poz_list, 'col_poz_list':col_poz_list, 'table_row_list': table_row_list }


}


/**
根据行和列的值划分表格
*/

function split_td_by_col_row(col_poz_list, row_poz_list){


    var table_row_list = []
    for(var i=0; i<row_poz_list.length; i++ ){
        var row = row_poz_list[i]
        var table_col_list = []
        for(var j=0; j< col_poz_list.length; j++ ){
            var col = col_poz_list[j]

            console.log("[left=%d,  right=%d, top=%d, bottom=%d]" ,  col['left'], col['right'] , row['top'], row['bottom']  )
            var box = {'left': col['left'], 'right': col['right'] ,
                        'top': row['top'], 'bottom': row['bottom'] }

            var text = merge_td_text_by_box_poz(box)
            console.log(  "row: [%d]  col: [%d]  ----  %s", i, j, text )
            table_col_list.push(text)
        }

        table_row_list.push(table_col_list)
    }

    return table_row_list
}


/**
 通过分割线找到表头元素
*/
function  find_table_items_by_th_items(old_th_items, th_x_poz_list){

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
                console.log(" th_x_poz_list: [%d] item_index  %d , j= [%d]   [%s]", i, item_index , j, single_item_list[j]['text'])
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
function find_split_row_poz_list(blockItem, row_max_height){

    var row_max_height = parseInt(row_max_height ) - blockItem['height']
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

