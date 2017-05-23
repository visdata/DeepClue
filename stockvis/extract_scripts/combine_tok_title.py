#!/usr/bin/env python

import sys
import traceback

if len(sys.argv)!= 4:
    print 'Usage: %s input tok output' % sys.argv[0]
    sys.exit(0)

input_file = open(sys.argv[1],"r")
token_file = open(sys.argv[2], "r")
output_file = open(sys.argv[3],"w")
while True:
    try:
        old_line = input_file.next().strip().split("|||")
        #print old_line
        token_line = token_file.next().strip()
        old_line[0] = token_line
        output_file.write(" ||| ".join( old_line ) +"\n")
    except:
        traceback.print_exc()
        break
