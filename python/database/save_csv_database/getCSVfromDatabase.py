import csv
import MySQLdb


def get_csv_from_db(symbol, cursor):
    print '%s...' % symbol
    header = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Adj Close',
              'predict_news_word', 'predict_news_sentiment', 'predict_news_event',
              'predict_twitter_word', 'predict_twitter_sentiment', 'predict_twitter_event']
    sql = "select * from %s_stock where Date>'%s'" % (symbol, '2006-10-19')
    cursor.execute(sql)
    results = cursor.fetchall()
    records = []
    for row in results:
        record = tuple(row)
        records.append(record)

    csvfile = file('price_data/%s.history.price.predict.csv'%symbol, 'wb')
    writer = csv.writer(csvfile)
    writer.writerow(header)
    writer.writerows(records)
    csvfile.close()
    print 'write csv finished!'

db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'Stock')
cursor = db.cursor()
# symbols = ['AAPL']
symbols = ['AAPL', 'GOOG', 'WMT', 'BA', 'BAC', 'GM', 'T', 'XOM']
for symbol in symbols:
    get_csv_from_db(symbol, cursor)

