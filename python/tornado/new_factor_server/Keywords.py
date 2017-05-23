import MySQLdb
import time
import json
import re
import datetime

def time_statistics(func):
    def _deco(*args, **kwargs):
        start = time.time()
        ret = func(*args, **kwargs)
        end = time.time()
        print 'finished! time: %f s' % (end-start)
        return ret
    return _deco

def getDayByDelta(today, delta):
    today = datetime.datetime.strptime(today, "%Y-%m-%d").date()
    day = today + datetime.timedelta(days=delta)
    return day.strftime('%Y-%m-%d')

@time_statistics
def getNewsListOfKeywords(source, symbol, keywords):
    table = "all_"+source
    sql_init = ""
    if source == 'news':
        sql_init = 'select title,news_date,predict_news_word from all_news where symbol="%s" and predict_news_word is not null' % symbol
        if symbol == "GSPC":
            sql_init = "select title,news_date,predict_news_gspc from all_news where predict_news_gspc is not null" # where symbol in ('AAPL', 'GOOG', 'WMT', 'BA', 'BAC', 'GM', 'T', 'XOM')"
    if source == 'twitter':
        sql_init = 'select content,twitter_date,predict_twitter_word from all_twitter where symbol="%s"' % symbol
        if symbol == "GSPC":
            sql_init = "select content,twitter_date,predict_twitter_word from all_twitter where symbol in ('AAPL', 'GOOG', 'WMT', 'BA', 'BAC', 'GM', 'T', 'XOM')"

    db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
    cursor = db.cursor()
    news_list = {}
    for idx in xrange(len(keywords)):  # get list of all News titles
        keyword = keywords[idx]
        keywordInfo = []
        if keyword.strip() == '':
            continue
        if source == 'news':
            if symbol == 'GSPC':
                sql = sql_init + ' and title like "%%'+keyword+'%%" limit 200'
            else:
                sql = sql_init + ' and (title like "%%'+keyword+'%%" or news_content like "%%'+keyword+'%%")'
        elif source == 'twitter':
            sql = sql_init + ' and content like "%%'+keyword+'%%" limit 200'

        cursor.execute(sql)
        results = cursor.fetchall()
        print len(results)
        for row in results:
            title = row[0]#.decode('utf8')
            try:
                title = title.decode('utf8', 'ignore')
            except Exception, e:
                print e
                print title
                continue
            news_date = row[1]
            prediction = row[2]

            if prediction == None:
                continue
            str_date = str(news_date)
            prediction = float(prediction)*100
            prediction = round(prediction, 3)

            record = {}
            record['title'] = title
            record['date'] = str_date
            record['pred'] = prediction
            keywordInfo.append(record)
        news_list[keyword] = keywordInfo
    cursor.close()
    db.close()
    return news_list

def getStockPrices(symbol, cursor):
    dict_price = dict()
    params = (symbol, )
    sql = 'select Date, adj_close from stock where symbol=%s'
    cursor.execute(sql, params)
    results = cursor.fetchall()
    for row in results:
        dict_price[row[0]] = float(row[1])
    return dict_price


@time_statistics
def getKeywordGroupInfo(source, symbol, stem_keywords, keywords, groups): # ,groups
    # print json.dumps(stem_keywords)
    # print json.dumps(keywords)
    keywords_count = []
    table = 'all_' + source
    db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
    cursor = db.cursor()

    dict_keyword_info, dict_news_id_list = \
        getKeywordInfoAndNewsList(source, symbol, keywords, cursor)

    groups_count = list()
    for idx in xrange(len(groups)):
        group = groups[idx]
        newsList = list()
        groupInfo = dict()
        for keyword in group:
            newsList.extend(dict_news_id_list[keyword])
            for Date in dict_keyword_info[keyword]:
                if groupInfo.get(Date) is None:
                    groupInfo[Date] = [0, 0]
                groupInfo[Date][0] += dict_keyword_info[keyword][Date][0]   # freq
                groupInfo[Date][1] += dict_keyword_info[keyword][Date][1]   #weight
        count_group  = {"group": groups[idx], "info": groupInfo, "key": ''.join(sorted(groups[idx])),
                        "newsList": list(set(newsList)), "text": groups[idx], "type": "group"}
        groups_count.append(count_group)

    for keyword in dict_keyword_info:
        count_keyword = {"keyword": keyword, "info": dict_keyword_info[keyword],
                         "newsList": dict_news_id_list[keyword], "text":keyword, "type": "keyword"}
        keywords_count.append(count_keyword)

    cursor.close()
    db.close()
    return keywords_count, groups_count # return groups info

