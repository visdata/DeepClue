import MySQLdb
import json
import time

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

start = time.time()

list_bigram_ids = range(461768, 471768)
# for keyword in keywords:
sql = 'select bigram from bigram_news where bigram_id in %s'
params = (list_bigram_ids, )
cursor.execute(sql, params)
results = cursor.fetchall()
print len(results)

print [results[i][0] for i in xrange(0, 10)]
end = time.time()
print 'all time: %f s' % (end-start)



cursor.close()
db.close()