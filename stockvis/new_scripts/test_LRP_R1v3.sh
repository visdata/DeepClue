#!/bin/bash

#gdb --args 
model=../const_lookup/GSPC.tok.hier.avg_50_64_0.5_pid.30353
../cnn/stock_vis/StockHierAvgLRPR1v3 ../const_lookup/GSPC.tok /home/chihyang_teng/2.research/tweet_stock/stockvis_bb2/new_scripts/../data_new3/bloomberg.50.clean.pretrained.vec /home/chihyang_teng/2.research/tweet_stock/stockvis_bb2/new_scripts/../data_new3/GSPC.train.clean.csv8 /home/chihyang_teng/2.research/tweet_stock/stockvis_bb2/new_scripts/../data_new3/GSPC.dev.clean.csv8 $model
