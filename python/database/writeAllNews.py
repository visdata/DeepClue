#encoding=utf-8
__author__ = 'WL'

import MySQLdb
import os
import json
import nltk
import sys
reload(sys)
sys.setdefaultencoding('utf8')

from sklearn import feature_extraction
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.feature_extraction.text import CountVectorizer

f = open("../tornado/stopwords.txt", "rb")
stopwords = [word[:-2] for word in f]
f.close()

useful_pos = ["VB", "VBD", "VBG", "VBN", "VBP", "VBZ"]
tokenizer = nltk.word_tokenize
stemmer = nltk.stem.lancaster.LancasterStemmer()
tagger = nltk.UnigramTagger(nltk.corpus.brown.tagged_sents())

path = "../../data/500CompanyNewsInfo"

# open database link
db = MySQLdb.connect(host="211.147.15.14", user="root", passwd="vis_2014", db="FinanceVis", use_unicode=True, charset="utf8")
cursor = db.cursor()

files = os.listdir(path)
for news_info_path in files:
    symbol = news_info_path.split("_")[0]
    print(symbol)
    f = open(path+"/"+news_info_path)
    newsInfo = json.loads(json.load(f))
    f.close()
    for day in newsInfo:
        day_news = newsInfo[day]
        for sentiment in day_news:
            sentiment_news = day_news[sentiment]
            for i in range(len(sentiment_news)):
                news = sentiment_news[i]
                embedding = news["embedding"]
                embedding_str = ' '.join([str(i) for i in embedding])
                title = news["title"]
                time = news["time"]
                date = time.split(" ")[0]
                time = time.split(" ")[1]
                key = date.replace("-", "") + time.replace(":", "")

                verbs = ""
                tokens = tokenizer(title)
                tagged = tagger.tag(tokens)
                for w in tagged:
                    try:
                        stemmed = stemmer.stem(w[0])
                        if w[1].split("-")[0] in useful_pos and stemmed not in stopwords:
                            verbs += w[0] + " "
                        # else:
                        #     print w
                    except:
                        pass
                        # print(w)
                sql = "INSERT INTO all_news(symbol, title, embedding, news_key, news_date, news_time, " \
                            "sentiment, verbs) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
                param = (symbol, title, embedding_str, key, date, time, sentiment, verbs)
                try:
                   cursor.execute(sql, param)
                   db.commit()
                except Exception,e:
                   # Rollback in case there is any error
                   print("error: "+symbol)
                   print(e)
                   db.rollback()
    print("%s finished!" % symbol)

db.close()
