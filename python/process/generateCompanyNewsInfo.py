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
target_path = "../../data/500News_info/"

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

# get the relation between title and path
f = open(path+"title_company_path.json")
title_path = json.loads(json.load(f))
f.close()

print("load finished!")

# num = 0
# for company in news_company:
#     print(company)
#     num += 1
# print(num)


num = 0
for company in news_company:
    num += 1
    # if num < 136:
    #     continue
    # if num > 137:
    #     break
    print("no. %d " % num)
    print(company)
    newsInfo = news_company[company]
    # print(news_company[company])
    company_path = target_path+company+"_info.json"
    target_file = file(company_path, "wb")
    json.dump(newsInfo, target_file)


    embeddings_show = []
    titles_show = []
    lines = list()
    map_line_row = {} # record relations between row and line
    # print(newsInfo)
    for date in newsInfo:
        lines.extend(newsInfo[date])
    # print(lines)
    for i in range(len(lines)):
        embeddings_show.append(embeddings[lines[i]])
        titles_show.append(all_titles[lines[i]].split(" ||| ")[0])
        map_line_row[lines[i]] = i

    titles_return = [titles_show[i]+"##"+title_path[titles_show[i]]["date"] for i in range(len(titles_show))]
    company_path = target_path+company+"_titles.json"
    target_file = file(company_path, "wb")
    json.dump(json.dumps(titles_return), target_file)

    cluster = []
    k = len(embeddings_show)
    if k > 1:
        k /= 2
    if k > 10:
        k = 10
    if k > 0:
        start = time.clock()
        dataSet = mat(embeddings_show)
        clustermap = pc.kcluster(dataSet, k)[0]
        end = time.clock()
        print("cluster: %f s" % (end - start))
        # print(clustermap)
        cluster = clustermap.tolist()
    embeddings_dic = {"embeddings":embeddings_show, "map_lines":map_line_row, "cluster":cluster, "k":k}

    company_path = target_path+company+"_embeddings.json"
    target_file = file(company_path, "wb")
    json.dump(json.dumps(embeddings_dic), target_file)

    print k
    # if k == 0:
    #     continue

    corpus = ["" for i in range(k)]
    keywords = [[] for i in range(k)]
    keywords_file = []

    for i in range(len(cluster)):
        corpus[cluster[i]] += titles_show[i] + " "

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
        except:
            print corpus
            print corpus_deal

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

