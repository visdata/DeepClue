/**
 * Created by WL on 2016/4/20.
 */

var spinner_keyword = new Spinner(opts);
var target_keyword = document.getElementById("spinner_keyword");
var spinner_keyword_line = new Spinner(opts);
var target_keyword_line = document.getElementById("spinner_keyword_line");

var div_factor = d3.select('#factor');
var width_detail = $('#factor').width();

var keywords_count = 6, candidate_count = 12;

var sentimentNews, sentimentCount;
var SENTIMENT_TYPES = ['null', 'positive', 'negative', 'all'];
var map_sentiment = {'POSITIVE': 1, 'NEGATIVE': 2};
var sentiment_type = 3;

var searchBox = $('#box_keyword');
var selected_keywords_arr = []; //选中的关键词（checkbox选中）
var selected_keywords = "";
var all_keywords = [];  //所有关键词（加上未选中的）
var json_keywords = null;   //得到的所有推荐词及其属性weight，count等
var map_keyword_attr = {};  //根据关键词得到其属性
var candidate_keywords = null;  //候选词

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
        //d3.selectAll('.div_candidate')
        //    .each(function(d, i) {
        //       if(i >= 3) {
        //           return;
        //       }
        //        d3.select(this).remove();
        //        addKeyword(d.keyword);
        //    });
        for(var i=candidate_count; i<candidate_count+3; i++) {
            if(i >= candidate_keywords.length) {
                alert('no more candidate!');
                return;
            }
            var keyword = candidate_keywords[i].keyword;
            addCandidate(keyword);
        }
        candidate_count += 3;
        //var keywords = json_keywords[keyword_types[which_keyword_type]];
        //removeCandidate();
        //for(var i=0; i<3; i++) {
        //    var keyword = keywords[keywords_count+i].keyword;
        //    addKeyword(keyword);
        //}
        //keywords_count += 3;
    });
d3.select('#btn_refresh')
    .on('click', function() {
        keywords_count = 6;
        candidate_count = 12;
        showRecommendKeywords();
        changeContour();
        //showKeywords();
    });

