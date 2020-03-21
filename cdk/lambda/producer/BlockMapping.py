import json
import math
import numpy as np
from urllib.request import Request, urlopen

single_block_dist_sqrt = math.sqrt(0.05 ** 2 + 0.05 ** 2)


class BlockMapping:
    """
    OCR 识别模块解析
    """

    def __init__(self, url):
        self.url_ = url
        self.data_ = self._load_data(url)
        self.block_list_ = None  # 所有页面的原始block数据
        self.blockItemList_ = None  # 当前页面经过解析的 block
        self.page_count = self.data_['DocumentMetadata']['Pages']
        self.page_no = 0
        print('【message】 url: {}  page: {} '.format(url, self.page_count))


    def _load_data(self, url):
        html = urlopen(Request(url))
        data_json = json.loads(html.read())
        return data_json

    def init_block_list_by_page(self, page_no):
        """
        初始化元素
        """
        block_list = []
        assert page_no < self.page_count, \
            "The number of pages is out of range[1, {}]".format(self.page_count)

        self.page_no = page_no
        for i in range(len(self.data_['Blocks'])):
            if self.data_['Blocks'][i]['Page'] == page_no and self.data_['Blocks'][i]['BlockType'] == 'LINE':
                block_list.append(self.data_['Blocks'][i])
        self.block_list_ = block_list
        print("【message】 Page=[{}] block list length: {} ".format(page_no, len(block_list)))
        T = self._init_rotate_matrix()  # 得到页面旋转的矩阵
        block_item_list = []
        for i in range(len(self.block_list_)):
            block_item = self._create_block(block_list[i], T)
            block_item_list.append(block_item)

        page_margin = self._init_page_margin_block(block_item_list)
        self.blockItemList_ = block_item_list
        for i in range(len(block_item_list)):
            self._zoom_layout_block(block_item_list[i], page_margin)

    def find_block_item_by_id(self, block_id):

        if self.blockItemList_ is None or len(self.blockItemList_) == 0:
            return None

        for i in range(len(self.blockItemList_)):
            if block_id == self.blockItemList_[i]['id']:
                return self.blockItemList_[i]
        return None

    def _create_block(self, block, T):

        poly_list = block['Geometry']['Polygon']
        poly_array = []

        for i in range(len(poly_list)):
            x = poly_list[i]['X'] - 0.5
            y = poly_list[i]['Y'] - 0.5
            P = np.dot(T, np.array([x, y]))
            P[0] += 0.5
            P[1] += 0.5
            poly_array.append({'x': P[0], 'y': P[1]})
        #         print('{} {} '.format(P[0], P[1]))

        block_item = {'id': block['Id'],
                      'newPoly': poly_array,
                      'polyList': poly_list,
                      'text': block['Text'],
                      'selected': 0,
                      'blockType': 0,
                      'x': (poly_array[2]['x'] + poly_array[0]['x']) / 2.0,
                      'y': (poly_array[2]['y'] + poly_array[0]['y']) / 2.0}

        #     print("----------------   {} ".format(blockItem))
        return block_item

    def _zoom_layout_block(self, block_item, page_margin):
        """
        切除空白部分
        """
        page_top = page_margin['top']
        page_left = page_margin['left']
        poly_array = block_item['newPoly']

        for i in range(len(poly_array)):
            poly = poly_array[i]
            poly['x'] = (poly['x'] - page_left) * page_margin['width_rate']
            poly['y'] = (poly['y'] - page_top) * page_margin['height_rate']

    def _init_rotate_matrix(self):
        """
        找到旋转的角度
        """
        max_width_block = {}
        max_width = 0.0

        for i in range(len(self.block_list_)):
            width = self.block_list_[i]['Geometry']['BoundingBox']['Width']
            if width > max_width:
                max_width = width
                max_width_block = self.block_list_[i]

        point_a = max_width_block['Geometry']['Polygon'][0]
        point_b = max_width_block['Geometry']['Polygon'][1]
        tan = (point_b['Y'] - point_a['Y']) / ((point_b['X'] - point_a['X']))
        theta = math.atan(tan)
        print('tan = {}\t theta = {} '.format(tan, theta))
        T = np.array([[math.cos(theta), math.sin(theta)],
                      [-math.sin(theta), math.cos(theta)]])
        return T

    def _init_page_margin_block(self, block_item_list):
        """
        找到页面空白的地方， 去除掉， 防止有偏移
        """
        page_top = 1
        page_bottom = 0.0
        page_left = 1
        page_right = 0.0

        for i in range(len(block_item_list)):
            top = block_item_list[i]['newPoly'][0]['y']
            if top < page_top:
                page_top = top

            left = block_item_list[i]['newPoly'][0]['x']
            if left < page_left:
                page_left = left

            bottom = block_item_list[i]['newPoly'][2]['y']
            if bottom > page_bottom:
                page_bottom = bottom

            right = block_item_list[i]['newPoly'][2]['x']
            if right > page_right:
                page_right = right

        page_margin = {'top': page_top,
                       'bottom': page_bottom,
                       'left': page_left,
                       'right': page_right,
                       'height_rate': 1.0 / (page_bottom - page_top),
                       'width_rate': 1.0 / (page_right - page_left)}

        print("page_margin ", page_margin)
        return page_margin;

    def find_single_block_item_by_poz(self, point, key):
        """
        单个元素查找， 误差范围可以大一些， 因为还有关键字的判断。
        """
        px = point[0]
        py = point[1]
        for i in range(len(self.blockItemList_)):
            blockItem = self.blockItemList_[i]
            x = blockItem['x']
            y = blockItem['y']

            if math.sqrt((x - px) ** 2 + (y - py) ** 2) < single_block_dist_sqrt and key == blockItem['text']:
                print("find block [{}] [x={} y={}] ".format(blockItem['text'], x, y))


if __name__ == '__main__':
    blockMapping = BlockMapping('https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json')
    blockMapping.init_block_list_by_page(1)
    blockItem = blockMapping.find_block_item_by_id("553de437-84e8-484b-adda-2247d0e48037")
    print('center: {} , {} '.format(blockItem['x'], blockItem['y']))
    blockMapping.find_single_block_item_by_poz([0.694645, 0.465083], 'Net amount')
    blockMapping.find_single_block_item_by_poz([0.889703, 0.734236], 'GROSS VALUE')
