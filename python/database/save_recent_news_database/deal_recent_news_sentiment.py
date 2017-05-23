
class Tree:
    def __init__(self):
        print 'init tree...'

    def get_sentiment_info(self, tree_line):
        # print tree_line
        sentiment_value = tree_line[1]
        sentiment_words = []
        line = tree_line.replace('(', '').replace(')', '').replace('\n', '')
        words_split = line.split(' ')
        # print words_split
        for i in range(len(words_split)):
            elem = words_split[i]
            if self.isWord(elem):
                label = int(words_split[i-1])
                if label != 2:
                    sentiment_words.append(elem+"_"+str(label))
        return sentiment_value, sentiment_words

    def isWord(self, elem):
        try:
            int(elem)
            return False
        except Exception, e:
            return True

file_news_sentiment = open('news.sentiment.info.csv', 'w')

file_sentiment = open('new.title.sentiment.tree.csv', 'r')
all_lines = file_sentiment.readlines()

tree = Tree()

for i in range(len(all_lines)):
    print all_lines[i]
    sentiment_value, sentiment_words = tree.get_sentiment_info(all_lines[i])
    sentiment_words = ','.join(sentiment_words)
    print sentiment_value
    print sentiment_words
    file_news_sentiment.write(sentiment_value+"\t"+sentiment_words+"\n")

