/**
 * Created by WL on 2016/4/20.
 */


var div_factor = d3.select('#factor');
var width_detail = $('#factor').width();
var height_factor = $('#factor').height();
height_factor += 100;
//var height_factor_title = $('#div_factor_title').height();
var height_factor_title = 30;
d3.select('#factor')
    .style('height', height_factor+'px');
d3.select('#div_news')
    .style('height', height_factor-height_factor_title+'px');

var keywords_count = 6, candidate_count = 12;

var sentimentNews, sentimentCount;
var SENTIMENT_TYPES = ['null', 'positive', 'negative', 'all'];
var map_sentiment = {'POSITIVE': 1, 'NEGATIVE': 2};
var sentiment_type = 3;

var searchBox = $('#box_keyword');
var selected_keywords_arr = []; //ѡ�еĹؼ��ʣ�checkboxѡ�У�
var selected_keywords = "";
var all_keywords = [];  //���йؼ��ʣ�����δѡ�еģ�
var json_keywords = null;   //�õ��������Ƽ��ʼ�������weight��count��
var map_keyword_attr = {};  //���ݹؼ��ʵõ�������
var candidate_keywords = null;  //��ѡ��

var DATE_RISE= 0, DATE_DOWN= 1, PRED_RISE= 2, PRED_DOWN=3;
var sortType = DATE_RISE;   //��ʲô��������

var newsListIsLarger = false;
d3.select('#factor_title')
    .on('click', function() {
        newsListIsLarger = !newsListIsLarger;
        changeNewsListHeight(newsListIsLarger); //�ı������б��С
        //if(newsListIsLarger) {
        //    newsListIsLarger
        //    changeNewsListHeight(false);
        //}
    });

d3.selectAll('.factor_type')
    .on('click', function(d, i) {
        var this_elem = d3.select(this);
        var curr = 'cur';
        if(hasClass(this_elem, curr)) {
           return;
        }
        d3.selectAll('.factor_type')
            .each(function() {
                removeClass(d3.select(this), curr);
            });
        switch(i) {
            case 0: //ALL
                addClass(this_elem, curr);
                break;
            case 1: //RISE
                addClass(this_elem, curr);
                break;
            case 2 :    //FALL
                addClass(this_elem, curr);
        }
        which_keyword_type = i;
        if(json_keywords != null) {
            showKeywords(json_keywords);
        }
    });

d3.select('#btn_more')
    .on('click', function() {
        for(var i=candidate_count; i<candidate_count+3; i++) {
            if(i >= candidate_keywords.length) {
                alert('no more candidate!');
                return;
            }
            var keyword = candidate_keywords[i].keyword;
            addCandidate(keyword);
        }
        candidate_count += 3;
    });
d3.select('#btn_refresh')
    .on('click', function() {
        keywords_count = 6;
        candidate_count = 12;
        showRecommendKeywords();
        changeContour();
    });

d3.select('#div_keyword')
    .on('click', function() {
        clearKeywordHighlight();
        showNewsTable(keywords_news_by_date);
        //sortNewsList(0);
    });

function removeCandidate() {
    d3.select('#div_add_keyword')
        .selectAll('.keyword')
        .each(function (d, i) {
            if(i < 3) {
                d3.select(this).remove();
            }
        });
}

function addCandidate(keyword) {
    var add_elem = d3.select('#div_add_keyword')
        .append('div')
        .attr('class', 'keyword div_candidate');

    var label = add_elem
        .append('label')
        .attr('class', 'keyword_candidate');

    label
        .append('text')
        .text(function() {
            return keyword;
        });
    add_elem
        .append('img')
        .attr('class', 'add_icon icon')
        .attr('title', 'add')
        .attr('src', 'img/add_green.png')
        .on('click', function() {
            add_elem.remove();
            addKeyword(keyword);
        });

    add_elem
        .on('mouseenter', function() {
            add_elem
                .select('.add_icon')
                .classed('show', true);
        })
        .on('mouseleave', function() {
            add_elem
                .select('.add_icon')
                .classed('show', false);
        });
}

