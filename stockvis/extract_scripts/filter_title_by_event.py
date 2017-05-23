#!/usr/bin/env python

import sys
import traceback

if len(sys.argv)!= 4:
    print 'Usage: %s event_dic input output' % sys.argv[0]
    sys.exit(0)
event_file = open(sys.argv[1], "r")
event_set = set()
for line in event_file:
    event_set.add(line.strip())

input_file = open(sys.argv[2],"r")
output_file = open(sys.argv[3],"w")
before_count = 0
after_count = 0
while True:
    try:
        price_line = input_file.next()
        #print price_line
        num_titles = int(input_file.next().strip())
        title_buffer = []
        before_count +=1
        for i in range(num_titles):
            title_line = input_file.next()
            title_items = title_line.strip().split("|||")
            title = title_items[0]
            #company_list = title_items[2].strip().split()
            #if len(company_list) == 0:
            #    print '[empty comp]: ', title_line.strip()
            #    continue
            words = title.strip().split()
            alive = False
            for word in words:
                if word in event_set:
                    alive = True
                    break
            if alive:
                title_buffer.append(title_line)
            else:
                print 'filtered: ', title_line.strip()
        if len(title_buffer)>0:
            after_count += 1
            output_file.write(price_line)
            output_file.write("%d\n" % len(title_buffer))
            for i in range(len(title_buffer)):
                output_file.write(title_buffer[i])
    except:
        traceback.print_exc()
        break
print "before, after, ", before_count, after_count