@time_statistics
def getKeywordCountAndPred(source, symbol, stem_keywords, keywords): # ,groups
    print json.dumps(stem_keywords)
    print json.dumps(keywords)
    keywords_count = []
    table = 'all_' + source
    db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
    cursor = db.cursor()
    dict_keyword_weight = getKeywordWeight(source, symbol, keywords, cursor)

    for idx in xrange(len(stem_keywords)):
        stem = stem_keywords[idx]
        keyword = keywords[idx]
        if source == 'news':    # using group by to get statistics info!!!!!!!
            if symbol == 'GSPC':
                sql = 'select news_date, count(*) as frequency, sum(predict_news_gspc) as prediction from '+table+' where title like "%%'+stem+'%%" or title like "%%'+keyword+'%%" group by news_date'
                print sql
                cursor.execute(sql)
            else:
                sql = 'select news_date, count(*) as frequency, sum(predict_news_word) as prediction from '+table+' where symbol=%s and (news_content like "%%'+stem+'%%" or news_content like "%%'+keyword+'%%") group by news_date'
                param = (symbol,)
                print sql%param
                cursor.execute(sql, param)
        elif source == 'twitter':
            if symbol == 'GSPC':
                sql = 'select twitter_date, count(*) as frequency, sum(predict_twitter_word) as prediction from '+table+' where content like "%%'+stem+'%%" or content like "%%'+keyword+'%%" group by twitter_date'
                print sql
                cursor.execute(sql)
            else:
                sql = 'select twitter_date, count(*) as frequency, sum(predict_twitter_word) as prediction from '+table+' where symbol=%s and (content like "%%'+stem+'%%" or content like "%%'+keyword+'%%") group by twitter_date'
                param = (symbol,)
                print sql%param
                cursor.execute(sql, param)
        results = cursor.fetchall()
        # print len(results)
        count = {}
        dict_weight = dict_keyword_weight[keywords[idx]]
        for row in results:
            news_date = str(row[0])
            frequency = row[1]
            prediction = row[2]
            if prediction == None:
                prediction = 0
            prediction = round(float(prediction), 3)
            weight = 0
            if dict_weight.get(news_date) == None:
                # print 'none'
                # if frequency != 0:
                #     print keywords[idx] + " : " + news_date
                pass
            else:
                weight = dict_weight[news_date]
            count[news_date] = [frequency, prediction, round(weight, 3)]

        count_keyword = {"keyword": keywords[idx], "info": count, "text":keywords[idx]}
        keywords_count.append(count_keyword)
    cursor.close()
    db.close()
    return keywords_count

def getKeywordInfoAndNewsList(source, symbol, keywords, cursor):
    table = 'new_keyword_news'
    if source == 'twitter':
        table = 'all_keyword_'+source
    dict_keyword_info = dict()
    dict_news_id_list = dict()
    if 'split' not in keywords:
        keywords.append('split')
    for keyword in keywords:
        dict_keyword_info[keyword] = dict()
        dict_news_id_list[keyword] = list()

    dict_price = getStockPrices(symbol, cursor)
    sql = 'select detail, frequency, news_id_list from '+table+' where symbol=%s and keyword=%s'

    minnum = 100
    maxnum = -100
    for keyword in keywords:
        params = (symbol, keyword)
        cursor.execute(sql, params)
        results = cursor.fetchall()
        if len(results) <= 0:
            print 'no keyword!'
            continue
        row = results[0]
        detail = json.loads(row[0])
        frequency = json.loads(row[1])
        news_id_list = json.loads(row[2])
        dict_news_id_list[keyword] = news_id_list   #news list of keyword
        keyword_info = dict()
        list_date = frequency.keys()
        # list_date = [getDayByDelta(Date, 1) for Date in list_date]  # add 1 day for frequency
        # list_date.extend(detail.keys())
        # list_date = list(set(list_date))
        for Date in list_date:
            freq = frequency.get(Date)
            keyword_info[Date] = [freq, 0]
        list_date = detail.keys()
        for Date in list_date:
            price = dict_price.get(Date) # or dict_price.get(getDayByDelta(Date, 1)) # weight is predict for tomorrow, so just mul today's price
            # price = dict_price.get(getDayByDelta(Date, 1))
            if price == None:
                price = 1
            # freq = frequency.get(Date)
            # freq = frequency.get(getDayByDelta(Date, -1)) # prev day for frequency
            weight = detail.get(Date)
            if freq is None:
                freq = 0
            if weight is None:
                weight = 0
            if weight!=0 and price==1:
                print 'error!'
            if keyword_info.get(Date) is None:
                keyword_info[Date] = [0, 0]
            keyword_info[Date][1] = round(weight*price, 6)
            # minnum = min(val, minnum)
            # maxnum = max(val, maxnum)
        dict_keyword_info[keyword] = keyword_info
    # print minnum, maxnum
    return dict_keyword_info, dict_news_id_list

