'''
Created on 2016-11-21

@author: Lei Shi
'''
import time
import numpy
from scipy import sparse
from scipy import spatial
from sklearn.cluster import KMeans
from sklearn.metrics import pairwise
from sklearn import manifold
from sklearn.metrics import silhouette_samples, silhouette_score
import matplotlib.pyplot as plt
import matplotlib.cm as cm

# settings

useSparseMatrix = True

maxNumOfKeywords = 200
maxLengthOfVectors = -1
useNormalizedVector = True
useBinaryVector = False

showSilhouettePlot = False
useWeightedSilhouette = True 
useTSNEEmbedding = False

numOfIter = 300
numOfInit = 10
numOfMaxCluster = 15

def getKeywordGroups(symbol):
    # Reading file
    filename = "keywords/keyword_weight_%s.csv" % symbol
    content = file(filename, 'r').read()
    keywordLines = content.split("\n")

    # Parsing file content to keyword list and vector list

    numOfKeywords = 0
    lengthOfKeywordVector = 0

    keywordList = []
    keywordWeightList= []
    keywordVectorMatrix = []

    for keywordLine in keywordLines:
        keywordLength = keywordLine.find(',')
        if keywordLength<=0:
            continue

        keyword = keywordLine[:keywordLength]
        keywordVector = numpy.fromstring(keywordLine[keywordLength+1:], sep=',')

        # truncate keywordVector with [:maxLengthOfVectors], only for test purpose

        if maxLengthOfVectors > 0:
            keywordVector = keywordVector[:maxLengthOfVectors]

        # L2 norm of keyword vector as weight

        keywordWeight = numpy.linalg.norm(keywordVector)

        if keywordWeight<=0:
            continue

        # normalize keyword vector

        if useNormalizedVector:
            keywordVector/= keywordWeight

        keywordList.append(keyword)
        keywordWeightList.append(keywordWeight)
        keywordVectorMatrix.append(keywordVector)
        numOfKeywords=numOfKeywords + 1

        if numOfKeywords==1:
            lengthOfKeywordVector = len(keywordVector)
        elif lengthOfKeywordVector!=len(keywordVector):
            print "Line ", numOfKeywords, " has invalid number of relevance components: ", str(len(keywordVector)), " should be ", str(lengthOfKeywordVector)


    # select top keywords

    if numOfKeywords > maxNumOfKeywords:
        numOfKeywords = maxNumOfKeywords

        sortedIndex = sorted(range(len(keywordWeightList)), key=lambda k: keywordWeightList[k], reverse=True)
        sortedIndex = sortedIndex[:maxNumOfKeywords]

        keywordList = [keywordList[index] for index in sortedIndex]
        keywordWeightList= [keywordWeightList[index] for index in sortedIndex]
        keywordVectorMatrix = [keywordVectorMatrix[index] for index in sortedIndex]


    # sum of used keyword weights

    totalKeywordWeight = sum(keywordWeightList)

    # use binary keyword vector

    if useBinaryVector:
        for i in range(len(keywordVectorMatrix)):
            keywordVectorMatrix[i] = numpy.sign(keywordVectorMatrix[i])

    # convert keyword vectors to sparse matrix

    keywordVectorMatrix = numpy.matrix(keywordVectorMatrix)

    if useSparseMatrix:
        keywordVectorMatrix = sparse.csr_matrix(keywordVectorMatrix)

    # compute distance matrix among keywords

    keywordDistanceMatrix = pairwise.pairwise_distances(keywordVectorMatrix, metric='euclidean', n_jobs=1)

    # compute an embedding for projection plot

    if showSilhouettePlot:

        if useTSNEEmbedding:
            # use tSNE
            embedding = manifold.TSNE(n_components=2, metric="precomputed")
            keywordEmbeddingPos = embedding.fit(keywordDistanceMatrix).embedding_
        else:
            # use MDS
            embedding = manifold.MDS(n_components=2, dissimilarity="precomputed", n_jobs=1)
            keywordEmbeddingPos = embedding.fit(keywordDistanceMatrix).embedding_

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
            ax2.scatter(keywordEmbeddingPos[:, 0], keywordEmbeddingPos[:, 1], marker='.', s=30, lw=0, alpha=0.7,
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

    bestKeywordClusterWeightList = [sum([keywordWeightList[index] for index in keywordCluster]) for keywordCluster in bestKeywordClusterList]

    bestKeywordClusterList = [[keywordList[index] for index in keywordCluster] for keywordCluster in bestKeywordClusterList]

    sortedIndex = sorted(range(len(bestKeywordClusterList)), key=lambda k: bestKeywordClusterWeightList[k], reverse=True)

    bestKeywordClusterList = [bestKeywordClusterList[index] for index in sortedIndex]

    return bestKeywordClusterList


if __name__ == "__main__":
    symbol = 'AAPL'
    # symbol = 'GOOG' # error
    # symbol = 'BA'
    # symbol = 'BAC'
    # symbol = 'XOM'
    # symbol = 'T'
    # symbol = 'GM'
    # symbol = 'WMT'
    # symbol = 'GSPC'
    groups = getKeywordGroups(symbol)
    # for group in groups:
    #     print group
    groups = groups[0:3]
    groups = [group[0:3] for group in groups]
    print groups