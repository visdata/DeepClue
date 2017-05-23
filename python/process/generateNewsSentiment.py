import json

path = "/data/wangl/FinanceVis/data/"
target_path = "../../data/news_sen"

#get the mapping between title and row
map_title_row = dict()
file_news_titles = open(path+'br.titles.good', 'r')
all_titles = file_news_titles.readlines()
file_news_titles.close()
for i in range(len(all_titles)):
    title = all_titles[i].split(" ||| ")[0]
    if map_title_row.get(title) == None:
        map_title_row[title] = list()
    map_title_row[title].append(i)

# title_row = path+"news_sentiment/title_row.json"
# target_file = file(title_row, "wb")
# json.dump(json.dumps(map_title_row), target_file)

#read the mapping between title and row
# f = open(path+"news_sentiment/title_row.json")
# map_title_row = json.loads(json.load(f))    #<title, row>
# f.close()
#
# count1 = 0
# for title in map_title_row:
#     count1 += 1
# print count1

file_news_sentiment = open(path+'b+r.titles.fmt.sorted.trees', 'r')
all_sentiments = file_news_sentiment.readlines()
file_news_sentiment.close()

file_news = open(path+'b+r.titles.fmt.sorted', 'r')
all_titles_date = file_news.readlines()
file_news.close()

news_statistics = dict()
map_title_sentiment = dict()    #<title, sentiment>
map_row_sentiment = dict()      #<row, sentiment>

count1 = 0
for i in range(len(all_titles_date)):
    strs = all_titles_date[i].split("  |||  ")
    title = strs[0]
    date = strs[1].split(" ")[0]
    time = strs[1].split(" ")[1]
    sentiment = all_sentiments[i][1]
    map_title_sentiment[title] = sentiment
    if news_statistics.get(date) == None:
        news_statistics[date] = [0 for j in range(5)]
    else:
        news_statistics[date][int(sentiment)] += 1

for title in map_title_row:
    rows = map_title_row[title]
    for row in rows:
        if map_title_sentiment.get(title) != None:
            map_row_sentiment[row] = map_title_sentiment[title]
        else:
            # print title
            map_row_sentiment[row] = 2  #no data, default is 2

#write the news_statistics
news_statistics_path = path+"news_sentiment/news_statistics.json"
target_file = file(news_statistics_path, "wb")
json.dump(json.dumps(news_statistics), target_file)

#write the map_row_sentiment
row_sentiment_path = path+"news_sentiment/map_row_sentiment.json"
target_file = file(row_sentiment_path, "wb")
json.dump(json.dumps(map_row_sentiment), target_file)



#TODO: all_sentiments + all_titles_date ==> (title, date, sentiment)
#TODO: all_titles ==> (title, rowId)
#TODO: (title, date, sentiment) ==> (date, time, positive, negative)
#TODO: (title, date, sentiment) + (title, rowId) ==> (rowId, sentiment)

