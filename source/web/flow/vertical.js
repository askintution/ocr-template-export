function add_vertical_table_block(){

    if (vue.tableBlockList.length >0 && vue.currentTableBlock['status'] !=2 ){
        show_message("请先完成前一个表格[ "+vue.currentTableBlock['id']+" ]的制作")
        return false;
    }

    var tableBlock = {}
    tableBlock['id']= uuid(8, 16)
    tableBlock['thItems'] = new Array()   // 定位元素

    tableBlock['save_location_items'] = new Array()
    tableBlock['table_type'] = 1    //0 横向  1: 纵向
    tableBlock['table_name'] = 'tb_name_'+table_item_index
    tableBlock['th_count'] = 0                      //默认表格列数
    tableBlock['row_max_height'] = 100
    tableBlock['status'] = 0
    vue.currentTableBlock = tableBlock
    vue.tableBlockList.push(tableBlock)

    table_item_index += 1


}

function create_vertical_table_split_th(){

    alert("create_vertical_table_split_th")
}

function create_vertical_table_template(){
    alert("create_vertical_table_template")
}