function addKeyword(keyword) {
    clearKeywordHighlight();
    if($.inArray(keyword, all_keywords) >= 0) { //��������
            alert('This keyword '+keyword+ ' already exists!');
            return;
        } else {
            all_keywords.push(keyword);
        }

        var add_elem = div_factor
            .select('#div_keyword')
            //.select('#div_add_keyword')
            .append('div')
            .attr('class', 'keyword');
        var label = add_elem
            .append('label')
            .attr('class', 'keyword_label')
            .attr('id', 'keyword_'+ keyword)
            .on('click', function() {
                clearKeywordHighlight();
                addClass(d3.select(this), 'highlight');
                showNewsTable(keywords_news_by_date, keyword);
                moveKeywordLineToFirst(keyword);
                event.stopPropagation(); //��ֹ�¼�ð��
            });
        label
            .append('text')
            .text(function() {
                return keyword;
            });
        add_elem
            .append('img')
            .attr('class', 'delete_icon icon')
            .attr('title', 'delete')
            .attr('src', 'img/close_red.png')
            .on('click', function() {
                add_elem.remove();
                removeSearchWord(keyword);
                getKeywordInfo(selected_keywords);
            });

        add_elem
                .on('mouseenter', function() {
                    add_elem
                        .select('.delete_icon')
                        .classed('show', true);
                })
                .on('mouseleave', function() {
                    add_elem
                        .select('.delete_icon')
                        .classed('show', false);
                });

        addSearchWord(keyword);
        getKeywordInfo(selected_keywords);

        adjustKeywordHeight();
}

function clearKeywordHighlight() {
    clearFilter();  //contour map
    d3.selectAll('.keyword_label')
        .each(function() {
           removeClass(d3.select(this), 'highlight');
        });
}

//function showRecommendKeywords() {
//    $('#factorOption').show();
//
//    spinner_keyword.spin(target_keyword);
//    spinner_keyword_line.spin(target_keyword_line);
//    var domain = x_price.domain();
//    var format = d3.time.format('%Y-%m-%d');
//    var start_date = format(domain[0]);
//    var end_date = format(domain[1]);
//
//    var url = "http://"+SERVER+":"+KEYWORD_PORT+"/getRecommendKeywords?symbol="+companies[which_stock]["symbol"]+'&start_date='+start_date+'&end_date='+end_date+'&count=48';
//    if(arguments.length == 0) {
//        url += '&method=model'; //���ݹؼ���ģ�͵õ��Ĺؼ���
//    } else {
//        url += '&method=tf';    //���ݴ�Ƶ�õ��Ĺؼ���
//    }
//    //Ĭ��source��news
//    if(which_model == 1) {
//        url += '&source=twitter';
//    } else if(which_model == 2) {
//        url += '&source=report';
//    }
//    var random = Math.random();
//    url += '&id='+random;
//    if(request_keyword_recommend != null) {
//        request_keyword_recommend.abort();
//    }
//    console.log("keywords api url: " + url);
//    request_keyword_recommend = $.ajax({
//        url: url,
//        context: document.body,
//        //async: false,
//        async: true,  //�첽
//        success: function(data){
//            clearFactorList();
//            var keywords = eval("("+data+")");
//            //spinner_factor.spin();     //end spinner
//            console.log(keywords);
//            json_keywords = keywords;
//            for(var i in keyword_types) {
//                for(var j in json_keywords[keyword_types[i]]) {
//                    var obj = json_keywords[keyword_types[i]][j];
//                    if(map_keyword_attr[obj.keyword] == undefined) {
//                        map_keyword_attr[obj.keyword] = {};
//                    } else {
//                        //console.log('exists!');
//                        continue;
//                    }
//                    map_keyword_attr[obj.keyword]['frequency'] = obj.count;
//                    map_keyword_attr[obj.keyword]['weight'] = obj.weight;
//                    map_keyword_attr[obj.keyword]['normalize'] = obj.weight/(obj.count);
//                }
//            }
//            spinner_keyword.spin();
//            showKeywords();
//            ////��ʼ��Ĭ����ʾ����˵��������������¼�����
//            //getKeywordInfo(selected_keywords);
//        },
//        error: function(error) {
//            alert("keywords error!");
//            console.log(error);
//            //spinner_factor.spin();
//        }
//    });
//}

