var POST_URL = "https://7imr48wed1.execute-api.cn-northwest-1.amazonaws.com.cn/prod/ocr"

var CMD_SAVE_TEMPLATE = 'save_template'   // 保存模板的请求命令
var CMD_GET_FIELD_LIST = 'get_field_list' //  获取一个模板所有的字段
var CMD_GET_TEMPLATE_LIST = 'get_template_list'   //或者特定类型的模板列表
var MIN_KEY_BLOCK_COUNT = 3 //一个模板最少的定位元素

var page_width=960;  // 页面宽度
var page_height=2000;  // 每一页，页面高度
var matrix = [1,0,0,1];  //矩阵

/**
解析ajax 返回的数据
**/
function parse_data(data){
    pageCount = parseInt(data['DocumentMetadata']['Pages'])
    vue.pageCount = pageCount //当前文档总页数
    vue.data = data   //保存数据


    if(pageCount<=0){
        show_message("该文档 没有内容")
        return;
    }


    var margin_document_top = 0.0 // 累计文档高度
    var blockItemList =  new Array()  //保存所有元素的列表
    var document_page_height = 0.0  //文档的累计高度

    //按照页数解析所有页面元素， 并且把它们拼接到一起
    for (count=0 ; count< pageCount; count++){
        result = parse_data_by_page(count+1 , margin_document_top)  // Demo 展示第一页
        _blockItemList = result['blockItemList']

        page_margin = result['page_margin']
        margin_document_top += page_margin['bottom'] - page_margin['top']
        document_page_height += page_margin['bottom'] - page_margin['top']

        console.log('Page : %d \t Item count: %d \t margin_document_top %f \t document_page_height %f',
         (count + 1),  _blockItemList.length, margin_document_top, document_page_height)


        blockItemList.push.apply(blockItemList,_blockItemList)
        console.log('Total: Item count: %d ', blockItemList.length)

    }


    var document_zoom_out_height = page_height* document_page_height
    reset_canvas(page_width , document_zoom_out_height)
    console.log('Canvas size=[%f , %f]  document height %f ',
    page_width, document_zoom_out_height,  document_page_height)
    vue.blockItemList = blockItemList
     //对元素进行缩放  如果是WORD 元素， 找到他们的父元素
     for(i =0 ; i<blockItemList.length; i++){
            var _blockItem = blockItemList[i]
            zoom_layout_block(_blockItem, document_zoom_out_height)
            find_parent_block_id_by_child(_blockItem)
     }
    // 绘制元素
    redraw_canvas()


}
/**
解析单页的数据
**/
function parse_data_by_page(page, margin_document_top){
    var data = vue.data
    var blockList = new Array()
    var index = 0

    //换页时， 清空现在选择的字段。
//    clean_current_field()

    // 将所有'行'的元素取出来
    for (i =0 ; i< data['Blocks'].length ; i++){
        if(data['Blocks'][i]['Page'] == page  &&
            (data['Blocks'][i]['BlockType']=='LINE' || data['Blocks'][i]['BlockType']=='WORD' )){
            blockList[index] = data['Blocks'][i]
            index++
        }
    }


    // 取出最长的元素， 找到旋转角度， 让它保持水平。
     var max_width_block = find_max_width_block(blockList)
     pointA = max_width_block['Geometry']['Polygon'][0]
     pointB = max_width_block['Geometry']['Polygon'][1]

    tan = (pointB['Y'] - pointA['Y'])/((pointB['X'] - pointA['X']))
    var theta = Math.atan(tan)
    console.log("PageCount=%d,   tan = %f,  theta =   %f   ", vue.pageCount , tan, theta)

    //反方向旋转Theta
    matrix = [Math.cos(theta), Math.sin(theta), -1 * Math.sin(theta), Math.cos(theta)]


    var block_item_list = new Array()

    //计算旋转后坐标
    var blockCount = blockList.length
//    blockCount = 20
    for(i =0 ; i<blockCount; i++){
       blockItem = create_block(blockList[i])
       block_item_list.push(blockItem)
    }

    var page_margin = init_page_margin_block(block_item_list)

    // 添加Margin Top， 把所有页面合并到一页
    for(i =0 ; i<block_item_list.length ; i++){
        var blockItem = block_item_list[i]
        re_arrange_position_block(blockItem, page_margin, margin_document_top)
//        console.log(blockItem)
    }

    return {'blockItemList': block_item_list, 'page_margin':page_margin }

}



/**
计算所有元素经过旋转以后的新坐标
*/
function create_block(block){

    var polyList = block['Geometry']['Polygon']
    var polyArray = new Array()

    //对坐标按照原点进行旋转
    for(j=0; j<polyList.length; j++){
        //围绕中心点旋转
        ploy = {}
        ploy['x'] = polyList[j]['X'] - 0.5
        ploy['y'] = polyList[j]['Y'] - 0.5
        newPloy = matrix_rotate(matrix, ploy)
        newPloy['x'] =   newPloy['x']+ 0.5
        newPloy['y'] =   newPloy['y']+ 0.5
        polyArray.push(newPloy)


    }


//    封装block 元素， 供页面显示
    var blockItem = {
        id:block['Id'],
        raw_block_type: block['BlockType'],   // LINE or WORD
        is_split: false,                      // 是否做拆分
        newPoly:polyArray,
//        polyList:block['Geometry']['Polygon'],  // 保存原始左边， 用于计算
        selected:0,  // 是否选中
        blockType:0, //0 默认;  1 表头; 2 表格中的值
        text:block['Text']
        };

     if(blockItem['raw_block_type'] == 'LINE' && block['Relationships'].length > 0){
        blockItem['child_list'] = block['Relationships'][0]['Ids']
     }


    return blockItem
}


