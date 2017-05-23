/**
 * Created by WL on 2016/3/1.
 */


var incoherence = 0.1;
var y_right_frequency  = d3.scale.linear();
var y_right_weight  = d3.scale.linear();
var yAxis_right_weight = d3.svg.axis().scale(y_right_weight).orient("right");
var yAxis_right_frequency = d3.svg.axis().scale(y_right_frequency).orient("right");

function drawSpectrumKeywords(svg_g, factor_data, unit) {

    //先删除上一个色谱，再画色谱
    svg_g.selectAll(".spectrum").remove();

    drawSpectrumKeywordsAdaptively(svg_g, factor_data, unit); //按照unit自适应的画色谱图
    addMouseOver(svg_g);
    //console.log(coherence_all_info);
}

function drawSpectrumKeywordsAdaptively(svg_g, factor_data, unit) {

    var type = factor_data.type;
    var factorInfo = factor_data.info;

    var extent = x_price.domain();
    var start_date = extent[0],
        end_date   = extent[1];
    //
    var units = [];   //记录每个时间单元的信息（涨跌信息或者交易量信息）
    //
    var arr_data = [];
    var max_value = MIN_NUM, min_value = MAX_NUM;
    var max_freq = MIN_NUM;
    //
    var max_date_has_data = start_date;  //有数据的最后日期
    //1.筛选有预测值的数据
    for(var str_date in factorInfo) {
        var date = parseDate(str_date);
        if(date>=start_date && date<=end_date) {
            var obj = {};
            obj.date = date;
            //obj.date = addDate(date, 'd', 1);
            var idx = 0;
            if(which_histogram == 0) {
                idx = 1;
            } else {
                idx = 0;
            }
            obj.freq = factorInfo[str_date][0];      // 0: frequency
            obj.pred = factorInfo[str_date][idx];    // 0: frequency, 1:keyword weight
            arr_data.push(obj);
            if(date > max_date_has_data) {
                max_date_has_data = date;
            }
        }
    }

    //2.按unit计算总的预测涨跌趋势
    var nest_data = d3.nest()
        .key(function(d) {
            var year = d.date.getFullYear();
            var month = d.date.getMonth()+1;
            var day = d.date.getDate();
            if(unit == 'day') {
                return year+'-'+ month+'-'+ day;
            } else if(unit == 'week') {
                return getFirstDayOfWeek(year, month, day);
            } else if(unit == 'month') {
                return year+'-'+month;
            }
        })
        .rollup(function(d) {
            var value_show = d3.sum(d, function(dd) {return dd.pred;});
            var value_freq = d3.sum(d, function(dd) {return dd.freq;});
            return value_show+"_"+value_freq;
        })
        .map(arr_data);

    var end_year = max_date_has_data.getFullYear(), //有数据的最后一年
        end_month = max_date_has_data.getMonth() + 1;       //TODO:为了第一个和最后一个柱不超出时间轴

    //3.将分好组的数据存入数组units
    for(var key in nest_data) {
        var obj = {};
        if(unit == 'day') {
            var date = parseDate(key);
            obj.start_date = date;
            var year = date.getFullYear();
            var month = date.getMonth()+1;
            var day = date.getDate();
            var end = new Date(year, month-1, day);
            end.setDate(end.getDate()+1);
            obj.end_date = end;
            obj.date = key;
        } else if(unit == 'week') {
            var date = parseDate(key);
            obj.start_date = date;
            var year = date.getFullYear();
            var month = date.getMonth()+1;
            var day = date.getDate();
            var end = new Date(year, month-1, day);
            end.setDate(end.getDate()+7);
            obj.end_date = end;
            var w = getMonthWeek(year, month, day);
            if(new Date(year, month-1, 1).getDay() != 0) {    //当前月的第一天不是周日，则当前月的每一周都要减一
                w -= 1;
            }
            obj.date = year+'/'+month+' week '+w;
        } else if(unit == 'month') {
            var date = parseDate(key+'-'+1);
            obj.start_date = date;
            var year = date.getFullYear();
            var month = date.getMonth()+1;
            var day = getDaysOfMonth(year, month);
            var end = new Date(year, month-1, day);
            obj.end_date = end;
            obj.date = year+'/'+month;
        }
        var value_pred_freq = nest_data[key].split('_');
        obj.value = parseFloat(value_pred_freq[0]);
        obj.freq =  parseFloat(value_pred_freq[1]);
        max_value = Math.max(max_value, Math.abs(obj.value));
        max_freq = Math.max(max_freq, Math.abs(obj.freq));
        units.push(obj);
    }
    //.5*height_separated-5
    var height_sep = HEIGHT_FACTOR[type];
    //var height_sep = height_separated;
    //if(type == 'bigram') {
    //    height_sep /= 2;
    //}

    //if(type == 'keyword' || type == 'group') {
    //    max_value = max_value_spectrum_weight;
    //    max_freq = max_value_spectrum_frequency;
    //} if(type == 'bigram') {
    //    if(max_value <= max_value_spectrum_weight/2) {
    //        max_value = max_value_spectrum_weight/2;
    //    }
    //    if(max_freq <= max_value_spectrum_frequency/2) {
    //        max_freq = max_value_spectrum_frequency/2;
    //    }
    //}
    if(type == GROUP) {
        max_value = max_value_spectrum_weight;
        max_freq = max_value_spectrum_frequency;
    } else if(type == KEYWORD) {
        max_value = max_value_spectrum_weight*RATIO_KEYWORD;
        max_freq = max_value_spectrum_frequency*RATIO_KEYWORD;
    } else {
        max_value = max_value_spectrum_weight*RATIO_BIGRAM;
        max_freq = max_value_spectrum_frequency*RATIO_BIGRAM;
    }
    y_right_weight
        .range([height_sep, 5]) //height_sep/2])
        .domain([0, max_value]); //统一max
    y_right_frequency
        .range([0, height_sep-5])//0,height_sep/2
        .domain([0, max_freq]);

    //4.根据units进行画图(预测值)
    svg_g
        .append('g')
        .attr('class', 'spectrum')
        .selectAll('rect')
        .data(units)
        .enter()
        .append('rect')
        .attr('class', 'unit unit_weight')
        .attr('x', function (d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            var width = Math.min(en-st, MAX_BAR_WIDTH);
            return st-width/2;  //改在起始日期左半格
            //return st;  //改在起始日期
            //return st-(en-st)/2; //改为在起始日期的中间
            //return x_price(d.start_date);//改为在起始日期的中间
        })
        .attr('y', function(d) {
            var h = height_sep-y_right_weight(Math.abs(d.value));
            h = adjustSmallBarHeight(h);
            var y = height_sep - h;
            return y;
        })
        .attr('width', function(d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            return Math.min(en-st, MAX_BAR_WIDTH);
            //return en-st;
        })
        .attr('height', function(d) {
            var h = height_sep-y_right_weight(Math.abs(d.value));
            h = adjustSmallBarHeight(h);
            return h;
        })
        .attr('fill', function(d) {
            if(which_histogram == 1) {
                //return 'black';
                return BLUE;
            }
            var fill = RED;
            if(d.value >= 0) {
                fill = GREEN;
            }
            return fill;
        })
        .attr('opacity', function(d) {
            if(which_coherence==1) {    //一致
                if(d.value>= 0 == coherence_all_info[d.date]) {
                    return 1;
                } else {
                    return incoherence;
                }
            } else if(which_coherence == 2) {   //不一致
                if(d.value>=0 != coherence_all_info[d.date]) {
                    return 1;
                }
                return incoherence;
            }
            return 1;
        })
        .append('title')
        .html(function (d) {
            var value = d.value;
            if(which_histogram == 0) {
                value = value.toFixed(2);
            }
            return d.date + " : " + value;
                //+"<br>actual change: "+();
        });

    //在下面画新闻数量
    svg_g
        .append('g')
        .attr('class', 'spectrum')
        .selectAll('rect')
        .data(units)
        .enter()
        .append('rect')
        .attr('class', 'unit unit_freq')
        .attr('x', function (d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            return st;  //改在起始日期
            //return st-(en-st)/4; //改为在起始日期的中间
        })
        .attr('y', function(d) {
            //var h = y_right_weight(Math.abs(d.value));
            //return h;
            return height_sep;
        })
        .attr('width', function(d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            return 1;
            //return (en-st)/2;
        })
        .attr('height', function(d) {
            var h = y_right_frequency(Math.abs(d.freq));
            h = adjustSmallBarHeight(h);    //调整小值
            return h;
        })
        .attr('fill', function(d) {
            return 'black';
            //return BLUE;
        })
        .attr('opacity', function(d) {
            return 1;
        })
        .append('title')
        .html(function (d) {
            var value = d.freq;
            return d.date + " : " + value;
        });

    //画右边的坐标y轴
    if(type == 'bigram') {
        yAxis_right_weight.ticks(1);
        yAxis_right_frequency.ticks(1);
    } else {
        yAxis_right_weight.ticks(2);
        yAxis_right_frequency.ticks(2);
    }
    svg_g.selectAll('.y_right').remove();
    svg_g.append("g")
        .attr("class", "y_right axis measure")
        .attr("transform", "translate(" + (x_price.range()[1]+5) + ", "+ (0) +")")
        .call(yAxis_right_weight)
        .append("text")
        .attr("class", "measure_label")
        .attr("text-anchor", "start")
        .attr("x", -40)
        .attr("y", 15)
        .attr("transform", "")
        .text(function() {
            if(type == GROUP) {
                return 'pred.';
            }
            return '';
        });
    svg_g.append("g")
        .attr("class", "y_right axis measure")
        .attr("transform", "translate(" + (x_price.range()[1]+5) + ", "+ (height_sep) +")")
        .call(yAxis_right_frequency)
        .append("text")
        .attr("class", "measure_label")
        .attr("text-anchor", "start")
        .attr("x", -40)
        .attr("y", height_sep-10)
        .attr("transform", "")
        .text(function() {
            if(type == GROUP) {
                return '#docs';
            }
            return '';
        });
}