function showKeywords() {

    var keywords = json_keywords[keyword_types[which_keyword_type]].slice(0, keywords_count);
    candidate_keywords = json_keywords[keyword_types[which_keyword_type]].slice(keywords_count);

    console.log('keywords:');
    console.log(keywords);
    clearFactorList();

    all_keywords = [];
    d3.select('#div_keyword').selectAll('.keyword').remove();
    d3.select('#div_add_keyword').selectAll('.keyword').remove();
    var div_keywords_candidate = d3.select('#div_add_keyword')
        .selectAll('.keyword')
        .data(candidate_keywords.slice(0, candidate_count))
        .enter()
        .append('div')
        .attr('class', 'keyword div_candidate');

    div_keywords_candidate
        .each(function(d, i) {
           var this_candidate = d3.select(this);
            var label = this_candidate
                .append('label')
                .attr('class', 'keyword_candidate');

            label
                .append('text')
                .text(function() {
                    return d.keyword;
                });
            this_candidate
                .append('img')
                .attr('class', 'add_icon icon')
                .attr('title', 'add')
                .attr('src', 'img/add_green.png')
                .on('click', function() {
                    this_candidate.remove();
                    addKeyword(d.keyword);
                });
            this_candidate
                .on('mouseenter', function() {
                    this_candidate
                        .select('.add_icon')
                        .classed('show', true);
                })
                .on('mouseleave', function() {
                    this_candidate
                        .select('.add_icon')
                        .classed('show', false);
                });
            });

    var div_keywords = d3.select('#div_keyword')
        .selectAll('.keyword')
        .data(keywords)
        .enter()
        .append('div')
        .attr("class", 'keyword');
    div_keywords
        .each(function(d, i) {
            var this_keyword = d3.select(this);
            this_keyword
                .on('mouseenter', function() {
                    this_keyword
                        .select('.delete_icon')
                        .classed('show', true);
                })
                .on('mouseleave', function() {
                    this_keyword
                        .select('.delete_icon')
                        .classed('show', false);
                });
            var label = this_keyword
                .append('label')
                .attr('class', 'keyword_label')
                .attr('id', 'keyword_'+ d.keyword)
                .on('click', function() {
                    clearKeywordHighlight();
                    addClass(d3.select(this), 'highlight');
                    showNewsTable(keywords_news_by_date, d.keyword);
                    moveKeywordLineToFirst(d.keyword);
                    event.stopPropagation(); //��ֹ�¼�ð��
                });
            label
                .append('text')
                .text(function() {
                    addSearchWord(d.keyword);
                    all_keywords.push(d.keyword);
                    return d.keyword;
                       //+" (<font color='green'>"+ d.rise+"</font>," +
                       // " <font color='red'>"+ d.down+"</font>)";
                });
            this_keyword
                .append('img')
                .attr('class', 'delete_icon icon')
                .attr('title', 'delete')
                .attr('src', 'img/close_red.png')
                .on('click', function() {
                    this_keyword.remove();
                    removeSearchWord(d.keyword);
                    getKeywordInfo(selected_keywords);
                });
        });
    getKeywordInfo(selected_keywords);
    adjustKeywordHeight();
}

