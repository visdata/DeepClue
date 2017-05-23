#!/usr/bin/env bash
inputdir=../3.b+r
outputdir=../6.b+r.titles.by.company
python ./split_by_company_name.py $inputdir/b+r.titles.fmt.sorted.tok $outputdir
