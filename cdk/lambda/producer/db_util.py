import boto3
import json
import decimal
import uuid
import time
import os
from boto3.dynamodb.conditions import Key

# Helper class to convert a DynamoDB item to JSON.
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)


class DatabaseUtil:

    def __init__(self):
        pass

    def __insert_template(self, dynamodb, template):
        print("insert item: ", template)
        TABLE_TEMPLATE_NAME = os.environ['TABLE_TEMPLATE_NAME']
        table = dynamodb.Table(TABLE_TEMPLATE_NAME)
        return table.put_item(Item=template)

    def __insert_batch_item(self, dynamodb, item_list):
        """
        批量插入数据
        :param item_list:
        :return:
        """
        TABLE_FIELD_NAME = os.environ['TABLE_FIELD_NAME']
        print("insert batch item length: ", len(item_list))
        table = dynamodb.Table(TABLE_FIELD_NAME)
        with table.batch_writer() as batch:
            for item in item_list:
                batch.put_item(
                    Item=item
                )

    def save_template(self, data):
        # print('[message] save_template', data)


        dynamodb = boto3.resource('dynamodb')

        template = data['template']
        template['id'] = str(uuid.uuid4())
        template['create_time'] = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))
        template['location_items'] = json.dumps(template['location_items'])
        result = self.__insert_template(dynamodb, template)
        print('insert template:  {} '.format(result))

        fields = data['fields']
        item_list = []
        for i in range(len(fields)):

            key_block = "null"
            pre_label_text = "null"

            if len(fields[i]['pre_label_text']) > 0:
                pre_label_text = fields[i]['pre_label_text']

            if len(fields[i]['key_block']) > 0:
                key_block = json.dumps(fields[i]['key_block'])

            item = {'template_id': template['id'],
                    'page_no': fields[i]['page_no'],
                    'business_field': fields[i]['business_field'],
                    'pre_label_text': pre_label_text,
                    'value_block': json.dumps(fields[i]['value_block']),
                    'key_block': key_block
                    }
            item_list.append(item)
            print(item)

        # print('item_list: ', item_list)
        self.__insert_batch_item(dynamodb, item_list)

    def query_field_list(self, template_id):
        """
        单条数据
        :param template_id: 模板Id
        :return:
        """

        dynamodb = boto3.resource('dynamodb')
        TABLE_FIELD_NAME = os.environ['TABLE_FIELD_NAME']
        table = dynamodb.Table(TABLE_FIELD_NAME)
        response = table.query(
            KeyConditionExpression=Key('template_id').eq(template_id)
        )
        items = json.loads(json.dumps(response['Items'], indent=4, cls=DecimalEncoder))
        new_item_list = []

        for i in range(len(items)):
            items[i]['value_block'] = json.loads(items[i]['value_block'])

            if items[i]['pre_label_text'] == 'null':
                items[i]['pre_label_text'] = ''

            if items[i]['key_block'] == 'null':
                items[i]['key_block'] = ''
            else:
                print(type(items[i]['key_block']), '  ****   ', json.loads(items[i]['key_block']))
                items[i]['key_block'] = json.loads(items[i]['key_block'])
            new_item_list.append(items[i])

        print(json.dumps(new_item_list))
        return new_item_list





if __name__ == "__main__":


    os.environ['TABLE_TEMPLATE_NAME'] = "ocr_template"
    os.environ['TABLE_FIELD_NAME'] = "ocr_field"
    # event_data_str = """
    # {"cmd":"save_template","data":{"template":{"name":"template","data_url":"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json","location_items":[{"label_text":"","x":0.8367107462426557,"y":0.8367107462426557,"block_type":0},{"label_text":"","x":0.9035254228743501,"y":0.9035254228743501,"block_type":0}]},"fields":[{"page_no":1,"business_field":"name1","value_block":{"id":"68a949a8-e535-43ed-8f73-8bfe67bfc7f0","text":"0.00","x":0.8367107462426557,"y":0.48605173006936564},"key_block":{"id":"e928e3a9-418e-4505-9492-6d3ccc7ba749","text":"VAT (Amount)","x":0.8154069130831243,"y":0.46397960190424054},"pre_label_text":""},{"page_no":1,"business_field":"name2","value_block":{"id":"553de437-84e8-484b-adda-2247d0e48037","text":"42,933.28","x":0.9035254228743501,"y":0.48555407046409516},"key_block":{"id":"4f88dfed-7695-43cb-b658-efb2579a8cbe","text":"Payable","x":0.8935547503055022,"y":0.4630681003734991},"pre_label_text":""},{"page_no":1,"business_field":"name3","value_block":{"id":"472bf463-3167-478e-b7e7-65212d0afc20","text":" amount","x":0.6946445632223042,"y":0.4650826940946904},"key_block":"","pre_label_text":"Net"},{"page_no":1,"business_field":"name4","value_block":{"id":"32e233ea-79ef-4edc-9da3-878138045aeb","text":"date:25/04/2019","x":0.789398289780408,"y":0.21329643103161344},"key_block":{"id":"9d98c083-b455-45cc-8e7b-fcb5dede6353","text":"Shipping date:29/04/2019","x":0.7963207089837498,"y":0.20006458345594283},"pre_label_text":"Order "}]}}
    # """
    #
    # data = json.loads(event_data_str)
    # cmd = data['cmd']
    # print('request cmd [{}] '.format(cmd))
    #
    #
    # if cmd == "save_template":
    #     databaseUtil = DatabaseUtil()
    #     databaseUtil.save_template(data['data'])


    databaseUtil = DatabaseUtil()
    field_list = databaseUtil.query_field_list('001c28b8-3daf-49b3-af8c-7490404700ca')

    print(field_list)

    for i in range(len(field_list)):
        field = field_list[i]

        print(type(field['key_block']))

        if type(field['key_block']) is dict:
            print(field['key_block']['x'], field['key_block']['y'])