function getAllTitlesAndShow() {
    var source = 'news';
    if(which_model == 1) {
        source = 'twitter';
    }

    var domain = x_price.domain();
    var format = d3.time.format('%Y-%m-%d');
    var start_date = format(domain[0]);
    var end_date = format(domain[1]);

    var url = "http://"+SERVER+":"+LIST_NEWS_PORT+"/getPeriodNewsList?source="+source+"&symbol="+companies[which_stock]["symbol"]+"&start_date="+start_date+'&end_date='+end_date;
    var random = Math.random();
    //TODO:�ں�̨�����ȶ�֮��ȥ��url�е���������û���ӿ��ٶ�
    //if(which_model != 0) {  //�����news�Ļ�����Ի��棬�ӿ��ٶ�
    //    url += '&id='+random;   //���������Ϊ����urlÿ�β�һ�£��������������
    //}

    console.log(url);

    if(request_list_news != null) {
        request_list_news.abort();
    }
    spinner_news_list.spin(target_news_list);
    request_list_news = $.ajax({
        url: url,
        context: document.body,
        //async: false,
        async: true,  //�첽
        success: function(data){
            var listNewsInfo = eval("("+data+")");
            //spinner_factor.spin();     //end spinner
            console.log(listNewsInfo);
            list_all_news = listNewsInfo['newsList'];
            map_news_id_idx = listNewsInfo['map_id'];
            //for(var i in list_all_news) {
            //    map_news_id_idx[list_all_news[i].news_id] = i;
            //}
            spinner_news_list.spin();
            list_selected_news = list_all_news.concat();//��ƣ������������������
            showNewsTable(list_selected_news);
        },
        error: function(error) {
            if(error.statusText == 'abort') {
                //alert('abort!');
            } else {
                //alert("keyword info error: " + error.statusText);
            }
            console.log(error);
            //spinner_factor.spin();
        }
    });
}

//�õ��ؼ��ʵ�bigram��Ϣ
function getBigramInfo(keywords_count) {
    var source = 'news';
    if(which_model == 1) {
        source = 'twitter';
    }
    var url = "http://"+SERVER+":"+KEYWORD_PORT+"/getRecommendKeywords?source="+source+"&symbol="+companies[which_stock]["symbol"]+"&mode=keyword_bigram";
    var random = Math.random();
    //url += '&id='+random;
    console.log(url);
    var keywords = "";
    keywords_count = keywords_count.slice(0, 20);   //TODO:ֻ��ʾǰ20���ʣ���Ȼ̫��
    for(var i in keywords_count) {
        keywords += keywords_count[i].keyword+" ";
    }
    url += '&keyword='+keywords;
    console.log(keywords);
    $.ajax({
        url: url,
        context: document.body,
        //type: 'post',
        //data: keywords,
        //async: false,
        async: true,  //�첽
        success: function(data){
            var bigramInfo = eval("("+data+")");
            //spinner_factor.spin();     //end spinner
            console.log(bigramInfo);
            for(var keyword in bigramInfo) {
                bigram_info_of_keywords[keyword] = bigramInfo[keyword];
            }
            dict_bigram_data = getBigramDataByDay();
        },
        error: function(error) {
            if(error.statusText == 'abort') {
                //alert('abort!');
            } else {
                alert("bigram info error: " + error.statusText);
            }
            console.log(error);
            //spinner_factor.spin();
        }
    });
}

//�õ�ĳ���ؼ��ʵ�bigram��Ϣ
function getKeywordBigramInfo(parameters) {
    var source = 'news';
    if(which_model == 1) {
        source = 'twitter';
    }
    var url = "http://"+SERVER+":"+KEYWORD_PORT+"/getRecommendKeywords?source="+source+"&symbol="+companies[which_stock]["symbol"]+"&mode=keyword_bigram";
    var random = Math.random();
    url += '&id='+random;
    url += '&keyword='+parameters.keyword;
    console.log(url);
    $.ajax({
        url: url,
        context: document.body,
        //type: 'post',
        //data: keywords,
        //async: false,
        async: true,  //�첽
        success: function(data){
            var bigramInfo = eval("("+data+")");
            //spinner_factor.spin();     //end spinner
            console.log(bigramInfo);
            for(var keyword in bigramInfo) {
                bigram_info_of_keywords[keyword] = bigramInfo[keyword];
            }
            dict_bigram_data = getBigramDataByDay();
            expandBigram(parameters);
        },
        error: function(error) {
            if(error.statusText == 'abort') {
                //alert('abort!');
            } else {
                alert("bigram info error: " + error.statusText);
            }
            console.log(error);
            //spinner_factor.spin();
        }
    });
}

