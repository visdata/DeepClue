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
    sql = 'update '+table+' set news_id_list=%s where bigram_id=%s'
    i = 0
    for row in results:
        bigram_id = row[0]
        bigram = re.sub('[^A-Z a-z0-9]', '', row[1]) # remove ,
        bigram_stem = re.sub('[^A-Z a-z0-9]', '', row[2]) # remove ,
        list_news_id = getSymbolBigramNewsIdList(source, symbol, bigram, bigram_stem)
        str_news_id_list = json.dumps(list_news_id)
        params.append([str_news_id_list, bigram_id])
        i += 1
        if i%1000 == 0:
            print '%d: %s' % (i, bigram)
            cursor.executemany(sql, params)
            params = []
    cursor.executemany(sql, params)
    print len(results)

def getSymbolBigramNewsIdList(source, symbol, bigram, bigram_stem):
    words = bigram.split(' ')
    if source=='news':
        sql = 'select news_id from all_news where symbol=%s and (locate(%s,title)>0 and locate(%s,title)>0)'
        # sql = 'select news_id from all_news where symbol=%s and (match(title) against(%s) and match(title) against(%s))'
    elif source=='twitter':
        sql = 'select news_id from all_twitter where symbol=%s and (match(title) against(%s) and match(title) against(%s))'
    params = (symbol, words[0], words[1])
    # if symbol == 'GSPC':
    #     sql = 'select news_id from all_news where locate(%s, title)>0 AND locate(%s, title)>0'
    #     params = (words[0], words[1])
    cursor.execute(sql, params)
    results = cursor.fetchall()
    list_news_id = list()
    for row in results:
        news_id = row[0]
        list_news_id.append(news_id)
    return list_news_id

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