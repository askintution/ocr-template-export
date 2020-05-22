export PYTHONPATH=./

python ./source/text_ocr_util.py \
--input_dir='./temp/' \
--output_dir='./target/' \
--prefix_s3='ocr_ouput' \
--global_s3_name='your_global_bucket_name' \
--global_profile_name='your_global_profile_name' \
--cn_s3_name='your_cn_s3_name' \
--cn_profile_name='your_cn_profile_name'
