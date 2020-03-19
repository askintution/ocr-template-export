const EPSILON = 1e-14
var page_width=1168;
var page_height=1425;
var matrix = [1,0,0,1];
var blockItemList ;
/**
解析数据
**/
function parse_data(data){
    blockItemList = new Array();

    pageCount = parseInt(data['DocumentMetadata']['Pages'])
    console.log('Pages:  %d', pageCount)
    vue.pageCount = pageCount
    vue.data = data
    parse_data_by_page(1)  // Demo 展示第一页
}

/**
解析单页的数据
**/
function parse_data_by_page(page){
    var data = vue.data
    var blockList = new Array()
    var index = 0
    vue.pageNo = page

    //换页时， 清空现在选择的字段。
    clean_current_field()
    // 将所有行的元素取出来
    for (i =0 ; i<data['Blocks'].length ; i++){
        if(data['Blocks'][i]['Page'] == page  && data['Blocks'][i]['BlockType']=='LINE'
//        && data['Blocks'][i]['Confidence']>99
        ){
            blockList[index] = data['Blocks'][i]
            index++
        }
    }
    //反方向旋转Theta
    var theta = -1 * find_best_degree(blockList)
    matrix = [Math.cos(theta), Math.sin(theta), -1 * Math.sin(theta), Math.cos(theta)]

    var blockCount = blockList.length
//    blockCount = 1  //测试 限制数量
    for(i =0 ; i<blockCount; i++){
       blockItem = create_block(blockList[i])
       blockItemList.push(blockItem)
    }


    /** 显示页面 **/
    var c=document.getElementById("myCanvas");
    var ctx=c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    blockItemList = new Array()

    for(i =0 ; i<blockCount; i++){
       blockItem = create_block(blockList[i])
       blockItemList.push(blockItem)
       draw_block_inside(ctx, blockItem, 0)
    }

    vue.blockItemList = blockItemList

    console.log("---------------   111 f ")
    redraw_blockItem()
}

/**
因为不知道图片的原始旋转坐标是哪里， 只能尝试用用图片的中点进行旋转，
1. 先让每个元素水平，
2. 每个元素水平以后， 再划分行
下面的函数， 是给出两个点， 尝试围绕[0, 0] 点旋转， 让这两个点的 tan值最小。
*/
function find_best_degree(blockList){
    var max_width_block = find_max_width_block(blockList)
    pointA = max_width_block['Geometry']['Polygon'][0]
    pointB = max_width_block['Geometry']['Polygon'][1]
    var polyList =  [pointA, pointB]
    console.info('【Method find_best_degree】  A[%f, %f] B [%f %f]', pointA['X'], pointA['Y'] , pointB['X'], pointB['Y'] )

    var total_count = 0;
    //Math.PI/12 -- > 30度的角
    var rates = get_rate_array( -1* Math.PI/12 , Math.PI/12  , 5)
    var result = 0.0
    while(total_count < 30  ){
        min_rate_index = 0
        interval = rates[1]- rates[0]
        min_rate = 10000.0
        raw_min_rate = 0
        total_count += 1
        for(r=0 ; r<rates.length; r++){

            theta = rates[r] // 围绕原点旋转的角度
            _matrix = [Math.cos(theta), Math.sin(theta), -1 * Math.sin(theta), Math.cos(theta)]

            polyArray = new Array()

            for(j=0; j<2; j++){
        //        console.log(' x=%d  y=%d', Math.round(page_width * parseFloat(polyList[j]['X'])),
        //                           Math.round(page_height * parseFloat(polyList[j]['Y'])))
                ploy = {}
                ploy['x'] = page_width * parseFloat(polyList[j]['X'])
                ploy['y'] = -1.0 * page_height * parseFloat(polyList[j]['Y'])
                newPloy = matrix_rotate(_matrix, ploy)
                newPloy['y'] = Math.abs(newPloy['y'])
                polyArray.push(newPloy)
            }

            value = (polyArray[1]['y'] - polyArray[0]['y'])
            if(Math.abs(value) < min_rate ){
                min_rate_index = r
                raw_min_rate = value
                min_rate =  Math.abs(value)
            }
//            console.log( 'old y1=%f, y2=%f,  Old Y1=%f, Y2=%f  New: Y1=%f,   Y2=%f',
//            polyList[0]['Y'], polyList[1]['Y'],  page_height *  polyList[0]['Y'],
//             page_height *  polyList[1]['Y'],polyArray[1]['y'], polyArray[0]['y'] )
        }
        if(min_rate_index ==0 ){
            rates = get_rate_array( rates[0] - interval, rates[min_rate_index+1] , rates.length)
        }else if(min_rate_index== rates.length){
           rates = get_rate_array( rates[min_rate_index-1], rates[rates.length-1] + interval , rates.length)
        }else {
           rates = get_rate_array( rates[min_rate_index-1], rates[min_rate_index+1] , rates.length)
        }

//        console.log('count [%d]  interval %f \t theta[%d] = %f, \t best delta y: %f ', total_count, interval, min_rate_index,rates[min_rate_index],  raw_min_rate)
        result = rates[min_rate_index]
        if(min_rate < EPSILON){
            break;
        }
    }

    return result;
}

function get_rate_array(start, end, size){
    interval = (end - start)/ (size-1)
    newArray = new Array(size)

    for(i=0; i< size; i++ ){
        newArray[i]= start + 1.0* i * interval
    }
    return newArray;
}




function create_block(block){

    var text = block['Text']
    polyList = block['Geometry']['Polygon']
    polyArray = new Array()

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
        width: parseInt(page_width * (polyArray[1]['x'] - polyArray[0]['x'])),
        height: parseInt(page_height *(polyArray[3]['y'] - polyArray[0]['y'])),
        left: parseInt(page_width * polyArray[0]['x']),
        top: parseInt(page_height * polyArray[0]['y']),
        newPoly:polyArray,
        polyList:block['Geometry']['Polygon'],  // 保存原始左边， 用于计算
        selected:0,  // 是否选中
        blockType:0, // 1 valueBlock;  2 keyBlock
        text:text
        };

    return blockItem
}


/**
绘制block
*/
function draw_block_inside(ctx, blockItem){

    ctx.beginPath();
    ctx.clearRect(blockItem['left']-3,blockItem['top']-3,blockItem['width']+6,blockItem['height']+6);
    if(blockItem['selected'] == 1){
//    blockType
        if(blockItem['blockType'] ==1){
            ctx.strokeStyle="red";
        }else if(blockItem['blockType'] ==2){
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
