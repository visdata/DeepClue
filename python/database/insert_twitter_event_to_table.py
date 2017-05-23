#!/usr/bin/python
#coding=utf-8

import MySQLdb
import time

db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "FinanceVis")
cursor = db.cursor()

batch_size = 10000
current = 0

sql = 'select max(twitter_id) from all_twitter'
cursor.execute(sql)
results = cursor.fetchall()
all_size = results[0][0]
print all_size

while True:
    if current>all_size:
        break
    sql = "select twitter_id,symbol,content,twitter_date,event from all_twitter" \
          " where twitter_id>=%d and twitter_id<%d" % (current, current+batch_size)
          # " limit %d,%d" % (current, current+batch_size)
          # " where event is not null limit %d,%d" % (current, current+batch_size)
    current += batch_size
    print sql
    start = time.time()
    cursor.execute(sql)
    results = cursor.fetchall()

    for row in results:
        twitter_id = row[0]
        symbol = row[1]
        content = row[2]
        twitter_date = row[3]
        event = row[4]

        if event != None:
            events = event.split(";")
            for event in events:
                sql = "insert into twitter_event(twitter_id,event,symbol,event_date,twitter) values(%s,%s,%s,%s,%s)"
                param = (twitter_id, event, symbol, twitter_date, content)
                try:
                    cursor.execute(sql, param)
                    db.commit()
                except Exception, e:
                    print e
                    print twitter_id
                    db.rollback()
                    exit()

    end = time.time()
    print 'time: %f s\n' % (end - start)
