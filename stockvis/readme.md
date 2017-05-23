###进度
目前已经完成Alex文档中的R1方法，初步的实验结果放在./output/*.lrp.r1.log中。  
对应的输入为data/GSPC.test.csv  
每天的词按照股票涨的相关性从高到低排列。
天与天之间按===分割。  
其中model1的精度比较高,为53.6.   
model2的精度为51.0.  
  
R2也已经实现完毕。相关的结果同样在./output*.lrp.r2.log中。
  
###代码
对应的代码文件为dcnn/stock_vis/StockHierAvgLRP.cc  
具体的函数为buildLRPGraph  

#Aug, 09, 2016
1. 更新了新的分类模型的训练代码, StockHierAvgSamplingConstLookup.cc
2. 添加了示例数据和模型。详情见data目录和const_lookup目录。
3. 更新了相关的LRP代码和使用脚本。详情见scripts目录。
4. 目前的精度Train/Dev/Test分别为53.35/55.03/53.09, 为大盘的数据。
5. 将tanh改为relu函数能提升预测的精度到58.7/56.2/56.7. 但是目前和relu函数对应的LRP的代码尚未完成。
## 后续
1. relu函数对应的LRP代码。
2. Regression模型对应的LRP代码。

##Sep 26, 2016
1. 训练数据更新至data_new3/*.clean.csv8
2. GSPC上的精度dev/test 为**61.2366/0.608939**。比之前最好的结果还要更好些。测试集上提升了1个点。
3. 日志文件为appding.reg.finetune.csv8.log
4. 训练的轮数建议为300轮
5. 测试的次数仍然为1，不使用dropout
  
主要的改变:  
1. 将预测的比值变成百分比。  
2. 将TEST_TIME 改回为最简单的TEST_TIME=1。  
3. 将if (acc >=best) 改为acc>best, 条件更为严格。  
4. 将语料更细致的处理; a) 对词做了lemma, 如rises->rise; b) 对长度为1的词进行了过滤，只保留那些非停用词。c) 对于长度>1的停用词，仍然保留。  

