
import MySQLdb
import time

db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "FinanceVis")
cursor = db.cursor()

file_result = open('result.txt', 'w')

start = time.time()
# get all the news and update database add the related companies of news
file_news = open('../../data/b+r.titles.fmt.sorted', 'r')
i=1
for line in file_news:
    print i
    i+=1
    values = line.split("  |||  ")
    title = values[0]
    companies = values[2]
    sql = "update all_news set companies=%s where title=%s"
    param = (companies, title)
    try:
        cursor.execute(sql, param)
        db.commit()
    except Exception, e:
        file_result.write("error: %d" % i)
        file_result.close()
        break
        print e
        db.rollback()

end = time.time()
print "all time: %f s" % (end-start)
file_result.write("succeed! all time: %f s" % (end-start))
file_result.close()
file_news.close()