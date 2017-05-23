import MySQLdb
import json

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

def insertFrequency(source, symbol):
    table = 'all_keyword_'+source
    # table = 'new_keyword_'+source
    
    # sql = 'select keyword_id, keyword, keyword_stem from '+table+' where symbol=%s and keyword=%s'
    # param = (symbol, 'patent')

    sql = 'select keyword_id, keyword, keyword_stem from '+table+' where symbol=%s'
    param = (symbol, )
    cursor.execute(sql, param)
    results = cursor.fetchall()
    params = []
    sql = 'update '+table+' set news_id_list=%s where keyword_id=%s'
    i = 0
    for row in results:
        keyword_id = row[0]
        keyword = row[1]
        keyword_stem = row[2]
        list_news_id = getSymbolKeywordNewsIdList(source, symbol, keyword, keyword_stem)
        str_news_id_list = json.dumps(list_news_id)
        params.append([str_news_id_list, keyword_id])
        i += 1
        if i%100 == 0:
            print '%d: %s' % (i, keyword)
        if i%1000 == 0:
            cursor.executemany(sql, params)
            params = []
    cursor.executemany(sql, params)
    print len(results)

def getSymbolKeywordNewsIdList(source, symbol, keyword, keyword_stem):
    if source == 'news':
        sql = 'select news_id from all_news where symbol=%s and (locate(%s, title)>0 or locate(%s,title)>0)'
        params = (symbol, keyword, keyword_stem)
        # sql = 'select news_id from all_news where symbol=%s and match(title) against(%s)'
        # sql += ' union '
        # sql += 'select news_id from all_news where symbol=%s and match(title) against(%s)'
        # params = (symbol, keyword, symbol, keyword_stem)
    elif source=='twitter':
        sql = 'select news_id from all_twitter where symbol=%s and match(title) against(%s)'
        params = (symbol, keyword)
    # if symbol == 'GSPC':
    #     sql = 'select news_id from all_news where locate(%s, title)>0 or locate(%s, title)>0'
    #     params = (keyword, keyword_stem)
    cursor.execute(sql, params)
    results = cursor.fetchall()
    list_news_id = list()
    for row in results:
        news_id = row[0]
        list_news_id.append(news_id)
    return list_news_id

symbols = ['AAPL', 'GOOG', 'T', 'XOM', 'BA', 'BAC', 'GM', 'WMT']
symbols = ['AAPL', 'WMT']
source = 'twitter'
# source = 'news'
for symbol in symbols:
    print symbol
    insertFrequency(source, symbol)

cursor.close()
db.close()