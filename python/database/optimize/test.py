import MySQLdb
import json
import time

db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
cursor = db.cursor()

start = time.time()
keywords = ["mobile", "rise", "fed", "retail", "tablet", "jump", "plan", "lead", "apple", "lawsuit", "slip", "build", "electronic", "gadget", "phone", "sell", "probe", "launch", "set", "web", "suit", "progress", "rival", "plant", "$1.9", "fear", "gm", "meet", "overseas", "strategy", "sold", "press", "judge", "settle", "holiday", "live", "turnaround", "estimate", "hard", "expand", "shareholder", "bring", "stake", "pact", "change", "surface", "snap", "curb", "worth", "merger", "gates", "step", "drag", "poised", "block", "exec", "spur", "cure", "fund", "offer", "chief", "view", "buy", "helps", "surprise", "supply", "gain", "feet", "create", "held", "laughs", "founder", "game", "story", "bear", "win", "blitz", "takes", "revamped", "data", "damage", "inch", "lawmakers", "smart", "$2", "land", "unaffected", "sharp", "idea", "displacing", "$3", "scrapped", "offset", "bargain", "joint", "charge", "fresh", "teach", "earth", "stamp", "$5", "pull", "rumor", "movie", "real", "slash", "wrestles", "notebook", "export", "optimism", "start", "future", "stock", "beat", "earns", "share", "advice", "bet", "host", "issue", "climb", "cautious", "palm", "delay", "leave", "biggest", "firm", "defend", "stay", "mortgage", "bull", "success", "sector", "luster", "instant", "misses", "user", "gross", "applies", "buoys", "tale", "hit", "loss", "names", "day", "display", "expects", "boom", "hire", "sink", "play", "system", "vow", "record", "mixed", "dividend", "customs", "decade", "fuel", "doubt", "commodity", "double", "executive", "cut", "return", "spend", "key", "arts", "stimulus", "slim", "staff", "threat", "trade", "bid", "partner", "tax", "retreat", "urge", "manufacturer", "competitive", "reach", "energy", "challenge", "job", "edge", "secure", "life", "emerge", "site", "agree", "slide", "pat", "quest", "led", "charm", "rule", "guidelines", "gold", "brink", "star"]
print len(keywords)

dict_keyword_info = dict()
dict_news_id_list = dict()
for keyword in keywords:
    dict_keyword_info[keyword] = dict()
    dict_news_id_list[keyword] = list()
dict_price = dict()
for keyword in keywords:
    sql = 'select detail, frequency, news_id_list from keyword_news where symbol=%s and keyword=%s'
    params = ('AAPL', keyword)
    cursor.execute(sql, params)
    results = cursor.fetchall()
    row = results[0]
    detail = json.loads(row[0])
    frequency = json.loads(row[1])
    news_id_list = json.loads(row[2])
    dict_news_id_list[keyword] = news_id_list   #news list of keyword
    keyword_info = dict()
    list_date = frequency.keys()
    list_date.extend(detail.keys())
    list_date = list(set(list_date))
    for Date in list_date:
        price = dict_price.get(Date)
        if price == None:
            price = 1
        freq = frequency.get(Date)
        weight = detail.get(Date)
        if freq is None:
            freq = 0
        if weight is None:
            weight = 0
        keyword_info[Date] = [freq, round(weight*price, 6)]
        # minnum = min(val, minnum)
        # maxnum = max(val, maxnum)
    dict_keyword_info[keyword] = keyword_info

end = time.time()
print 'all time: %f s' % (end-start)
# sql = 'select keyword, detail, frequency from keyword_news limit 10000'
# cursor.execute(sql)
# results = cursor.fetchall()
# for row in results:
#     keyword = row[0]
#     detail = json.loads(row[1])
#     frequency = json.loads(row[2])
#     for Date in detail:
#         if frequency.get(Date) is None:
#             print 'error:%s, %s'%(Date,keyword)
            # break


cursor.close()
db.close()