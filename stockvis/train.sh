#!/usr/bin/env bash
workspace=`pwd`/..
outputdir=../const_lookup
mkdir -p $outputdir

#gdb --args ../cnn/stock_vis/StockHierAvgSamplingConstLookup3 $outputdir/GSPC.tok $workspace/data_new/bloomberg.50.clean.pretrained.vec $workspace/data_new/GSPC.train.clean.csv $workspace/data_new/GSPC.dev.clean.csv
#../cnn/stock_vis/StockHierAvgSamplingConstLookup3 $outputdir/GSPC.tok $workspace/data_new/bloomberg.50.clean.pretrained.vec $workspace/data_new/GSPC.train.clean.csv $workspace/data_new/GSPC.dev.clean.csv

#../cnn/stock_vis/StockHierAvgSamplingConstLookupTfIdf $outputdir/GSPC.tok $workspace/data_new/bloomberg.50.clean.pretrained.vec $workspace/data_new/GSPC.train.clean.csv $workspace/data_new/GSPC.dev.clean.csv

##data2
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdf $outputdir/GSPC.tok $workspace/data_new2/bloomberg.50.clean.pretrained.vec $workspace/data_new2/GSPC.train.clean.csv $workspace/data_new2/GSPC.dev.clean.csv
##add conv over title reps
../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok /home/wangl/FinanceVis/model/stock_prediction_model/news.word.vec $workspace/data_new2/GSPC.train.clean.csv $workspace/data_new2/GSPC.dev.clean.csv
