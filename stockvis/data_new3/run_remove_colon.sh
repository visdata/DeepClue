#!/bin/bash

run_clean(){
    echo "Train"
    python ./remove_colon.py GSPC.train.clean.csv$1.unique1 GSPC.train.clean.csv$1.unique1.colon
    echo "DEV"
    python ./remove_colon.py GSPC.dev.clean.csv$1.unique1 GSPC.dev.clean.csv$1.unique1.colon
    echo "Test"
    python ./remove_colon.py GSPC.test.clean.csv$1.unique1 GSPC.test.clean.csv$1.unique1.colon
}

#run_clean 9
run_clean 10
