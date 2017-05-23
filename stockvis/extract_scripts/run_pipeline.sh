#!/usr/bin/env bash
#./1.extract_reuters.sh
#./1.extract_bloomberg.sh
echo "Step 2"
#./2.run_time_format.sh
#wait
#echo "Step 3"
#./3.sort.sh
#wait
#echo "Step 4"
#./4.tok.sh
#wait
echo "Step 6"
./6.split_by_tdt.sh
wait
echo "Step 7.1"
./7.add_price_all.sh
wait
echo "Step 7.2"
./7.filter_titles.sh
wait
echo "Step 8"
./8.make_examples_all.sh
wait
echo "Finished"

