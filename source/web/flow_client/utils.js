/**
找到一个word 元素的父元素
*/
function find_parent_block_id_by_child(child_blockItem){

    if(child_blockItem['raw_block_type'] !='WORD'){
        return
    }

   for(var i=0; i< vue.blockItemList.length; i++  ){
        parent_blockItem = vue.blockItemList[i]
        if(parent_blockItem['raw_block_type'] != "LINE" ){
            continue
        }

        var child_list = parent_blockItem['child_list']
//        console.log('child_list length: ', child_list.length)
        for (var j =0; j< child_list.length; j++ ){
            if(child_blockItem['id'] == child_list[j]){
                child_blockItem['parent_block_id'] =  parent_blockItem['id']
//                console.log ("parent %s   child:  %s",  parent_blockItem['id'], child_blockItem['id'])
            }
        }
   }



}

/**
根据ID找到元素
*/
function find_block_by_id(block_id){

   for(var i=0; i< vue.blockItemList.length; i++  ){
        if (block_id ==vue.blockItemList[i]['id'] ){
            return vue.blockItemList[i]
        }
   }
}


/**
根据 坐标  找到word 元素, 并且合并文本内容,
并且将这些元素拆分
*/
function merge_td_text_by_box_poz(box){

   var td_text = ''
   for(var blockItem of vue.blockItemList){
        if (blockItem['raw_block_type'] =='LINE'){
            continue
        }
        if ( blockItem['x'] > box['left'] && blockItem['x']<= box['right']
           &&  blockItem['y']> box['top'] && blockItem['y'] <= box['bottom']){
            td_text +=  ' '+ blockItem['text']

        }
   }
   return td_text
}


/**
重新调整canvas 的大小
*/
function reset_canvas(width, height){
    var canvas=document.getElementById("myCanvas");
    canvas.width=width
    canvas.height=height

}


/**
找到最宽的元素， 用它来进行页面的旋转
*/
function find_max_width_block(blockList){
        var max_width_block = null
        max_width = 0.0
        for(i =0 ; i< blockList.length; i++){

               width =  blockList[i]['Geometry']['BoundingBox']['Width']
               if(width> max_width){
                max_width = width
                max_width_block = blockList[i]
               }
        }
        return max_width_block;
}


/**
找到每一页空白的地方， 去除掉， 防止有偏移
**/
function init_page_margin_block(blockItemList){
        var min_top_block = null
        var page_top = 1
        var page_bottom = 0.0
        var page_left = 1
        var page_right = 0.0

        for(i =0 ; i< blockItemList.length; i++){
               var top =  blockItemList[i]['newPoly'][0]['y']
               if(top<page_top){
                    page_top = top
               }
               var left =  blockItemList[i]['newPoly'][0]['x']
               if(left<page_left){
                  page_left = left
               }

               var bottom =  blockItemList[i]['newPoly'][2]['y']
               if(bottom > page_bottom){
                   page_bottom = bottom
               }

               var right =  blockItemList[i]['newPoly'][2]['x']
               if(right > page_right){
                   page_right = right
               }

        }


        var page_margin ={'top':0, 'bottom':1, 'left':0, 'right':'1'}
        page_margin['top'] = page_top;
        page_margin['bottom'] = page_bottom;
        page_margin['left'] = page_left;
        page_margin['right'] = page_right;
        page_margin['height'] = page_bottom - page_top;


        page_margin['height_rate'] = 1.0/(page_bottom - page_top);
        page_margin['width_rate'] =  1.0/(page_right - page_left)  ;

        console.log("page_margin",  JSON.stringify(page_margin))
        return page_margin;

}

/**
把现有元素等比例放大， 占满空间
*/
function zoom_layout_block(blockItem, document_zoom_out_height){

    var polyArray  = blockItem['newPoly']
    for (var i=0; i<polyArray.length; i++){
        var poly = polyArray[i];
        poly['x'] = parseInt(poly['x']  * page_width)
        poly['y'] = parseInt(poly['y']  * page_height)
    }
    blockItem['width'] = parseInt(polyArray[1]['x'] - polyArray[0]['x'])
    blockItem['height'] = parseInt(polyArray[3]['y'] - polyArray[0]['y'])
    blockItem['left'] = polyArray[0]['x']
    blockItem['top'] = polyArray[0]['y']
    blockItem['right'] = polyArray[1]['x']
    blockItem['bottom'] = polyArray[2]['y']
    blockItem['x'] = parseInt((polyArray[2]['x'] + polyArray[0]['x']) / 2.0)
    blockItem['y'] = parseInt((polyArray[2]['y'] + polyArray[0]['y']) / 2.0)
}

