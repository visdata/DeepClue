#!/usr/bin/env python
# coding=utf-8
import sys
import traceback
import time
from datetime import timedelta
from time import mktime
from datetime import datetime

if  len(sys.argv)!=5:
    print 'Usage: %s price_data tweets output code'
    sys.exit(-1)

input_price  = open(sys.argv[1],"r")
input_tweets = open(sys.argv[2],"r")
output_file = open(sys.argv[3],"w")
code = sys.argv[4]
###Loading Price Data...
price_dict = {}
for line in input_price:
    items = line.strip().split(",")
    #2015-08-18,691.070007,695.76001,685.320007,688.72998,1377700,688.72998,694.109985
    price_date = time.strptime(items[0].strip(), "%Y-%m-%d")
    #tm_year=2004, tm_mon=8, tm_mday=20
    #print price_date.tm_year, price_date.tm_mon, price_date.tm_mday
    dt = datetime.fromtimestamp(mktime(price_date))
    #print dt
    if dt.weekday() == 0:
        #print 'before: ', dt 
        dt = dt - timedelta(days = 3)
        #print 'after: ', dt 
    else:
        dt = dt - timedelta(days=1)
    #print dt
    price_dict[ (dt.year, dt.month, dt.day) ] =  line.strip()


###Loading Tweets...
tweet_dict = {}
for line in input_tweets:
    items = line.strip().split("|||")
    #googl   |||   Fri Apr 10 02:52:42 +0000 2015   |||  rt @stockhighalert : #stockmarket #wallstreet #daytrading #otcbb $twtr $fb $googl $t join 📧 alerts http://t.co/znommbvpjs @bigmoneymike6 ht
    #Wal-Mart Moms Torn on Health Care Become Campaign Targets ||| 2012-06-19 00:00:00 ||| WMT GPS ||| 0 0 8 1 0 0 1 6 0 0 0 1 0 0 0 ||| /home/ji_ma/tzy/6.corpus/stock_market/20061020_20131126_bloomberg_news/2012-06-19/wal-mart-moms-torn-on-health-care-become-campaign-targets
    if cmp(code, "GSPC") != 0:
        cand_codes = set(items[2].strip().split())
        if len(cand_codes) == 0:
            continue
        if code not in cand_codes: 
            continue
    tweet_date = time.strptime(items[1].strip(), "%Y-%m-%d %H:%M:%S")
    dt = datetime.fromtimestamp(mktime(tweet_date))
    dt_key = (dt.year, dt.month, dt.day)
    if not tweet_dict.has_key(dt_key):
        tweet_dict[ dt_key ] = []
    #else:
        #print dt_key
    tweet_dict[ dt_key ].append(line.strip())

tweet_keys = tweet_dict.keys()
tweet_keys = sorted(tweet_keys, key=lambda dt: time.strptime("%d %d %d" %( dt[0], dt[1], dt[2] ), "%Y %m %d"))
### Associating Price with Tweets...
count = 0
for key in tweet_keys:
    price = price_dict.get(key, None)
    if price is None:
        print "No price information on ", key
        continue
    count += 1
    output_file.write(price+"\n")
    tweets = tweet_dict.get(key)
    output_file.write("%d\n" % len(tweets))
    for i in xrange(len(tweets)):
        output_file.write(tweets[i]+"\n")
print "Total Days: ", len(tweet_keys)
print "Useful Days: ", count
