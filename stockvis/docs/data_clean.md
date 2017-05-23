#Clean Scripts
 1. jima@/home/ji_ma/tzy/2.research/tweet_stock/news_title_from_scratch/text_extract_scripts/clean10.py  
 2. s1@/home/chihyang_teng/2.research/train_word2vec  
 3. /home/chihyang_teng/2.research/train_word2vec/b+r.all.text.a2b.ascii.sents.clean2.nofirstline.vec 准备测试测新训练的vec

#Embedding
 1. b+r.all.text.a2b.ascii.sents.clean2.vec  
 2. b+r.all.text.a2b.ascii.sents.clean2 corpus  

#data3
 1. 当前最好的数据处理方式。还需要加入每天的去重。（相同的新闻标题出现在不同的日子里面，只保留前一天的）  
 2. 每个公司都用全部的数据来预测。  
 3. 最后以: source 的要去掉, 类似的有 : <num>,  % ( table ) : <num> tt
```
evertop wire cor may sales fall <num> % ( table ) : <num> tt ||| 
kwang ming silk may sales fall <num> % ( table ) : <num> tt ||| 
optimax tech cor may sales rise <num> % ( table ) : <num> tt ||| 
taiwan life may sales rise <num> % ( table ) : <num> tt ||| 
mustek systems may sales fall <num> % ( table ) : <num> tt ||| 
taiwan mobile co may sales rise <num> % ( table ) : <num> tt ||| 
lung yen life se may sales fall <num> % ( table ) : <num> tt ||| 
standard charter may sales rise <num> % ( table ) : <num> tt ||| 
tung kai tech may sales fall <num> % ( table ) : <num> tt ||| 
pou chen may sales fall <num> % ( table ) : <num> tt ||| 
president chain may sales rise <num> % ( table ) : <num> tt ||| 
far eastone tele may sales rise <num> % ( table ) : <num> tt ||| 
fortune info may sales fall <num> % ( table ) : <num> tt ||| 
depo auto parts may sales rise <num> % ( table ) : <num> tt ||| 
test rite intl may sales fall <num> % ( table ) : <num> tt ||| 
<num> kang rubber may sales rise <num> % ( table ) : <num> tt ||| 
zentek photonics september sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics december sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics november sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics october sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics march sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics february sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics january sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics may sales fall <num> % ( table ) : <num> tt ||| 
zentek photonics april sales fall <num> % ( table ) : <num> tt ||| 
mega biotech & e may sales fall <num> % ( table ) : <num> tt ||| 
dsg technology may sales rise <num> % ( table ) : <num> tt ||| 
```
```
sri lanka first quarter gdp : summary ||| 
sri lanka first quarter gdp : details ||| 
sri lanka first quarter gdp : contribution by sector ||| 
```  
```
 : u . s 
```
```
ebay sales top estimates as paypal gains : san francisco mover |||   MA EBAY MSFT V YHOO AMZN HD
vmware gains as profit tops estimates : san francisco mover |||   MS EMC
nvidia falls as disk decline hits sales : san francisco mover |||   NVDA
sandisk tumbles as lower prices hurt sales : san francisco mover |||   AAPL SNDK
juniper declines after forecast disappoints : san francisco mover |||   CSCO T JNPR
cbre group declines on transaction - volume scrutiny : san francisco mover |||   JPM CBG
seagate rises after forecast tops estimates : san francisco mover |||   WDC STX
medivation surges on prostate cancer drug : san francisco mover |||   JNJ
jds uniphase falls amid price competition : san francisco mover |||   MS
zynga surges for second day after facebook ipo filing : san francisco mover |||   FB
threshold jumps on merck kgaa cancer - drug partnership : san francisco mover |||   MRK
tivo climbs on patent wins , new customers : san francisco mover |||   GOOG VZ T MSFT
astex falls most since <num> as fda questions drug : san francisco mover ||| 
jive reaches post-ipo high on similarity to facebook : san francisco mover |||   FB WAT DTV
move climbs on forecast , web search tools : san francisco mover |||   MSFT
juniper rises on speculation of at & t orders : san francisco mover |||   VZ CSCO T JNPR
nvidia falls as forecast trails estimates : san francisco mover |||   TXN QCOM NVDA
codexis has historic drop after ceo resigns : san francisco mover ||| 
dell falls after forecast misses estimates : san francisco mover |||   GOOG EMC CA HPQ AAPL MSFT
amyris falls after losses exceed estimates : san francisco mover |||   JPM
polycom falls as top sales executives leave : san francisco mover |||   HPQ IBM MSFT
immersion falls on apple 's ipad <num> exclusion : san francisco mover |||   AAPL
zeltiq aesthetics shares surge on new buy rating : san francisco mover |||   JPM GS
solazyme climbs on defense plans , partners : san francisco mover ||| 
procera gains as analyst sees larger market : san francisco mover ||| 
lsi gains after raising earnings forecast : san francisco mover ||| 
intermune gains on german esbriet decision : san francisco mover |||   WFC
pandora gains on projected growth : san francisco mover ||| 
linkedin reaches highest level since august : san francisco mover |||   GS
saba declines <num> % after delaying earnings : san francisco mover ||| 
quicklogic gains on optimism over clients : san francisco mover ||| 
bio - rad rises on bet family may seek sale : san francisco mover ||| 
invensense falls on sandisk sales forecast : san francisco mover |||   AAPL SNDK
pharmacyclics drops before j & j earnings : san francisco mover |||   JNJ
apple gains after analysts renew optimism : san francisco mover |||   AAPL
rambus rises after jpmorgan rating upgrade : san francisco mover |||   MU JPM
verifone drops as organic growth questioned : san francisco mover |||   GOOG EBAY MA HD V
talon drops on fda review of cancer therapy : san francisco mover ||| 
amryis declines after earnings miss : san francisco mover ||| 
salesforce falls on corporate cuts : san francisco mover |||   CSCO CRM
shutterfly gains as facebook threat fades : san francisco mover |||   AAPL FB
vmware declines on slower growth warning : san francisco mover |||   CTXS MSFT EMC
ebay drops on second - quarter sales concern : san francisco mover |||   EBAY
facebook falls on concern for growth : san francisco mover |||   FB GM MS
zynga rebounds from low in two - day gain : san francisco mover |||   FB MS
```

