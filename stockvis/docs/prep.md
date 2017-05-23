这里记录预处理的相关的文档。
##1.extract_bloomberg.sh
抽取bloomberg的新闻。  
需要用到match_company_name2.py去匹配公司名。  
match_company_name2是人工设计的, 可能有些噪声。  
注意这里有可能某些新闻一个公司名也没有匹配到。不知道Ding是怎么处理的。现在是全部留下来了。  
抽取区间，完全参考dingxiao paper中的时间划分。  
##2.run_time_format.sh
这个脚本把抽取出来的时间规范化成一种格式。  
bloomberg的没有问题。  
retuers的时区有EDT和EST两个，最开始的时候我是处理了，分别+4和+5的位移。现在假设不处理，看看会是怎么样。
##3.sort.sh
按时间排序  
依靠sort_by_time.py  
##4.tok.sh
对英文进行tok


