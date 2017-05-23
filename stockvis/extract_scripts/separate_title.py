#!/usr/bin/env python

import sys
import traceback

if len(sys.argv)!= 3:
    print 'Usage: %s input output' % sys.argv[0]
    sys.exit(0)

input_file = open(sys.argv[1],"r")
output_file = open(sys.argv[2],"w")
for line in input_file:
    cur_line = line.strip().split("|||")
    output_file.write("%s\n"%cur_line[0].strip())
