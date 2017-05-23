#!/usr/bin/env bash
workspace=`pwd`/..
outputdir=../const_lookup
mkdir -p $outputdir

../cnn/stock_vis/StockHierAvgSamplingConstLookup $outputdir/GSPC.tok $workspace/data/bloomberg.50.clean.pretrained.vec $workspace/data/GSPC.train.clean.csv $workspace/data/GSPC.dev.clean.csv
