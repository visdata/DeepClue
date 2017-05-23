import MySQLdb
import datetime

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

def getDayByDelta(today, delta):
    today = datetime.datetime.strptime(today, "%Y-%m-%d").date()
    day = today + datetime.timedelta(days=delta)
    return day.strftime('%Y-%m-%d')

def get_title_predict(source, symbol, Date):
    sql = 'select predict_news_word from all_'+source+' where symbol=%s and news_date=%s'
    params = (symbol, Date)
    # print sql % params
    cursor.execute(sql, params)
    results = cursor.fetchall()
    sum_predict = 0
    count = 0
    for row in results:
        try:
            sum_predict += float(row[0])
            count += 1
        except Exception,e:
            pass
            # print Date
            # print e
            # break
    if count == 0:
        print 'error! %s' % str(Date)
    return sum_predict

# read stock price
def update_bias(source, symbol):
    sql = 'select Date, Adj_close, predict_'+source+' from stock where symbol=%s order by Date'
    params = (symbol, )
    cursor.execute(sql, params)
    results = cursor.fetchall()
    priceInfo = list()
    for row in results:
        predict = row[2]
        try:
            predict = float(predict)
        except:
            predict = 0
        info = dict()
        info['date'] = row[0]
        info['close']= float(row[1])
        info['predict'] = predict
        priceInfo.append(info)

    count = 0
    sql = 'update stock set bias_'+source+'=%s where symbol=%s and Date=%s'
    params = list()
    for i in xrange(len(priceInfo)):
        info = priceInfo[i]
        predict_all = info['predict']
        if predict_all == 0:
            continue
        Date = info['date']
        yesterday = getDayByDelta(Date, -1)
        predict_title = get_title_predict(source, symbol, yesterday)
        predict_title *= priceInfo[i-1]['close']    # * close of yesterday
        bias = predict_all - predict_title
        bias = round(bias, 6)
        # print '(%f, %f, %f)' % (predict_all, predict_title, bias)
        count += 1
        params.append([bias, symbol, Date])
        if count % 1000 == 0:
            print count
            cursor.executemany(sql, params)
            params = []
    cursor.executemany(sql, params)
    print count

# source = 'twitter'
# source = 'news'
# symbol = 'AAPL'
# sources = ['news', 'twitter']

sources = ['news']
symbols = ['AAPL', 'GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']

for source in sources:
    for symbol in symbols:
        print '%s %s' % (source, symbol)
        update_bias(source, symbol)

cursor.close()
db.close()
