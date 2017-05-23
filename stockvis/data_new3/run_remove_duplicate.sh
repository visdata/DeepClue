#!/bin/bash

run_clean(){
    echo "Train"
    python ./remove_duplicates.py GSPC.train.clean.csv$1 GSPC.train.clean.csv$1.unique1 
    echo "DEV"
    python ./remove_duplicates.py GSPC.dev.clean.csv$1 GSPC.dev.clean.csv$1.unique1 
    echo "Test"
    python ./remove_duplicates.py GSPC.test.clean.csv$1 GSPC.test.clean.csv$1.unique1 
}

#run_clean 9
run_clean 10