//�õ����йؼ��ʵ������б�
function getKeywordInfo(keywords) {
    return; //TODO:��ʱȥ��
}

//�õ�һ��ʱ���ڵĹؼ��ʾ���
function getKeywordGroupInfo() {
    //bigram_info_of_keywords = null;
    spinner_keyword_line.spin(target_keyword_line);
    spinner_contour.spin(target_contour);
    var source = 'news';
    if(which_model == 1) {
        source = 'twitter';
    }
    var domain = x_price.domain();
    var format = d3.time.format('%Y-%m-%d');
    var start_date = format(domain[0]);
    var end_date = format(domain[1]);

    //��ȡ���Ը�ѡ���״̬���Ա����̨��������
    var chk_value =[];
    $('input[name="select_POS"]:checked').each(function(){
        chk_value.push($(this).val());
    });
    var part_of_speech = chk_value.join(',');

    var url = "http://"+SERVER+":"+KEYWORD_PORT+"/getRecommendKeywords?source="+source+"&symbol="+companies[which_stock]["symbol"]+"&mode=group_info&start_date="+start_date+'&end_date='+end_date;
    url += "&part_of_speech="+part_of_speech;
    //var random = Math.random();
    //url += '&id='+random;

    console.log(url);

    if(request_group_info != null) {
        request_group_info.abort();
    }
    request_group_info = $.ajax({
        url: url,
        context: document.body,
        //async: false,
        async: true,  //�첽
        success: function(data){
            var groupInfo = eval("("+data+")");
            //spinner_factor.spin();     //end spinner
            console.log(groupInfo);
            //TODO: groups
            keywords_count_by_date = groupInfo['keywords'];
            groups_info_by_date = groupInfo['groups'];

            ////TODO: test
            //var obj = {};
            //obj.info = dict_all_keyword_info;
            //obj.group = 'test';
            //obj.text = ['all', 'keywords'];
            //obj.type = 'group';
            //groups_info_by_date.unshift(obj);

            groups_sort_and_keyword_position = groupInfo['sort_position'];
            initKeywordMap();   //��keyword map
            console.log(groups_sort_and_keyword_position);
            //spinner_keyword_line.spin();
            //spinner_contour.spin();
            dict_keyword_data = getKeywordDataByDay();  //���ֵ���ʽ����ɼ����ݺ͹ؼ������ݣ��Ա������ض�
                                                        //ͬʱ�õ����йؼ��ֵ��б�
            $("#box_keyword").autocomplete({
                source: list_all_keywords   //��������ʾ
            });
            dict_group_data = getGroupDataByDay();
            console.log(dict_group_data);
            //getBigramInfo(keywords_count_by_date);    //�õ��ؼ��ʵ�bigram��Ϣ
            //showNewsTable(newsList);
            drawKeywordLines();
        },
        error: function(error) {
            if(error.statusText == 'abort') {
                //alert('abort!');
            } else {
                alert("keyword info error: " + error.statusText);
            }
            console.log(error);
            //spinner_factor.spin();
        }
    });
}

function filterNewsTable(start, end, keyword, type) {
    if(keyword) {   //��ѡ֮������Ž���ɸѡ

    } else {
        var tmp_news_list = [];
        for(var i in list_all_news) {
            var d = list_all_news[i];
            var date = parseDate(d.date);
            if(date >= start && date <= end) {
                tmp_news_list.push(d);
            }
        }
        showNewsTable(tmp_news_list, null, start, end);
    }
}

function addSortOption() {
    var div_news = d3.select('#div_news');
    div_news.select('#div_sort').remove();
    var span_order = div_news
        .append('div')
        .attr('id', 'div_sort')
        .append('div')
        .attr('class', 'order');
    span_order.append('span')
        .attr('class', 'sort date rise')
        .html(" date &nbsp;&nbsp;&nbsp;&nbsp;");
    span_order.append('text')
        .text("|");
    span_order.append('span')
        .attr('class', 'sort pred')
        .html(" pred. &nbsp;&nbsp;&nbsp;&nbsp;");
}

