import os
import MySQLdb

def save_result_db(path, symbol, each, db):
    cursor = db.cursor()
    source = 'news'
    count_segs = 5
    file_prefix = '%s.%s.word' % (symbol, source)

    table_name = 'all_news'
    key_name = 'news_id'

    if each:
        file_prefix += '.each'
    else:
        table_name = '%s_stock' % symbol
        key_name = 'Date'

    for i in range(1):
        filename = '%s.out.%d' % (file_prefix, i)
        filename = '927.out'
        print filename
        file_result = open('%s' % filename)
        content = file_result.readlines()
        for line in content:
            if line.startswith('[average'):
                line = line.strip()
                # print line
                columns = line.split('\t')
                # [0] is [average
                key = columns[1]
                pred = columns[2]
                if pred == '-nan':
                    continue
                # print key + " " + pred
                sql = "update %s set predict_news_word=%s where %s='%s'" % (table_name, pred, key_name, key)
                if symbol == "GSPC":
                    sql = "update %s set predict_news_word=%s where %s='%s'" % (table_name, pred, key_name, key)
                try:
                    cursor.execute(sql)
                    db.commit()
                except Exception, e:
                    print e
                    print key
                    print sql
                    db.rollback()
                    break
            else:
                pass
    print 'finished!'
    cursor.close()

db_each = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
db_stock = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'Stock')

path_result = '../result_data'

symbols = ['AAPL']
symbols = ['AAPL', 'GOOG', 'WMT', 'BA', 'BAC', 'GM', 'T', 'XOM']
symbols = ['GSPC']
eachs = [True, False]
eachs = [False]
# eachs = [True]

for symbol in symbols:
    for each in eachs:
        db = db_stock
        if each:
            db = db_each
        save_result_db(path_result, symbol, each, db)

db_each.close()
db_stock.close()