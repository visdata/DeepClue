from numpy import *

import csv
import json
import time
import Pycluster as pc
import os
import sys

from sklearn import feature_extraction
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.feature_extraction.text import CountVectorizer

path = "/data/wangl/FinanceVis/data/"
target_path = "/data1/wangl/FinanceVis/data/500CompanyNewsInfo/"

f = open("stopwords.txt", "rb")
stopwords = [word[:-2] for word in f]
f.close()

# Get all the news titles
file_news_titles = open(path+'br.titles.good', 'r')
all_titles = file_news_titles.readlines()
file_news_titles.close()

# get all the news embeddings
embeddings = list()
file_embeddings = open(path+'br.titles.vec', 'r')
for line in file_embeddings:
    line = line.split(" ")[0:150]   #150 dimensions vector
    line = [float(line[i]) for i in range(len(line))]
    embeddings.append(line)
file_embeddings.close()

# get all the embeddings info of every company
f = open(path+"news_company.json")
news_company = json.loads(json.load(f))
f.close()

# get the sentiment of every row
f = open(path+"news_sentiment/map_row_sentiment.json")
map_row_sentiment = json.loads(json.load(f))
f.close()

# get the relation between title and path
f = open(path+"title_company_path.json")
title_path = json.loads(json.load(f))
f.close()

print("load finished!")

num = 0
for company in news_company:
    company_dates = []
    company_embeddings = []
    company_titles = []
    company_times = []
    company_sentiments = []

    num += 1
    # if num == 2:
    #     break
    # if num < 136:
    #     continue
    # if num > 137:
    #     break
    print("no. %d " % num)
    print(company)
    newsInfo = news_company[company]
    for date in newsInfo:
        rows = newsInfo[date]
        for row in rows:
            company_dates.append(date)
            company_embeddings.append(embeddings[row])
            title = all_titles[row].split(" ||| ")[0]
            company_titles.append(title)
            company_times.append(title_path[title]["date"])
            company_sentiments.append(map_row_sentiment[str(row)])

    company_clusters = []
    k = len(company_embeddings)
    if k > 1:
        k /= 2
    if k > 5:
        k = 5
    start = time.clock()
    dataSet = mat(company_embeddings)
    clustermap = pc.kcluster(dataSet, k)[0]
    end = time.clock()
    print("cluster: %f s" % (end - start))
    # print(clustermap)
    company_clusters = clustermap.tolist()

    company_info = dict()
    for i in range(len(company_dates)):
        date = company_dates[i]
        if company_info.get(date) == None:
            company_info[date] = dict()
            for j in range(5):
                company_info[date][j] = []
        news = dict()
        news["embedding"] = company_embeddings[i]
        news["title"] = company_titles[i]
        news["cluster"] = company_clusters[i]
        news["time"] = company_times[i]
        company_info[date][int(company_sentiments[i])].append(news)

    company_path = target_path+company+"_NewsInfo.json"
    target_file = file(company_path, "wb")
    json.dump(json.dumps(company_info), target_file)

    corpus = ["" for i in range(k)]
    keywords = [[] for i in range(k)]
    keywords_file = []

    for i in range(len(company_clusters)):
        corpus[company_clusters[i]] += company_titles[i] + " "

    corpus_deal = ["" for i in range(k)]
    for i in range(len(corpus)):
        strs = corpus[i].split(" ")
        for j in range(len(strs)):
            if strs[j] not in stopwords:
                corpus_deal[i] += strs[j] + " "

    if k == 1:
        strs = corpus_deal[0].split(" ")
        for j in range(len(strs)):
            keywords[0].append({"word":strs[j], "tfidf":0.3})
        keywords_file.append(keywords[0])
    else:
        try:
            vectorizer=CountVectorizer()
            transformer=TfidfTransformer()
            tfidf=transformer.fit_transform(vectorizer.fit_transform(corpus_deal))
            word=vectorizer.get_feature_names()
            weight=tfidf.toarray()
        except Exception,e:
            print Exception
            print e
            print corpus_deal
            print weight
            print word

        for i in range(len(weight)):
            for j in range(len(word)):
                keywords[i].append({"word":word[j], "tfidf":weight[i][j]})
            keywords[i].sort(key=lambda e:e["tfidf"], reverse=True)
            l = len(keywords[i])
            if l > 9:
                l = 9
            keywords_file.append(keywords[i][0:l])

    company_path = target_path+company+"_keywords.json"
    target_file = file(company_path, "wb")
    json.dump(json.dumps(keywords_file), target_file)

print("finished! count: %d " % num)