//ÿ�θ��ݴ�������newsList������ʾ��ǰ�����������ߴ�����֮ǰ��ȡǰ200����
//keyword��ѡ������������
//start��end�Ǳ�עѡ�еĹؼ��ʵ�ʱ������
function showNewsTable(newsList, keywords, start, end) {

    list_selected_news = newsList;  //ÿ�δ��������ǵ�ǰѡ�е���������
    list_selected_keywords = keywords;
    selected_start_date = start;
    selected_end_date = end;

    sortSelectedNews(); //�Ȱ���ǰ�������ͽ�������

    var div_news = d3.select('#div_news');
    div_news.select('#div_list').remove();
    if(!newsList) {
        return;
    }

    if(!start) {    //���û�п�ʼ���ڣ���û��ѡ���κιؼ���
        start = x_price.domain()[0];
        end = x_price.domain()[1];
        clearAllKeywordBrush();
    } else {
        start = parseDate(format_date2(addDate(start, 'd', 1)));
    }

    var SHOW = 500; //ѡ���б��������ʾ��������
    var count = newsList.length;  //��ҳ������ʾ����������
    //�鿴���йؼ��ʵ������б�
    //ѡȡǰ200����¼
    var infos = newsList.slice(0, SHOW);

    var div_list = div_news
        .append('div')
        .attr('id', 'div_list');

    var span_order = d3.select('#div_sort .order');
    span_order.selectAll('.selected_keyword_hint').remove();
    if(keywords) {
        span_order.append('text')
            .attr('class', 'selected_keyword_hint')
            .text("|");
        span_order.append('span')
            .attr('class', 'selected_keyword_hint')
            .html(function() {
                var kword = keywords[0];
                var len = keywords.length;
                if(len > 1) {
                    kword += '...';
                }
                var html = ' keyword: <text class="highlight_keyword">'+keywords[0]+' </text>';
                if(len > 1) {
                    html += '('+keywords.length+')';
                }
                return html;
            });
    }

    div_list
        .append('div')
        .attr('id', 'news_info')
        //.append('span')
        .html(function() {
            var news_info = count;
            //if(keywords) {
            //    news_info += ' "<strong>'+keywords+'</strong>"';
            //}
            if(which_model == 0) {
                news_info += " news: ";
            } else if(which_model == 1) {
                news_info += " tweets: ";
            } else {
                news_info += " report: ";
            }

            news_info += " " + format_date3(start);
            news_info += "~" + format_date3(end);
            return news_info;
        });

    span_order.selectAll('.sort')
        .on('click', function(d, i) {
            //TODO:�����Ž�������
            sortSelectedNewsList(i);
            event.stopPropagation();
        });

    var key_list = div_list
        .append('div')
        .attr('id', 'news_list')
        .style('height', height_factor-height_factor_title-55+'px')
        .append('ul')
        .attr('id', 'keyword_list');

    key_list
        .selectAll('.record')
        .data(infos)
        .enter()
        .append('li')
        .attr('class', 'record')
        .html(function(d) {
            var title = d.title;
            if(keywords) {
                var find_bigram = false;
                if(keywords.length == 2) {
                    var keyword = keywords.join(' ');
                    var index = title.toLowerCase().indexOf(keyword);
                    if(index >= 0) {
                        //TODO: �����ùؼ���
                        title = title.substring(0, index)+'<text class="highlight_keyword">'
                            +title.substring(index, index+keyword.length)+'</text>'
                            +title.substring(index+keyword.length);
                        find_bigram = true;
                    }
                }
                if(!find_bigram) {
                    for(var i in keywords) {
                        var keyword = keywords[i];
                        var index = title.toLowerCase().indexOf(keyword);
                        if(index >= 0) {
                            //TODO: �����ùؼ���
                            title = title.substring(0, index)+'<text class="highlight_keyword">'
                                +title.substring(index, index+keyword.length)+'</text>'
                                +title.substring(index+keyword.length);
                            break;
                        }
                    }
                }
            }

            var title = '<a href="#" class="title">'+ title+'</a><br>';
            var pred = d.pred;

            if(pred >= 0) {
                pred = '<text class="rise pred">'+pred+'% &uarr;</text>';
            } else {
                pred = '<text class="down pred">'+pred+'% &darr;</text>';
            }
            var date = '<text class="date">'+ format_date(parseDate(d.date))+'</text>';
            var cutoff = '<hr class="cutoff">';

            var html = cutoff+title+pred+date;
            d.html = html;
            return html;
        })
        .on('click', function(d, i) {
            if(which_model==0) {    //�����news����鿴��������
                seeDetail(d);
                var elem = d3.select(this);
                var expand = 'expanded';
                if(elem.classed(expand)) {    //˵�������Ѿ�չ������
                    elem.classed(expand, false);    //ȥ��class
                    changeNewsListHeight(false);
                    elem.html(d.html);
                } else {
                    elem.classed(expand, true);
                    changeNewsListHeight(true);
                    if(d.content) { //�Ѿ���ȡ�����ţ�����Ҫ�ٴλ�ȡ
                        elem.html(d.html + '<br>' + d.content);
                        return;
                    }
                    //��û�л�ȡ�����ȡ
                    var url = "http://"+SERVER+":"+LIST_NEWS_PORT+"/getNewsContent?news_id=" + d.news_id;
                    $.ajax({
                        url: url,
                        context: document.body,
                        //async: false,   //ͬ��
                        async: true,  //�첽
                        success: function(data){
                            data = eval("("+data+")");
                            var content = data['content'];
                            var contents = content.split("\n");
                            var title = contents[0].split("--")[1];
                            var author = contents[1].split("--")[1];
                            var news_url = contents[3].split("--")[1];
                            var news_content = contents.slice(4).join("\n").replace(/(^\s*)|(\s*$)/g, "");

                            news_url = "<a target='_blank' class='news_url' href='" + news_url + "'>" + news_url + "</a>";

                            d.content = '<p class="news_content">'+news_content + '<br>author: &nbsp;'+author
                                +"<br>url: &nbsp;"+news_url+'</p>';

                            elem.html(d.html + '<br>' + d.content);
                        },
                        error: function(error) {
                            alert("news content error!");
                            console.log(error);
                        }
                    });
                }
            }
        });
}

