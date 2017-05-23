import MySQLdb
import json
import re

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

def insertFrequency(source, symbol):
    # table = 'all_bigram_'+source
    table = 'new_bigram_news'
    sql = 'select bigram_id, bigram, bigram_stem from '+table+' where symbol=%s'
    param = (symbol, )
    cursor.execute(sql, param)
    results = cursor.fetchall()
    params = []
    sql = 'update '+table+' set frequency=%s where bigram_id=%s'
    i = 0
    for row in results:
        bigram_id = row[0]
        bigram = re.sub('[^A-Z a-z0-9]', '', row[1]) # remove ,
        bigram_stem = re.sub('[^A-Z a-z0-9]', '', row[2]) # remove ,
        # print bigram
        # print bigram_stem
        dict_frequency = getSymbolBigramFrequency(source, symbol, bigram, bigram_stem)
        frequency = json.dumps(dict_frequency)
        # print frequency
        # break
        params.append([frequency, bigram_id])
        i += 1
        if i % 1000 == 0:
            print '%d: %s' % (i, bigram)
            cursor.executemany(sql, params)
            params = []
    cursor.executemany(sql, params)
    print len(results)

def getSymbolBigramFrequency(source, symbol, bigram, bigram_stem):
    words = bigram.split(' ')
    if source == 'news':
        sql = 'select news_date, count(*) as frequency from all_news where symbol=%s and (locate(%s,title)>0 and locate(%s,title)>0) group by news_date'
        # sql = 'select news_date, count(*) as frequency from all_news where symbol=%s and (match(title) against(%s) and match(title) against(%s)) group by news_date'
    elif source == 'twitter':
        sql = 'select news_date, count(*) as frequency from all_twitter where symbol=%s and (match(title) against(%s) and match(title) against(%s)) group by news_date'
    params = (symbol, words[0], words[1])
    # if symbol == 'GSPC':
    #     sql = 'select news_date, count(*) as frequency from all_news where locate(%s, title)>0 and locate(%s, title)>0 group by news_date'
    #     params = (words[0], words[1])
    cursor.execute(sql, params)
    results = cursor.fetchall()
    dict_frequency = dict()
    for row in results:
        Date = str(row[0])
        count = row[1]
        dict_frequency[Date] = count
    return dict_frequency

symbols = ['AAPL', 'GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
symbols = ['AAPL']
symbols = ['GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
# source = 'twitter'
source = 'news'
for symbol in symbols:
    print symbol
    insertFrequency(source, symbol)

cursor.close()
db.close()