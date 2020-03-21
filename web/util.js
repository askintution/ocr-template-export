
/**
编辑距离算法, 扫描文件， 会有一些字符没有识别出来， 不能判断完全相当， 用编辑距离算法看相识度
*/
function minDistance(s1, s2) {
    const len1 = s1.length
    const len2 = s2.length

    let matrix = []

    for (let i = 0; i <= len1; i++) {
        // 构造二维数组
        matrix[i] = new Array()
        for (let j = 0; j <= len2; j++) {
            // 初始化
            if (i == 0) {
                matrix[i][j] = j
            } else if (j == 0) {
                matrix[i][j] = i
            } else {
                // 进行最小值分析
                let cost = 0
                if (s1[i - 1] != s2[j - 1]) { // 相同为0，不同置1
                    cost = 1
                }
                const temp = matrix[i - 1][j - 1] + cost

                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, temp)
            }
        }
    }
    return matrix[len1][len2] //返回右下角的值
}


function deepClone(obj){
    if(obj == null){
        return null
    }
    let _obj = JSON.stringify(obj);
    return JSON.parse(_obj);
}

function getTanDeg(tan) {
        return Math.atan(tan);
}

/**
对单个点进行矩阵乘法， 围绕原点旋转。
point{'x':1, 'y':2}
matrix[[0, 1], [2, 3]]
*/
function matrix_rotate(m, point){

    var a = point['x']
    var b = point['y']
    var X = m[0]*a + m[1]*b
    var Y = m[2]*a + m[3]*b
    var new_point = {}
    new_point['x']=X
    new_point['y']=Y
//    console.log('point: %f, %f , new point: %f  %f',a, b , X, Y)
    return new_point
}


String.format = function(src){

       if (arguments.length == 0) return null;

       var args = Array.prototype.slice.call(arguments, 1);

       return src.replace(/\{(\d+)\}/g, function(m, i){

             return args[i];

      });

};