function sortSelectedNews() {
    switch(sortType) {
        case DATE_RISE:
            list_selected_news.sort(function(a, b) {
                var date_a = parseDate(a.date);
                var date_b = parseDate(b.date);
                return date_a>date_b?1:-1;
            });
            break;
        case DATE_DOWN:
            list_selected_news.sort(function(a, b) {
                var date_a = parseDate(a.date);
                var date_b = parseDate(b.date);
                return date_a>date_b?-1:1;
            });
            break;
        case PRED_RISE:
            list_selected_news.sort(function(a, b) {
                var pred_a = parseFloat(a.pred);
                var pred_b = parseFloat(b.pred);
                return pred_a>pred_b?1:-1;
            });
            break;
        case PRED_DOWN:
            list_selected_news.sort(function(a, b) {
                var pred_a = parseFloat(a.pred);
                var pred_b = parseFloat(b.pred);
                return pred_a>pred_b?-1:1;
            });
            break;
    }
}

function seeDetail(news) {
    var date = news.date;
    var title = news.title;
    var news_id = news.news_id;
    var x, y;
    var d = stock_info_by_date[date];
    var tomorrow = parseDate(date);
    while(!d) {
        tomorrow = addDate(tomorrow, 'd', 1);
        d = stock_info_by_date[format_date2(tomorrow)];
    }
    x = x_price(parseDate(date));
    y = y_price(d[prices[which_price]]);
    addNewsLabel({date:date, title:title, x:x, y:y});
    //var left = x+220;
    //var top = y+220;
    //if(which_model == 0)
    //    window.open("newsDetail.html?news_id="+news_id, "new_window","height=300,width=400,left="+left+",top="+top);
}

