#!/bin/bash

run_clean(){
    echo "Train"
    data=train
    python ./remove_duplicates.py GSPC.${data}.clean.csv$1.unique1.colon GSPC.${data}.clean.csv$1.unique2.colon
    echo "DEV"
    data=dev
    python ./remove_duplicates.py GSPC.${data}.clean.csv$1.unique1.colon GSPC.${data}.clean.csv$1.unique2.colon
    echo "Test"
    data=test
    python ./remove_duplicates.py GSPC.${data}.clean.csv$1.unique1.colon GSPC.${data}.clean.csv$1.unique2.colon
}

#run_clean 9
run_clean 10
