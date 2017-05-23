__author__ = 'WL'

import MySQLdb
import os
import sys

reload(sys)
sys.setdefaultencoding('utf8')

target_path = "/data1/www/html/usr/wangl/FinanceVis/data/500Symbols.txt"
target_file = open(target_path, "w")

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
symbols.append("GSPC")  #all stock market
symbols_str = ",".join(symbols)
print len(symbols)
print symbols_str
target_file.write(symbols_str)
target_file.close()

