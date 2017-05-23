#!/usr/bin/env python
# coding=utf-8
import sys
import traceback
import time
from datetime import timedelta
from time import mktime
from datetime import datetime

price_date = time.strptime("2016-08-14", "%Y-%m-%d")
dt = datetime.fromtimestamp(mktime(price_date))
print dt.weekday()
#print dt
print 'before: ', dt 
dt = dt + timedelta(days = 1)
print 'after: ', dt 
dt = dt - timedelta(days=1)
print dt
