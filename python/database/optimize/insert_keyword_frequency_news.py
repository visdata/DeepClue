import MySQLdb
import json

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

def insertFrequency(source, symbol):
    table = 'all_keyword_'+source
    # table = 'new_keyword_news'
    sql = 'select keyword_id, keyword, keyword_stem from '+table+' where symbol=%s'
    param = (symbol, )

    # sql = 'select keyword_id, keyword, keyword_stem from '+table+' where symbol=%s and keyword=%s'
    # param = (symbol, 'patent')

    cursor.execute(sql, param)
    results = cursor.fetchall()
    params = []
    sql = 'update '+table+' set frequency=%s where keyword_id=%s'
    i = 0
    for row in results:
        keyword_id = row[0]
        keyword = row[1]
        keyword_stem = row[2]
        dict_frequency = getSymbolKeywordFrequency(source, symbol, keyword, keyword_stem)
        frequency = json.dumps(dict_frequency)
        params.append([frequency, keyword_id])
        i += 1
        if i % 100 == 0:
            print '%d: %s' % (i, keyword)
        if i == 1000:
            cursor.executemany(sql, params)
            params = []
            i = 0
    cursor.executemany(sql, params)
    print len(results)

def getSymbolKeywordFrequency(source, symbol, keyword, keyword_stem):
    if source=='news':
        sql = 'select news_date, count(*) as frequency from all_news where symbol=%s and (locate(%s, title)>0 or locate(%s,title)>0) group by news_date'
        params = (symbol, keyword, keyword_stem)
    elif source=='twitter':
        sql = 'select news_date, count(*) as frequency from all_twitter where symbol=%s and match(title) against(%s) group by news_date'
        params = (symbol, keyword)

    # if symbol == 'GSPC':
    #     sql = 'select news_date, count(*) as frequency from all_news where locate(%s, title)>0 or locate(%s, title)>0 group by news_date'
    #     params = (keyword, keyword_stem)
    cursor.execute(sql, params)
    results = cursor.fetchall()
    dict_frequency = dict()
    for row in results:
        Date = str(row[0])
        count = row[1]
        dict_frequency[Date] = count
    return dict_frequency

symbols = ['AAPL', 'GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
symbols = ['AAPL', 'WMT']
# symbols = ['GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
# source = 'news'
source = 'twitter'
for symbol in symbols:
    print symbol
    insertFrequency(source, symbol)

cursor.close()
db.close()