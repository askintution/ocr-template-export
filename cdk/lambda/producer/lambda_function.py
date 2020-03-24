from __future__ import print_function

import json
import uuid
import decimal
import os
import boto3

from db_util import DatabaseUtil
from block_mapping import BlockMapping


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
    database = DatabaseUtil()

    if cmd == "save_template":
        data = database.save_template(event['data'])
        return {'statusCode': 200, 'data': data, 'message': 'OK'}
    elif cmd == "get_field_list":
        data = database.query_field_list(event['template_id'])
        return {'statusCode': 200, 'data': data, 'message': 'OK'}
    elif cmd == "get_template_list":
        data = database.get_template_list(event['template_type'])
        return {'statusCode': 200, 'data': data, 'message': 'OK'}
    elif cmd == "match_template":

        template_list = database.get_template_list(event['template_type'])
        block_mapping = BlockMapping(event['data_url'])
        template = block_mapping.match_template(template_list)
        print("lambda match_template  {}".format(json.dumps(template)))
        if template is None:
            return {'statusCode': 400, 'data': '', 'message': '没有找到适合的模板'}

        field_list = database.query_field_list(template['id'])
        field_items = block_mapping.export_field_list(template, field_list)
        data = {"template": template, "field_item": field_items}
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
    # {"cmd":"save_template","data":{"template":{"template_type":"default","name":"template005","data_url":"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json","location_items":[{"label_text":"","x":0.9035254228743501,"y":0.9035254228743501,"id":"553de437-84e8-484b-adda-2247d0e48037","block_type":0},{"label_text":"","x":0.6937118976129697,"y":0.6937118976129697,"id":"ea2457f6-edbb-4026-9d10-4c5928349c9c","block_type":0}]},"fields":[{"status":2,"page_no":1,"business_field":"name1","value_block":{"id":"553de437-84e8-484b-adda-2247d0e48037","text":"42,933.28","x":0.9035254228743501,"y":0.48555407046409516},"key_block":{"id":"4f88dfed-7695-43cb-b658-efb2579a8cbe","text":"Payable","x":0.8935547503055022,"y":0.4630681003734991},"pre_label_text":""},{"status":2,"page_no":1,"business_field":"name2","value_block":{"id":"ea2457f6-edbb-4026-9d10-4c5928349c9c","text":"42,933.28","x":0.6937118976129697,"y":0.4886453222403053},"key_block":{"id":"472bf463-3167-478e-b7e7-65212d0afc20","text":"Net amount","x":0.6946445632223042,"y":0.4650826940946904},"pre_label_text":""},{"status":1,"page_no":1,"business_field":"name003","value_block":{"id":"6550d2ac-7a26-453a-ae3a-1e95dcf587ff","text":"Page: 1/1","x":0.7667044917658339,"y":0.15878699649989494},"key_block":"","pre_label_text":"Page"}]}}
    # """

    # event_data_str = """
    # {"cmd":"get_field_list","template_id":"fe1efd02-64de-4371-8229-89e67cbe86ba"}
    # """

    # event_data_str = """
    # {"cmd":"get_template_list", "template_type":"default"}
    # """


    event_data_str = """
    {"cmd":"match_template","template_type":"default",  "data_url":"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json"}
    """

    event = json.loads(event_data_str)
    lambda_handler(event, None)



