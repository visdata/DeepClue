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

sql = 'select news_id, title from all_news where news_id>312691'
try:
    cursor.execute(sql)
    results = cursor.fetchall()
    for row in results:
        news_id = row[0]
        title = row[1]
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
        sql = "update all_news set verbs=%s where news_id=%s"
        param = (verbs, news_id)
        try:
           cursor.execute(sql, param)
           db.commit()
        except Exception,e:
           # Rollback in case there is any error
           print("error: "+news_id)
           print(e)
           db.rollback()
except Exception, e:
    print e

db.close()
