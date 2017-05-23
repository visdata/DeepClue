#!/usr/bin/env bash
workspace=`pwd`
modelname=GSPC.tok.hier.avg_300_64_0.5.model2
#modelname=GSPC.tok.hier.avg_300_64_0.5.model1
#./dcnn/stock_vis/StockHierAvg GSPC.tok $workspace/data/GSPC.pretrained.vec data/GSPC.train.csv data/GSPC.dev.csv $modelname
./dcnn/stock_vis/StockHierAvgLRP GSPC.tok $workspace/data/GSPC.pretrained.vec data/GSPC.train.csv data/GSPC.test.csv $modelname
