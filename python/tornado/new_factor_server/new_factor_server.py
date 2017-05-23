#!/usr/bin/env python
# -*- coding:utf-8 -*-
#
#	Authhor	:Eric.Tang
#	Email	:jeepxiaozi66@gmail.com
#	Date	:13/06/02 22:17:57
#	Desc	:hello,world of tornado
#

import time
import datetime
import json
import os
import functools
import nltk
import math
import MySQLdb

import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.options

import sys
reload(sys)
sys.setdefaultencoding('utf8')

from tornado import gen
from tornado.options import define, options
from tornado.concurrent import run_on_executor
#python 3+ with the futures itself,however you should install it while using python2+
from concurrent.futures import ThreadPoolExecutor
from numpy import *

from Keywords import *
# from KmeansKeywordClustering import *
from KMeansKeywordClusteringOnKNeighbors import *
# from clusterFromDatabase import *

define("port", default=5500, help="run on the given port", type=int)

start = time.time()

# f = open("../stopwords.txt", "rb")
# stopwords = [word[:-2] for word in f]
# f.close()

tokenizer = nltk.word_tokenize
stemmer = nltk.stem.lancaster.LancasterStemmer()
# tagger = nltk.UnigramTagger(nltk.corpus.brown.tagged_sents())

end = time.time()
print("load finished! time: %f s" % (end - start))

class MainHandler(tornado.web.RequestHandler):
    i = 0
    executor = ThreadPoolExecutor(10)

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):
        set_default_headers(self)
        url = 'www.google.com'

        # tornado.ioloop.IOLoop.instance().add_callback(functools.partial(self.deal, url))
        # self.finish('It works')
        # self.write('finished!')

        # response = yield tornado.gen.Task(self.deal, 'www.google.com')
        # print 'response', response
        # self.finish('hello')

        future = self.executor.submit(self.deal, url)

        response = yield tornado.gen.with_timeout(datetime.timedelta(10), future,
                             quiet_exceptions=tornado.gen.TimeoutError)
        if response:
            self.write(response.result())


    # @tornado.gen.coroutine
    @tornado.concurrent.run_on_executor
    def deal(self, url):
        print('request...')
        # time.sleep(5)
        return 'this %s' % url

