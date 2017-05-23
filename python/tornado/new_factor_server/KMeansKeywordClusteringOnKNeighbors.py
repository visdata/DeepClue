'''
Created on 2016-11-21

@author: Lei Shi
'''
import time
import numpy
import math
from scipy import sparse
from scipy import spatial
from sklearn.cluster import KMeans
from sklearn.metrics import pairwise
from sklearn import manifold
from sklearn.metrics import silhouette_samples, silhouette_score
from sklearn.neighbors import NearestNeighbors
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.cm as cm
    

import MySQLdb
import datetime


def str2date(str_date):
    result_date = datetime.datetime.strptime(str_date, "%Y-%m-%d").date()
    return result_date

def findStartAndEndIndex(list_date, start_date, end_date):
    start_date = str2date(start_date)
    end_date = str2date(end_date)
    start_idx = 1
    end_idx = len(list_date)-1
    for i in xrange(1, len(list_date)):
        now_date = str2date(list_date[i])
        if now_date >= start_date:
            start_idx = i
            break
    for i in xrange(len(list_date)-1, 1, -1):
        now_date = str2date(list_date[i])
        if now_date <= end_date:
            end_idx = i
            break
    print list_date[start_idx]
    print list_date[end_idx]
    return start_idx, end_idx

def process(keywordLines, start_date, end_date):
    list_date = keywordLines[0].split(',')     # date headers
    keywordLines = keywordLines[1:] # keyword weights
    start_idx, end_idx = findStartAndEndIndex(list_date, start_date, end_date)
    result_keywordLines = list()
    for line in keywordLines:
        infos = line.split(',')
        result_line = list()
        result_line.append(infos[0])    #keyword
        result_line.extend(infos[start_idx:end_idx+1])
        result_keywordLines.append(','.join(result_line))
    return result_keywordLines

