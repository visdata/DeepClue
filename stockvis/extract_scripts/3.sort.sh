#!/usr/bin/env bash
outputdir=../3.b+r
mkdir $outputdir -p
rm $outputdir/* -f
cat ../1.bloomberg_titles+company/bloomberg.all.titles.fmt ../1.reuters_titles+company/reuters.all.titles.fmt >> $outputdir/b+r.titles.fmt
wc -l $outputdir/b+r.titles.fmt
python ./sort_by_time.py $outputdir/b+r.titles.fmt $outputdir/b+r.titles.fmt.sorted