d3.select('#btn_add')
    .on('click', function() {
        var keyword = searchBox.val();
        addKeyword(keyword);
        searchBox.val('');
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
    if($.inArray(keyword, all_keywords) >= 0) { //在数组中
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
                event.stopPropagation(); //阻止事件冒泡
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

function showRecommendKeywords() {
    $('#factorOption').show();

    spinner_keyword.spin(target_keyword);
    spinner_keyword_line.spin(target_keyword_line);
    var domain = x_price.domain();
    var format = d3.time.format('%Y-%m-%d');
    var start_date = format(domain[0]);
    var end_date = format(domain[1]);

    var url = "http://"+SERVER+":"+KEYWORD_PORT+"/getRecommendKeywords?symbol="+companies[which_stock]["symbol"]+'&start_date='+start_date+'&end_date='+end_date+'&count=48';
    if(arguments.length == 0) {
        url += '&method=model'; //根据关键词模型得到的关键词
    } else {
        url += '&method=tf';    //根据词频得到的关键词
    }
    //默认source是news
    if(which_model == 1) {
        url += '&source=twitter';
    } else if(which_model == 2) {
        url += '&source=report';
    }
    var random = Math.random();
    url += '&id='+random;
    if(request_keyword_recommend != null) {
        request_keyword_recommend.abort();
    }
    console.log("keywords api url: " + url);
    request_keyword_recommend = $.ajax({
        url: url,
        context: document.body,
        //async: false,
        async: true,  //异步
        success: function(data){
            clearFactorList();
            var keywords = eval("("+data+")");
            //spinner_factor.spin();     //end spinner
            console.log(keywords);
            json_keywords = keywords;
            for(var i in keyword_types) {
                for(var j in json_keywords[keyword_types[i]]) {
                    var obj = json_keywords[keyword_types[i]][j];
                    if(map_keyword_attr[obj.keyword] == undefined) {
                        map_keyword_attr[obj.keyword] = {};
                    } else {
                        //console.log('exists!');
                        continue;
                    }
                    map_keyword_attr[obj.keyword]['frequency'] = obj.count;
                    map_keyword_attr[obj.keyword]['weight'] = obj.weight;
                    map_keyword_attr[obj.keyword]['normalize'] = obj.weight/(obj.count);
                }
            }
            spinner_keyword.spin();
            showKeywords();
            ////初始就默认显示，因此调用下面的鼠标点击事件方法
            //getKeywordInfo(selected_keywords);
        },
        error: function(error) {
            alert("keywords error!");
            console.log(error);
            //spinner_factor.spin();
        }
    });
}

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
                    event.stopPropagation(); //阻止事件冒泡
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

//得到所有关键词的新闻列表
function getKeywordInfo(keywords) {
    spinner_keyword_line.spin(target_keyword_line);
    var source = 'news';
    if(which_model == 1) {
        source = 'twitter';
    }
    var url = "http://"+SERVER+":"+KEYWORD_PORT+"/getRecommendKeywords?source="+source+"&symbol="+companies[which_stock]["symbol"]+"&mode=keyword_info&keyword="+keywords;
    var random = Math.random();
    url += '&id='+random;

    console.log(url);

    if(request_keyword_info != null) {
        request_keyword_info.abort();
    }
    request_keyword_info = $.ajax({
        url: url,
        context: document.body,
        //async: false,
        async: true,  //异步
        success: function(data){
            var keywordInfo = eval("("+data+")");
            //spinner_factor.spin();     //end spinner
            console.log(keywordInfo);
            var newsList = keywordInfo['newsList'];
            var keywordCount = keywordInfo['keywords'];
            keywords_news_by_date = newsList;
            keywords_count_by_date = keywordCount;
            spinner_keyword_line.spin();
            showNewsTable(newsList);
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

function showNewsTable(newsList, keyword, start, end) {

    var div_news = d3.select('#div_news');
    div_news.select('#div_list').remove();
    if(!newsList) {
        return;
    }

    if(!start) {    //如果没有开始日期，即没有选中任何关键词
        start = x_price.domain()[0];
        end = x_price.domain()[1];
        clearAllKeywordBrush();
    }

    var infos = [];
    var SHOW = 200; //选择列表中最多显示多少新闻
    var count = 0;  //在页面中显示的新闻数量
    if(keyword) {   //如果是查看某个关键词的新闻列表
        filterNews(keyword);    //contour map
        var news_list = newsList[keyword];
        //选取前200条记录
        var total = Math.min(news_list.length, SHOW);
        for(var i in news_list) {
            var date = parseDate(news_list[i].date);
            if(date >= start && date <= end) {
                count++;
                if(count < total) {
                    infos.push(news_list[i]);
                }
            }
        }
    } else {
        //查看所有关键词的新闻列表
        //选取前200条记录
        var count = 0;
        for (var word in newsList) {
            var news_list = newsList[word];
            for (var i in news_list) {
                var date = parseDate(news_list[i].date);
                if (date >= start && date <= end) {
                    count++;
                    if (count < SHOW) {
                        infos.push(news_list[i]);
                    }
                }
            }
        }
    }

    var div_list = div_news
        .append('div')
        .attr('id', 'div_list');

    var span_order = div_list
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
        .html(" pred &nbsp;&nbsp;&nbsp;&nbsp;");
    //span_order.append('text')
    //    .text("|");
    //span_order.append('span')
    //    .attr('class', 'sort title')
    //    .html(" news &nbsp;&nbsp;&nbsp;&nbsp;");
    var span_news_info = div_list
        .append('div')
        .attr('id', 'news_info')
        //.append('span')
        .html(function() {
            var news_info = count;
            if(keyword) {
                news_info += ' "<strong>'+keyword+'</strong>"';
            }
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
            if(keyword) {
                sortNewsList(i, keyword);
            } else {
                sortNewsList(i);
            }
            event.stopPropagation();
        });
    span_order
        .on('click', function(d, i) {

        });

    var key_list = div_list
        .append('div')
        .attr('id', 'news_list')
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
            for(var i in keywords_count_by_date) {
                var keyword = keywords_count_by_date[i].keyword;
                var index = title.toLowerCase().indexOf(keyword);
                if(index >= 0) {
                    //TODO: 包含该关键词
                    title = title.substring(0, index)+'<text class="highlight_keyword">'
                        +title.substring(index, index+keyword.length)+'</text>'
                        +title.substring(index+keyword.length);
                    break;
                }
            }

            var title = '<a href="#" class="title">'+ title+'</a><br>';
            var pred = d.pred;
            var today = new Date(d.date);
            addDate(today, 'd', 1);
            var to_day = format_date2(today);
            //if(to_day == null) {
            //    to_day = format_date3(today);
            //}
            var change_rate = 0;
            if(stock_info_by_date[to_day]) {
                var close_price = stock_info_by_date[to_day].close;
                change_rate = (pred/close_price*100).toFixed(2);
            } else {
                console.log('keywords not: ' + to_day);
            }

            if(pred >= 0) {
                pred = '<text class="rise pred">'+change_rate+'% &uarr;</text>';
            } else {
                pred = '<text class="down pred">'+change_rate+'% &darr;</text>';
            }
            var date = '<text class="date">'+ format_date(parseDate(d.date))+'</text>';
            var cutoff = '<hr class="cutoff">';

            var html = cutoff+title+pred+date;
            return html;
        })
        .on('click', function(d, i) {
            seeDetail(d.date, d.title, d.pred < 0);
        });

}

function sortNewsList(i, keyword) {
    var arr = $('li.record');
    if(keyword) {
        highlightKeyword(keyword);
    } else {
        highlightKeyword();
    }
    switch(i) {
        case 0:
            var changeToRise = !$('.sort.date').hasClass('rise');   //只要不是涨就改成增序
            var first = 1;
            var cls = 'rise';
            if(!changeToRise) {
                first = -1;
                cls = 'down';
            }
            arr.sort(function(a, b) {
                var tmpParseDate = d3.time.format("%Y/%m/%d").parse;
                var date_a = tmpParseDate($(a).children('.date').text());
                var date_b = tmpParseDate($(b).children('.date').text());
                return date_a>date_b?first:-first;
            });
            $('.sort').removeClass('rise down');
            $('.sort.date').addClass(cls);
            break;

        case 1:
            var changeToRise = !$('.sort.pred').hasClass('rise');   //只要不是涨就改成增序
            var first = 1;
            var cls = 'rise';
            if(!changeToRise) {
                first = -1;
                cls = 'down';
            }
            arr.sort(function(a, b) {
                var pred_a = parseFloat($(a).children('.pred').text().split(' ')[0]);
                var pred_b = parseFloat($(b).children('.pred').text().split(' ')[0]);
                return pred_a>pred_b?first:-first;
            });
            $('.sort').removeClass('rise down');
            $('.sort.pred').addClass(cls);
            break;
        case 2:var changeToRise = !$('.sort.title').hasClass('rise');   //只要不是涨就改成增序
            var first = 1;
            var cls = 'rise';
            if(!changeToRise) {
                first = -1;
                cls = 'down';
            }
            arr.sort(function(a, b) {
                return $(a).children('.title').text()>$(b).children('.title').text()?first:-first;
            });
            $('.sort').removeClass('rise down');
            $('.sort.title').addClass(cls);
            break;
        default :
            alert('error in the sort!');
    }//对li进行排序，这里按照从小到大排序
    $('#keyword_list').empty().append(arr);//清空原来内容添加排序后内容。
}

//function sortNewsListByKeyword(keyword) {
//    filterNews(keyword);    //contour map
//    highlightKeyword(keyword);
//    var arr = $('li.record');
//    arr.sort(function(a, b) {
//        var aElem = $(a).children('.title');
//        var bElem = $(b).children('.title');
//        var aTitle = aElem.text();
//        var bTitle = bElem.text();
//        var aIndex = aTitle.toLowerCase().indexOf(keyword);
//        var bIndex = bTitle.toLowerCase().indexOf(keyword);
//        var aHas = aIndex >= 0;
//        var bHas = bIndex >= 0;
//        if(aHas) {
//            return -1;
//        } else {
//            return 1;
//        }
//    });
//    $('#keyword_list').empty().append(arr);//清空原来内容添加排序后内容。
//}

function highlightKeyword(keyword) {
    var arr = $('li.record');
    arr.each(function(i, d) {
        var elem = $(d).children('.title');
        var title = elem.text();
        var index = -1;
        if(keyword) {
            index = title.toLowerCase().indexOf(keyword);
        } else {
            for(var i in keywords_count_by_date) {
                keyword = keywords_count_by_date[i].keyword;
                index = title.toLowerCase().indexOf(keyword);
                if(index >= 0) {
                    break;
                }
            }
        }
        if(index >= 0) {
            title = title.substring(0, index) + '<text class="highlight_keyword">'
                + title.substring(index, index + keyword.length) + '</text>'
                + title.substring(index + keyword.length);
        }
        elem.html(title);
    });
}

//只有在多选状态下才会调用该方法
function addSearchWord(keyword) {  //添加成功返回true
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


function removeSearchWord(keyword) {  //删除关键词
    all_keywords.splice($.inArray(keyword, all_keywords), 1);
    selected_keywords_arr.splice($.inArray(keyword, selected_keywords_arr), 1);
    selected_keywords = "";
    for(var i in selected_keywords_arr) {
        selected_keywords += selected_keywords_arr[i]+' ';
    }
    adjustKeywordHeight();

    //var words = [];
    //var all_words = [];
    //for(var i in selected_keywords_arr) {
    //    if(selected_keywords_arr[i] == keyword) {
    //        continue;
    //    }
    //    words.push(selected_keywords_arr[i]);
    //}
    //selected_keywords_arr = [];
    //selected_keywords = "";
    //for(var i in words) {
    //    selected_keywords_arr.push(words[i]);
    //    selected_keywords += words[i]+' ';
    //}
    ////下面从所有的关键词数组里删除
    //for(var i in all_keywords) {
    //    if(all_keywords[i] == keyword) {
    //        continue;
    //    }
    //    all_words.push(all_keywords[i]);
    //}
    //for(var i in all_words) {
    //    all_keywords.push(all_words[i]);
    //}
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
    //在展示新的关键词之前首先清空之前的所有状态
    div_factor.select('#div_list').remove();
    clearKeywordSelection();
}

function hideAllTag() {
    d3.selectAll('.tag').each(function() {
        removeClass(d3.select(this), 'tag_cur');
    });
}

function showFactorsTag() {
    hideAllTag();
    addClass(d3.select('#div_factors'), 'tag_cur');
}

function showNewsTag() {
    hideAllTag();
    addClass(d3.select('#div_news'), 'tag_cur');
}