#!/usr/bin/env bash
workspace=`pwd`/..
exe=StockHierAvgLRP
#也可以使用R2
#exe=StockHierAvgLRPR2
#模型文件
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.30436
#获得dev文件的词的重要性
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data/bloomberg.50.clean.pretrained.vec $workspace/data/GSPC.train.clean.csv $workspace/data/GSPC.dev.clean.csv $model
#获得test文件的词的重要性
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data/bloomberg.50.clean.pretrained.vec $workspace/data/GSPC.train.clean.csv $workspace/data/GSPC.test.clean.csv $model
#获得train文件的词的重要性
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data/bloomberg.50.clean.pretrained.vec $workspace/data/GSPC.train.clean.csv $workspace/data/GSPC.train.clean.csv $model
