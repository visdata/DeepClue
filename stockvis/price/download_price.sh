#!/bin/bash
#codes=`cat snp500.code`
codes='GCI'
for code in $codes ; do 
echo $code
echo -ne '\n' | wget -O prices/$code.history.price.csv http://real-chart.finance.yahoo.com/table.csv?s=$code&d=7&e=19&f=2015&g=d&a=7&b=25&c=1972&ignore=.csv &
done
wait
echo "done"
