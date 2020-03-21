import boto3
import json
import decimal
import uuid
import time
import os
from boto3.dynamodb.conditions import Key


# set environment variable
TABLE_FIELD_NAME = os.environ['TABLE_FIELD_NAME']
TABLE_TEMPLATE_NAME = os.environ['TABLE_TEMPLATE_NAME']


# Helper class to convert a DynamoDB item to JSON.
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)


def insert_template(item):
    """
    插入单条数据
    :param item:
    :return:
    """
    print("insert item: ", item)
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_TEMPLATE_NAME)
    table.put_item(Item=item)


def insert_batch_item(item_list):
    """
    批量插入数据
    :param item_list:
    :return:
    """

    print("insert batch item length: ", len(item_list))
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_TEMPLATE_NAME)
    with table.batch_writer() as batch:
        for item in item_list:
            batch.put_item(
                Item=item
            )


def query_item(id):
    """
    单条数据
    :param id:
    :return:
    """

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_TEMPLATE_NAME)
    response = table.query(
        KeyConditionExpression=Key('id').eq(id)
    )
    # print(response['Items'])
    return response['Items']


def create_ocr_template(item):

    item['id'] = str(uuid.uuid4())
    item['create_time'] = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))


    print(item)

    # insert_template(item)





def parse_cmd(data_str):
    data = json.loads(data_str)
    print(data)
    pass

if __name__ == "__main__":

    event_data_str = """
    {"statusCode":200,"data":{"cmd":"save_template","data":{"template":{"name":"test","data_url":"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json"},"fields":[{"pageNo":1,"business_field":"1","value_block":{"id":"9d98c083-b455-45cc-8e7b-fcb5dede6353","text":"Shipping date:29/04/2019","x":0.7963207089837498,"y":0.20006458345594283},"key_block":{"id":"32e233ea-79ef-4edc-9da3-878138045aeb","text":"Order date:25/04/2019","x":0.789398289780408,"y":0.21329643103161344},"pre_label_text":""},{"pageNo":1,"business_field":"2","value_block":{"id":"f64653b0-5413-4441-9595-7c8b895c40bf","text":"Fisca representative:PROCTE & GAMBLE RSC REGIONALIS","x":0.22445098171824784,"y":0.1771084084199439},"key_block":{"id":"b4c5f1c3-5641-4ea5-b982-e54d43766a97","text":"SZOLGALTATO KFT","x":0.13750197349400645,"y":0.19057372655160465},"pre_label_text":""}]}}}
    """
    parse_cmd(event_data_str)
    # item = {}
    # item['name'] = 'name'
    # item['url'] = 'url'
    #
    #
    # item['fields'] = str({'x':1.4, 'y':2.5, 'label':'name'})
    #
    # create_ocr_template(item)
    #



    print()
