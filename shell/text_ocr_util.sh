export PYTHONPATH=./

python ./source/text_ocr_util.py \
--input_dir='./temp/' \
--output_dir='./target/' \
--prefix_s3='ocr_ouput' \
--global_s3_name='dikers.nwcd' \
--global_profile_name='g' \
--cn_s3_name='dikers-html' \
--cn_profile_name='default' \
--prefix_s3='ocr_output/'
