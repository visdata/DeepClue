/**
 * Created by WL on 2016/5/15.
 */

var div_init_keyword = d3.select('#div_init_keyword');
$('#div_init_keyword').width(width+10);
var height_separated = 55;

var y_init_keyword  = d3.scale.linear();
var y_right_keyword  = d3.scale.linear();

var xAxis_init_keyword = d3.svg.axis().scale(x_price).orient("bottom").ticks(0);
var yAxis_init_keyword = d3.svg.axis().scale(y_init_keyword).orient("left");
var yAxis_right_keyword = d3.svg.axis().scale(y_right_keyword).orient("right").ticks(2);

var color_init_keyword = d3.scale.category10();

var line_init_keyword = d3.svg.line()
    .x(function(d) {
        return x_price(d.date);
    })
    .y(function(d) {
        return y_init_keyword(d.value);
    });

var dict_stocks_data, dict_keyword_data;  //���ֵ���ʽ����ɼ����ݺ͹ؼ������ݣ��Ա������ض�
var delay = 0;  //delay,������ض�ʱ�õ�

function showOrHiddenTimeline() {
    if(which_timeline < 2) {    //0:����ԣ�1��Ƶ��
        //show
        d3.selectAll('.keywordLine')
            .style('display', 'block');
        if(last_timeline_type != which_timeline) {
            drawKeywordLines();
        }
    } else {    //2������
        //hidden
        d3.selectAll('.keywordLine')
            .style('display', 'none');
        d3.selectAll('.hidden_axislabel')
            .style('display', 'none');
    }
}

function getUnit(start_year, start_month, end_year, end_month) {
    var unit = "day";
    if(which_window != 0) { //��window����0ʱ������������Ӧ�ģ�������û�ѡ�������ʾ
        if(window_types[which_window] == 'year') {
            unit = 'month';
        } else if(window_types[which_window] == 'month') {
            unit = 'week';
        } else if(window_types[which_window] == 'week') {
            unit = 'day';
        }
    } else {
        //�ж�ʱ�����Ƕ��٣�ȷ���Ƿ���Ҫƽ������
        //����������ƽ������
        if(end_year - start_year > 3) { //�����䳬������ʱ�����·ݻ�
            unit = 'month';
        } else if(end_year-start_year > 1 || (end_year-start_year==1)&&(end_month+12-start_month>=12)) {
            //��������һ�굽����֮��ʱ�����ܻ�
            unit = "week";
        } else {
            unit = 'day';
        }
    }
    return unit;
}