function clear_block_item_in_canvas(blockItem){
    $('#myCanvas').clearCanvas({
          x: blockItem['x']-1, y: blockItem['y']-1,
          width: blockItem['width']+3,
          height: blockItem['height']+3
    });

    var c=document.getElementById("myCanvas");
    var ctx=c.getContext("2d");
    ctx.beginPath();
    ctx.clearRect(blockItem['left']-1,blockItem['top']-1,blockItem['width']+3,blockItem['height']+3);
    ctx.stroke();

}

/**
获取一个表头几个元素的， 坐标位置， top  left  right  height
*/

function  get_thItems_box(thItems, th_count){

    if(thItems.length <2){
        show_message(" 至少选择两列 ")
        return ;
    }

    var max_top = 100000;
    var max_left = 100000;
    var max_right = 0;
    var max_bottom = 0;

    for (var i =0; i< thItems.length; i++ ){
        if(thItems[i]['top'] < max_top){
            max_top = thItems[i]['top']
        }

        if(thItems[i]['left'] < max_left){
            max_left = thItems[i]['left']
        }

        if(thItems[i]['right'] > max_right){
            max_right = thItems[i]['right']
        }

        if(thItems[i]['bottom'] > max_bottom){
            max_bottom = thItems[i]['bottom']
        }

    }

    var box = {
        th_count: th_count,
        top: max_top -3,
        left: max_left -3,
        right: max_right + 3,
        bottom: max_bottom + 3
    }
    console.log("get_thItems_box: ", JSON.stringify(box))
    return box
}

/**
对 表头列元素进行排序
*/
function sort_block_by_x(a,b) {
    return a['x']-b['x'];
}
function sort_block_by_left(a,b) {
    return a['left']-b['left'];
}
function sort_block_by_top(a,b) {
    return a['top']-b['top'];
}


/**
显示错误消息
*/
function show_message(message){
    $("#myModalContent").html(message)
    $('#myModal').modal('show')
}

function sort_map_return_list(data_map){
    var dataArray= []
    for (var item of data_map ){
        dataArray.push(item[1])
    }
    dataArray = dataArray.sort(function(a,b){return a-b})

    console.log('sort map : ', JSON.stringify(dataArray))
    return dataArray;
}

/**
保存定位元素
*/
function copy_block_item(block_item){

    var new_block_item = {}
    new_block_item['left'] = block_item['left']
    new_block_item['id'] = block_item['id']
    new_block_item['right'] = block_item['right']
    new_block_item['top'] = block_item['top']
    new_block_item['bottom'] = block_item['bottom']
    new_block_item['text'] = block_item['text']

    return new_block_item
}


function load_data_from_local(template_name){

    save_template_str = localStorage.getItem(template_name)
    var save_tableBlockList = JSON.parse(save_template_str);

    var tableBlockList = []
    for (var tableBlock of save_tableBlockList){


        save_location_items = tableBlock['save_location_items']
        total_th_item_list = find_th_items_from_location_item(save_location_items)
//        --total_poz_list
//            --col_poz_list                  // 用来分割表头元素横线的 X 坐标 集合
//            --row_poz_list                  // 用来分割行元素横线的 Y 坐标 集合

        var total_poz_list = []

        for (var th_item of total_th_item_list){
            total_poz_list.push(create_table_template(th_item, tableBlock['th_x_poz_list'], tableBlock['row_max_height']))
        }
        tableBlock['total_poz_list'] = total_poz_list
        tableBlockList.push(tableBlock)

    }
    vue.tableBlockList = tableBlockList
}

/**
根据定位元素， 寻找thItem


*/

function find_th_items_from_location_item(save_location_items){

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
                total_th_item_list.push(th_item_list)
            }
        }

//        console.log("^^^^^^^^^^^^^^^^  ", total_th_item_list.length)
        return total_th_item_list


}