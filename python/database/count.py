__author__ = 'WL'

import os
import json
import sys
reload(sys)
sys.setdefaultencoding('utf8')

path = "../../data/"


f = open(path+"title_company_path.json")
title_path = json.loads(json.load(f))
f.close()

i = 0
for title in title_path:
    i+=1
print("sum: "+str(i))
