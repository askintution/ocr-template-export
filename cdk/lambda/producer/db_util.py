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


def __insert_template(dynamodb, template):


    """
    插入单条数据
    :param item:
    :return:
    """
    print("insert item: ", template)
    TABLE_TEMPLATE_NAME = os.environ['TABLE_TEMPLATE_NAME']
    table = dynamodb.Table(TABLE_TEMPLATE_NAME)
    return table.put_item(Item=template)

def __insert_batch_item(dynamodb, item_list):
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


def __save_template(data):
    # print('[message] save_template', data)


    dynamodb = boto3.resource('dynamodb')

    template = data['template']
    template['id'] = str(uuid.uuid4())
    template['create_time'] = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))
    # result = __insert_template(dynamodb, template)
    # print('insert template:  {} '.format(result))

    fields = data['fields']
    item_list = []
    for i in range(len(fields)):

        key_block = "null"
        pre_label_text = "null"

        if len(fields[i]['pre_label_text']) > 0:
            pre_label_text = fields[i]['pre_label_text']

        if len(fields[i]['key_block']) > 0:
            key_block = str(fields[i]['key_block'])

        item = {'template_id': template['id'],
                'page_no': fields[i]['page_no'],
                'business_field': fields[i]['business_field'],
                'pre_label_text': pre_label_text,
                'value_block': str(fields[i]['value_block']),
                'key_block': key_block
                }
        item_list.append(item)
        print(item)

    # print('item_list: ', item_list)
    __insert_batch_item(dynamodb, item_list)




def parse_cmd(data_str):
    data = json.loads(data_str)

    if data['statusCode'] != 200:
        print("  ", data['statusCode'])

    cmd = data['data']['cmd']
    print('request cmd [{}] '.format(cmd))

    if cmd == "save_template":
        __save_template(data['data']['data'])



if __name__ == "__main__":

    # TABLE_TEMPLATE_NAME = "ocr_template"
    # TABLE_FIELD_NAME = "ocr_field"

    os.environ['TABLE_TEMPLATE_NAME'] = "ocr_template"
    os.environ['TABLE_FIELD_NAME'] = "ocr_field"
    event_data_str = """
    {"statusCode":200,"data":{"cmd":"save_template","data":{"template":{"name":"template name 1","data_url":"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json"},"fields":[{"page_no":1,"business_field":"name1","value_block":{"id":"68a949a8-e535-43ed-8f73-8bfe67bfc7f0","text":"0.00","x":0.8367107462426557,"y":0.48605173006936564},"key_block":{"id":"e928e3a9-418e-4505-9492-6d3ccc7ba749","text":"VAT (Amount)","x":0.8154069130831243,"y":0.46397960190424054},"pre_label_text":""},{"page_no":1,"business_field":"name2","value_block":{"id":"9f82f7f1-43b4-4e3c-837e-4cabbc2b8059","text":"0.00","x":0.7764124344024748,"y":0.4871740387774248},"key_block":{"id":"7dfb5bb6-bf57-4cb7-b110-ad8ed9a23ff4","text":"VAT (%)","x":0.7547293040529255,"y":0.4650002469859016},"pre_label_text":""},{"page_no":1,"business_field":"name3","value_block":{"id":"6550d2ac-7a26-453a-ae3a-1e95dcf587ff","text":"1/1","x":0.7667044917658339,"y":0.15878699649989494},"key_block":"","pre_label_text":"Page: "}]}}}
    """
    parse_cmd(event_data_str)