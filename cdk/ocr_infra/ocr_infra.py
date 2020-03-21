from aws_cdk import (
    core,
    aws_lambda,
    aws_dynamodb,
    aws_apigateway,
)

TABLE_TEMPLATE_NAME = "ocr_template"
TABLE_FIELD_NAME = "ocr_field"

class OcrInfraStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # create dynamo table
        template_table = aws_dynamodb.Table(
            self, TABLE_TEMPLATE_NAME, table_name=TABLE_TEMPLATE_NAME,
            billing_mode=aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=core.RemovalPolicy.DESTROY, #开发阶段设置为 DESTROY， 正式环境设置为.RETAIN
            partition_key=aws_dynamodb.Attribute(
                name="template_type",
                type=aws_dynamodb.AttributeType.STRING
            ),
            sort_key=aws_dynamodb.Attribute(
                name='create_time',
                type=aws_dynamodb.AttributeType.STRING
            )
        )

        field_table = aws_dynamodb.Table(
            self, TABLE_FIELD_NAME, table_name=TABLE_FIELD_NAME,
            billing_mode=aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=core.RemovalPolicy.DESTROY, #开发阶段设置为 DESTROY， 正式环境设置为.RETAIN
            partition_key=aws_dynamodb.Attribute(
                name="template_id",
                type=aws_dynamodb.AttributeType.STRING
            ),
            sort_key=aws_dynamodb.Attribute(
                name='business_field',
                type=aws_dynamodb.AttributeType.STRING
            )
        )

        # create producer lambda function
        producer_lambda = aws_lambda.Function(self, "producer_lambda_function",
                                              function_name="OcrData",
                                              runtime=aws_lambda.Runtime.PYTHON_3_6,
                                              handler="lambda_function.lambda_handler",
                                              code=aws_lambda.Code.asset("./lambda/producer"))
        producer_lambda.add_environment("TABLE_TEMPLATE_NAME", template_table.table_name)
        producer_lambda.add_environment("TABLE_FIELD_NAME", field_table.table_name)
        template_table.grant_read_write_data(producer_lambda)
        field_table.grant_read_write_data(producer_lambda)

        # ---------------------api-gateway  GET -------------------- #

        integration_responses = [{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                }
            }]
        method_responses = [{
            'statusCode': '200',
            'responseParameters': {
                'method.response.header.Access-Control-Allow-Origin': True,
            }
        }]

        producer_api = aws_apigateway.RestApi(self, 'OcrApi',
                                              endpoint_types=[aws_apigateway.EndpointType.REGIONAL],
                                              rest_api_name='OcrApi')

        method_post_data = "ocr"
        producer_entity = producer_api.root.add_resource(method_post_data)
        producer_entity_lambda_integration = aws_apigateway.LambdaIntegration(producer_lambda, proxy=False,
            integration_responses=integration_responses)

        producer_entity.add_method('POST', producer_entity_lambda_integration,
            method_responses=method_responses)

        core.CfnOutput(self, "OCR-Data", value=producer_api.url+method_post_data,
                       description="ocr url")
        self.add_cors_options(producer_entity)




    def add_cors_options(self, apigw_resource):
        apigw_resource.add_method('OPTIONS', aws_apigateway.MockIntegration(
            integration_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'"
                }
            }
            ],
            passthrough_behavior=aws_apigateway.PassthroughBehavior.WHEN_NO_MATCH,
            request_templates={"application/json":"{\"statusCode\":200}"}
        ),
                  method_responses=[{
                      'statusCode': '200',
                      'responseParameters': {
                          'method.response.header.Access-Control-Allow-Headers': True,
                          'method.response.header.Access-Control-Allow-Methods': True,
                          'method.response.header.Access-Control-Allow-Origin': True,
                      }
                  }
            ],
        )
