#!/usr/bin/env bash
workspace=`pwd`/..
exe=StockHierAvgSamplingConstLookup
#模型文件
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.30436
#测试dev文件的精度
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data/bloomberg.50.clean.pretrained.vec $workspace/data/GSPC.train.clean.csv $workspace/data/GSPC.dev.clean.csv $model
#测试test文件的精度
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data/bloomberg.50.clean.pretrained.vec $workspace/data/GSPC.train.clean.csv $workspace/data/GSPC.test.clean.csv $model
#测试train文件的精度
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data/bloomberg.50.clean.pretrained.vec $workspace/data/GSPC.train.clean.csv $workspace/data/GSPC.train.clean.csv $model
