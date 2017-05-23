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
    file_csv = open('keyword_embedding/keyword_embedding_%s.csv'%symbol, 'wb')
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
    sql = 'select Date, Adj_close from stock where symbol=%s'
    param = (symbol, )
    cursor.execute(sql, param)
    results = cursor.fetchall()
    for row in results:
        list_days.append(row[0])
    list_days.reverse()
    sql = 'select keyword, detail from keyword_news where symbol=%s'
    cursor.execute(sql, param)
    results = cursor.fetchall()
    file_csv_weight = open('keyword_weight/keyword_weight_%s.csv'%symbol, 'wb')
    writer_weight = csv.writer(file_csv_weight)
    data_weight = []
    max_val = 0
    i = 0
    for row in results:
        keywordInfo_weight = []
        keyword = row[0].replace(',', '')
        detail = json.loads(row[1])
        keywordInfo_weight.append(keyword)
        i += 1
        if i%100 == 0:
            print keyword
        for Date in list_days:
            val = detail.get(getDayOfDelta(Date, -1))   # the prev day of stock price
            if val is None:
                val = 0
            val = float(val)
            val_weight = val
            max_val = max(val, max_val)
            keywordInfo_weight.append(val_weight)
        data_weight.append(keywordInfo_weight)
    list_days.insert(0, "") # insert "" in the keyword position
    writer_weight.writerow(list_days)   # record the date in the first line
    writer_weight.writerows(data_weight)
    file_csv_weight.close()
    print max_val



symbol = 'AAPL'
symbols = ['AAPL', 'GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
# symbols = ['GOOG']
for symbol in symbols:
    print symbol
    getKeywordEmbedding(symbol)
    # getKeywordWeightEveryday(symbol)

cursor.close()
db.close()