import MySQLdb

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

sql = 'select predict_news_word from all_twitter where symbol=%s order by predict_news_word+0 desc'
cursor.execute(sql, ('AAPL', ))
results = cursor.fetchall()

file_twitter_predict = open('twitter_predict_AAPL.csv', 'wb')
for row in results:
    predict = row[0]
    if row[0] is None:
        predict = 'NULL'
    file_twitter_predict.write(predict+'\n')
file_twitter_predict.close()


cursor.close()
db.close()