XXX stocks
```
4646

china stocks : icbc , industrial bank , inner mongolia yili ||| 
thailand stocks : ptt , ptt exploration & production , sri trang ||| 
czech stocks : erste group , new world resources , vienna insurance |||   PX
sub-sahara africa stocks : kenya airways , mumias sugar , uac move ||| 
russia stocks : norilsk nickel , polymetal international , rosneft ||| 
hungary stocks : mol , otp bank , drugmaker egis move in budapest ||| 
polish stocks : bank zachodni , gtc , grupa lotos , pko shares move ||| 
colombian stocks : bolsa de valores , cementos argos , ecopetrol ||| 
argentine stocks : grupo galicia , petrobras argentina and ypf ||| 
mexico stocks : america movil , modelo , industrias ch were active ||| 
peru stocks : buenaventura , candente copper , southern copper ||| 
taiwan stocks : au optronics , chimei innolux , epistar , mediatek |||   JPM
philippine stocks : aboitiz power , energy development , semirara |||   PX
israel stocks : cellcom , partner , bezeq , ratio , delek drilling ||| 
persian gulf stocks : arabtec and tamweel in dubai were active ||| 
egyptian stocks : maridive & oil services , south valley cement ||| 
czech stocks : erste group bank , new world resources are active |||   PX
hungary stocks : otp bank , mol , magyar telekom move in budapest ||| 
turkish stocks : akbank , trabzonspor , turkish airlines move ||| 
sub-sahara africa stocks : japaul oil , pan africa insurance ||| 
polish stocks : kghm polska miedz , synthos , pulawy are active ||| 
mexico stocks : homebuilders , grupo modelo , axtel were active |||   WFC
chilean stocks : afp provida , cencosud and endesa were active ||| 
argentine stocks : bbva banco frances , cresud and ypf were active ||| 
peru stocks : ferreyros , maple , panoro , relapasa , siderperu |||   CAT
```
```
<num> % ( table )
```
以及直接以冒号结尾的

, source say
- source
