from __future__ import print_function

import json
import uuid
import decimal
import os
import boto3

from db_util import DatabaseUtil


# Helper class to convert a DynamoDB item to JSON.
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)


# Get the service resource.
dynamodb = boto3.resource('dynamodb')




def lambda_handler(event, context):
    print(event)

    cmd = event['cmd']
    print('request cmd [{}] '.format(cmd))

    if cmd == "save_template":
        database = DatabaseUtil()
        database.save_template(event['data'])
    elif cmd == "get_field_list":
        database = DatabaseUtil()
        data = database.query_field_list(event['template_id'])
        return {'statusCode': 200, 'data': data, 'message': 'OK'}
    elif cmd == "get_template_list":
        database = DatabaseUtil()
        data = database.get_template_list(event['template_type'])
        return {'statusCode': 200, 'data': data, 'message': 'OK'}
    else:
        return {'statusCode': 200, 'data': event, 'message': 'Unknown Command [{}]'.format(cmd)}

    return {
        'statusCode': 200,
        'data': event
    }


if __name__ == "__main__":


    os.environ['TABLE_TEMPLATE_NAME'] = "ocr_template"
    os.environ['TABLE_FIELD_NAME'] = "ocr_field"
    # event_data_str = """
    # {"cmd":"save_template","data":{"template":{"type":"default","name":"template001","data_url":"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json","location_items":"[{\"label_text\": \"\", \"x\": 0.789398289780408, \"y\": 0.789398289780408, \"id\": \"32e233ea-79ef-4edc-9da3-878138045aeb\", \"block_type\": 0}, {\"label_text\": \"\", \"x\": 0.16541290879635187, \"y\": 0.16541290879635187, \"id\": \"9f361962-3af4-4561-b5f0-6c4788671eb8\", \"block_type\": 0}]","id":"d7ac84cd-a5db-4b2e-9b90-26ed027f2002","create_time":"2020-03-21 13:20:04"},"fields":[{"page_no":1,"business_field":"name1","value_block":{"id":"32e233ea-79ef-4edc-9da3-878138045aeb","text":"Order date:25/04/2019","x":0.789398289780408,"y":0.21329643103161344},"key_block":{"id":"9d98c083-b455-45cc-8e7b-fcb5dede6353","text":"Shipping date:29/04/2019","x":0.7963207089837498,"y":0.20006458345594283},"pre_label_text":""},{"page_no":1,"business_field":"name2","value_block":{"id":"9f361962-3af4-4561-b5f0-6c4788671eb8","text":"VAT Registration O.:HU13097596","x":0.16541290879635187,"y":0.21935329224758734},"key_block":{"id":"554ac5b8-db3b-4758-bf3e-330ed8d19764","text":"KISFALUDY UTCA 38., 1082,BUDAPEST, HU","x":0.18607778697529265,"y":0.20454793661699147},"pre_label_text":""},{"page_no":1,"business_field":"name3","value_block":{"id":"6550d2ac-7a26-453a-ae3a-1e95dcf587ff","text":": 1/1","x":0.7667044917658339,"y":0.15878699649989494},"key_block":"","pre_label_text":"Page"},{"page_no":1,"business_field":"name4","value_block":{"id":"553de437-84e8-484b-adda-2247d0e48037","text":",933.28","x":0.9035254228743501,"y":0.48555407046409516},"key_block":{"id":"4f88dfed-7695-43cb-b658-efb2579a8cbe","text":"Payable","x":0.8935547503055022,"y":0.4630681003734991},"pre_label_text":"42"}]}} network.js:26:29
    # """

    # event_data_str = """
    # {"cmd":"get_field_list","template_id":"fe1efd02-64de-4371-8229-89e67cbe86ba"}
    # """

    event_data_str = """
    {"cmd":"get_template_list", "template_type":"default"}
    """


    event = json.loads(event_data_str)
    lambda_handler(event, None)
