#!/usr/bin/env python
# coding=utf-8
import sys
import traceback
import nltk
import re
from nltk.stem import *
from nltk.corpus import stopwords

if len(sys.argv)!=3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)


def isNumber(s):
    try:
        float(s)
    except:
        '''numObj = re.match("([0-9]{1,},{0,1}[0-9]{1,})+", s) 
        if numObj is None:
            return False
        so = numObj.group()
        if len(so) == len(s):
            print s
            return True
        '''
        return False
    return True

input_file = open(sys.argv[1], "r")
output_file = open(sys.argv[2], "w")
stemmer = PorterStemmer()
stop = stopwords.words('english')
keepwords = set([line.strip() for line in open('./stopwords.keep', 'r')])

while True:
    try:
        first_line = input_file.next()
        num_titles = int(first_line.split()[1])
        output_file.write(first_line)
        for i in range(num_titles):
            words = input_file.next().strip().lower().split()
            for j in range(len(words)):
                #if len(words[j]) == 1: #drop single character
                #    print words[j]
                #    words[j]=""
                if isNumber(words[j]):
                    words[j] = "<NUM>"
                else:
                    #try:
                    #    words[j] = stemmer.stem(words[j])
                    #except:
                    #    words[j] = ""
                    if words[j].decode('utf-8') in stop and words[j] not in keepwords:
                        #print words[j]
                        words[j] =''
            output_line = " ".join(words)
            output_file.write(output_line+"\n")
    except:
        traceback.print_exc()
        break

output_file.close()
input_file.close()
