
/**
扎到col_poz_list
*/
function find_table_items_by_th_items_vertical(thItems, th_x_poz_list){

    var col_poz = {'left':th_x_poz_list[0], 'right': th_x_poz_list[1]}
    var col_poz_list = []
    col_poz_list.push(col_poz)
    return col_poz_list
}


/***
//step 2.  找到行划分 row_poz_list
*/
function find_split_row_poz_list_vertical(thItems, row_max_height){

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
                    parseInt(row_max_height))
    console.log("new_th_item_list: ", JSON.stringify(new_item_poz_list ))


    var row_poz_list = []
    for(var j=1; j< new_item_poz_list.length; j++ ){
        var row_poz = {'top':new_item_poz_list[j-1], 'bottom':new_item_poz_list[j]}
        row_poz_list.push(row_poz)
    }

    console.log("row_poz_list: ", JSON.stringify(row_poz_list ))
    return row_poz_list
}

/*
* 找出表格元素
*/
function split_td_by_col_row_vertical(thItems, col_poz_list, row_poz_list){

      var table_row_list = []
        for(var i=0; i<row_poz_list.length; i++ ){
            var row = row_poz_list[i]

            var col = col_poz_list[0]
            console.log("[left=%d,  right=%d, top=%d, bottom=%d]" ,  col['left'], col['right'] , row['top'], row['bottom']  )
            var box = {'left': col['left'], 'right': col['right'] ,
                        'top': row['top'], 'bottom': row['bottom'] }

            var td_text_list = merge_td_text_by_box_block_type(box)

            table_row_list.push(td_text_list)
        }

        return table_row_list

}


/**
根据 坐标  找到word 元素, 并且合并文本内容,
并且将这些元素拆分
*/
function merge_td_text_by_box_block_type(box){


   var td_text_th = ''   // 定位元素
   var td_text = ''      // 普通元素
   for(var blockItem of vue.blockItemList){
        if (blockItem['raw_block_type'] =='LINE'){
            continue
        }
        if ( blockItem['x'] > box['left'] && blockItem['x']<= box['right']
           &&  blockItem['y']> box['top'] && blockItem['y'] <= box['bottom']){

            if(blockItem['blockType'] == 0){
                td_text +=  ' '+ blockItem['text']
            }else {
                td_text_th += ' '+ blockItem['text']
            }

        }
   }
   var td_text_list = []
    td_text_list.push(td_text_th)
    td_text_list.push(td_text)

   return td_text_list
}


/**
根据定位元素， 寻找thItem
*/
function find_th_items_from_location_item_vertical(save_location_items){
        console.error("************************* ")
        if(1==1){
            return null;
        }
        var error_range = 50  // 左右误差范围
        save_location_items.sort(sort_block_by_left);

        var total_col_list = []
        for (var location_item of save_location_items){
//            console.log("************   ", JSON.stringify(location_item))
            var col_list = []
            for(var _blockItem of  vue.blockItemList){

                if(_blockItem['raw_block_type'] == "LINE" ){
                     continue
                }

                if(_blockItem['text'] == location_item['text']
                    && _blockItem['x'] > location_item['left'] - error_range
                    && _blockItem['x'] < location_item['right'] + error_range){
//                    console.log(" [%s] [%s]  [x=%d, y=%d] ", _blockItem['id'], _blockItem['text'] , _blockItem['x'] ,  _blockItem['y'] )
                    col_list.push(_blockItem)

                }
            }
            col_list.sort(sort_block_by_top)
            total_col_list.push(col_list)
        }


        var total_th_item_list = []
//        console.log("----------- 按照第一行寻找行")
        // 按照第一行寻找行
        for( var col_item of total_col_list[0]){

            var th_item_list = []
            var top = col_item['top'] - error_range
            var bottom = col_item['bottom'] + error_range

            th_item_list.push(col_item)
            console.log("---- [%s] [%s]  [x=%d, y=%d] ", col_item['id'], col_item['text'] , col_item['x'] ,  col_item['y'] )


            for(var j=1; j< total_col_list.length; j++ ){

                for(var temp_col_item of total_col_list[j]){

                    if(temp_col_item['y'] > top && temp_col_item['y']< bottom ){
                        th_item_list.push(temp_col_item)
                    }
                }
            }

            if (th_item_list.length == save_location_items.length){
                for(var _blockItem of th_item_list){
                    _blockItem['blockType'] = 1
                }
                total_th_item_list.push(th_item_list)
            }else {
                console.warn("%%%%%%%%%%%%%%   save_location_items=%d        th_item_list=%d", save_location_items.length, th_item_list.length)
            }

        }
        return total_th_item_list


}