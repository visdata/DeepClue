#!/usr/bin/env bash
outputdir=../6.b+r.titles.tdt
inputdir=../3.b+r
mkdir -p $outputdir
rm $outputdir/* -f
python split_and_replace_by_tdt.py $inputdir/b+r.titles.fmt.sorted.tok $outputdir
#python collect_statistics.py $outputdir/b+r.titles.train 1>$outputdir/b+r.train.stat 2>&1
#python collect_statistics.py $outputdir/b+r.titles.dev 1>$outputdir/b+r.dev.stat 2>&1
#python collect_statistics.py $outputdir/b+r.titles.test 1>$outputdir/b+r.test.stat 2>&1
