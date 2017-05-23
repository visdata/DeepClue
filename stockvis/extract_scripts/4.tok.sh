#!/usr/bin/env bash
tokdir=/home/ji_ma/tzy/1.softwares/2_tok
workspace=`pwd`
inputdir=../3.b+r
echo $workspace
python ./separate_title.py $inputdir/b+r.titles.fmt.sorted $inputdir/b+r.titles.fmt.sorted.title.only
cd $tokdir
./tok.sh $workspace/$inputdir/b+r.titles.fmt.sorted.title.only $workspace/$inputdir/b+r.titles.fmt.sorted.title.only.tok 5
cd $workspace
python combine_tok_title.py $inputdir/b+r.titles.fmt.sorted $inputdir/b+r.titles.fmt.sorted.title.only.tok $inputdir/b+r.titles.fmt.sorted.tok
#rm b+r/b+r.titles.fmt.sorted.title.only
