#!/usr/bin/env python
# coding=utf-8
import sys
import traceback
import nltk
import re
from nltk.stem import *
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

if len(sys.argv)!=3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)


def isNumber(s):
    try:
        float(s)
    except:
        pattern = "([0-9]+,)*[0-9]+(\.[0-9]+)*"
        numObj = re.search(pattern, s) 
        if numObj is None:
            return False
        so = numObj.group()
        if len(so) == len(s):
            #print s
            return True
        else:
            alphaObj = re.search("[a-z]+", s)
            if alphaObj is None:
                #print "[log] ", so, s
                return True
            else:
                #print "[false log] ", so, s
                return False
        return False
    return True

def clean_line(word_line):
        word_line = word_line.strip().replace("’", "'").replace("‘", "'").replace("”", "\"").replace("“", "\"").replace(" "," ")
        word_line = word_line.replace("<NUM>", "***num***")
        #words = word_line.strip().split()
        words=[]
        try:
            words = nltk.word_tokenize(word_line)
        except:
            #print word_line
            words = word_line.strip().split()
        for j in range(len(words)):
            if isNumber(words[j]):
                words[j] = "<num>"
            else:
                try:
                    if len(words[j])>=4:
                        temp_word = wordnet_lemmatizer.lemmatize(words[j], 'v')
                        if cmp(temp_word, words[j]) == 0:
                            temp_word = wordnet_lemmatizer.lemmatize(words[j], 'n')
                        #if temp_word != words[j]:
                            #print 'stem: ', words[j], temp_word
                        words[j] = temp_word.encode('utf-8')
                except:
                    print 'stem error: ', words[j]
                    #print traceback.print_exc()
                    #continue
                    #sys.exit(0)
                    words[j] = ""
                    pass
        output_line = " ".join(words).lower()
        output_line = output_line.replace("***num***", "<num>")
        return output_line


input_file = open(sys.argv[1], "r")
output_file = open(sys.argv[2], "w")
wordnet_lemmatizer = WordNetLemmatizer()

while True:
    try:
        first_line = input_file.next()
        num_titles = int(first_line.split()[1])
        output_file.write(first_line)
        for i in range(num_titles):
            word_line, company_line = input_file.next().strip().split("|||")
            output_line = clean_line(word_line)
            output_file.write(output_line+" ||| "+company_line+"\n")
    except:
        traceback.print_exc()
        break

output_file.close()
input_file.close()