@time_statistics
def getBigramOfKeywords(source, symbol, list_keywords):
    db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
    cursor = db.cursor()
    table = 'all_bigram_'+source
    dict_keyword_bigram = dict()
    dict_price = getStockPrices(symbol, cursor)
    for keyword in list_keywords:
        dict_keyword_bigram[keyword] = list()
        sql = 'select bigram,detail,frequency,news_id_list from '+table+' where symbol=%s and locate(%s, bigram)>0'#' limit 50' # only retain the first 50th
        params = (symbol, keyword)
        cursor.execute(sql, params)
        results = cursor.fetchall()
        for row in results:
            bigram = re.sub('[^A-Z a-z0-9]', '', row[0]) # remove ,
            detail = json.loads(row[1])
            frequency = json.loads(row[2])
            news_list = json.loads(row[3])
            sum_weight = 0
            count_days = 0
            dict_bigram_weight = dict()

            list_date = frequency.keys()
            list_date.extend(detail.keys())
            for Date in list_date:
                price = dict_price.get(Date) or dict_price.get(getDayByDelta(Date, 1))
                # price = dict_price.get(getDayByDelta(Date, 1))
                if price == None:
                    price = 1
                freq = frequency.get(Date)
                weight = detail.get(Date)
                if freq is None:
                    freq = 0
                if weight is None:
                    weight = 0
                weight = round(weight*price, 6)
                dict_bigram_weight[Date] = [freq, weight]   # feq, weight
                count_days += 1
                sum_weight += abs(weight)
            dict_bigram = {'info': dict_bigram_weight, 'bigram': bigram, 'text': bigram,
                           'newsList': news_list,
                           'type': 'bigram', 'sum': sum_weight, 'days': count_days}
            dict_keyword_bigram[keyword].append(dict_bigram)
        dict_keyword_bigram[keyword].sort(key=lambda x:x['sum'], reverse=True)
        dict_keyword_bigram[keyword] = dict_keyword_bigram[keyword][0:50]   # only retain the first 50th
    cursor.close()
    db.close()
    return dict_keyword_bigram

@time_statistics
def getNewsOrTwitterOfBigram(source, symbol, bigram, cursor):
    words = bigram.split(' ')
    if source == 'news':
        if symbol == 'GSPC':
            sql = 'select title, news_date, predict_news_gspc from all_news where title like "%%'+words[0]+'%%" and title like "%%'+words[1]+'%%"'
        else:
            sql = 'select title, news_date, predict_news_word from all_news where symbol=%s and title like "%%'+words[0]+'%%" and title like "%%'+words[1]+'%%"'
    elif source == 'twitter':
        if symbol == 'GSPC':
            sql = 'select content, twitter_date, predict_twitter_gspc from all_twitter where content like "%%'+words[0]+'%%" and title like "%%'+words[1]+'%%"'
        else:
            sql = 'select content, twitter_date, predict_twitter_word from all_twitter where symbol=%s and content like "%%'+words[0]+'%%" and title like "%%'+words[1]+'%%"'
            sql +=" and symbol in ('AAPL', 'GOOG', 'WMT', 'BA', 'BAC', 'GM', 'T', 'XOM')"

    print sql
    if symbol == 'GSPC':
        cursor.execute(sql)
    else:
        cursor.execute(sql, (symbol, ))
    results = cursor.fetchall()

    print len(results)
    bigramInfo = list()
    for row in results:
        title = row[0]#.decode('utf8')
        try:
            title = title.decode('utf8', 'ignore')
        except Exception, e:
            print e
            print title
            continue
        news_date = row[1]
        prediction = row[2]
        if prediction == None:
            continue
        str_date = str(news_date)
        prediction = float(prediction)*100
        prediction = round(prediction, 3)

        record = {}
        record['title'] = title
        record['date'] = str_date
        record['pred'] = prediction
        bigramInfo.append(record)
    return bigramInfo


if __name__ == '__main__':
    # news_list = getNewsListOfKeywords('twitter', 'GSPC', ['$aapl', '$twtr', 'iphone'])
    # print json.dumps(news_list['iphone'])

    # keywords_count = getKeywordCountAndPred('news', 'AAPL', ['mob'], ['mobile'])
    # print json.dumps(keywords_count)

    db = MySQLdb.connect('127.0.0.1', 'root', 'vis_2014', 'FinanceVis')
    cursor = db.cursor()
    bigramInfo = getNewsOrTwitterOfBigram('news', 'AAPL', 'apple intellectual', cursor)
    # dict_keyword_weight = getKeywordWeight('news', 'AAPL', ['mobile'], cursor)
    print json.dumps(bigramInfo)
    cursor.close()
    db.close()

    # keyword_bigram = getBigramOfKeywords('news', 'AAPL', ['apple'])
    # print json.dumps(keyword_bigram)

