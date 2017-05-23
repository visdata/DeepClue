import json
import time
import os
import sys

path = "/data1/www/html/usr/wangl/FinanceVis/data/500CompanyNewsInfo/"
target_path = "/data1/www/html/usr/wangl/FinanceVis/data/500CompanyNewsSentiment/"

num = 0

files = os.listdir(path)
for news_info_path in files:
    num += 1
    symbol = news_info_path.split("_")[0]
    print(symbol + " : no." + str(num))
    f = open(path+"/"+news_info_path)
    newsInfo = json.loads(json.load(f))
    f.close()

    news_sentiment = dict()
    for date in newsInfo:
        day_news = newsInfo[date]
        news_sentiment[date] = dict()
        for sentiment in day_news:
            sentiment_news = day_news[sentiment]
            news_sentiment[date][sentiment] = len(sentiment_news)

    company_path = target_path+symbol+"_news_sentiment.json"
    target_file = file(company_path, "wb")
    json.dump(json.dumps(news_sentiment), target_file)


print("finished! count: %d " % num)

