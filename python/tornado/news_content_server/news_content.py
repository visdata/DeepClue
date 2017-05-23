#!/usr/bin/env python
# -*- coding:utf-8 -*-

import json
import csv
import os
import MySQLdb

import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.options

from tornado.options import define, options

define("port", default=6693, help="run on the given port", type=int)
path = "../../../data/"

print 'finished!'

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        set_default_headers(self)
        self.write("This is api for news content.")

class NewsContentHandler(tornado.web.RequestHandler):

    def get(self):
        set_default_headers(self)
        title = self.get_argument("title", None)
        news_id = self.get_argument("news_id", 88452)
        db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "FinanceVis")
        cursor = db.cursor()
        if title is None:
            sql = "select news_path from all_news where news_id=%s"
            param = (news_id,)
        else:
            sql = "select news_path from all_news where title=%s"
            param = (title,)
        content = 'error!'
        try:
            cursor.execute(sql, param)
            results = cursor.fetchall()
            file_path = results[0][0]
            file_news = open(path+"news_data/"+file_path, 'r')
            content = file_news.read()
            file_news.close()
            db.close()
        except Exception, e:
            print e
            print title
            return "exception!"
        dic_result = {"content": content}
        self.write(json.dumps(dic_result))


class PeriodNewsListHandler(tornado.web.RequestHandler):

    def get(self):
        set_default_headers(self)
        source = self.get_argument("source", 'news')
        symbol = self.get_argument("symbol", 'AAPL')
        start_date = self.get_argument("start_date", '2006-10-20')
        end_date = self.get_argument('end_date', '2015-11-04')

        db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "FinanceVis")
        cursor = db.cursor()
        if source == 'news':
            sql = 'select news_id, news_date,title,predict_news_word from all_news where symbol=%s and ' \
                  'news_date between %s and %s'
        elif source == 'twitter':
            sql = 'select news_id, news_date,title,predict_news_word from all_twitter ' \
                  'where symbol=%s and news_date between %s and %s order by abs(predict_news_word+0) desc'
            sql += ' limit 20000' # get the first 10000
        params = (symbol, start_date, end_date)
        list_news = []
        map_id_idx = {}
        try:
            cursor.execute(sql, params)
            results = cursor.fetchall()
            for row in results:
                tid = row[0]
                Date = str(row[1])
                title = row[2].decode('utf8', 'ignore')
                pred = row[3]
                if pred is None:
                    pred = 0
                prediction = round(float(pred)*100, 3)
                record = {"news_id": tid, 'date':Date, 'title':title, 'pred':prediction}
                map_id_idx[tid] = len(list_news)
                list_news.append(record)
            cursor.close()
            db.close()
        except Exception, e:
            print e
            print title
            return "exception!"
        dic_result = {"newsList": list_news, "map_id":map_id_idx}
        self.write(json.dumps(dic_result))

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
        (r"/getNewsContent", NewsContentHandler),
        (r"/getPeriodNewsList", PeriodNewsListHandler)],
    static_path=os.path.join(os.path.dirname(__file__), "static")
)

if __name__ == "__main__":
    http_server = tornado.httpserver.HTTPServer(application)
    http_server.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()