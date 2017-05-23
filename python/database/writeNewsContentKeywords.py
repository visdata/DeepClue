__author__ = 'WL'

import MySQLdb
import os
import json
import sys
import time
import nltk

reload(sys)
sys.setdefaultencoding('utf8')

path = "../../data/"

start = time.time()

f = open("../tornado/stopwords.txt", "rb")
stopwords = [word[:-2] for word in f]
f.close()

f = open(path + "title_company_path.json")
title_path = json.loads(json.load(f))
f.close()

useful_pos = ["VB", "VBD", "VBG", "VBN", "VBP", "VBZ"]
tokenizer = nltk.word_tokenize
stemmer = nltk.stem.lancaster.LancasterStemmer()
tagger = nltk.UnigramTagger(nltk.corpus.brown.tagged_sents())

end = time.time()
print("loading finished! %f s" % (end-start))

# open database link
db = MySQLdb.connect("211.147.15.14", "root", "vis_2014", "FinanceVis", use_unicode=True, charset="utf8")
cursor = db.cursor()
cursor2 = db.cursor()

sql = "select news_id,title from all_news WHERE symbol='A'"
sql = "select news_id,title from all_news"
try:
    cursor.execute(sql)
    count = int(cursor.rowcount)
    print(count)
    for i in range(count):
        start = time.time()
        row = cursor.fetchone()
        print(row)
        news_id = row[0]
        title = row[1]
        file_path = title_path[title]["path"]
        news_titles = open(path + "news_data/" + file_path, 'r')
        content = news_titles.read().encode("utf-8", "ignore")
        content = unicode(content, errors="ignore")
        news_titles.close()
        print("%d: %d in %d..." % (news_id, i, count))
        verbs = ""
        tokens = tokenizer(content)
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
        # print(verbs)
        sql = "update all_news set content_words=%s where news_id=%s"
        param = (verbs, news_id)
        try:
           cursor2.execute(sql, param)
           db.commit()
        except Exception,e:
           # Rollback in case there is any error
           print(e)
           db.rollback()
        end = time.time()
        print("finish one row! time: %f s" % (end-start))
except Exception,e:
    print(e)
    print "Error: unable to fecth data"

# i = 0
# for title in title_path:
#     i+=1
#     print("no. "+str(i))
#     file_path = title_path[title]["path"]
#     news_titles = open(path+"news_data/"+file_path, 'r')
#     content = news_titles.read().encode("utf-8")
#     news_titles.close()
#     print(content)

# sql = "INSERT INTO news_file(title, content, path)\
#          VALUES (%s, %s, %s)"
# try:
#    cursor.execute(sql, (title, content, path))
#    db.commit()
# except Exception,e:
#    # Rollback in case there is any error
#    print(e)
#    db.rollback()
#
# db.close()
