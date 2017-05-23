#!/usr/bin/env python

import sys
import traceback
import re
import os

if len(sys.argv)!= 3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)
code_dict = {}
def loadSNP():
    code_file = open("../snp500/snp500.name.aug.5","r")
    code_list = [ code.strip().split("|||") for code in code_file ]
    for i in range(len(code_list)):
        code_name = code_list[i][0].strip() 
        for j in range(1, len(code_list[i])):
            code_dict[code_list[i][j].strip()] = code_name
loadSNP()

#print sys.argv[1]
##1. Get Title
input_file = open(sys.argv[1],"r")

title=""
while True:
    try:
        title = input_file.next().strip()
        if title.find("--") == 0:
            title = title[2:].strip()
        if len(title) == 0: 
            continue
        break
    except:
        #if(len(title)>0):
        #    print "[FILE]: ", sys.argv[1]
        #    print "[title]:",title
        sys.exit(0)
##2. Get Date
date=None
while True:
    try:
        date = input_file.next().strip()
        if date.find("--") == 0:
            date = date[2:].strip()
        if len(date) == 0: 
            continue
        dateObj = re.match("\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", date)
        if dateObj is None:
            continue
        date = dateObj.group().strip()
        break
    except:
        #print "[FILE]: ", sys.argv[1]
        #print "no date", date
        parentdir = os.path.dirname(sys.argv[1])
        date = os.path.basename(parentdir)
        date = "%sT00:00:00Z" % date #fakedate
        break


##3. Get URL
url=None
while True:
    try:
        url = input_file.next().strip()
        if url.find("--") == 0:
            url = url[2:].strip()
        if len(url) == 0:
            continue
        if url.find("http://www.")!=0:
            continue
        break
    except:
        #print "[FILE]: ", sys.argv[1]
        #print "invalid url", url
        url = sys.argv[1]
        break

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
output_file.write("%s ||| %s ||| %s ||| %s \n" % (title.strip(), date.strip(), codes_str, sys.argv[1]))
