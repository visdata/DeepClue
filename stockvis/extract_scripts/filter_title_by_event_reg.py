#!/usr/bin/env python

import sys
import traceback
import re

if len(sys.argv)!= 4:
    print 'Usage: %s event_list input output' % sys.argv[0]
    sys.exit(0)
event_file = open(sys.argv[1], "r")
event_set = set()
for line in event_file:
    #print line.strip().replace("__", ".*").replace("_", ".*")
    event_set.add(line.strip().replace("__", ".*").replace("_", ".*"))

input_file = open(sys.argv[2],"r")
output_file = open(sys.argv[3],"w")

while True:
    try:
        price_line = input_file.next()
        print price_line
        num_titles = int(input_file.next().strip())
        title_buffer = []
        for i in range(num_titles):
            title_line = input_file.next()
            title_items = title_line.strip().split("|||")
            title = title_items[0].strip()
            alive = False
            broken_set=set()
            for wordrep in event_set: #expensive
                eventObj = None
                try:
                    eventObj = re.search(wordrep, title)
                except:
                    broken_set.add(wordrep)
                    continue
                if not (eventObj is None):
                    alive = True
                    break
            if alive:
                title_buffer.append(title_line)
            else:
                print 'filtered: ', title_line.strip()
            for item in broken_set:
                print 'Remove:', item
                event_set.remove(item)
        if len(title_buffer)>0:
            output_file.write(price_line)
            output_file.write("%d\n" % len(title_buffer))
            for i in range(len(title_buffer)):
                output_file.write(title_buffer[i])
    except:
        traceback.print_exc()
        break
