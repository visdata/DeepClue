#!/bin/bash
#./a2b.sh GSPC.train.csv
#./a2b.sh GSPC.dev.csv
#./a2b.sh GSPC.test.csv
#python clean.py GSPC.train.csv.a2b GSPC.train.clean.csv2
#python clean.py GSPC.dev.csv.a2b GSPC.dev.clean.csv2
#python clean.py GSPC.test.csv.a2b GSPC.test.clean.csv2

#python clean.py GSPC.train.csv.a2b GSPC.train.clean.csv3
#python clean.py GSPC.dev.csv.a2b GSPC.dev.clean.csv3
#python clean.py GSPC.test.csv.a2b GSPC.test.clean.csv3

#python clean.py GSPC.train.csv.a2b GSPC.train.clean.csv4 &
#python clean.py GSPC.dev.csv.a2b GSPC.dev.clean.csv4 &
#python clean.py GSPC.test.csv.a2b GSPC.test.clean.csv4 &

#python clean.py GSPC.train.csv.a2b GSPC.train.clean.csv5 &
#python clean.py GSPC.dev.csv.a2b GSPC.dev.clean.csv5 &
#python clean.py GSPC.test.csv.a2b GSPC.test.clean.csv5 &

#python clean.py GSPC.train.csv.a2b GSPC.train.clean.csv6 &
#python clean.py GSPC.dev.csv.a2b GSPC.dev.clean.csv6 &
#python clean.py GSPC.test.csv.a2b GSPC.test.clean.csv6 &

#python clean.py GSPC.train.csv.a2b GSPC.train.clean.csv7 &
#python clean.py GSPC.dev.csv.a2b GSPC.dev.clean.csv7 &
#python clean.py GSPC.test.csv.a2b GSPC.test.clean.csv7 &

run_clean(){
    python clean$1.py GSPC.train.csv.a2b GSPC.train.clean.csv$1 &
    python clean$1.py GSPC.dev.csv.a2b GSPC.dev.clean.csv$1 &
    python clean$1.py GSPC.test.csv.a2b GSPC.test.clean.csv$1 &
    wait
}

#run_clean 9
run_clean 10
