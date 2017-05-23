#!/usr/bin/env python

import sys
import traceback
import time
from datetime import timedelta
from time import mktime
from datetime import datetime
import os
from dateutil.parser import parse

if len(sys.argv)!= 3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)
def format_time(cur_time):
    #Mon Oct 23, 2006 3:51am EDT
    #Mon Oct 23, 2006 3:51am EST
    try:
        cur_date = parse(cur_time)
        format_date = cur_date.strftime("%Y-%m-%d %H:%M:%S")  
        #normalize date to GMT
        if cur_time.find("EDT") >0:
            new_date = time.strptime(format_date, "%Y-%m-%d %H:%M:%S") 
            dt = datetime.fromtimestamp(mktime(new_date))
            dt = dt + timedelta(hours=4)
            format_date = dt.strftime("%Y-%m-%d %H:%M:%S")  
        elif cur_time.find("EST")>0:
            new_date = time.strptime(format_date, "%Y-%m-%d %H:%M:%S") 
            dt = datetime.fromtimestamp(mktime(new_date))
            #dt = dt + timedelta(hours=5) original
            dt = dt + timedelta(hours=5)
            format_date = dt.strftime("%Y-%m-%d %H:%M:%S")  
    except Exception as e:
        traceback.print_exc() 
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