function drawKeywordLines() {
    clearInitKeywords();

    var keywordCount = keywords_count_by_date;

    if(!dict_stocks_data) {
        dict_stocks_data = getAllStocksDataByDay();
    }

    dict_keyword_data = getKeywordDataByDay(delay);  //���ֵ���ʽ����ɼ����ݺ͹ؼ������ݣ��Ա������ض�

    ////TODO: ��keywordCount���keyword������Խ�������
    //keywordCount.forEach(function(d) {
    //    //������ǹؼ���Ԥ��ֵ��ʵ��ֵ�������
    //    d['correlation'] = getPeriodCrossCorrelationKeywordPrediction(d.keyword, parseDate(all_start_date), parseDate(all_end_date));
    //    if(map_keyword_attr[d.keyword]) {
    //        d.weight = map_keyword_attr[d.keyword].weight;
    //        d.frequency = map_keyword_attr[d.keyword].frequency;
    //        d.normalize = map_keyword_attr[d.keyword].normalize;
    //    } else {
    //        d.weight = Number.MAX_VALUE;
    //        d.frequency = Number.MAX_VALUE;
    //        d.normalize = Number.MAX_VALUE;
    //    }
    //});
    //keywordCount.sort(function(a, b) {
    //    //TODO: ['weight', 'frequency', 'normalize', 'correlation']
    //    var type = sort_types[which_sort];
    //    return Math.abs(b[type]) - Math.abs(a[type]);
    //});

    var extent = x_price.domain();
    var start_year = extent[0].getFullYear(),
        end_year = extent[1].getFullYear(),
        start_month = extent[0].getMonth(),
        end_month = extent[1].getMonth(),
        start_day = extent[0].getDate(),
        end_day = extent[1].getDate();

    var unit = getUnit(start_year, start_month, end_year, end_month);

    var max_count = 0;  //��ȡ���йؼ����е����ֵ
    var tmpKeywordCount = [];
    for(var i in keywordCount) {
        var d = keywordCount[i];
        var data = [];
        var keyword_count = d.info;    //TODO������ÿ���ؼ��ʵ�������Ϊ�����ֵ���Ϣ��ֵ��Ƶ�ʺ�Ԥ��ֵ�����飡����
        //����ɸѡ����ʱ����֮�ڵ�����
        for(var date=new Date(start_year, start_month, start_day);
                date<=extent[1]; addDate(date, 'd', 1)) {
            var date_format = format_date2(date);
            var obj = {};
            obj['date'] = parseDate(date_format);
            var value = 0;
            if(keyword_count[date_format]) {
                value = keyword_count[date_format][0];
            }
            obj['value'] = value;
            data.push(obj);
        }

        //���ܼ����ܵĴ�Ƶ��ƽ������
        var nest_data = d3.nest()
            .key(function(d) {
                var year = d.date.getFullYear(), month = d.date.getMonth()+1,
                    day = d.date.getDate();
                if(month < 10) {
                    month = '0'+month;
                }
                if(day < 10) {
                    day = '0'+day;
                }
                if(unit == 'month') {
                    return year+'-'+month+'-15';    //Ϊ�˻�ͼ
                } else if(unit == 'week') {
                    return getFirstDayOfWeek(year, month, day);
                } else if(unit == 'day') {
                    return year+'-'+ month+'-'+ day;
                }
            })
            .rollup(function(d) {
                //console.log(d);
                var value = d3.sum(d, function(dd){return dd['value']});
                //var cross = getUnitPeriodCrossCorrelation(d.keyword, format_date2(addDate(d.date, unit[0], -1)), unit[0]);
                //if(which_timeline == 0) {
                //    value = cross;
                //}
                max_count = Math.max(max_count, value); //��ȡ���ֵ��Ϊ��overlapping��ͼ
                return value;
            })
            .map(data);

        var keyword_info = {};
        keyword_info['keyword'] = d.keyword;
        keyword_info['count'] = nest_data;
        tmpKeywordCount.push(keyword_info);
    }
    keywordCount = tmpKeywordCount;

    //console.log(keywordCount);
    drawSeparatedKeywordLine(keywordCount, unit);
}

function drawSeparatedKeywordLine(keywordCounts, unit) {
    clearInitKeywords();

    for(var i in keywordCounts) {
        //drawSingleKeywordLine(keywordCounts[i], i, unit);
        drawSingleKeywordLineContinuous(keywordCounts[i], i, unit); //������ͼ
    }
}

