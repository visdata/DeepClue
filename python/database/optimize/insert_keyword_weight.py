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

def insertKeywordWeightEveryday(source, symbol):
    list_days = []
    sql = 'select Date, Adj_close from stock where symbol=%s'
    param = (symbol, )
    cursor.execute(sql, param)
    results = cursor.fetchall()
    for row in results:
        list_days.append(row[0])
    list_days.reverse()
    date_label = '#date#'

    # table = 'all_keyword_'+source
    table = 'new_keyword_news'

    sql = 'select keyword_id, keyword, detail from '+table+' where symbol=%s'
    cursor.execute(sql, param)
    results = cursor.fetchall()
    # file_csv_weight = open('keyword_weight/keyword_weight_%s.csv'%symbol, 'wb')
    # writer_weight = csv.writer(file_csv_weight)
    max_val = 0
    i = 0
    sql = 'update '+table+' set weight_list=%s where keyword_id=%s'
    params = []
    for row in results:
        keywordInfo_weight = []
        keyword_id = row[0]
        keyword = row[1].replace(',', '')
        if keyword == date_label:
            continue
        detail = json.loads(row[2])
        # keywordInfo_weight.append(keyword)
        i += 1
        if i%100 == 0:
            print '%d: %s' % (i, keyword)
        for Date in list_days:
            val = detail.get(getDayOfDelta(Date, -1))   # the prev day of stock price
            if val is None:
                val = 0
            val = float(val)
            max_val = max(val, max_val)
            val_weight = str(val)
            keywordInfo_weight.append(val_weight)
        params.append([','.join(keywordInfo_weight), keyword_id])
        if i%1000 ==0:
            cursor.executemany(sql, params)
            params = []
    cursor.executemany(sql, params)
    print len(results)

    sql = 'insert into '+table+'(symbol,keyword,weight_list) values(%s,%s,%s)'
    params = (symbol, date_label, ','.join(list_days))

    # sql = 'update '+table+' set weight_list=%s where keyword=%s'
    # params = (','.join(list_days), date_label)

    cursor.execute(sql, params)
    # list_days.insert(0, "") # insert "" in the keyword position
    # writer_weight.writerow(list_days)   # record the date in the first line
    # writer_weight.writerows(data_weight)
    # file_csv_weight.close()
    # print max_val



symbol = 'AAPL'
symbols = ['AAPL', 'GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
# source = 'twitter'
source = 'news'
symbols = ['AAPL']
symbols = ['GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
for symbol in symbols:
    print symbol
    insertKeywordWeightEveryday(source, symbol)

cursor.close()
db.close()