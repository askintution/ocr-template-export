

function find_table_items_by_th_items_vertical(thItems, th_x_poz_list){
    console.log("--------------------find_table_items_by_th_items_vertical "   )
    return []

}
                    //step 2.  找到行划分
function find_split_row_poz_list_vertical(col_poz, row_max_height){
    console.log("--------------------find_split_row_poz_list_vertical "   )
    return []
}

function split_td_by_col_row_vertical( col_poz_list, row_poz_list){
    console.log("--------------------split_td_by_col_row_vertical "   )
    return []

}




function create_vertical_table_split_th(table_block_id){

    if( !has_current_table_block()){
        return ;
    }

    var thItems = vue.currentTableBlock['thItems']
    if(thItems.length<1){
        show_message("至少一个定位元素")
        return ;
    }

    if(vue.currentTableBlock['id'] != table_block_id){
        show_message("当前表格已经创建成功， 如需修改，请删除以后重建")
        return;
    }

    vue.currentTableBlock['status'] = 1

    var box = get_thItems_box(thItems, vue.currentTableBlock['th_count'])
    var row_max_height = parseInt(vue.currentTableBlock['row_max_height'])
    if (row_max_height< 15 || row_max_height> 300){
        show_message("请确认行高是否正确 ")
        return;
    }
    create_split_thItems_line(box, 1,  row_max_height)


}

function create_vertical_table_template(table_block_id){
    if( !has_current_table_block()){
        return ;
    }
    var thItems = vue.currentTableBlock['thItems']

    if(thItems.length<1){
        show_message("至少有一个定位元素")
        return ;
    }
    if( vue.currentTableBlock['status'] != 1){
        show_message("请先生成分割线")
        return;
    }
     if(vue.currentTableBlock['id'] != table_block_id){
        show_message("当前表格已经创建成功， 如需修改，请删除以后重建")
        return;
    }


    if(vue.currentTableBlock['table_name'] == ''){
        show_message("请填写表格名称")
        return ;
    }

    var th_x_poz_list = vue.currentTableBlock['th_x_poz_list']

    console.log('th_x_poz_list: ', th_x_poz_list)
    var col_poz = {'left':th_x_poz_list[0], 'right': th_x_poz_list[1]}
    var col_poz_list = []
    col_poz_list.push(col_poz)


    vue.currentTableBlock['status'] =2


    //step 1. 找到每行第一个元素， 找到行的划分
    var tableItems = new Array()
    var row_poz_list = find_first_block_in_line(thItems)

    vue.currentTableBlock['row_poz_list'] = row_poz_list
    vue.currentTableBlock['col_poz_list'] = col_poz_list
    split_vertical_td_by_col_row(thItems, row_poz_list, col_poz_list)
    redraw_canvas()


}

/**
找到划分行的y 坐标
把所有元素 按照y排序， 每行取一个元素
*/
function  find_first_block_in_line(thItems){
    var line_error_rate = 15
    thItems.sort(sort_block_by_y);

    var new_item_poz_list = []
    new_item_poz_list.push(thItems[0]['top'])
    for(var i=1; i<thItems.length; i++){

        if( Math.abs(thItems[i]['top'] - new_item_poz_list[new_item_poz_list.length-1]) > line_error_rate ){
            new_item_poz_list.push(thItems[i]['top'])
        }
    }

    new_item_poz_list.push(new_item_poz_list[new_item_poz_list.length-1] +
                    parseInt(vue.currentTableBlock['row_max_height']))
    console.log("new_th_item_list: ", JSON.stringify(new_item_poz_list ))


    var row_poz_list = []
    for(var j=1; j< new_item_poz_list.length; j++ ){

        var row_poz = {'top':new_item_poz_list[j-1], 'bottom':new_item_poz_list[j]}
        row_poz_list.push(row_poz)
    }



    console.log("row_poz_list: ", JSON.stringify(row_poz_list ))
    return row_poz_list
}

/**
划分行内元素
*/
function split_vertical_td_by_col_row(thItems, row_poz_list, col_poz_list){


    var blockItemList = vue.blockItemList

    var table_row_list = [] // {'key': key , 'value': value}


    for (var row of row_poz_list){
        var box = {'left': col_poz_list[0]['left'], 'right': col_poz_list[0]['right'] ,
                     'top': row['top'], 'bottom': row['bottom'] }

        var find_row_block_list = find_block_list_in_box(box)
    }




}

function find_block_list_in_box(box){
   console.log("^^^^^^^^box  ", JSON.stringify(box))
   var block_list = []
   for(var blockItem of vue.blockItemList){
        if (blockItem['raw_block_type'] =='LINE'){
            continue
        }
        if ( blockItem['x'] > box['left'] && blockItem['x']<= box['right']
           &&  blockItem['y']> box['top'] && blockItem['y'] <= box['bottom']){
            block_list.push(blockItem)
            console.log("***********   ", blockItem['text'])

        }
   }

    return block_list
}