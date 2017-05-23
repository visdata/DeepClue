import MySQLdb

db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

sql = 'select news_id,news_date,event_reverb,symbol,title from all_news where news_id>312691 and event_reverb is not null';
cursor.execute(sql)
results = cursor.fetchall()
for row in results:
    news_id = row[0]
    event_date = row[1]
    events = row[2]
    symbol = row[3]
    title = row[4]
    event_list = events.split(';')
    for event in event_list:
        try:
            sql = 'insert into news_event(news_id,event,symbol,event_date,title) VALUES (%s,%s,%s,%s,%s)'
            param = (news_id,event,symbol,event_date,title)
            cursor.execute(sql, param)
            db.commit()
        except Exception, e:
            print e
            print news_id
            db.rollback()
            exit()
print 'finished success!'

