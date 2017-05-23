#!/usr/bin/env python

import sys
import traceback
import os
from datetime import datetime
import time
from datetime import timedelta
from time import mktime

#02/10/2006
train_begin = time.strptime("20/10/2006", "%d/%m/%Y") 
train_end = time.strptime("19/06/2012", "%d/%m/%Y") 
#dev_end = time.strptime("22/02/2013", "%d/%m/%Y") 
dev_end = time.strptime("07/03/2013", "%d/%m/%Y") #for 178
#test_end = time.strptime("22/11/2013", "%d/%m/%Y") 
test_end = time.strptime("19/11/2013", "%d/%m/%Y") 

if len(sys.argv)!= 3:
    print 'Usage: %s input output_dir' % sys.argv[0]
    sys.exit(0)

if not os.path.exists(sys.argv[2]):
    os.mkdir(sys.argv[2])

#print sys.argv[1]
input_file = open(sys.argv[1],"r")

title_train_out = open(sys.argv[2]+"/b+r.titles.train", "w")
title_dev_out = open(sys.argv[2]+"/b+r.titles.dev", "w")
title_test_out = open(sys.argv[2]+"/b+r.titles.test", "w")

for line in input_file:
    items = line.strip().split("|||")
    #2006-10-22 16:14:00
    title_date = time.strptime(items[1].strip(), "%Y-%m-%d %H:%M:%S")
    if title_date < train_begin:
        print 'Invalid dateime ', line 
    elif title_date >= train_begin and title_date < train_end:
        title_train_out.write("%s ||| %s ||| %s ||| %s\n" % (items[0].strip(), items[1].strip(), items[2].strip(),  items[3].strip()))
    elif title_date >= train_end and title_date < dev_end:
        title_dev_out.write("%s ||| %s ||| %s ||| %s\n" % (items[0].strip(), items[1].strip(), items[2].strip(), items[3].strip()))
    elif title_date >= dev_end and title_date < test_end:
        title_test_out.write("%s ||| %s ||| %s ||| %s\n" % (items[0].strip(), items[1].strip(), items[2].strip(),  items[3].strip()))
    else:
        print 'Invalid dateime ', line 
