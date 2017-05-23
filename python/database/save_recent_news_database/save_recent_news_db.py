import MySQLdb

db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

file_news_info = open('news.info.csv', 'r')
file_news_sentiment_info = open('news.sentiment.info.csv', 'r')

list_news_info = file_news_info.readlines()
list_news_sentiment_info = file_news_sentiment_info.readlines()

for i in range(len(list_news_info)):
    news_info = list_news_info[i].replace('\n', '')
    news_sentiment_info = list_news_sentiment_info[i].replace('\n', '')
    news_info_arr = news_info.split('\t')
    news_sentiment_info_arr = news_sentiment_info.split('\t')
    title = news_info_arr[0]
    url = news_info_arr[1]
    news_date = news_info_arr[2]
    news_time = news_info_arr[3]
    news_path = news_info_arr[4]
    news_symbols = news_info_arr[5]
    sentiment = news_sentiment_info_arr[0]
    sentiment_word = news_sentiment_info_arr[1]
    if news_symbols != '':
        symbols = news_symbols.split(' ')
        for symbol in symbols:
            if sentiment_word != '':
                sql = 'insert into all_news(symbol,title,news_date,news_time,' \
                  'sentiment,companies,sentiment_words,news_path) values(%s,%s,%s,%s,%s,%s,%s,%s)'
                param = (symbol, title, news_date, news_time, sentiment, news_symbols, sentiment_word, news_path)
            else:
                sql = 'insert into all_news(symbol,title,news_date,news_time,' \
                  'sentiment,companies,news_path) values(%s,%s,%s,%s,%s,%s,%s)'
                param = (symbol, title, news_date, news_time, sentiment, news_symbols, news_path)

            try:
                cursor.execute(sql, param)
                db.commit()
            except Exception, e:
                print e
                db.rollback()
    # if i == 10:
    #     break
