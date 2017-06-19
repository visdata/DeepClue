# DeepClue
- 项目名称：DeepClue
- 项目作用与介绍：基于文本的深度学习股票预测模型的可视分析

  本项目是对深度学习股票预测模型的可视化，首先使用深度学习模型基于每日新闻标题对公司每日股价进行预测，然后使用LRP算法抽取了深度学习模型中的重要文本因素，并构建了因素的层次结构，最后使用集成的可视化系统对以上信息进行展示，并提供多种交互方式帮助分析。
  
- 项目运行方法：
	1. 后台启动python/tornado下的两个server.py服务
	2. demo代码置于apache下，访问index.html即可
	3. 具体内容见[项目wiki](https://github.com/visdata/DeepClue/wiki)。

- 项目结构（具体内容见[项目wiki](https://github.com/visdata/DeepClue/wiki)）：
	- demo：DeepClue可视化系统
	- python：后台数据处理部分及提供API服务
	- stockvis：预测模型

- [项目wiki](https://github.com/visdata/DeepClue/wiki)
