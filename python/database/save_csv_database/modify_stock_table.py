import MySQLdb
import os

db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "Stock")
cursor = db.cursor()

path_csv = '/data1/500Stock_Prices/'
files = os.listdir(path_csv)
for f in files:
    try:
        symbol = f.split('.')[0]
        table_symbol = symbol + "_stock"

        sql = """alter table %s add COLUMN predict_twitter_word varchar(20),
                    add COLUMN predict_twitter_sentiment VARCHAR(20),
                    add COLUMN predict_twitter_event VARCHAR(20),
                    drop COLUMN predict_event_embedding,
                    change predict_title_word predict_news_word VARCHAR(20),
                    change predict_title_sentiment_word predict_news_sentiment VARCHAR(20),
                    change predict_event_word predict_news_event VARCHAR(20)""" % table_symbol
        cursor.execute(sql)
        db.commit()
    except Exception, e:
        print f
        print e
        print sql
        db.rollback()
        # break
db.close()


