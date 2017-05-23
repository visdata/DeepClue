import csv

def judge(stock, price):
    path='../../data/500SP_csv/'+stock+'.csv'
    csvfile = file(path, 'rb')
    reader = csv.reader(csvfile)
    d={}
    dict_price={'open':1,'high':2,'low':3,'close':4,'volume':5,'adjclose':6}
    index=dict_price[price]
    for line in reader:
        if reader.line_num ==1:
            continue

        if reader.line_num == 2:
            t=float(line[index])
            dt=line[0]
            continue

        if t>=float(line[index]):
            d[dt]=1

        if t<float(line[index]):
            d[dt]=-1

        dt=line[0]
        t=float(line[index])
    csvfile.close()
    return d