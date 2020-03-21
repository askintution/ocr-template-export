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
        database.query_field_list(event['template_id'])

    return {
        'statusCode': 200,
        'data': event
    }


if __name__ == "__main__":


    os.environ['TABLE_TEMPLATE_NAME'] = "ocr_template"
    os.environ['TABLE_FIELD_NAME'] = "ocr_field"
    # event_data_str = """
    # {"cmd":"save_template","data":{"template":{"name":"template","data_url":"https://dikers-html.s3.cn-northwest-1.amazonaws.com.cn/data/page7.json","location_items":[{"label_text":"","x":0.8367107462426557,"y":0.8367107462426557,"block_type":0},{"label_text":"","x":0.9035254228743501,"y":0.9035254228743501,"block_type":0}]},"fields":[{"page_no":1,"business_field":"name1","value_block":{"id":"68a949a8-e535-43ed-8f73-8bfe67bfc7f0","text":"0.00","x":0.8367107462426557,"y":0.48605173006936564},"key_block":{"id":"e928e3a9-418e-4505-9492-6d3ccc7ba749","text":"VAT (Amount)","x":0.8154069130831243,"y":0.46397960190424054},"pre_label_text":""},{"page_no":1,"business_field":"name2","value_block":{"id":"553de437-84e8-484b-adda-2247d0e48037","text":"42,933.28","x":0.9035254228743501,"y":0.48555407046409516},"key_block":{"id":"4f88dfed-7695-43cb-b658-efb2579a8cbe","text":"Payable","x":0.8935547503055022,"y":0.4630681003734991},"pre_label_text":""},{"page_no":1,"business_field":"name3","value_block":{"id":"472bf463-3167-478e-b7e7-65212d0afc20","text":" amount","x":0.6946445632223042,"y":0.4650826940946904},"key_block":"","pre_label_text":"Net"},{"page_no":1,"business_field":"name4","value_block":{"id":"32e233ea-79ef-4edc-9da3-878138045aeb","text":"date:25/04/2019","x":0.789398289780408,"y":0.21329643103161344},"key_block":{"id":"9d98c083-b455-45cc-8e7b-fcb5dede6353","text":"Shipping date:29/04/2019","x":0.7963207089837498,"y":0.20006458345594283},"pre_label_text":"Order "}]}}
    # """

    event_data_str = """
    {"cmd":"get_field_list","template_id":"001c28b8-3daf-49b3-af8c-7490404700ca"}
    """

    event = json.loads(event_data_str)
    lambda_handler(event, None)
