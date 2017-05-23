#!/bin/bash
tool=/home/chihyang_teng/5.tools/2_tok
workspace=`pwd`
cd $tool
dos2unix $workspace/$1
./tra2b -utf8 -pre $workspace/$1 $workspace/$1.a2b
