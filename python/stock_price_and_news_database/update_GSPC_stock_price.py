import MySQLdb
import csv
import time
import datetime

def strToDate(str_date):
    return datetime.datetime.strptime(str_date, "%Y-%m-%d").date()

db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

csvfile = file('/data1/cache/GSPC.price.csv', 'rb')
reader = csv.reader(csvfile)

start_date = strToDate("2006-10-20")
headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Adj Close']
i = 0
list_params = []
for line in reader:
    i += 1
    if i == 1:
        continue
    Date = line[0]
    if i < 10:
        print Date
    params = ('GSPC', line[0], line[1], line[2], line[3], line[4], line[5], line[6])
    list_params.append(params)
    sql = 'insert into stock(symbol,Date,Open,High,Low,Close,Volume,Adj_close) ' \
          'values(%s,%s,%s,%s,%s,%s,%s,%s)'
    cursor.execute(sql, params)
    db.commit()
# sql = 'insert into stock(symbol,Date,Open,High,Low,Close,Volume,Adj_close) ' \
#           'values(%s,%s,%s,%s,%s,%s,%s,%s)'
# cursor.executemany(sql, tuple(list_params))
# db.commit()
csvfile.close()
cursor.close()
db.close()