class KeywordsHandler(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(10)

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):
        set_default_headers(self)
        source = self.get_argument("source", "news")
        symbol = self.get_argument("symbol", "AAPL")
        mode = self.get_argument("mode", "recommend")
        partOfSpeech = self.get_argument("part_of_speech", "noun,verb,adj")
        count = self.get_argument("count", "5")
        keyword = self.get_argument("keyword", "stock")
        start_date = self.get_argument("start_date", '2006-10-20')
        end_date = self.get_argument('end_date', '2015-11-04')

        count = int(count)
        start = time.time()
        # judge which mode and execute different deal method
        future = None
        if mode == "recommend":
            future = self.executor.submit(self.getKeywordsOfSymbolByModel,
                                          source, symbol, count, start_date, end_date)
            # self.getKeywordsOfSymbolByModel(source, symbol, count, start_date, end_date)
        elif mode == 'group_info':
            future = self.executor.submit(self.getKeywordsGroupInfoSymbol,
                                          source, symbol, start_date, end_date, partOfSpeech)

        elif mode == "keyword_info":
            future = self.executor.submit(self.getKeywordInfo,
                                              source, symbol, keyword)
            # self.getKeywordInfo(source, symbol, keyword)
        elif mode == "keyword_bigram":
            future = self.executor.submit(self.getBigramInfo,
                                          source, symbol, keyword)

        response = yield tornado.gen.with_timeout(datetime.timedelta(10), future,
                             quiet_exceptions=tornado.gen.TimeoutError)
        if response:
            self.write(response.result())
        end = time.time()
        print "deal finished! all time: %f s" % (end - start)

    def getRatio(self, a, b):
        if b == 0:
            return a
        else:
            return a/b      #todo: float(a)/b ?

    def isBigger(self, date1, date2):
        format = '%Y-%m-%d'
        if datetime.datetime.strptime(date1, format) > \
                datetime.datetime.strptime(date2, format):
            return True
        else:
            return False

    @tornado.concurrent.run_on_executor
    def getKeywordsGroupInfoSymbol(self, source, symbol, start_date, end_date, partOfSpeech):
        dict_group = getKeywordGroups(source, symbol, start_date, end_date, partOfSpeech)
        groups = dict_group['groups']
        keywords = []
        for group in groups:
            keywords.extend(group)
        # print groups
        # print keywords
        # news_list = getNewsListOfKeywords(source, symbol, keywords)
        list_stem_keywords = [stemmer.stem(keyword) for keyword in keywords]
        keywordsInfo, groupsInfo = getKeywordGroupInfo(source, symbol, list_stem_keywords, keywords, groups)
        # dic_result = {'groups': groupsInfo, 'keywords': keywords_count, 'newsList': news_list}
        dic_result = {'groups': groupsInfo, 'keywords': keywordsInfo, 'sort_position': dict_group}
        return json.dumps(dic_result)

    @tornado.concurrent.run_on_executor
    def getKeywordsOfSymbolByModel(self, source, symbol, count, start_date, end_date):

        db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
        cursor = db.cursor()

        table = 'keyword_'+source
        sql = 'select keyword, detail from '+table+' where symbol=%s'
        params = (symbol, )

        cursor.execute(sql, params)
        results = cursor.fetchall()

        dict_factors_period = dict()
        for row in results:
            try:
                keyword = row[0]
                if '.' in keyword:  # remove u.s. etc.
                    continue
                detail = json.loads(row[1])
            except Exception, e:
                print e
                print row[0]
            dict_factors_period[keyword] = dict()
            dict_factors_period[keyword]['weight'] = 0
            dict_factors_period[keyword]['count'] = 0
            sort_all = 0
            sort_rise = 0
            sort_down = 0
            for Date in detail:
                if self.isBigger(start_date, Date) or self.isBigger(Date, end_date):
                    continue
                dict_factors_period[keyword]['weight'] += detail[Date]
                dict_factors_period[keyword]['count'] += 1
                sort_all += pow(detail[Date], 2)
                if detail[Date] > 0:
                    sort_rise += pow(detail[Date], 2)
                else:
                    sort_down += pow(detail[Date], 2)
            dict_factors_period[keyword]['sort_all'] = math.sqrt(sort_all)
            dict_factors_period[keyword]['sort_rise'] = math.sqrt(sort_rise)
            dict_factors_period[keyword]['sort_down'] = math.sqrt(sort_down)
        sorted_factors_all = sorted(dict_factors_period.iteritems(), key=lambda d:d[1]['sort_all'], reverse=True)
        sorted_factors_rise = sorted(dict_factors_period.iteritems(), key=lambda d:d[1]['sort_rise'], reverse=True)
        sorted_factors_down = sorted(dict_factors_period.iteritems(), key=lambda d:d[1]['sort_down'], reverse=True)
        keywords_all = []
        keywords_rise = []
        keywords_down = []

        list_sorted_word = [sorted_factors_all, sorted_factors_rise, sorted_factors_down]
        for i in xrange(len(list_sorted_word)):
            sorted_word = list_sorted_word[i]
            for elem in sorted_word[0:count]:
                keyword = {}
                keyword["keyword"] = elem[0]
                keyword["weight"] = elem[1]['weight']
                keyword["count"] = elem[1]['count']
                keyword["sort_all"]=elem[1]["sort_all"]
                keyword["sort_rise"]=elem[1]["sort_rise"]
                keyword["sort_down"]=elem[1]["sort_down"]
                if i == 0:
                    keywords_all.append(keyword)
                elif i == 1:
                    keywords_rise.append(keyword)
                else:
                    keywords_down.append(keyword)

        dic_result = {'all':keywords_all, 'rise': keywords_rise, 'down': keywords_down}
        cursor.close()
        db.close()
        return json.dumps(dic_result)

    @tornado.concurrent.run_on_executor
    def getKeywordInfo(self, source, symbol, keywords):
        list_keywords = keywords.split(' ')
        news_list = getNewsListOfKeywords(source, symbol, list_keywords)
        list_stem_keywords = [stemmer.stem(keyword) for keyword in list_keywords]
        keywords_count = getKeywordCountAndPred(source, symbol, list_stem_keywords, list_keywords)
        dic_result = {'keywords': keywords_count, 'newsList': news_list}
        return json.dumps(dic_result)

    @tornado.concurrent.run_on_executor
    def getBigramInfo(self, source, symbol, keywords):
        list_keywords = keywords.split(' ')
        dict_keyword_bigram = getBigramOfKeywords(source, symbol, list_keywords)
        return json.dumps(dict_keyword_bigram)

def set_default_headers(obj):
    obj.set_header('Access-Control-Allow-Origin', '*')
    obj.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    obj.set_header('Access-Control-Max-Age', 1000)
    # self.set_header('Access-Control-Allow-Headers', 'origin, x-csrftoken, content-type, accept')
    obj.set_header('Access-Control-Allow-Headers', '*')
    # self.set_header('Content-type', 'application/json')


application = tornado.web.Application(
    handlers=[
        (r"/", MainHandler),
        (r"/getRecommendKeywords", KeywordsHandler)],
    static_path=os.path.join(os.path.dirname(__file__), "static")
)

if __name__ == "__main__":
    # server = tornado.httpserver.HTTPServer(application)
    # server.listen(options.port)
    # tornado.ioloop.IOLoop.instance().start()

    # TODO: concurrent 1
    # # http_server.bind(options.port)
    # # http_server.start(0)

    # TODO: concurrent 2
    server = tornado.httpserver.HTTPServer(application)
    sockets = tornado.netutil.bind_sockets(options.port)
    tornado.process.fork_processes(0)
    server.add_sockets(sockets)
    tornado.ioloop.IOLoop.instance().start()