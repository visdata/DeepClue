#!/usr/bin/env bash
codes="GSPC WMT GOOG BA NKE QCOM APA SBUX AVP V SYMC HSY MAT ACT GCI SNDK"
#codes=`cat ./snp500/snp500.code`
echo $codes
#codes="GOOGL"
codes="GSPC"
inputdir=../6.b+r.titles.tdt/
model=all
model=15
outputdir="../7.b+r.titles.dateoff.add_price.${model}"
mkdir -p $outputdir
rm $outputdir/* -f

function add_price
{
    code=$1
    #price_file=`echo "$code" | tr 'A-Z' 'a-z'`
    price_file=$code
    #python add_yesterday_titles_to_price.py ../price/prices_add_yesterday/${price_file}.price.add_yesterday $inputdir/b+r.titles.test $outputdir/${code}.test.add_price $code 1>$outputdir/${code}.test.log 2>&1 &
    #python add_yesterday_titles_to_price.py ../price/prices_add_yesterday/${price_file}.price.add_yesterday $inputdir/b+r.titles.dev $outputdir/${code}.dev.add_price $code 1>$outputdir/${code}.dev.log 2>&1  &
    #python add_yesterday_titles_to_price.py ../price/prices_add_yesterday/${price_file}.price.add_yesterday $inputdir/b+r.titles.train $outputdir/${code}.train.add_price $code 1>$outputdir/${code}.train.log 2>&1  &
    python add_titles_to_price.py ../price/prices/${price_file}.history.price.csv1 $inputdir/b+r.titles.test $outputdir/${code}.test.add_price $code 1>$outputdir/${code}.test.log 2>&1 &
    python add_titles_to_price.py ../price/prices/${price_file}.history.price.csv1 $inputdir/b+r.titles.dev $outputdir/${code}.dev.add_price $code 1>$outputdir/${code}.dev.log 2>&1  &
    python add_titles_to_price.py ../price/prices/${price_file}.history.price.csv1 $inputdir/b+r.titles.train $outputdir/${code}.train.add_price $code 1>$outputdir/${code}.train.log 2>&1  &
}
i=0
for code in $codes; do 
    echo $code
    let 'i=i+1'
    echo $i
    add_price $code
    if [ $i == 5 ] 
    then
        let 'i=0'
        wait
    fi
done
wait
