#!/usr/bin/env python3

from aws_cdk import core

from ocr_infra.ocr_infra import OcrInfraStack


app = core.App()
OcrInfraStack(app, "OcrInfra")

app.synth()
