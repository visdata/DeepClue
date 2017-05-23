#!/usr/bin/env bash
workspace=`pwd`/..
exe=StockHierAvgSamplingFinetuneTfIdfResReg
#model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.29434
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.7057
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.11500
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.1286
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.1686
#csv2
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.18913
#csv3
#model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.20814
#csv4,8
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.30792
#csv5,9
#model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.31811
#csv6,10
#model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.31812
#csv7,11
#model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.2754
#csv8,12
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.4906
#测试dev文件的精度
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv3 $workspace/data_new3/GSPC.dev.clean.csv3 $model
#测试test文件的精度
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv3 $workspace/data_new3/GSPC.test.clean.csv3 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv2 $workspace/data_new3/GSPC.dev.clean.csv2 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv2 $workspace/data_new3/GSPC.test.clean.csv2 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv4 $workspace/data_new3/GSPC.dev.clean.csv4 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv4 $workspace/data_new3/GSPC.test.clean.csv4 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv5 $workspace/data_new3/GSPC.dev.clean.csv5 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv5 $workspace/data_new3/GSPC.test.clean.csv5 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv6 $workspace/data_new3/GSPC.dev.clean.csv6 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv6 $workspace/data_new3/GSPC.test.clean.csv6 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv7 $workspace/data_new3/GSPC.dev.clean.csv7 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv7 $workspace/data_new3/GSPC.test.clean.csv7 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv8 $workspace/data_new3/GSPC.dev.clean.csv8 $model
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv8 $workspace/data_new3/GSPC.test.clean.csv8 $model
test_csv(){
model=$1
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv$2 $workspace/data_new3/GSPC.train.clean.csv$2 $model
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv$2 $workspace/data_new3/GSPC.dev.clean.csv$2 $model
../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv$2 $workspace/data_new3/GSPC.test.clean.csv$2 $model
}
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.8063
#test_csv $model 9
#csv8,12
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.4906
#test_csv $model 8
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.24705
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.30022
test_csv $model 8
#测试test文件的精度
#测试train文件的精度
#../cnn/stock_vis/$exe $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv3 $workspace/data_new3/GSPC.train.clean.csv3 $model
