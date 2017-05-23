#!/bin/bash
model=all
model=GSPC
output_dir=../8.open_close.${model}.examples
inputdir=../7.b+r.titles.dateoff.add_price.15/
mkdir -p $output_dir
rm -f $output_dir/*
python ./make_feedall_examples.py $inputdir/${model}.test.add_price.filter $output_dir/${model}.test.csv &
python ./make_feedall_examples.py $inputdir/${model}.dev.add_price.filter $output_dir/${model}.dev.csv &
python ./make_feedall_examples.py $inputdir/${model}.train.add_price.filter $output_dir/${model}.train.csv &
wait
