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

input_file = open(sys.argv[1],"r")
output_file = open(sys.argv[2],"w")
titles = [ line.strip().split("|||") for line in input_file ]
sorted_titles = sorted(titles, key=lambda dt: time.strptime(dt[1].strip(),"%Y-%m-%d %H:%M:%S"))

for title in sorted_titles:
    if title[0].strip().find("Update") ==0:
        print title
    output_file.write(" ||| ".join(title)+"\n") 
