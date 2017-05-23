#!/bin/bash
#codes=`cat snp500.code`
codes='^GSPC'
for code in $codes ; do 
echo $code
echo -ne '\n' | wget -O $code.history.price.csv http://real-chart.finance.yahoo.com/table.csv?s=$code&a=9&b=20&c=2006&d=10&e=4&f=2015&g=d&ignore=.csv &
done
wait
echo "done"
