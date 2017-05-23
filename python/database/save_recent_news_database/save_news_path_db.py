import MySQLdb
import json
import time
import sys
reload(sys)
sys.setdefaultencoding('utf-8')

db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis', use_unicode=True, charset="utf8")
cursor = db.cursor()

start = time.time()
path = "../../data/"
f = open(path+"title_company_path.json", 'r')
title_path = json.loads(json.load(f))
f.close()
end = time.time()
print("load finished! %f s" % (end - start))

count = 0
for title in title_path:
    count += 1
    # if count<4000:
    #     continue
    if count % 1000 == 0:
        print 'now deal: %d' % count
        print title
    path = title_path[title]['path']
    # print title
    # print path
    sql = "update all_news set news_path=%s where title=%s"
    param = (path, title)
    try:
        cursor.execute(sql, param)
        db.commit()
        # count += cursor.rowcount
    except Exception, e:
        print e
        print path
        print title
        db.rollback()
        break

    # sql = "select news_id from all_news where title=%s"
    # cursor.execute(sql, title)
    # results = cursor.fetchall()
    # for row in results:
    #     print row[0]
    # break

print 'finished!'