function drawSingleKeywordLineContinuous(keywordCount, index, unit) {

    var svg_keywordLine = div_init_keyword
        .append('div')
        .datum(keywordCount)
        .attr('class', 'div_keywordLine')
        .attr('id', function() {
            return 'keyword_line_'+ keywordCount.keyword;
        })
        .style('height', height_separated*2+5+'px')
        .append('svg')
        .attr('class', 'svg_keywordLine');

    var svg_keywordLine_g = svg_keywordLine
        .append('g')
        .attr('class', 'svg_g')
        .attr('transform', 'translate(50, 2)'); //

    //�������ֵ��ȷ��y�᷶Χ
    var max_count = 0;
    for(var date in keywordCount.count) {
        if(keywordCount.count[date] > max_count) {
            max_count = keywordCount.count[date];
        }
    }
    y_init_keyword
        .range([height_separated*2-5, 5])
        //.range([5, height_separated-5])
        .domain([max_count, 0]);    //��������
        //.domain([0, max_count]);
    if(which_timeline == 0) {
        y_init_keyword
            .domain([1, -1]);
    }

    yAxis_init_keyword.ticks(2);

    //����brush
    var brush_keyword = d3.svg.brush()
        .x(x_price)
        .on("brush", function() {
            //ȡ���ؼ��ʸ���
            clearKeywordHighlight();
            //��������brushȥ��
            d3.selectAll('.brush_keyword')
                .each(function(dd, ii) {
                    if(dd.keyword != keywordCount.keyword) {
                        d3.select(this)
                            .select('.extent')
                            .attr('width', 0);  //����brush�Ŀ����Ϊ0����ȥ��
                    }
                });
            var extent = brush_keyword.empty() ? x_price.domain() : brush_keyword.extent();
            showNewsTable(keywords_news_by_date, keywordCount.keyword, extent[0], extent[1]);
        });

    svg_keywordLine_g.append("g")
        .attr("class", "brush_keyword")
        .call(brush_keyword)
        .selectAll("rect")
        .attr("y", 0)
        .attr("height", height_separated);

    //��ʱ����
    svg_keywordLine_g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height_separated-5) + ")")
        .call(xAxis_init_keyword);
    //��y��
    svg_keywordLine_g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(1, "+ (0) +")")
        .call(yAxis_init_keyword)
        .append("text")
        .attr("class", "axislabel hidden_axislabel")
        .attr("text-anchor", "start")
        .attr("x", -40)
        .attr("y", 30)
        .text(function(d) {
            switch (which_timeline) {
                case 0:
                    return 'cor';
                case 1:
                    return 'feq';
            }
        });

    //��ͼ�����ؼ�������
    svg_keywordLine_g.append('text')
        .attr('fill', function() {
            return 'black';
            //return color_init_keyword(index);
        })
        .attr('class', 'keywordLegend')
        .attr('transform', 'translate('+(20)+', '+(height_separated/2)+')')
        //.attr('transform', 'translate('+(width-120)+', '+(height_separated/2)+')')
        .on('click', function() {
            //addFactorLine(keywordCount.keyword);
        })
        .text(keywordCount.keyword);

    drawKeywordLineEveryDay(svg_keywordLine_g, keywordCount, unit);
    drawSpectrumKeywords(svg_keywordLine_g, keywordCount.keyword, unit);

    ////TODO: ��ק
    //$('.div_keywordLine')
    //    .each(function() {
    //        var this_elem = $(this);
    //        var this_div = this_elem[0];
    //        this_div.draggable="true";
    //        this_div.ondragstart="drag(event, this)";
    //        this_div.ondrop = "drop(event, this)";
    //        this_div.ondragover="allowDrop(event)";
    //    });

    //$('.div_keywordLine')
    //    .click(function() {
    //         $(this).insertBefore($('.div_keywordLine').first())
    //    }); //�����һ��div���ƶ�����һ��λ��
}

function moveKeywordLineToFirst(keyword) {
     $('#keyword_line_' + keyword).insertBefore($('.div_keywordLine').first());
}

