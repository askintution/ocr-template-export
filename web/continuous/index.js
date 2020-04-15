var POST_URL = "https://94qmp9fmc3.execute-api.cn-northwest-1.amazonaws.com.cn/prod/ocr"

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
        margin_document_top = page_margin['bottom'] - page_margin['top']
        document_page_height += margin_document_top


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
    /** 显示页面 **/
    var c=document.getElementById("myCanvas");
    var ctx=c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);


     //对元素进行缩放
     for(i =0 ; i<blockItemList.length; i++){
            zoom_layout_block(blockItemList[i], document_zoom_out_height)
     }
    // 绘制元素
     for(i =0 ; i<blockItemList.length; i++){
        draw_block_inside(ctx, blockItemList[i])
     }


}



function reset_canvas(width, height){
    var canvas=document.getElementById("myCanvas");
    canvas.width=width
    canvas.height=height

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
        if(data['Blocks'][i]['Page'] == page  && data['Blocks'][i]['BlockType']=='LINE'){
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
    console.log("PageCount=%d,  PageNo=%d,  tan = %f,  theta =   %f   ", vue.pageCount , vue.pageNo, tan, theta)

    //反方向旋转Theta
    matrix = [Math.cos(theta), Math.sin(theta), -1 * Math.sin(theta), Math.cos(theta)]


    var block_item_list = new Array()

    //计算旋转后坐标
    var blockCount = blockList.length
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
        newPoly:polyArray,
//        polyList:block['Geometry']['Polygon'],  // 保存原始左边， 用于计算
        selected:0,  // 是否选中
        blockType:0, //0 默认;  1 表头; 2 表格中的值
        text:block['Text']
        };

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

/**
绘制block
*/
function draw_block_inside(ctx, blockItem){

    ctx.beginPath();
    ctx.clearRect(blockItem['left']-3,blockItem['top']-3,blockItem['width']+6,blockItem['height']+6);
    if(blockItem['selected'] == 1){ // 已经选择
//    blockType
        if(blockItem['blockType'] ==1){  //1 表头; 2 表格中的值
            ctx.strokeStyle="red";
        }else if(blockItem['blockType'] ==2){ //1 表头; 2 表格中的值
            ctx.strokeStyle="green";
        }
    }else {
        ctx.strokeStyle="blue";
    }

    var newPoly = blockItem.newPoly
    ctx.font="10px Arial";
    ctx.lineWidth="1";
    ctx.rect(blockItem['left'],blockItem['top'],blockItem['width'],blockItem['height']);

    ctx.fillText(blockItem['text'],blockItem['left'] +3, blockItem['top']+blockItem['height']/2.0 +2);
    ctx.stroke();

}

function redraw_canvas(){
     var c=document.getElementById("myCanvas");
     var ctx=c.getContext("2d");
     ctx.clearRect(0,0,c.width,c.height);

        for(i =0 ; i<vue.blockItemList.length; i++){
            if(vue.blockItemList[i]['blockType'] !=0 ){
                console.log('-------[%s]------  %d', vue.blockItemList[i]['text'], vue.blockItemList[i]['blockType'])
            }
            draw_block_inside(ctx,vue.blockItemList[i] )
        }
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