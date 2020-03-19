from aws_cdk import (
    core,
    aws_lambda,
    aws_dynamodb,
    aws_apigateway,
)


class OcrInfraStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # create dynamo table
        demo_table = aws_dynamodb.Table(
            self, "ocr_template", table_name="ocr_template",
            billing_mode=aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=core.RemovalPolicy.DESTROY, #开发阶段设置为 DESTROY， 正式环境设置为.RETAIN
            partition_key=aws_dynamodb.Attribute(
                name="id",
                type=aws_dynamodb.AttributeType.STRING
            )
        )

        # create producer lambda function
        producer_lambda = aws_lambda.Function(self, "producer_lambda_function",
                                              function_name="OcrAddTemplate",
                                              runtime=aws_lambda.Runtime.PYTHON_3_6,
                                              handler="lambda_function.lambda_handler",
                                              code=aws_lambda.Code.asset("./lambda/producer"))
        producer_lambda.add_environment("TABLE_NAME", demo_table.table_name)
        demo_table.grant_write_data(producer_lambda)



        # create consumer lambda function
        consumer_lambda = aws_lambda.Function(self, "consumer_lambda_function",
                                              function_name="OcrGetAllTemplates",
                                              runtime=aws_lambda.Runtime.PYTHON_3_6,
                                              handler="lambda_function.lambda_handler",
                                              code=aws_lambda.Code.asset("./lambda/consumer"))
        consumer_lambda.add_environment("TABLE_NAME", demo_table.table_name)
        demo_table.grant_read_data(consumer_lambda)


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


        consumer_api = aws_apigateway.RestApi(self, 'OcrGetTemplates',
                                    endpoint_types=[aws_apigateway.EndpointType.REGIONAL],
                                    rest_api_name='OcrGetTemplates')

        method_templates = "templates"
        consumer_entity = consumer_api.root.add_resource(method_templates)
        consumer_entity_lambda_integration = aws_apigateway.LambdaIntegration(consumer_lambda, proxy=False,
            integration_responses=integration_responses)

        consumer_entity.add_method('GET', consumer_entity_lambda_integration,
            method_responses= method_responses)



        producer_api = aws_apigateway.RestApi(self, 'OcrAddTemplate',
                                              endpoint_types=[aws_apigateway.EndpointType.REGIONAL],
                                              rest_api_name='OcrAddTemplate')

        method_add_template = "addTemplate"
        producer_entity = producer_api.root.add_resource(method_add_template)
        producer_entity_lambda_integration = aws_apigateway.LambdaIntegration(producer_lambda, proxy=False,
            integration_responses=integration_responses)

        producer_entity.add_method('POST', producer_entity_lambda_integration,
            method_responses=method_responses)

        core.CfnOutput(self, "Get-All-Templates", value=consumer_api.url+method_templates,
                       description="Get all template url")
        core.CfnOutput(self, "Add-Template", value=producer_api.url+method_add_template,
                       description="Add template url")
        self.add_cors_options(consumer_entity)
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