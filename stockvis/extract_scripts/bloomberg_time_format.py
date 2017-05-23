#!/usr/bin/env python

import sys
import traceback
import time
from datetime import timedelta
from time import mktime
from datetime import datetime


if len(sys.argv)!= 3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)
def format_time(cur_time):
    #2006-10-23T11:51:36Z
    try:
        cur_date = time.strptime(cur_time.strip(), "%Y-%m-%dT%H:%M:%SZ")
        format_date = time.strftime("%Y-%m-%d %H:%M:%S", cur_date)  
    except Exception as e:
        print 'Error', cur_time
        raise e
    return format_date

input_file = open(sys.argv[1],"r")
output_file = open(sys.argv[2],"w")
for line in input_file:
    items = line.strip().split("|||")
    try:
        items[1] = format_time(items[1])
    except:
        print line
        continue
    output_file.write("%s ||| %s ||| %s ||| %s \n" % (items[0].strip(), items[1].strip(), items[2].strip(), items[3].strip()))
