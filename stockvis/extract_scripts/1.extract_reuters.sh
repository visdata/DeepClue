#!/bin/bash
datadir=/home/ji_ma/tzy/2.research/tweet_stock/news_title/reuters/retuers_news/ReutersNews106521
outputdir="../1.reuters_titles+company"
mkdir -p $outputdir
rm $outputdir/* -f
datas=`ls "$datadir"`
j=0
for date_dir in $datas; do
    #echo $date_dir
    date_files=`ls $datadir/$date_dir`
    for date_file in $date_files; do
        output_file=$outputdir/$date_file.1
        let j=$j+1
        #python extract_title_date.py $datadir/$date_dir/$date_file $output_file &
        python ./match_company_name2_reuters.py $datadir/$date_dir/$date_file $output_file &
        if [  $j -eq 20 ]; then 
            let 'j=0'
            wait
            files=$(ls $outputdir/*.1 2> /dev/null | wc -l)
            if [ "$files" != "0" ] ; then
                cat $outputdir/*.1 >>$outputdir/reuters.all.titles
                rm $outputdir/*.1 -f
            fi
        fi
    done
done
wait
files=$(ls $outputdir/*.1 2> /dev/null | wc -l)
if [ "$files" != "0" ] ; then
    cat $outputdir/*.1 >>$outputdir/reuters.all.titles
    rm $outputdir/*.1 -f
fi
