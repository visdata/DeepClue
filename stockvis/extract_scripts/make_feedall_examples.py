#!/usr/bin/env python
# coding=utf-8
import sys
import traceback
import time
from datetime import timedelta
from time import mktime
from datetime import datetime
import math
import nltk
from nltk.corpus import stopwords

if  len(sys.argv)!=3:
    print 'Usage: %s input output'
    sys.exit(-1)
input_file  = open(sys.argv[1],"r")
output_file = open(sys.argv[2],"w")


def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

count = 0
zero_count = 0
one_count = 0
pos_count = 0
while True:
    try:
        count += 1
        #2006-10-23,65.150002,66.00,65.019997,65.889999,2408600,60.849415,65.940002
        #Date,Open,High,Low,Close,Volume,Adj Close,Yesterday Close
        price_line = input_file.next().strip().split(",")

        current_date = price_line[0]
        open_price = float(price_line[1])
        close_price = float(price_line[4])

        #trend = "+1" if close_price > open_price else "-1"
        trend = close_price - open_price;
        if trend == 0.0:
            zero_count += 1
        if trend/open_price > 0.005:
            #print price_line
            one_count +=1
        if trend > 0:
            pos_count +=1
        num_titles = int(input_file.next().strip())
        result_titles = []
        title_set = set()
        for i in range(num_titles):
            title_line = input_file.next().strip()
            items = title_line.split("|||")
            #print items[0]
            try:
                items[0] = nltk.word_tokenize(items[0].strip())
            except:
                items[0] = items[0].strip().split()
            filtered_words = []
            for word in items[0]:
                try:
                    if is_number(word):
                        filtered_words.append("<NUM>")
                    else:
                        filtered_words.append(word)
                except:
                    pass
            if len(filtered_words) == 0:
                continue
            new_title = " ".join(filtered_words)
            if new_title not in title_set:
                title_set.add(new_title)
            else:
                #print 'duplicate:', new_title
                continue
            #result_titles.append((new_title, items[2]))
            result_titles.append((new_title, items[2], items[1]))

        output_file.write("%f %d %f %f %s\n" % (trend/open_price, len(result_titles), open_price, close_price,
            current_date))
        #output_file.write("%f %d %f %f %s\n" % (trend/open_price, len(result_titles), open_price, close_price, price_line[0]))
        for i in range(len(result_titles)):
            #print items[0]
            output_file.write(result_titles[i][0])
            #output_file.write(" ||| ")
            #output_file.write(result_titles[i][2])
            output_file.write(" ||| ")
            output_file.write(result_titles[i][1])
            output_file.write("\n")
            #Pluspetrol says losing $ 2.4 mln/day in Peru protest ||| 2006-10-22 00:11:00 ||| AMZN ||| 0 1 8 0 0 0 4 3 0 0 0 1 0 0 0 ||| /home/ji_ma/tzy/2.research/tweet_stock/news_title/reuters/retuers_news/ReutersNews106521/20061022/businesspro-oil-peru-pluspetrol-dc-idUSN2127888220061022
    except:
        print count
        print 'zero count: ', zero_count
        print 'one count: ', one_count, float(one_count)/pos_count, float(one_count)/count
        traceback.print_exc()
        break
