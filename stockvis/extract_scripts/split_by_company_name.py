#!/usr/bin/env python

import sys
import traceback
import os

if len(sys.argv)!= 3:
    print 'Usage: %s input output_dir' % sys.argv[0]
    sys.exit(0)
if not os.path.exists(sys.argv[2]):
    os.mkdir(sys.argv[2])
title_files = []
code_index = {}
def loadSNP():
    code_input = open("../snp500/snp500.name.aug.5","r")
    code_list = [ code.strip().split("|||") for code in code_input ]
    for i in range(len(code_list)):
        code_name = code_list[i][0].strip() 
        output_file = open(sys.argv[2]+"/"+code_name.lower(), "w")
        code_index[code_name] = i
        title_files.append(output_file)
loadSNP()

#print sys.argv[1]
input_file = open(sys.argv[1],"r")
for line in input_file:
    items = line.strip().split("|||")
    codes = items[2].strip().split()
    for code in codes:
        index = code_index[code]
        output_file = title_files[index]
        output_file.write(line)


