# coding: utf-8
import MySQLdb
import datetime, time
import csv

host = 'localhost'
db = MySQLdb.connect(host, 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

headers = ["Date", "Open", "High", "Low", "Close", "Volume", "Adj Close",
           "predict_news_word", "predict_twitter_word", "bias_news_word", "bias_twitter_word"]
file_suffix = ""

symbols = ['AAPL']
symbols = ['AAPL', 'GOOG', 'WMT', 'BA', 'BAC', 'GM', 'T', 'XOM'] #, 'GSPC']
# symbols = ['GSPC']

for symbol in symbols:
    print symbol
    csvfile = file('500Stock_prices/%s.history.price.predict.csv'%symbol, 'wb')
    writer = csv.writer(csvfile)
    writer.writerow(headers)
    sql = 'select Date,Open,High,Low,Close,Volume,Adj_close,predict_news,predict_twitter,bias_news,bias_twitter from stock where symbol="%s" order by date(Date) desc' % symbol
    cursor.execute(sql)
    results = cursor.fetchall()
    for row in results:
        data = []
        # if time.strptime(row[0], "%Y-%m-%d") < time.strptime('2006-10-20', "%Y-%m-%d"):
        #     print row[0]
        #     break
        close = float(row[6])
        for i in xrange(len(row)):
            value = row[i]
            if value==None:
                value = ""
            # elif i==9:
            #     value = float(value)*close
            data.append(value)
        # for i in xrange(2):
        #     data.append("")
        # data.append(row[len(row)-1])
        # for i in xrange(2):
        #     data.append("")
        writer.writerow(data)
    csvfile.close()

cursor.close()
db.close()