function drawKeywordLineEveryDay(svg_keywordLine_g, keywordCount, unit) {

    var start_date = keywordCount.count[0];
    var lines = []; //�����߶�
    var prev_cross = 0, prev_date = '';
    for(var date in keywordCount.count) {
        var u = 'm';
        if(unit == 'month') {
            u = 'y';
        } else if(unit == 'week') {
            u = 'm';
        } else if(unit == 'day') {
            u = 'w';
        }
        var cross, cross_next;
        //�����ȥһ��u�����ڵ������
        if(prev_date == date) {
            cross = prev_cross;
            //console.log('equals!');
        } else {
           cross = getUnitPeriodCrossCorrelation(keywordCount.keyword, format_date2(addDate(parseDate(date), u, -1)), u);
        }
        var date_next = addDate(parseDate(date), unit[0], 1);
        prev_date = format_date2(date_next);
        //console.log(prev_date+" # "+date + " : "+ format_date2(date_next));
        var cross_next = getUnitPeriodCrossCorrelation(keywordCount.keyword, format_date2(addDate(date_next, u, -1)), u);
        prev_cross = cross_next;    //��¼�ϴμ�������ں������

        var line = [];  //һ���߶�
        var obj = {};
        //obj['date'] = parseDate(date);
        obj['date'] = addDate(parseDate(date), unit[0], -1);
        obj['frequency'] = keywordCount.count[date];
        obj['correlation'] = cross;
        var obj_next = {};
        obj_next['date'] = parseDate(date);
        //obj_next['date'] = addDate(parseDate(date), unit[0], 1);
        var value_next = keywordCount.count[format_date2(addDate(parseDate(date), unit[0], 1))];
        //var value_next = keywordCount.count[format_date2(obj_next['date'])];
        if(value_next == undefined) {
            value_next = keywordCount.count[date];
        }
        obj_next['frequency'] = value_next;
        obj_next['correlation'] = cross_next;
        //console.log(cross_next);

        if(which_timeline == 0) {
            obj['value'] = obj['correlation'];
            obj_next['value'] = obj_next['correlation'];
        } else {
            obj['value'] = obj['frequency'];
            obj_next['value'] = obj_next['frequency'];
        }
        line.push(obj);
        line.push(obj_next);
        lines.push(line);
    }
    svg_keywordLine_g.selectAll('day')
        .data(lines)
        .enter()
        .append('path')
        .attr('class', 'keywordLine')
        .attr('stroke-width', '2px')
        .attr('fill', 'none')
        .attr("d", function (line_data) {   //�˴���d����line_data, lines[i]
            var cross_correlation = line_data[0]['correlation'];
            d3.select(this)
                .attr('stroke', function () {
                    return 'steelblue';  //TODO:��ʱȥ������Ե���ɫ��ʾ
                    if (cross_correlation < 0) {
                        return 'red';
                    } else if(cross_correlation > 0) {
                        return 'green';
                    } else {    // == 0
                        return 'gray';
                    }
                })
                //.attr('stroke-dasharray', function() {
                //    if(cross_correlation >= 0) {
                //        return '1, 0';
                //    }
                //    return '1, 1';
                //})
                .attr('stroke-opacity', function () {
                    return 1;
                    //if(cross_correlation == 0) {
                    //    return 1;
                    //}
                    ////͸���ȸ�����ض�0~1��Ӧ��Ϊ0.3~1
                    //var min = 0.3;
                    //return min + Math.abs(cross_correlation) * (1 - min);
                })
                .attr('stroke-width', function() {
                    //͸���ȸ�����ض�0~1��Ӧ��Ϊ1~3
                    var min = 1;
                    return 1;
                    return min + Math.abs(cross_correlation)*2+'px';
                })
                .on('mouseenter', function() {
                    d3.select(this)
                        .attr('stroke-width', '3px')
                })
                .on('mouseleave', function() {
                    var min = 1;
                    var s_w = min + Math.abs(cross_correlation)*2+'px';
                    d3.select(this)
                        .attr('stroke-width', min)
                })
                .append('title')
                .html(function() {
                    var period = format_date2(line_data[1].date);
                    var y = parseInt(period.split('-')[0]);
                    var m = parseInt(period.split('-')[1]);
                    var d = parseInt(period.split('-')[2]);
                    if(unit == "month") {
                        period = y+"-"+m;
                    } else if(unit == "week") {
                        period = y+"-"+m+" week "+getMonthWeek(y, m, d);
                    }
                    return "Period: "+period+
                        "<br>frequency: "+line_data[0].frequency+"<br>cross correlation: "+
                    cross_correlation.toFixed(2)
                });

            //line_data.sort(function (a, b) {  //�ȶ����鰴date���򣬷���areaͼ�����
            //    if (a.date > b.date) {
            //        return 1;
            //    } else if (a.date < b.date) {
            //        return -1;
            //    }
            //});
            return line_init_keyword(line_data);
        });

}

function clearAllKeywordBrush() {
    d3.selectAll('.brush_keyword')
        .each(function(dd, ii) {
            d3.select(this)
                .select('.extent')
                .attr('width', 0);  //����brush�Ŀ����Ϊ0����ȥ��
        });
}

function clearInitKeywords() {
    div_init_keyword.selectAll('div').remove();
    div_init_keyword.selectAll('svg').remove();
}

function getUnitPeriodCrossCorrelation(keyword, start, unit) {

    var start_date = parseDate(start);
    var end_date = parseDate(start);
    end_date = addDate(end_date, unit, 1);

    return getPeriodCrossCorrelationKeywordPrediction(keyword, start_date, end_date, unit);
}

