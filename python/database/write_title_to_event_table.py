import MySQLdb

db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

sql = 'select event_id, news_id from news_event'
cursor.execute(sql)

results = cursor.fetchall()
i = 0
for row in results:
    i += 1
    if i%10000 == 0:
        print 'deal %dth...' % i
    event_id = row[0]
    news_id = row[1]
    sql = 'select title from all_news where news_id=%s' % news_id
    cursor.execute(sql)
    rs = cursor.fetchall()
    title = rs[0][0]

    try:
        sql = "update news_event set title=%s where event_id=%s"
        param = (title, event_id)
        cursor.execute(sql, param)
        db.commit()
    except Exception, e:
        print e
        print title
        print event_id
        db.rollback()
        break
print 'finished!'