function getKeywordSpectrumMax(unit) {
    var max_value_weight = MIN_NUM;
    var max_value_frequency = MIN_NUM;
    for(var i in groups_info_by_date) {
        var factorInfo = groups_info_by_date[i].info;
        var extent = x_price.domain();
        var start_date = extent[0],
            end_date   = extent[1];
        //
        var units = [];   //记录每个时间单元的信息（涨跌信息或者交易量信息）
        //
        var arr_data = [];
        //
        //1.筛选有预测值的数据
        for(var str_date in factorInfo) {
            var date = parseDate(str_date);
            if(date>=start_date && date<=end_date) {
                var obj = {};
                obj.date = addDate(date, 'd', 1);
                obj.freq = factorInfo[str_date][0];    // 0:frequency, 1:keyword weight
                obj.pred = factorInfo[str_date][1];    // 0:frequency, 1:keyword weight
                arr_data.push(obj);
            }
        }

        //2.按unit计算总的预测涨跌趋势
        var nest_data = d3.nest()
            .key(function(d) {
                var year = d.date.getFullYear();
                var month = d.date.getMonth()+1;
                var day = d.date.getDate();
                if(unit == 'day') {
                    return year+'-'+ month+'-'+ day;
                } else if(unit == 'week') {
                    return getFirstDayOfWeek(year, month, day);
                } else if(unit == 'month') {
                    return year+'-'+month;
                }
            })
            .rollup(function(d) {
                var value_show = d3.sum(d, function(dd) {return dd.pred;});
                var value_freq = d3.sum(d, function(dd) {return dd.freq;});
                return value_show+"_"+value_freq;
                //var value = d3.sum(d, function(dd) {return dd.pred;});
                //return value;
            })
            .map(arr_data);

        //3.将分好组的数据存入数组units
        for(var key in nest_data) {
            var obj = {};
            if(unit == 'day') {
                var date = parseDate(key);
                obj.start_date = date;
                var year = date.getFullYear();
                var month = date.getMonth()+1;
                var day = date.getDate();
                var end = new Date(year, month-1, day);
                end.setDate(end.getDate()+1);
                obj.end_date = end;
                obj.date = key;
            } else if(unit == 'week') {
                var date = parseDate(key);
                obj.start_date = date;
                var year = date.getFullYear();
                var month = date.getMonth()+1;
                var day = date.getDate();
                var end = new Date(year, month-1, day);
                end.setDate(end.getDate()+7);
                obj.end_date = end;
                var w = getMonthWeek(year, month, day);
                if(new Date(year, month-1, 1).getDay() != 0) {    //当前月的第一天不是周日，则当前月的每一周都要减一
                    w -= 1;
                }
                obj.date = year+'/'+month+' week '+w;
            } else if(unit == 'month') {
                var date = parseDate(key+'-'+1);
                obj.start_date = date;
                var year = date.getFullYear();
                var month = date.getMonth()+1;
                var day = getDaysOfMonth(year, month);
                var end = new Date(year, month-1, day);
                obj.end_date = end;
                obj.date = year+'/'+month;
            }
            var value_pred_freq = nest_data[key].split('_');
            obj.value = parseFloat(value_pred_freq[0]);
            obj.freq =  parseFloat(value_pred_freq[1]);
            max_value_weight = Math.max(max_value_weight, Math.abs(obj.value));
            max_value_frequency = Math.max(max_value_frequency, Math.abs(obj.freq));
            //max_value_weight = Math.max(max_value_weight, Math.abs(obj.value));
            units.push(obj);
        }
    }
    max_value_spectrum_weight = max_value_weight;
    max_value_spectrum_frequency = max_value_frequency;

    return max_value_weight;
}

