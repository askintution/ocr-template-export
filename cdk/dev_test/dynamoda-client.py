import boto3
import json
import decimal
from boto3.dynamodb.conditions import Key

TABLE_NAME = "ocr_template"



def insert_item(item):
    """
    插入单条数据
    :param item:
    :return:
    """
    print("insert item: ", item)
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_NAME)
    table.put_item(Item=item)


def insert_batch_item(item_list):
    """
    批量插入数据
    :param item_list:
    :return:
    """

    print("insert batch item length: ", len(item_list))
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_NAME)
    with table.batch_writer() as batch:
        for item in item_list:
            batch.put_item(
                Item=item
            )


def query_item(id):
    """
    单条数据
    :param user_id:
    :return:
    """

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_NAME)
    response = table.query(
        KeyConditionExpression=Key('id').eq(id)
    )
    # print(response['Items'])
    return response['Items']



if __name__ == "__main__":

    item = {}
    item['id'] = 'id'
    item['name'] = 'name'
    item['create-time'] = 'create-time'
    item['url'] = 'url'

    insert_item(item)


    # create_db()
    # insert_item()
    # get_item()

    # result = query_item(1)
    # json_str = ""
    # if result is None:
    #     print(" No results.")
    # else:
    #     print("data length: ", len(result))
    #     json_str = json.dumps(result, cls=DecimalEncoder)
    #
    print()
