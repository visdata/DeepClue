#!/bin/bash
datadir=/home/ji_ma/tzy/6.corpus/stock_market/20061020_20131126_bloomberg_news
outputdir="../1.bloomberg_titles+company"
mkdir -p $outputdir
rm $outputdir/* -f
datas=`ls "$datadir"`
for date_dir in $datas; do
    #echo $date_dir
    date_files=`ls $datadir/$date_dir`
    j=0
    for date_file in $date_files; do
        output_file=$outputdir/$date_file.1
        let j=$j+1
        #python extract_title_date.py $datadir/$date_dir/$date_file $output_file &
        python ./match_company_name2.py $datadir/$date_dir/$date_file $output_file &
        if [  $j -eq 10 ]; then 
            let 'j=0'
            wait
            files=$(ls $outputdir/*.1 2> /dev/null | wc -l)
            if [ "$files" != "0" ] ; then
                cat $outputdir/*.1 >>$outputdir/bloomberg.all.titles
                rm $outputdir/*.1 -f
            fi
        fi
    done
    wait
    files=$(ls $outputdir/*.1 2> /dev/null | wc -l)
    if [ "$files" != "0" ] ; then
        cat $outputdir/*.1 >>$outputdir/bloomberg.all.titles
        rm $outputdir/*.1 -f
    fi
done
