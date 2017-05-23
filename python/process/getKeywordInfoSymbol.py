import MySQLdb
import json
import csv
import datetime

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

def getDayOfDelta(today, delta):
    today = datetime.datetime.strptime(today, "%Y-%m-%d").date()
    day = today + datetime.timedelta(days=delta)
    return day.strftime('%Y-%m-%d')

def getKeywordEmbedding(symbol):
    sql = 'select keyword, embedding from keyword_news where symbol=%s'
    param = (symbol, )
    cursor.execute(sql, param)
    results = cursor.fetchall()
    file_csv = open('keyword_embedding_%s.csv'%symbol, 'wb')
    writer = csv.writer(file_csv)
    data = []
    for row in results:
        keyword = row[0]
        embedding = row[1]
        keywordInfo = [keyword]
        keywordInfo.extend(embedding.split(' '))
        data.append(keywordInfo)
        # print len(embedding.split(' '))
        # data.append([keyword, embedding])
    writer.writerows(data)
    file_csv.close()

def getKeywordWeightEveryday(symbol):
    list_days = []
    dict_price_day = dict()
    sql = 'select Date, Adj_close from stock where symbol=%s'
    param = (symbol, )
    cursor.execute(sql, param)
    results = cursor.fetchall()
    for row in results:
        list_days.append(row[0])
        dict_price_day[row[0]] = float(row[1])
    list_days.reverse()
    # print json.dumps(list_days)
    sql = 'select keyword, detail from keyword_news where symbol=%s'
    cursor.execute(sql, param)
    results = cursor.fetchall()
    file_csv_weight = open('keyword_weight_%s.csv'%symbol, 'wb')
    # file_csv_pred = open('keyword_pred_%s.csv'%symbol, 'wb')
    writer_weight = csv.writer(file_csv_weight)
    # writer_pred = csv.writer(file_csv_pred)
    data_weight = []
    data_pred = []
    max_val = 0
    for row in results:
        keywordInfo_weight = []
        keywordInfo_pred = []
        keyword = row[0].replace(',', '')
        detail = json.loads(row[1])
        keywordInfo_weight.append(keyword)
        keywordInfo_pred.append(keyword)
        for Date in list_days:
            val = detail.get(getDayOfDelta(Date, -1))   # the prev day of stock price
            if val is None:
                val = 0
            val = float(val)
            val_weight = val
            val_pred = val * dict_price_day[Date]
            max_val = max(val, max_val)
            keywordInfo_weight.append(val_weight)
            keywordInfo_pred.append(val_pred)
        data_weight.append(keywordInfo_weight)
        data_pred.append(keywordInfo_pred)
    writer_weight.writerows(data_weight)
    # writer_pred.writerows(data_pred)
    # file_csv_pred.close()
    file_csv_weight.close()
    print max_val



symbol = 'AAPL'
symbols = ['AAPL', 'GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
symbols = ['GOOG']
for symbol in symbols:
    print symbol
    # getKeywordEmbedding(symbol)
    getKeywordWeightEveryday(symbol)

cursor.close()
db.close()