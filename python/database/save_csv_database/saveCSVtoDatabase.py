import MySQLdb
import os

db = MySQLdb.connect("127.0.0.1", "root", "vis_2014", "Stock")
cursor = db.cursor()

path_csv = '/data1/500Stock_Prices/'
files = os.listdir(path_csv)
for f in files:
    try:
        symbol = f.split('.')[0]
        table_symbol = symbol + "_stock"
        cursor.execute("DROP TABLE IF EXISTS " + table_symbol)
        sql_create = """create table %s(Date varchar(15), Open VARCHAR(15), High VARCHAR(15),
              Low VARCHAR(15), Close VARCHAR(15), Volume VARCHAR(15), Adj_close VARCHAR(15))""" % table_symbol
        cursor.execute(sql_create)
        sql_insert = """load data infile '%s' into table %s fields terminated by ','
                optionally enclosed by '\"' escaped by '\"'
                lines terminated by '\n'""" % (path_csv+f, table_symbol)
        cursor.execute(sql_insert)
        db.commit()
    except Exception, e:
        print f
        print e
        db.rollback()
        # break
db.close()


