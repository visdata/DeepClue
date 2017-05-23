#!/usr/bin/env bash
workspace=`pwd`/..
exe=StockHierAvgSamplingFinetuneTfIdfResReg
#model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.29434
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.7057
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.1354
#测试dev文件的精度
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv $workspace/data_new3/GSPC.dev.clean.csv $model
#测试test文件的精度
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv $workspace/data_new3/GSPC.test.clean.csv $model
#测试train文件的精度
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv $workspace/data_new3/GSPC.train.clean.csv $model