function getPeriodCrossCorrelation(keyword, start_date, end_date, unit) {

    //��ָ��˥��ȷ��ÿһ��ı���:w=exp(-at)
    //ȷ������a�����ݰ�˥�ڵĴ�Сȷ��a������exp(-at)=1/2,tΪ��˥�ڣ���a=log2/t,log2=0.693
    //��unit��һ���ʱ��,��˥����30�죬��a=log2/30=0.0231
    //��unit���µ�ʱ�򣬰�˥����7�죬��a=log2/7=0.1
    //��unit���ܵ�ʱ�򣬰�˥����1�죬��a=log2/1=0.693
    var a = 0.0231;
    if(unit == 'y') {
        a = 0.0231;
    } else if(unit == 'm') {
        a = 0.1;
    } else if(unit == 'w') {
        a = 0.693;
    }

    var keyword_arr = [], stocks_arr = []; //�ֱ𱣴�ؼ��ֺ͹ɼ۵����飬Ȼ�����ù�ʽ����ض�
    var format = d3.time.format('%Y-%m-%d');
    for(; start_date<end_date; start_date=addDate(start_date, 'd', 1)) {
        var date = format(start_date);
        if(dict_keyword_data[keyword][date] && dict_stocks_data[date]) {
            keyword_arr.push(dict_keyword_data[keyword][date][0]);

            //TODO:�����Ǹ����û�ѡ�񣬼����루ʵ��ֵ��Ԥ��ֵ��risk������ض�
            var price;
            if(correlation_types[which_correlation] == 'actual') {
                price = dict_stocks_data[date]['close'];
            } else if(correlation_types[which_correlation] == 'prediction') {
                var model_name = model_names[which_model];
                price = dict_stocks_data[date]['pred_close_'+model_name];
            } else if(correlation_types[which_correlation] == 'risk') {
                price = dict_stocks_data[date]['risk'];
            }
            stocks_arr.push(price);
        }
    }

    var mean_keyword = d3.mean(keyword_arr);
    var mean_stocks = d3.mean(stocks_arr);
    var deviation_keyword = 0;
    var deviation_stocks = 0;

    var cross_covariance;
    if(unit) {  //����ǰ��μ���Ļ���ʹ�øĽ��������Թ�ʽ����
        var sum = 0;
        var all_weight = 0;
        for (var idx in keyword_arr) {
            var t = keyword_arr.length-1-idx;
            var weight = Math.exp(-a*t);
            sum += weight*(keyword_arr[idx] - mean_keyword) * (stocks_arr[idx] - mean_stocks);
            deviation_keyword += weight*Math.pow(keyword_arr[idx] - mean_keyword, 2);
            deviation_stocks += weight*Math.pow(stocks_arr[idx] - mean_stocks, 2);
            all_weight += weight;
        }
        cross_covariance = sum / all_weight;
        deviation_keyword = Math.sqrt(deviation_keyword/all_weight);
        deviation_stocks = Math.sqrt(deviation_stocks/all_weight);
    } else {
        var sum = 0;
        for (var idx in keyword_arr) {
            sum += (keyword_arr[idx] - mean_keyword) * (stocks_arr[idx] - mean_stocks);
        }
        cross_covariance = sum / keyword_arr.length;
        deviation_keyword = d3.deviation(keyword_arr);
        deviation_stocks = d3.deviation(stocks_arr);
    }
    var cross_correlation = cross_covariance / (deviation_keyword * deviation_stocks);
    if (isNaN(cross_correlation)) {
        cross_correlation = 0;
    }
    return cross_correlation;
}

