
import MySQLdb
import time

file_object = open('all_titles.txt', 'w')
titles = list()

print "start reading..."
start = time.time()
db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "FinanceVis")
cursor = db.cursor()
sql = "SELECT symbol,title FROM all_news"
try:
    cursor.execute(sql)
    results = cursor.fetchall()
    for row in results:
        title = row[1]
        if title[-1] == "!" or title[-1] == "?":
            title = title[:-1]
        title=title.replace("'s"," ?s").replace("dn't","d n?t").replace("en't","e n?t").replace("sn't","s n?t")\
            .replace("`","").replace(",","").replace("\"","").replace(";","").replace(":","").replace(".", " ")
        title = title.replace("'", "")
        title = title.replace("?", "'")
        titles.append(title+"\n")
    file_object.writelines(titles)
except Exception, e:
    print e
end = time.time()
print "finished! time: %f s" % (end-start)
db.close()
cursor.close()
file_object.close()
