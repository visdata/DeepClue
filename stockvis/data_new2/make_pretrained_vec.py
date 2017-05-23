#!/usr/bin/env python
import sys
import traceback

word_set = set()
if len(sys.argv) != 3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)

def load_file(file_path):
    global word_set
    input_file = open(file_path, "r")
    while True:
        try:
            line_start_items = input_file.next().strip().split()
            assert(len(line_start_items) == 4)
            num_titles = int(line_start_items[1])
            for i in range(num_titles):
                title = input_file.next().strip().split("|||")
                for word in title[0].split():
                    word_set.add(word)
        except:
            traceback.print_exc()
            break

load_file("GSPC.train.clean.csv")
load_file("GSPC.dev.clean.csv")
load_file("GSPC.test.clean.csv")

glove_path = sys.argv[1]
glove_file = open(glove_path, "r")
output_file = open(sys.argv[2]+".pretrained.vec", "w")
for line in glove_file:
    items = line.strip().split()
    if items[0].strip() in word_set:
        output_file.write(line)