//�õ��ؼ��ʵ�Ԥ��ֵ��ɼ�ͼ��ʾ����ض�
function getPeriodCrossCorrelationKeywordPrediction(keyword, start_date, end_date, unit) {

    //��ָ��˥��ȷ��ÿһ��ı���:w=exp(-at)
    //ȷ������a�����ݰ�˥�ڵĴ�Сȷ��a������exp(-at)=1/2,tΪ��˥�ڣ���a=log2/t,log2=0.693
    //��unit��һ���ʱ��,��˥����30�죬��a=log2/30=0.0231
    //��unit���µ�ʱ�򣬰�˥����7�죬��a=log2/7=0.1
    //��unit���ܵ�ʱ�򣬰�˥����1�죬��a=log2/1=0.693
    var a = 0.0231;
    if(unit == 'y') {
        a = 0.0231;
    } else if(unit == 'm') {
        a = 0.1;
    } else if(unit == 'w') {
        a = 0.693;
    }

    var arr_keyword_predicted = [], arr_prices = [];    //�ֱ𱣴�ؼ���Ԥ��ֵ��ɼ�ͼ����ʾ������
    for(; start_date<end_date; start_date=addDate(start_date, 'd', 1)) {
        var date = format_date2(start_date);
        var which_to_show = spectrums[which_spectrum];
        var keyword_date = addDate(parseDate(date), 'd', -delay);
        keyword_date = format_date2(keyword_date);
        if(dict_keyword_data[keyword][keyword_date] && dict_stocks_data[date]) {
            var idx = 0;
            if(which_histogram == 0) {
                idx = 2;    // weight
            } else {
                idx = 0;    //frequency
            }
            arr_keyword_predicted.push(dict_keyword_data[keyword][keyword_date][idx]);//0:frequency��1��prediction, 2:keyword weight

            //TODO:�����Ǹ����û�ѡ�񣬼����루ʵ��ֵ��Ԥ��ֵ��risk������ض�
            var price = dict_stocks_data[date][which_to_show];
            arr_prices.push(price);
        }
    }

    //console.log(dict_keyword_data);
    //console.log(dict_stocks_data);
    //console.log(arr_keyword_predicted);
    //console.log(arr_prices);

    var mean_keyword = d3.mean(arr_keyword_predicted);
    var mean_stocks = d3.mean(arr_prices);
    var deviation_keyword = 0;
    var deviation_stocks = 0;

    var cross_covariance;
    if(unit) {  //����ǰ��μ���Ļ���ʹ�øĽ��������Թ�ʽ����
    //if(false) {  //TODO:ʹ�øĽ��������Թ�ʽ�����ٶ�̫��
        var sum = 0;
        var all_weight = 0;
        for (var idx in arr_keyword_predicted) {
            var t = arr_keyword_predicted.length-1-idx;
            var weight = Math.exp(-a*t);
            sum += weight*(arr_keyword_predicted[idx] - mean_keyword) * (arr_prices[idx] - mean_stocks);
            deviation_keyword += weight*Math.pow(arr_keyword_predicted[idx] - mean_keyword, 2);
            deviation_stocks += weight*Math.pow(arr_prices[idx] - mean_stocks, 2);
            all_weight += weight;
        }
        cross_covariance = sum / all_weight;
        deviation_keyword = Math.sqrt(deviation_keyword/all_weight);
        deviation_stocks = Math.sqrt(deviation_stocks/all_weight);
    } else {
        var sum = 0;
        for (var idx in arr_keyword_predicted) {
            sum += (arr_keyword_predicted[idx] - mean_keyword) * (arr_prices[idx] - mean_stocks);
        }
        cross_covariance = sum / arr_keyword_predicted.length;
        deviation_keyword = d3.deviation(arr_keyword_predicted);
        deviation_stocks = d3.deviation(arr_prices);
    }
    var cross_correlation = cross_covariance / (deviation_keyword * deviation_stocks);
    if (isNaN(cross_correlation)) {
        cross_correlation = 0;
    }
    return cross_correlation;
}

function isNext(date1, date2, unit) {
    var interval = 'd';
    if(unit == 'day') {
        interval = 'd';
    } else if(unit == 'week') {
        interval = 'w';
    } else if(unit == 'month') {
        interval = 'm';
    }
    var format = d3.time.format("%Y-%m-%d");
    var next = addDate(new Date(date1), interval, 1);
    return format(next) == format(date2);
}

function prevOrNext(date, unit, flag) { //flag=-1:prev, flag=1:next
    var prev = new Date(date);
    var interval = 'd';
    if(unit == 'day') {
        interval = 'd';
    } else if(unit == 'week') {
        interval = 'w';
    } else if(unit == 'month') {
        interval = 'm';
    }
    return addDate(prev, interval, flag);
}


/*
** ������ʵ��div�ϷŲ���
 */
function allowDrop(ev)
{
    ev.preventDefault();
}

var srcdiv = null;
function drag(ev, divdom)
{
    srcdiv=divdom;
    ev.dataTransfer.setData("text/html",divdom.innerHTML);
}

function drop(ev, divdom)
{
    ev.preventDefault();
    if(srcdiv != divdom){
        alert('change!');
        srcdiv.innerHTML = divdom.innerHTML;
        divdom.innerHTML=ev.dataTransfer.getData("text/html");
    }
}

//function keyword_brushed(keyword) {
//    alert(keyword);
//    var extent = brush_keyword.empty() ? x_price.domain() : brush_keyword.extent();
//    showNewsTable(keywords_news_by_date, 'share', extent[0], extent[1]);
//}