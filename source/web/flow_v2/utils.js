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
function find_block_by_id(child_id){

   for(var i=0; i< vue.blockItemList.length; i++  ){
        if (child_id ==vue.blockItemList[i]['id'] ){
            return vue.blockItemList[i]
        }
   }
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