def getKeywordGroups(source, symbol, start_date, end_date, partOfSpeech):
    # compute k-neighbors
    numOfNeighbors = 5
    minNeighborDistance = 2

    nearestNeighborIndexList = []
    nearestNeighborDistanceList = []
    neighborDecayingFactor = 0.7

    # input of parOfSpeech: "noun,verb,adj"  ==> "('noun','verb','adj')"
    partOfSpeech = "('"+partOfSpeech.replace(",", "','")+"')"
    # partOfSpeech = "('noun','verb','adj')"

    db = MySQLdb.connect('localhost', 'root', 'vis_2014', 'FinanceVis')
    cursor = db.cursor()
    date_label = '#date#'
    # reading keyword embedding from database
    table = 'new_keyword_news'
    if source == 'twitter':
        table = 'all_keyword_'+source
    sql = 'select keyword, embedding, weight_list from '+table+' where symbol=%s and POS in '+partOfSpeech
    param = (symbol, )
    cursor.execute(sql, param)
    results = cursor.fetchall()
    print sql % param
    print len(results)
    keywordEmbeddingLines = list()
    keywordLines = list()
    for row in results:
        keyword = row[0].replace(',', '')
        if keyword==date_label:
            continue
        # if keyword=='pat' and symbol=='AAPL':
        #     keyword = 'patent'  # pat => patent for apple
        #     print keyword
        embedding = row[1]
        weight = row[2]
        embeddingLine = keyword+',' + ','.join(embedding.split(' '))
        weightLine = keyword + ',' + weight
        keywordEmbeddingLines.append(embeddingLine)
        keywordLines.append(weightLine)

    sql = 'select weight_list from '+table+' where symbol=%s and keyword=%s'
    param = (symbol, date_label)
    cursor.execute(sql, param)
    results = cursor.fetchall()
    date_line = ','+results[0][0]
    keywordLines.insert(0, date_line)
    cursor.close()
    db.close()

    # # Reading file keyword embedding info
    # filename = "keyword_embedding/keyword_embedding_%s.csv" % symbol
    # content = file(filename, 'r').read()
    # keywordEmbeddingLines = content.split("\r\n")
    # print keywordEmbeddingLines[0]
    #
    # # Reading file keyword weight info
    # filename = "keyword_weight/keyword_weight_%s.csv" % symbol
    # content = file(filename, 'r').read()
    # keywordLines = content.split("\r\n")


    keywordLines = process(keywordLines, start_date, end_date)

    # Parsing file content to keyword list and vector list

    numOfKeywords = 0
    lengthOfKeywordVector = 0

    keywordList = []
    keywordVectorMatrix = []

    start_time = time.time()

    for keywordLine in keywordEmbeddingLines:
        keywordLength = keywordLine.find(',')
        if keywordLength<=0:
            continue

        keyword = keywordLine[:keywordLength]
        keywordVector = numpy.fromstring(keywordLine[keywordLength+1:], sep=',')

        keywordList.append(keyword)
        keywordVectorMatrix.append(keywordVector)
        numOfKeywords=numOfKeywords + 1

        if numOfKeywords==1:
            lengthOfKeywordVector = len(keywordVector)
        elif lengthOfKeywordVector!=len(keywordVector):
            print "Line ", numOfKeywords, " has invalid number of relevance components: ", str(len(keywordVector)), " should be ", str(lengthOfKeywordVector)


    keywordNeighbor = NearestNeighbors(n_neighbors=numOfNeighbors, algorithm='auto').fit(keywordVectorMatrix)
    nearestNeighborDistanceList, nearestNeighborIndexList = keywordNeighbor.kneighbors(keywordVectorMatrix)

    # for index, keyword in enumerate(keywordList):
    #     print keyword,': '
    #     neighbors = [keywordList[n] for n in nearestNeighborIndexList[index]]
    #     print neighbors
    #     distances = nearestNeighborDistanceList[index]
    #     print distances


    # filter neighbor list
    nearestNeighborIndexList_new = []

    for index in range(len(nearestNeighborIndexList)):
        nearestNeighborIndexList_new.append([nearestNeighborIndexList[index][i] for i in range(len(nearestNeighborIndexList[index])) if nearestNeighborDistanceList[index][i] <= minNeighborDistance])

    nearestNeighborIndexList = nearestNeighborIndexList_new

    print 'Time for loading data and compute nearest neighbor:', time.time() - start_time

    # for index, keyword in enumerate(keywordList):
    #     print keyword,': '
    #     neighbors = [keywordList[n] for n in nearestNeighborIndexList[index]]
    #     print neighbors
    #     distances = nearestNeighborDistanceList[index]
    #     print distances

    # settings

    useSparseMatrix = True

    maxNumOfKeywords = 200
    maxLengthOfVectors = -1
    startVectorLoc = 0

    useNormalizedVector = True
    useBinaryVector = False
    useWeightedSilhouette = False

    showSilhouettePlot = False
    addProjectionPoles = True
    addPosNegPoles = False
    useTSNEEmbedding = False
    showRiseFallColor = False
    showSingleColor = False
    useMarkerType = False

    projectionDistanceMetric = 'euclidean'
    clusteringDistanceMetric = 'euclidean'

    aggregationWindowSize = 5
    minWindowNum = 4


    numOfIter = 300
    numOfInit = 10
    numOfMaxCluster = 10

    # Parsing file content to keyword list and vector list

    numOfKeywords = 0
    lengthOfKeywordVector = 0

    keywordList = []
    keywordWeightList= []
    keywordL1WeightList= []
    # keywordPosWeightList=[]
    # keywordNegWeightList=[]
    keywordSumWeightList=[]
    keywordVectorMatrix = []


    start_time = time.time()


    # parse all keywords

    keywordVectors = []
    keywords= []

    for keywordLine in keywordLines:

        keywordLength = keywordLine.find(',')

        if keywordLength<=0:
            continue

        keyword = keywordLine[:keywordLength]
        keywordVector = numpy.fromstring(keywordLine[keywordLength+1:], sep=',')

        keywordVectors.append(keywordVector)
        keywords.append(keyword)

    # parse keywords again

    for keywordIndex in range(len(keywords)):

        keywordVector = keywordVectors[keywordIndex]

        if maxLengthOfVectors > 0:
            keywordVector = keywordVector[startVectorLoc:(startVectorLoc+maxLengthOfVectors)]

        if numpy.linalg.norm(keywordVector)<=0:
            continue

        # aggregate keywords by k-neighbors

        keyword = keywords[keywordIndex]

        keywordVector = keywordVectors[nearestNeighborIndexList[keywordIndex][0]]

        for i in range(1, len(nearestNeighborIndexList[keywordIndex])):
            keywordVector = numpy.add(keywordVector, numpy.multiply(keywordVectors[nearestNeighborIndexList[keywordIndex][i]], neighborDecayingFactor))

        # truncate keywordVector with [:maxLengthOfVectors], only for test purpose

        if maxLengthOfVectors > 0:
            keywordVector = keywordVector[startVectorLoc:(startVectorLoc+maxLengthOfVectors)]

        # aggregate keywordVector by a moving window

        if aggregationWindowSize > 1 and len(keywordVector) > (aggregationWindowSize * minWindowNum):
            numOfWindow = int(math.ceil(len(keywordVector)/float(aggregationWindowSize)))
            keywordVector = [sum(keywordVector[i*aggregationWindowSize:(i+1)*aggregationWindowSize]) for i in range(numOfWindow)]

        # L2 norm of keyword vector as weight

        keywordWeight = numpy.linalg.norm(keywordVector)
        keywordL1Weight = numpy.linalg.norm(keywordVector, ord=1)

    #     keywordPosWeight = numpy.linalg.norm(numpy.select([keywordVector>0],[keywordVector]))
    #     keywordNegWeight = numpy.linalg.norm(numpy.select([keywordVector<0],[keywordVector]))

        if keywordWeight<=0:
            continue

        # normalize keyword vector

        if useNormalizedVector:
            keywordVector/= keywordWeight

        if useBinaryVector:
            keywordSumWeight = numpy.sum(numpy.sign(keywordVector))
        else:
            keywordSumWeight = numpy.sum(keywordVector)

        keywordList.append(keyword)
        keywordWeightList.append(keywordWeight)
        keywordL1WeightList.append(keywordL1Weight)
    #     keywordPosWeightList.append(keywordPosWeight)
    #     keywordNegWeightList.append(keywordNegWeight)
        keywordSumWeightList.append(keywordSumWeight)
        keywordVectorMatrix.append(keywordVector)
        numOfKeywords=numOfKeywords + 1

        if numOfKeywords==1:
            lengthOfKeywordVector = len(keywordVector)
        elif lengthOfKeywordVector!=len(keywordVector):
            print "Line ", numOfKeywords, " has invalid number of relevance components: ", str(len(keywordVector)), " should be ", str(lengthOfKeywordVector)


    print 'Time for loading data:', time.time() - start_time

    start_time = time.time()


    # select top keywords

    if numOfKeywords > maxNumOfKeywords:
        numOfKeywords = maxNumOfKeywords

    sortedIndex = sorted(range(len(keywordL1WeightList)), key=lambda k: keywordL1WeightList[k], reverse=True)
    sortedIndex = sortedIndex[:maxNumOfKeywords]

    keywordList = [keywordList[index] for index in sortedIndex]
    keywordWeightList= [keywordWeightList[index] for index in sortedIndex]
    keywordL1WeightList= [keywordL1WeightList[index] for index in sortedIndex]
    # keywordPosWeightList= [keywordPosWeightList[index] for index in sortedIndex]
    # keywordNegWeightList= [keywordNegWeightList[index] for index in sortedIndex]
    keywordSumWeightList= [keywordSumWeightList[index] for index in sortedIndex]
    keywordVectorMatrix = [keywordVectorMatrix[index] for index in sortedIndex]


    # sum of used keyword weights

    totalKeywordWeight = sum(keywordWeightList)

    # use binary keyword vector

    if useBinaryVector:
        for i in range(len(keywordVectorMatrix)):
            keywordVectorMatrix[i] = numpy.sign(keywordVectorMatrix[i])


    # convert keyword vectors to sparse matrix

    embeddingMatrix = keywordVectorMatrix
    keywordVectorMatrix = numpy.matrix(keywordVectorMatrix)

    # compute distance matrix among keywords

    if addProjectionPoles:

        sumEmbeddingMatrix = numpy.sum(embeddingMatrix, axis=0)

        # made to binary vectors
        for i in range(len(embeddingMatrix)):
            embeddingMatrix[i] = numpy.sign(embeddingMatrix[i])

        posPole = numpy.absolute(numpy.sign(sumEmbeddingMatrix))
        neuPole = [0]*lengthOfKeywordVector
        negPole = numpy.negative(posPole)

        # add poles

        if addPosNegPoles:
            embeddingMatrix.append(posPole)
            embeddingMatrix.append(neuPole)
            embeddingMatrix.append(negPole)
            keywordSumWeightList.extend([numpy.sum(posPole),numpy.sum(neuPole),numpy.sum(negPole)])
            keywordList.extend(['#POS','#NEU','#NEG'])
        else:
            embeddingMatrix.append(neuPole)
            keywordSumWeightList.extend([numpy.sum(neuPole)])
            keywordList.extend(['#NEU'])

    keywordDistanceMatrix = pairwise.pairwise_distances(embeddingMatrix, metric=projectionDistanceMetric, n_jobs=1)

    # compute an embedding for projection plot

    # use MDS
    embedding = manifold.MDS(n_components=2, dissimilarity="precomputed", n_jobs=1)
    keywordMDSEmbeddingPos = embedding.fit(keywordDistanceMatrix).embedding_

    # tSNE
    #embedding = manifold.TSNE(n_components=2, metric="precomputed")
    #keywordTSNEEmbeddingPos = embedding.fit(keywordDistanceMatrix).embedding_

    keywordTSNEEmbeddingPos = keywordMDSEmbeddingPos

    keywordDistanceMatrix = pairwise.pairwise_distances(keywordVectorMatrix, metric=clusteringDistanceMetric, n_jobs=1)


    if useSparseMatrix:
        keywordVectorMatrix = sparse.csr_matrix(keywordVectorMatrix)

    print 'Time for computing distance and embedding:', time.time() - start_time


    # k-mean clustering with sparse feature matrix

    bestKeywordClusterList = []
    bestNumOfCluster = -1
    bestSilhouette = -2
    initialSilhouette = -2

    for numOfClusters in range(2,numOfMaxCluster+1):

        start_time = time.time()

        # k-mean clustering

        kmeans = KMeans(n_clusters=numOfClusters, max_iter=numOfIter, n_init=numOfInit, n_jobs=1, verbose=0, random_state=0)
        kmeans.fit_predict(keywordVectorMatrix)

        #print kmeans.labels_

        # retrieve the clustering result
        keywordClusterList = [None]*numOfClusters

        for clusterIndex in range(numOfClusters):
            keywordClusterList[clusterIndex] = [i for i, x in enumerate(kmeans.labels_) if x == clusterIndex]

        # compute weighted silhouette measure
        a = [None] * numOfKeywords
        b = [None] * numOfKeywords
        s = [None] * numOfKeywords

        weighted_s = 0.0

        for keywordIndex in range(numOfKeywords):
            keywordVector = keywordVectorMatrix.getrow(keywordIndex)
            keywordClusterIndex = kmeans.labels_[keywordIndex]
            keywordCluster = keywordClusterList[keywordClusterIndex]

            # compute a[], average distance within the same cluster

            sum_a = 0.0
            for sameClusterIndex in range(len(keywordCluster)):
                if keywordCluster[sameClusterIndex] == keywordIndex:
                    continue

                sum_a = sum_a + keywordDistanceMatrix[keywordIndex][keywordCluster[sameClusterIndex]]

            if len(keywordCluster) > 1:
                a[keywordIndex] = sum_a/(len(keywordCluster)-1)
            else:
                a[keywordIndex] = 0.0

            # print a[keywordIndex]

            # compute b[], lowest average distance to any other cluster

            min_b = 'Inf'
            for clusterIndex in range(numOfClusters):
                if keywordClusterIndex == clusterIndex:
                    continue

                newCluster = keywordClusterList[clusterIndex]

                if len(newCluster)<=0:
                    continue

                sum_b = 0.0
                for newClusterIndex in range(len(newCluster)):
                    sum_b = sum_b + keywordDistanceMatrix[keywordIndex][newCluster[newClusterIndex]]

                avg_b = sum_b/len(newCluster)

                if avg_b < min_b:
                    min_b = avg_b

            b[keywordIndex] = min_b

            # compute s[]

            s[keywordIndex] = (b[keywordIndex]-a[keywordIndex])/max(a[keywordIndex],b[keywordIndex])

            if useWeightedSilhouette == True:
                weighted_s = weighted_s + (keywordWeightList[keywordIndex]*numOfKeywords/totalKeywordWeight) * s[keywordIndex]
            else:
                weighted_s = weighted_s + s[keywordIndex]

        # find the best clustering
        weighted_s = weighted_s/numOfKeywords

        if numOfClusters==2:
            initialSilhouette = weighted_s

        if bestNumOfCluster < 0 or (weighted_s-initialSilhouette)/max(1.0,float(numOfClusters-2)) > (bestSilhouette-initialSilhouette)/max(1.0,float(bestNumOfCluster-2)):
            bestSilhouette = weighted_s
            bestNumOfCluster = numOfClusters
            bestKeywordClusterList = keywordClusterList

        #if showSilhouettePlot==False:
        print 'Num of clusters = ',str(numOfClusters), ', Num of keywords = ', str(numOfKeywords), ', Silhouette = ',str(weighted_s)

        print 'Time for clustering:', time.time() - start_time

        # create silhouette plot

        if showSilhouettePlot:

            # Create a subplot with 1 row and 2 columns
            fig, (ax1, ax2) = plt.subplots(1, 2)
            fig.set_size_inches(18, 7)

            # The 1st subplot is the silhouette plot
            # The silhouette coefficient can range from -1, 1 but in this example all
            # lie within [-0.1, 1]
            ax1.set_xlim([-0.1, 1])
            # The (n_clusters+1)*10 is for inserting blank space between silhouette
            # plots of individual clusters, to demarcate them clearly.
            ax1.set_ylim([0, numOfKeywords + (numOfClusters + 1) * 10])

            # Initialize the clusterer with n_clusters value and a random generator
            # seed of 10 for reproducibility.
            cluster_labels = kmeans.labels_

            # The silhouette_score gives the average value for all the samples.
            # This gives a perspective into the density and separation of the formed
            # clusters
            silhouette_avg = sum(s)/float(len(s))

            #print "For n_clusters =", numOfClusters, ", n_keywords =", numOfKeywords, ", The average silhouette_score is :", silhouette_avg

            # Compute the silhouette scores for each sample
            sample_silhouette_values = s

            y_lower = 10
            for i in range(numOfClusters):
                # Aggregate the silhouette scores for samples belonging to
                # cluster i, and sort them

                ith_cluster_silhouette_values = [sample_silhouette_values[index] for index in keywordClusterList[i]]

                ith_cluster_silhouette_values.sort()

                size_cluster_i = len(ith_cluster_silhouette_values)
                y_upper = y_lower + size_cluster_i

                color = cm.spectral(float(i) / numOfClusters)
                ax1.fill_betweenx(numpy.arange(y_lower, y_upper),
                                  0, ith_cluster_silhouette_values,
                                  facecolor=color, edgecolor=color, alpha=0.7)

                # Label the silhouette plots with their cluster numbers at the middle
                ax1.text(-0.05, y_lower + 0.5 * size_cluster_i, str(i))

                # Compute the new y_lower for next plot
                y_lower = y_upper + 10  # 10 for the 0 samples

            ax1.set_title("The silhouette plot for the various clusters.")
            ax1.set_xlabel("The silhouette coefficient values")
            ax1.set_ylabel("Cluster label")

            # The vertical line for average silhouette score of all the values
            ax1.axvline(x=silhouette_avg, color="red", linestyle="--")

            ax1.set_yticks([])  # Clear the yaxis labels / ticks
            ax1.set_xticks([-0.1, 0, 0.2, 0.4, 0.6, 0.8, 1])

            # 2nd Plot showing the actual clusters formed

            colors = cm.spectral(cluster_labels.astype(float) / numOfClusters)
            riseFallColor=['red','black','green']

            if showSingleColor:
                colors = 'black'
            if showRiseFallColor:
                colors = [riseFallColor[int(numpy.sign(keywordSumWeightList[i]))+1] for i in range(len(keywordSumWeightList))]
            elif addProjectionPoles and addPosNegPoles:
                colors = cm.spectral(numpy.append(cluster_labels.astype(float),[0,0,0]) / numOfClusters)
            elif addProjectionPoles:
                colors = cm.spectral(numpy.append(cluster_labels.astype(float),[0]) / numOfClusters)

            sizes = 50

            if addProjectionPoles and addPosNegPoles:
                sizes = [50]*(len(keywordList)-3)
                sizes.extend([100,300,500])
            elif addProjectionPoles:
                sizes = [50]*(len(keywordList)-1)
                sizes.extend([300])

            all_filled_markers = ['o', 'v', '^', '<', '>', '8', 's', 'p', '*', 'h', 'H', 'D', 'd','.']

            markers = 'o'

            if useMarkerType:
                markers = [all_filled_markers[label%len(all_filled_markers)] for label in cluster_labels]
                if addProjectionPoles and addPosNegPoles:
                    markers.extend(['o','o','o'])
                elif addProjectionPoles:
                    markers.extend(['o'])

                if useTSNEEmbedding:
                    for d_index in range(len(keywordTSNEEmbeddingPos[:, 0])):
                        ax2.scatter(keywordTSNEEmbeddingPos[d_index, 0], keywordTSNEEmbeddingPos[d_index, 1], marker=markers[d_index], s=sizes[d_index], lw=0, alpha=1,
                            c=colors[d_index])
                else:
                    for d_index in range(len(keywordMDSEmbeddingPos[:, 0])):
                        ax2.scatter(keywordMDSEmbeddingPos[d_index, 0], keywordMDSEmbeddingPos[d_index, 1], marker=markers[d_index], s=sizes[d_index], lw=0, alpha=1,
                            c=colors[d_index])
            else:
                if useTSNEEmbedding:
                    ax2.scatter(keywordTSNEEmbeddingPos[:, 0], keywordTSNEEmbeddingPos[:, 1], marker=markers, s=sizes, lw=0, alpha=1,
                        c=colors)
                else:
                    ax2.scatter(keywordMDSEmbeddingPos[:, 0], keywordMDSEmbeddingPos[:, 1], marker=markers, s=sizes, lw=0, alpha=1,
                        c=colors)

            # Labeling the clusters
        #    centers = kmeans.cluster_centers_
            # Draw white circles at cluster centers
        #     ax2.scatter(centers[:, 0], centers[:, 1],
        #                 marker='o', c="white", alpha=1, s=200)
        #
        #     for i, c in enumerate(centers):
        #         ax2.scatter(c[0], c[1], marker='$%d$' % i, alpha=1, s=50)

            ax2.set_title("The visualization of the clustered data.")
            ax2.set_xlabel("Feature space for the 1st feature")
            ax2.set_ylabel("Feature space for the 2nd feature")

            plt.suptitle(("Silhouette analysis for KMeans clustering on sample data "
                          "with n_clusters = %d, n_keywords = %d" % (numOfClusters, numOfKeywords)),
                         fontsize=14, fontweight='bold')

            plt.show()

    print 'Best num of cluster = ',str(bestNumOfCluster)
    print 'Best silhouette = ',str(bestSilhouette)

    # sort bestKeywordClusterList by summed weight of each cluster

    bestKeywordClusterWeightList = [sum([keywordL1WeightList[index] for index in keywordCluster]) for keywordCluster in bestKeywordClusterList]

    bestKeywordClusterListOverallRelevance = [[keywordList[index] for index in keywordCluster] for keywordCluster in bestKeywordClusterList]

    sortedIndex = sorted(range(len(bestKeywordClusterListOverallRelevance)), key=lambda k: bestKeywordClusterWeightList[k], reverse=True)


    # keyword clusters sorted by overall relevance weight

    bestKeywordClusterListOverallRelevance = [bestKeywordClusterListOverallRelevance[index] for index in sortedIndex]


    # keyword clusters sorted by positive relevance weight

    for index, keywordCluster in enumerate(bestKeywordClusterList):
        sortedIndex = sorted(range(len(keywordCluster)), key=lambda k: keywordSumWeightList[keywordCluster[k]], reverse=True)
        keywordCluster = [keywordCluster[i] for i in sortedIndex]
        bestKeywordClusterList[index] = keywordCluster

    bestKeywordClusterWeightList = [sum([keywordSumWeightList[index] for index in keywordCluster]) for keywordCluster in bestKeywordClusterList]

    bestKeywordClusterListPosRelevance = [[keywordList[index] for index in keywordCluster] for keywordCluster in bestKeywordClusterList]

    sortedIndex = sorted(range(len(bestKeywordClusterListPosRelevance)), key=lambda k: bestKeywordClusterWeightList[k], reverse=True)

    bestKeywordClusterListPosRelevance = [bestKeywordClusterListPosRelevance[index] for index in sortedIndex]


    # keyword clusters sorted by negative relevance weight

    for index, keywordCluster in enumerate(bestKeywordClusterList):
        sortedIndex = sorted(range(len(keywordCluster)), key=lambda k: keywordSumWeightList[keywordCluster[k]])
        keywordCluster = [keywordCluster[i] for i in sortedIndex]
        bestKeywordClusterList[index] = keywordCluster

    bestKeywordClusterWeightList = [sum([keywordSumWeightList[index] for index in keywordCluster]) for keywordCluster in bestKeywordClusterList]

    bestKeywordClusterListNegRelevance = [[keywordList[index] for index in keywordCluster] for keywordCluster in bestKeywordClusterList]

    sortedIndex = sorted(range(len(bestKeywordClusterListNegRelevance)), key=lambda k: bestKeywordClusterWeightList[k])

    bestKeywordClusterListNegRelevance = [bestKeywordClusterListNegRelevance[index] for index in sortedIndex]


    # keyword list sorted by three kinds of relevances

    # bestKeywordClusterListOverallRelevance
    # bestKeywordClusterListPosRelevance
    # bestKeywordClusterListNegRelevance
    #
    # # embedding coordinate, including "#POS/#NEU/#NEG"
    #
    # keywordList
    # keywordTSNEEmbeddingPos
    # keywordMDSEmbeddingPos
    # keywordSumWeightList
    #
    print bestKeywordClusterListOverallRelevance

    dict_result = {}
    dict_result['groups'] = bestKeywordClusterListOverallRelevance
    # dict_result['groups'] = test_group
    dict_result['all_relevance'] = bestKeywordClusterListOverallRelevance
    dict_result['pos_relevance'] = bestKeywordClusterListPosRelevance
    dict_result['neg_relevance'] = bestKeywordClusterListNegRelevance
    dict_result['keywordMapList'] = keywordList
    dict_result['pos_tSNE'] = [[round(pos[0],3), round(pos[1], 3)] for pos in keywordTSNEEmbeddingPos.tolist()]
    dict_result['pos_MDS'] = [[round(pos[0],3), round(pos[1], 3)] for pos in keywordMDSEmbeddingPos.tolist()]
    dict_result['keywordWeight'] = [round(weight, 3) for weight in keywordSumWeightList]
    return dict_result

if __name__ == "__main__":
    source = 'news'
    symbol = 'AAPL'
    partOfSpeech = "noun,verb,adj"
    partOfSpeech = "noun"
    # partOfSpeech = "noun,verb,adj,other"
    groups = getKeywordGroups(source, symbol, '2011-09-30', '2011-12-28', partOfSpeech)
