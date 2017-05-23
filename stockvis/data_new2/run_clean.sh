#!/bin/bash
./a2b.sh GSPC.train.csv
./a2b.sh GSPC.dev.csv
./a2b.sh GSPC.test.csv
python clean.py GSPC.train.csv.a2b GSPC.train.clean.csv
python clean.py GSPC.dev.csv.a2b GSPC.dev.clean.csv
python clean.py GSPC.test.csv.a2b GSPC.test.clean.csv
