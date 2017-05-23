__author__ = 'WL'

import MySQLdb
import os
import json
import sys
import time
import datetime
import decimal

reload(sys)
sys.setdefaultencoding('utf8')

target_path = "/data1/www/html/usr/wangl/FinanceVis/data/500CompanyNews/"

# open database link
db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "FinanceVis")
cursor = db.cursor()

symbols = []
sql = "SELECT DISTINCT symbol FROM all_news"
try:
   cursor.execute(sql)
   results = cursor.fetchall()
   for row in results:
      symbol = row[0]
      symbols.append(symbol)
except:
   print "Error: unable to fecth data"

print "start.."
start = time.time()
titles = []
embeddings = []
num = 0
for symbol in symbols:
    num += 1
    print(symbol+" : no."+str(num))
    dic_company_news = dict()
    sql = "SELECT news_id,title,embedding,news_date,news_time,sentiment" \
          " FROM all_news WHERE symbol=%s"
    param = (symbol,)
    try:
       cursor.execute(sql, param)
       results = cursor.fetchall()
       for row in results:
          news_id = row[0]
          dic_news = dict()
          dic_news["title"] = row[1]
          dic_news["embedding"] = [i for i in row[2].split(" ")]
          dic_news["date"] = row[3].strftime('%Y-%m-%d')
          dic_news["time"] = str(row[4])
          dic_news["sentiment"] = int(row[5])
          dic_company_news[news_id] = dic_news
    except Exception, e:
       print e
       print "Error: unable to fecth data"
    company_path = target_path+symbol+"_news_sentiment.json"
    target_file = file(company_path, "wb")
    json.dump(json.dumps(dic_company_news), target_file)
end = time.time()
print("database time: %f s"%(end-start))
db.close()


