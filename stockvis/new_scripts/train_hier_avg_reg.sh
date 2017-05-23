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
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv $workspace/data_new3/GSPC.dev.clean.csv
#clean number
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv2 $workspace/data_new3/GSPC.dev.clean.csv2
#remove len=1 words
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv3 $workspace/data_new3/GSPC.dev.clean.csv3
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv4 $workspace/data_new3/GSPC.dev.clean.csv4
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv5 $workspace/data_new3/GSPC.dev.clean.csv5 1>./appding.reg.finetune.9.lemmanoalpha.log 2>&1 &
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv6 $workspace/data_new3/GSPC.dev.clean.csv6 1>./appding.reg.finetune.10.lammanoalphanostop.log 2>&1 & 
#../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv7 $workspace/data_new3/GSPC.dev.clean.csv7 1>./appding.reg.finetune.11.lammanoalphastop.log 2>&1 & 

train_csv(){
    ../cnn/stock_vis/StockHierAvgSamplingFinetuneTfIdfResReg $outputdir/GSPC.tok $workspace/data_new3/bloomberg.50.clean.pretrained.vec $workspace/data_new3/GSPC.train.clean.csv$1 $workspace/data_new3/GSPC.dev.clean.csv$1 1>./appding.reg.finetune.csv$1.log 2>&1 & 
}

#train_csv 9
train_csv 8
