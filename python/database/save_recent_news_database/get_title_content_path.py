# -*- coding: utf-8 -*-

import json
import os
import sys
import time, datetime
reload(sys)
sys.setdefaultencoding('utf8')


def get_related_symbols(news_title_content, code_dict):
    matched_codes = set()
    for company in code_dict.keys():
        pos = news_title_content.find(company)
        if pos == -1: continue
        if pos+len(company) < len(news_title_content) and news_title_content[pos+len(company)].isalpha():
            #print "[LOGA]", company, text_whole[pos:pos+len(company)+1]
            continue
        if pos-1 >=0 and news_title_content[pos-1].isalpha():
            #print "[LOGB]", company, text_whole[pos-1:pos+len(company)]
            #if cmp(company, "eBay") == 0:
            #    print text_whole
            continue
        matched_codes.add(code_dict.get(company))
    codes_str=" ".join(matched_codes)
    return codes_str

code_dict = {}
code_file = open("snp500.name.aug.5", "r")
code_list = [ code.strip().split("|||") for code in code_file ]
for i in range(len(code_list)):
    code_name = code_list[i][0].strip()
    for j in range(1, len(code_list[i])):
        code_dict[code_list[i][j].strip()] = code_name
code_file.close()


path_root_news = '../../data/news_data/'
path_news_sources = ['bloomberg_news_recent', 'retuers_news_recent']
sep = ' ||| '

file_new_titles = open('new.title.csv', 'w')
file_news_info = open('news.info.csv', 'w')

for source in path_news_sources:
    dir = path_root_news + source
    for root, dirs, files in os.walk(dir):
        for name in files:
            try:
                path = os.path.join(root, name)
                news_path = path.replace(path_root_news, '')
                news_file = open(path, 'r')
                file_content = news_file.read().decode('utf-8', 'ignore').encode('gbk', 'ignore')
                items = file_content.split(sep)
                if len(items) != 4:
                    continue
                title = items[0].strip().decode('utf-8', 'ignore').encode('gbk', 'ignore')
                date_time = items[1].strip()
                if source == path_news_sources[1]:
                    date_time = date_time[:-4]
                    t = time.strptime(date_time, "%a %b %d, %Y %I:%M%p")
                    date_time = time.strftime("%Y-%m-%d %H:%M:%S", t)
                news_date = date_time.split(" ")[0]
                news_time = date_time.split(" ")[1]
                url = items[2].strip()
                content = items[3].strip()
                codes = get_related_symbols(title+" "+content, code_dict)
                print news_path
                print title
                print codes
                file_new_titles.write(title+"\n")
                file_news_info.write(title+"\t"+url+"\t"+news_date+"\t"+news_time+"\t"+news_path+"\t"+codes+"\n")
            except Exception, e:
                print e
                print path
                print items
                exit()

print "finished!"
file_new_titles.close()
file_news_info.close()
