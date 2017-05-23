#!/usr/bin/env python

import sys
import traceback

if len(sys.argv)!= 3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)
code_dict = {}
def loadSNP():
    code_file = open("snp500/snp500.name.aug.5","r")
    code_list = [ code.strip().split("|||") for code in code_file ]
    for i in range(len(code_list)):
        code_name = code_list[i][0].strip() 
        for j in range(1, len(code_list[i])):
            code_dict[code_list[i][j].strip()] = code_name
loadSNP()

#print sys.argv[1]
input_file = open(sys.argv[1],"r")
title=""
try:
    title = input_file.next().strip()
    assert title.find("--") == 0
except:
    print "[title]:",title
    sys.exit(0)
input_file.next()
date = input_file.next().strip()
if date.find("--") != 0:
    print date
if len(title.strip()) == 0 or len(date.strip()) == 0:
    sys.exit(0)
url = input_file.next().strip()
assert url.find("--") ==0

text_buffer = []
text_buffer.append(title.strip())
text_buffer.append(url.strip())
for line in input_file:
    cur_line = line.strip()
    if len(cur_line) == 0: continue
    cur_line = ' '.join(cur_line.split()) #replace multiple space with one
    text_buffer.append(cur_line)

text_whole = " ".join(text_buffer)
matched_codes = set()
for company in code_dict.keys():
    pos = text_whole.find(company)
    if pos == -1: continue
    if pos+len(company) < len(text_whole) and text_whole[pos+len(company)].isalpha():
        #print "[LOGA]", company, text_whole[pos:pos+len(company)+1]
        continue
    if pos-1 >=0 and text_whole[pos-1].isalpha():
        #print "[LOGB]", company, text_whole[pos-1:pos+len(company)]
        #if cmp(company, "eBay") == 0:
        #    print text_whole
        continue
    matched_codes.add(code_dict.get(company))
codes_str=" ".join(matched_codes)
output_file = open(sys.argv[2],"w")
output_file.write("%s ||| %s ||| %s ||| %s \n" % (title[2:].strip(), date[2:].strip(), codes_str, sys.argv[1]))
