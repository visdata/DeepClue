from itertools import *
import math
import numpy
import time

start = time.time()
for t in xrange(1800):
    size = 2000
    arr = range(size)

    # arr_idx = [d/5 for d in arr]
    # group_sum = numpy.bincount(arr_idx, weights=arr)

    numOfWindow = int(math.ceil(len(arr)/float(5)))
    keywordVector = [sum(arr[i*5:(i+1)*5]) for i in xrange(numOfWindow)]

    # print keywordVector

    # print numpy.array_equal(group_sum, numpy.array(keywordVector))

    # break

    # # print arr_idx
    # np_arr = numpy.array(arr)
    # np_arr_idx = numpy.array(arr_idx)
    # groups = numpy.unique(np_arr_idx)
    # arr_sum = list()
    # for group in groups:
    #     arr_sum.append(np_arr[np_arr_idx==group].sum())

print 'finished! time: %f s' % (time.time()-start)
# print arr_sum
# print keywordVector