function changeCoherence() {
    d3.selectAll('.div_keywordLine')
        .each(function() {
           d3.select(this)
               .selectAll('.unit')
               .each(function(d, i) {
                   d3.select(this)
                        .attr('opacity', function(d) {
                            if(which_coherence==1) {    //一致
                                if(d.value>= 0 == coherence_all_info[d.date]) {
                                    return 1;
                                } else {
                                    return incoherence;
                                }
                            } else if(which_coherence == 2) {   //不一致
                                if(d.value>=0 != coherence_all_info[d.date]) {
                                    return 1;
                                }
                                return incoherence;
                            }
                            return 1;
                        });
                });
        });
}

function showOrHiddenFactorSpectrum() {
    switch(which_histogram) {
        case 0:
            showOrHiddenWeightHistogram(true);
            showOrHiddenFreqHistogram(true);
            break;
        case 1:
            showOrHiddenWeightHistogram(true);
            showOrHiddenFreqHistogram(false);
            break;
        case 2:
            showOrHiddenFreqHistogram(true);
            showOrHiddenWeightHistogram(false);
            break;
        case 3:
            showOrHiddenFreqHistogram(false);
            showOrHiddenWeightHistogram(false);
            break;
    }
}

function showOrHiddenWeightHistogram(flag) {
    if(flag) {
        d3.selectAll('.unit_weight')
            .style('display', 'block');
    } else {
        d3.selectAll('.unit_weight')
            .style('display', 'none');
    }
}

function showOrHiddenFreqHistogram(flag) {
    if(flag) {
        d3.selectAll('.unit_freq')
            .style('display', 'block');
    } else {
        d3.selectAll('.unit_freq')
            .style('display', 'none');
    }
}

var MIN_HEIHGT = 1;
//如果高度太小，则设为最小值
function adjustSmallBarHeight(h) {
    if(h == 0) {
        return h;
    }
    if(h < 2) {
        h = 2;
    }
    return h;
}