function sortSelectedNewsList(i) {
    switch(i) {
        case 0:
            var changeToRise = !$('.sort.date').hasClass('rise');   //ֻҪ�����Ǿ͸ĳ�����
            var first = 1;
            var cls = 'rise';
            sortType = DATE_RISE;   //�ı�sortType������ʾ��ʱ��������Ӧ����
            if(!changeToRise) {
                first = -1;
                cls = 'down';
                sortType = DATE_DOWN;
            }
            //sortSelectedNews();
            //list_selected_news.sort(function(a, b) {
            //    //var tmpParseDate = d3.time.format("%Y/%m/%d").parse;
            //    var date_a = parseDate(a.date);
            //    var date_b = parseDate(b.date);
            //    return date_a>date_b?first:-first;
            //});
            $('.sort').removeClass('rise down');
            $('.sort.date').addClass(cls);
            break;
        case 1:
            var changeToRise = !$('.sort.pred').hasClass('rise');   //ֻҪ�����Ǿ͸ĳ�����
            var first = 1;
            var cls = 'rise';
            sortType = PRED_RISE;
            if(!changeToRise) {
                first = -1;
                cls = 'down';
                sortType = PRED_DOWN;
            }
            //sortSelectedNews();
            //list_selected_news.sort(function(a, b) {
            //    var pred_a = parseFloat(a.pred);
            //    var pred_b = parseFloat(b.pred);
            //    return pred_a>pred_b?first:-first;
            //});
            $('.sort').removeClass('rise down');
            $('.sort.pred').addClass(cls);
            break;
    }
    showNewsTable(list_selected_news, list_selected_keywords,
        selected_start_date, selected_end_date);
}

function changeNewsListHeight(larger) {
    newsListIsLarger = larger;  //�ı�״̬
    if(larger) {    //���
        $('#factor')
            .css('height', '80%');
        var height_factor = $('#factor').height();
        height_factor += 100;
        var height_factor_title = 30;
        d3.select('#factor')
            .style('height', height_factor+'px');
        d3.select('#div_news')
            .style('height', height_factor-height_factor_title+'px');
        d3.select('#news_list')
            .style('height', height_factor-height_factor_title-55+'px');
    } else {
        $('#factor')
            .css('height', '37%');
        var height_factor = $('#factor').height();
        height_factor += 100;
        var height_factor_title = 30;
        d3.select('#factor')
            .style('height', height_factor+'px');
        d3.select('#div_news')
            .style('height', height_factor-height_factor_title+'px');
        d3.select('#news_list')
            .style('height', height_factor-height_factor_title-55+'px');
    }
}

//ֻ���ڶ�ѡ״̬�²Ż���ø÷���
function addSearchWord(keyword) {  //��ӳɹ�����true
    var flag = true;
    var words = [];
    for(var i in selected_keywords_arr) {
        if(selected_keywords_arr[i] == keyword) {
            flag = false;
            continue;
        }
        words.push(selected_keywords_arr[i]);
    }
    if(flag) {
        words.push(keyword);
    }
    selected_keywords_arr = [];
    selected_keywords = "";
    for(var i in words) {
        selected_keywords_arr.push(words[i]);
        selected_keywords += words[i]+' ';
    }
    return flag;
}


function removeSearchWord(keyword) {  //ɾ���ؼ���
    all_keywords.splice($.inArray(keyword, all_keywords), 1);
    selected_keywords_arr.splice($.inArray(keyword, selected_keywords_arr), 1);
    selected_keywords = "";
    for(var i in selected_keywords_arr) {
        selected_keywords += selected_keywords_arr[i]+' ';
    }
    adjustKeywordHeight();
}

function clearKeywordSelection() {
    selected_keywords_arr.length = 0;
    selected_keywords = "";
}

function adjustKeywordHeight() {
    $('#div_keyword')
            .height(Math.ceil(all_keywords.length/3)*20+50+'px');
}

function clearFactorList() {
    //��չʾ�µĹؼ���֮ǰ�������֮ǰ������״̬
    div_factor.select('#div_list').remove();
    clearKeywordSelection();
}