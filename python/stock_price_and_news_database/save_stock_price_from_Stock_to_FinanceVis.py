import MySQLdb
import time
import datetime

host = '127.0.0.1'
user = 'root'
auth = 'vis_2014'

db_stock = MySQLdb.connect(host, user, auth, 'Stock')
db_finan = MySQLdb.connect(host, user, auth, 'FinanceVis')

cursor_stock = db_stock.cursor()
cursor_finan = db_finan.cursor()

symbols = ['AAPL', 'GOOG', 'WMT', 'BA', 'BAC', 'GM', 'T', 'XOM', 'GSPC']
start_date = datetime.datetime.strptime('2006-10-20', "%Y-%m-%d").date()
for symbol in symbols:
    table = '%s_stock' % symbol
    sql_read = 'select Date, Open, High, Low, Close, Volume, Adj_close, predict_news_word,' \
               'predict_twitter_word from %s' % table
    cursor_stock.execute(sql_read)
    results = cursor_stock.fetchall()
    for row in results:
        now = datetime.datetime.strptime(row[0], "%Y-%m-%d").date()
        if now < start_date:
            print row[0]
            break
        sql_write = 'insert into stock(symbol, Date, Open, High, Low, Close, Volume, ' \
                    'Adj_close, predict_news, predict_twitter) ' \
                    'values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)'
        params = (symbol, row[0],row[1],row[2],row[3],row[4],row[5],row[6],row[7],row[8])
        cursor_finan.execute(sql_write, params)

# db_finan.commit()
cursor_finan.close()
cursor_stock.close()
db_finan.close()
db_stock.close()