/**
删除空白区域以后，加上前面所有页的高度， 将所有页面合并到一起
*/
function re_arrange_position_block(blockItem , page_margin, margin_document_top){
    var page_top = page_margin['top']
    var page_left = page_margin['left']
    var polyArray  = blockItem['newPoly']
    for (var i=0; i<polyArray.length; i++){
        var poly = polyArray[i];
        poly['x'] = (poly['x'] -  page_left )*  page_margin['width_rate']
        poly['y'] = poly['y'] -  page_top +  margin_document_top
    }


}


function is_display_block(blockItem){

    var current_split_block_list = ['ee7da4fa-04ed-4844-869f-e007972eee8c',
                                    'f30f4c52-cb4e-49c3-ba82-216ef381b6b4']

    if (blockItem['raw_block_type'] == 'LINE'){
        for (var i=0 ; i<current_split_block_list.length; i++  ){
           var current_split_block_id = current_split_block_list[i]
            //如果是LINE block， 已经切分了， 就不显示
            if(blockItem['id'] == current_split_block_id){
                return false
            }
        }
        return true
    }




    for (var i=0 ; i<current_split_block_list.length; i++  ){
       var current_split_block_id = current_split_block_list[i]
        //如果是LINE block， 已经切分了， 就不显示
        if ( blockItem['raw_block_type'] == 'WORD' && blockItem['parent_block_id'] == current_split_block_id ){
    //      console.log( 'parent_block_id: ',  blockItem['parent_block_id'] )
            return true
        }
    }





    return false
}




/**
绘制block
*/
function draw_block_inside(blockItem){

    if( is_display_block(blockItem) == false ){

        return
    }

     var strokeStyle = 'blue'
     if(blockItem['blockType'] ==1){  //1 表头; 2 表格中的值
        strokeStyle="red";
     }else if(blockItem['blockType'] ==2){ //1 表头; 2 表格中的值
        strokeStyle="green";
     }


    $('#myCanvas').clearCanvas({
          x: blockItem['x']-1, y: blockItem['y']-1,
          width: blockItem['width']+2,
          height: blockItem['height']+2
    });



    $('#myCanvas').drawRect({
      layer: true,
      strokeStyle: strokeStyle,
      strokeWidth: 1,
      x: blockItem['x'], y: blockItem['y'],
      width: blockItem['width'],
      height: blockItem['height'],
      cornerRadius: 1,
      click: function() {
            click_item(blockItem)
        }
    });


   $('#myCanvas').drawText({
     layer: true,
     fillStyle: '#36c',
     fontSize: '10pt',
     text: blockItem['text'],
     x: blockItem['x'] - $('#myCanvas').measureText('myText').width / 2, y: blockItem['y'],
     align: 'left',
   });

}

function click_item(blockItem){
    var selected = blockItem['selected']
    console.log('tops %f ; left %f --->id [%s] [%s]  ', blockItem['top'],
                    blockItem['left'], blockItem['id'], blockItem['text'] )

     console.log('id=%s,  [x=%f, y=%f]  ', blockItem['id'], blockItem['x'], blockItem['y'])
    if(selected == 0){
        if(add_block_to_current_table(blockItem)){
            blockItem['selected'] = 1
            blockItem['blockType'] = 1
            draw_block_inside(blockItem)
        }

    }else {
            blockItem['selected'] = 0
    }
}

/**
重新绘制所有元素
*/
function redraw_canvas(){
     $('#myCanvas').clearCanvas()
        for(i =0 ; i<vue.blockItemList.length; i++){
            draw_block_inside(vue.blockItemList[i] )
        }
     create_split_thItems_line()
}


function create_split_thItems_line(){

    line_height = 30
    line_width = 600
    line_top = 100
    line_left = 230
    col_num = 4

    $('#myCanvas').drawLine({
    layer: true,
      strokeStyle: '#6c1',
      strokeWidth: 2,
      x1: line_left, y1: line_top,
      x2: line_left + line_width, y2: line_top
    });

    $('#myCanvas').drawLine({
    layer: true,
      strokeStyle: '#6c1',
      strokeWidth: 2,
      x1: line_left, y1: line_top + line_height,
      x2: line_left + line_width, y2: line_top + line_height,
    });

    col_width = line_width / col_num
    col_item_y_poz_map = {}
    for(var i=0 ; i< col_num + 1; i++){

        draggable = true

        if(i ==0 || i == col_num){
            draggable = false
        }

        x = col_width * i + line_left
        col_item_y_poz_map[i] = x

         $('#myCanvas').drawRect({
          layer: true,
          id: i,
          draggable: draggable,
          fillStyle: '#6c1',
          x: x, y: line_top + line_height/2,
          width: 2, height: line_height,
          restrictDragToAxis: 'x',
          dragstart: function() {
            // code to run when dragging starts
          },
          drag: function(layer) {
          },
          dragstop: function(layer) {
           console.log(layer['x'] ,layer['id']  )
           col_item_y_poz_map[layer['id']] = layer['x']

           console.log( col_item_y_poz_map )
          }
        });
    }
}