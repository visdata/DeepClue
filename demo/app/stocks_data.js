/**
 * Created by WL on 2016/6/11.
 */

function getStocksDataGroupByMonth() {
    //首先筛选出在时间轴之内的数据
    var stocks_data_period = [];
    stocks_data.forEach(function(d) {
        if(d.date >= x_price.domain()[0] && d.date <= x_price.domain()[1]) {
            stocks_data_period.push(d);
        }
    });

    //按月计算总的词频以平滑曲线
    var month_data = d3.nest()
        .key(function(d) {
            return d.date.getFullYear();
        })
        .key(function(d) { return d.date.getMonth() + 1; })
        .rollup(function(d) {
            var value = d3.sum(d, function(dd){return dd['close']});
            return value;
        })
        .map(stocks_data_period);

    var stock_grouped = {};
    for(var year in month_data) {
        for(var month in month_data[year]) {
            var y = parseInt(year),
                m = parseInt(month);
            stock_grouped[y+'-'+m+'-15'] = month_data[year][month];
        }
    }

    return stock_grouped;
}

function getAllStocksDataByDay() {
    //所有数据存到字典中去
    var dict_stocks_data = {};
    stocks_data.forEach(function(d) {
        var model_name = model_names[which_model];
        dict_stocks_data[d.Date] = {};
        dict_stocks_data[d.Date][ACTUAL] = d['actual_change'];
        dict_stocks_data[d.Date][PREDICTION_TEXT] = d['predict_text_'+model_name];
        dict_stocks_data[d.Date][PREDICTION] = d['pred_close_'+model_name];
        dict_stocks_data[d.Date][ERROR] = d['pred_close_'+model_name]- d.adjclose;
        dict_stocks_data[d.Date][VOLUME] = d.volume;
        dict_stocks_data[d.Date]['close'] = d.adjclose;
        dict_stocks_data[d.Date]['adjclose'] = d.adjclose;
        dict_stocks_data[d.Date]['open'] = d.open;
        dict_stocks_data[d.Date]['adjopen'] = d.adjopen;
        dict_stocks_data[d.Date]['pred_close_'+model_name] = d['pred_close_'+model_name];
        dict_stocks_data[d.Date]['bias_'+model_name] = d['bias_'+model_name];
        dict_stocks_data[d.Date]['risk'] = Math.abs(d.close-d['pred_close_'+model_name]);
        dict_stocks_data[d.Date]['fund'] = d['fund_'+model_name];
    });
    return dict_stocks_data;
}

function getGroupDataByDay() {
    var dict_group_data = {};
    for(var i in groups_info_by_date) {
        var d = groups_info_by_date[i];
        dict_group_data[d.group] = d;
        //dict_group_data[d.key] = d;
    }
    return dict_group_data;
}

function getKeywordDataByDay() {
    //if(delay != 0) {
    //    return getKeywordDataByDayDelay(delay);
    //}
    list_all_keywords = [];
    var dict_keyword_data = {};
    var keywordCount = keywords_count_by_date;
    for(var i in keywordCount) {
        var d = keywordCount[i];
        dict_keyword_data[d.keyword] = d;
        list_all_keywords.push(d.keyword);
    }
    return dict_keyword_data;
}

function getBigramDataByDay() {
    //if(delay != 0) {
    //    return getKeywordDataByDayDelay(delay);
    //}
    var dict_bigram_data = {};
    for(var keyword in bigram_info_of_keywords) {
        var bigram_info_keyword = bigram_info_of_keywords[keyword];
        for(var i in bigram_info_keyword) {
            var d = bigram_info_keyword[i];
            dict_bigram_data[d.bigram] = d;
        }
    }
    return dict_bigram_data;
}

//当delay等于1时的关键词频率统计,
function getKeywordDataByDayDelay(delay) {
    var dict_keyword_data = {};
    var keywordCount = keywords_count_by_date;
    var format = d3.time.format('%Y-%m-%d');    //将日期格式化成字符串
    for(var i in keywordCount) {
        var d = keywordCount[i];
        //d.count['2006-11-03'] = 3;        //测试周末是否正确用的
        //d.count['2006-11-04'] = 4;
        //d.count['2006-11-05'] = 5;
        var count = {};
        for(var key in d.count) {
            var date = parseDate(key);
            var w = date.getDay();  //周几，根据当天是周几来进行相应操作，将周五周六周日的平均值作为下周一的值
            if(w>=1 && w<=4) {  //如果是周一到周四，则直接作为第二天的值
                date = addDate(date, 'd', 1);
                count[format(date)] = d.info[key][0];
            } else {
                date = addDate(date, 'd', (8-w)%7); //w=5:+3, w=6:+2, w=0:+1
                var str_date = format(date);
                if(count[str_date]) {   //如果存在该天（即周一），则继续相加，最后求平均
                    count[str_date] += d.info[key][0];
                } else {
                    count[str_date] = d.info[key][0];
                }
                if(w == 0) {
                    count[str_date] = Math.floor(count[str_date]/3);    //求周五周六周日的平均值，整数
                }
            }
        }
        dict_keyword_data[d.keyword] = count;
    }
    return dict_keyword_data;
}

function getPeriodStocksDataByDay() {
    //首先筛选出在时间轴之内的数据
    var stocks_data_period = {};
    stocks_data.forEach(function(d) {
        if(d.date >= x_price.domain()[0] && d.date <= x_price.domain()[1]) {
            stocks_data_period[d.Date] = d.close;
        }
    });

    return stocks_data_period;
}