/**
 * Created by WL on 2015/12/11.
 */
var spinner_factor = new Spinner(opts);
var target_factor = document.getElementById("spinner_factor");

var svg_factor = d3.select("#svg_factor");
var svg_factor_g = svg_factor.append("g")
    .attr("class", "svg_g")
    .attr("transform", "translate(0, 0)");
var width_factor_view  = $("#factor_view").width();
var height_factor_view = $("#factor_view").height();

var factor_margin = {left: 30, top: 5, right: 10, bottom: 30}; //设置曲线的边距
var selected_price = [0, 1];    //选中显示哪些价格曲线
var height_y_axis = (height_factor_view-factor_margin.top-factor_margin.bottom)/2;

var x_price_factor  = d3.time.scale().range([5+factor_margin.left, width_factor_view-factor_margin.right]),
    y_price_factor  = d3.scale.linear().range([height_y_axis+factor_margin.top, factor_margin.top]),
    y_factor  = d3.scale.linear().range([height_factor_view-factor_margin.bottom, height_y_axis+factor_margin.top]);

var xAxis_price_factor = d3.svg.axis().scale(x_price_factor).orient("bottom").ticks(5).tickFormat(customTimeFormat),
    yAxis_price_factor = d3.svg.axis().scale(y_price_factor).orient("left").ticks(5),
    xAxis_factor = d3.svg.axis().scale(x_price_factor).orient('bottom').ticks(5).tickFormat(customTimeFormat),
    yAxis_factor = d3.svg.axis().scale(y_factor).orient("left").ticks(5);

var customTimeFormat = d3.time.format.multi([
  [".%L", function(d) { return d.getMilliseconds(); }],
  [":%S", function(d) { return d.getSeconds(); }],
  ["%I:%M", function(d) { return d.getMinutes(); }],
  ["%I %p", function(d) { return d.getHours(); }],
  //["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }], //返回周几加日期（几号）
  //["%a %d", function(d) { return d.getDate() != 1; }],
  ["%b %d", function(d) { return d.getDate() != 1; }],
  ["%B", function(d) { return d.getMonth(); }],
  ["%Y", function() { return true; }]
]);

//下面是画factor view里的股价曲线图
var line_price_factor = d3.svg.line()
    .x(function(d) {
        return x_price_factor(d.date);
    })
    .y(function(d) {
        return y_price_factor(d.value);
    });

var area_risk_factor = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) {
        return x_price_factor(d.date);
    })
    .y0(function(d) {
        return y_price_factor(d.lower);
    })
    .y1(function(d) {
        return y_price_factor(d.upper);
    });


//下面是画factor view里的因素数量图
var stack_factor = d3.layout.stack()
    .offset("zero")
    .values(function(d) { return d.values; })
    .x(function(d) { return d.date; })
    .y(function(d) { return d.value; });

var nest = d3.nest()
    .key(function(d) { return d.key; });

var area_factor = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x_price_factor(d.date); })
    .y0(function(d) { return y_factor(d.y0); })
    .y1(function(d) { return y_factor(d.y0 + d.y); });

var line_ratio = d3.svg.line()
    .interpolate('linear')
    .x(function(d) {
        return x_price_factor(d.date);
    })
    .y(function(d) {
        return y_factor(d.value);
    });

var typeFace = 'Gorditas';
var minFontSize = 24;
var colors = d3.scale.category20b();
var factor_colors = ["rgb(111, 127, 179)", "rgb(127, 147, 203)",
    "rgb(189, 202, 239)", "rgb(240, 190, 175)", "rgb(240, 30, 15)"];
var factor_keyword_color = ['red', 'rgb(0,128, 1)'];

function getSentimentNewsAndDraw() {
    return;//暂时去掉

    if(news_sentiment != undefined && pre_stock == which_stock) {
        console.log(" chart exists!!");
        drawSentimentNews(news_sentiment);
        return;
    }

    spinner_factor.spin(target_factor);

    var url = "http://"+SERVER+":"+FACTOR_PORT+"/getNewsSentiment?symbol="+companies[which_stock]["symbol"];
    $.ajax({
        url: url,
        context: document.body,
        //async: false,
        success: function(data){
            pre_stock = which_stock;

            news_sentiment = eval("("+data+")");
            spinner_factor.spin();     //end spinner
            drawSentimentNews(news_sentiment);
        },
        error: function(error) {
            alert("error!");
            console.log(error);
            spinner_factor.spin();
        }
    });
}

function drawFactorPrice(data_price) {
    return;//TODO:暂时去掉

    var price_str =  prices[which_price];
    var model_name = model_names[which_model];

    var is_close = (price_str == 'close');
    var prices_arr = [price_str];
    if(is_close) {
        if(mode_keywords) {
            prices_arr.push('sub_prediction');
        } else {
            prices_arr.push('pred_close_'+model_names[selected_models[0]]);
        }
        //for(var i=0; i<selected_models.length; i++) {
        //    var selected_model = selected_models[i];
        //    var selected_model_name = model_names[selected_model];
        //    prices_arr.push('pred_close_'+selected_model_name);
        //}
    }

    var domain = d3.keys(prices_arr);
    var price_data = domain.map(function(i) {
        return {
            price: prices_arr[i],
            values: data_price.map(function(d) {
                return {date: d.date, value: d[prices_arr[i]]};
            })
        };
    });

    y_price_factor.domain([
        d3.min(data_price, function(d) {return d["lower_"+price_str]*1.1;}), // not 0
        d3.max(data_price, function(d) {return d["upper_"+price_str]*1.1;})
    ]);
    
    var prices_risk = [];
    data_price.forEach(function(d) {
        //用于上下risk显示
        prices_risk.push({date: d.date, upper: d["upper_close_"+model_name],
                lower: d["lower_close_"+model_name]});
    });

    svg_factor_g.append("path")
        .datum(prices_risk)
        .attr("class", "risk_area")
        .attr("d", area_risk_factor);

    svg_factor_g.selectAll(".curve")
        .data(price_data)
        .enter()
        .append("path")
        .attr("class", function(d, i) {
            var cls = "curve curve" + i;
            if(i == 0) {
                cls += " actual";
            } else if(i >= 1) {
                cls += " prediction";
            }
            return cls;
        })
        .attr('opacity', function(d, i) {
            if(hasElemInArr(selected_price, i)) {
                return 1;
            } else {
                return 0;
            }
        })
        .attr('stroke', function(d, i) {
            if(i >= 1) {
                return model_legend_colors[i-1];
            }
        })
        .attr("d", function(d) {
            return line_price_factor(d.values);
        });

    svg_factor_g.append("g")
        .attr("class", "x_factor axis")
        .attr("transform", "translate(0, "+(height_factor_view-factor_margin.bottom-height_y_axis)+")")
        .call(xAxis_price_factor);
    svg_factor_g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+factor_margin.left+", 0)")
        .call(yAxis_price_factor);

    var width_legend = 150,
        length_legend_line = 50,
        margin_left_legend= 8,
        margin_up_legend = 13;
    svg_factor_g.select('.legend').remove();
    var legend_price = svg_factor_g.append('g')
        .attr('class', 'legend legend_price')
        .attr('transform', 'translate('+(width_factor_view-width_legend)+', 10)');
    var line = "M0 0 L" + length_legend_line + " 0";
    legend_price.append('path')
        .attr('d', line)
        .attr('stroke', 'steelblue');
    legend_price.append('text')
        .attr('x', length_legend_line+margin_left_legend)
        .attr('y', 2)
        .attr('class', 'legend_text')
        .html('actual');
    for(var i=0; i<selected_models.length; i++) {
        var selected_model = selected_models[i];
        var selected_model_name = model_names[selected_model];
        var y = margin_up_legend*(i+1);
        line = "M0 "+y+" L" + length_legend_line + " "+y;
        legend_price.append('path')
            .attr('d', line)
            .attr('stroke', model_legend_colors[i])
            .attr('stroke-dasharray', '5 10');
        legend_price.append('text')
            .attr('x', length_legend_line+margin_left_legend)
            .attr('y', 2+y)
            .attr('class', 'legend_text')
            .html(models[i]);
    }

    svg_factor_g.selectAll('.legend_text')
        .attr('fill', function(d, i) {
            if(hasElemInArr(selected_price, i)) {
                return 'red';   //选中的颜色
            } else {
                return 'black'; //没选中的颜色
            }
        })
        .attr('opacity', function(d, i) {
            if(hasElemInArr(selected_price, i)) {
                return 1;
            } else {
                return 0.5;
            }
        })
        .on('mouseenter', function(d, i) {
            d3.select(this)
                .attr('cursor', 'pointer');
        })
        .on('click', function(d, i) {
            if(hasElemInArr(selected_price, i)) {
                //if(selected_price.length == 1) {
                //    alert('please select at least one price curve!');
                //    return;
                //}
                removeElemFromArr(selected_price, i);
                svg_factor_g.select('.curve'+i)
                    .attr('opacity', 0);
                d3.select(this)
                    .attr('fill', 'black')
                    .attr('opacity', 0.5);
            } else {
                selected_price.push(i);
                svg_factor_g.select('.curve'+i)
                    .attr('opacity', 1);
                d3.select(this)
                    .attr('fill', 'red')
                    .attr('opacity', 1);
            }
        })
    ;
}

//画不同情感值的新闻的堆栈area图
function drawSentimentNews(news_sentiment) {
    return;
    repaint();

    var data = [];

    //var domain = x_price.domain();
    var domain = d3.extent(stocks_data.map(function(d) { return d.date; }));
    if(brush_extent != null && brush_extent[0] != brush_extent[1]) {
        domain = brush_extent;
    }

    x_price_factor.domain(domain);

    var data_price = [];
    stocks_data.forEach(function (d) {
        if(d.date >= domain[0] && d.date <= domain[1]) {
            data_price.push(d);
        }
    });
    //drawFactorSpectrum();
    drawFactorPrice(data_price);

    svg_factor_g.select('.period').remove();       //显示factor选中的日期区间
    svg_factor_g.append('text')
        .attr('class', 'period')
        .text(format_date(domain[0]) + ' - ' + format_date(domain[1]))
        .attr('transform', 'translate(60, 20)');


    if(news_sentiment != undefined) {
        for(var date in news_sentiment) {
            var date_parsed = parseDate(date);
            if(date_parsed >= domain[0] && date_parsed <= domain[1]) {
                for(var i=0; i<5; i++) {
                    var news_day = {};
                    news_day["date"] = date_parsed;
                    news_day["key"] = i;    //此处key为情感值0-4
                    var value = news_sentiment[date][i];
                    if(value == undefined) {
                        value = 0;
                        news_sentiment[date][i] = 0;
                    }
                    news_day["value"] = value;
                    data.push(news_day);
                }
            }
        }
        if(data.length == 0) {
            return;
        }
        data.sort(function(a, b) {  //先对数组按date排序，否则area图会很乱;然后按情感值排序，不然同一天的情感值顺序是随机的
            if(a.date > b.date) {
                return 1;
            } else if(a.date < b.date) {
                return -1;
            } else {
                return a.key>b.key ? 1 : -1;
            }
        });

        area_factor.x(function(d) { return x_price_factor(d.date); });

        var nest_news = nest.entries(data);
        var layers = stack_factor(nest_news);
        y_factor.domain([0, d3.max(data, function(d) {return d.y0 + d.y;})]);

        svg_factor_g.selectAll(".layer")
            .data(layers)
            .enter()
            .append("path")
            .attr("class", "layer")
            .attr("d", function(d) { return area_factor(d.values); })
            .style("fill", function(d, i) {
                return factor_colors[i];
                return colors(i);
                if(i < 2) return colors(0);
                if(i == 2) return colors(1);
                return colors(2);
            })
            .on("mouseenter", function(d, i) {
                d3.select(this).style("fill", "yellow");
                console.log(i);
            })
            .on("mouseleave", function(d, i) {
                d3.select(this).style("fill", function() {
                    return factor_colors[i];
                    return colors(i);
                    if(i < 2) return colors(0);
                    if(i == 2) return colors(1);
                    return colors(2);
                });
            })
            .append("title")
            .text(function(d, i) {
                return "sentiment: " + i;
            });

        svg_factor_g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0, "+(height_factor_view-factor_margin.bottom)+")")
            .call(xAxis_factor);
        svg_factor_g.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate("+factor_margin.left+", 0)")
            .call(yAxis_factor);
    }
}

//画不同预测涨跌（涨 or 跌）的新闻的堆栈area图
function drawKeywordsFlow(news_keywords) {
    return;

    repaint();
    mode_keywords = true;

    var data = [];

    //var domain = x_price.domain();
    var domain = d3.extent(stocks_data.map(function(d) { return d.date; }));
    if(brush_extent != null && brush_extent[0] != brush_extent[1]) {
        domain = brush_extent;
    }

    x_price_factor.domain(domain);

    var data_price = [];
    stocks_data.forEach(function (d) {
        if(d.date >= domain[0] && d.date <= domain[1]) {
            data_price.push(d);
        }
    });
    //drawFactorSpectrum();
    drawFactorPrice(data_price);

    svg_factor_g.select('.period').remove();       //显示factor选中的日期区间
    svg_factor_g.append('text')
        .attr('class', 'period')
        .text(format_date(domain[0]) + ' - ' + format_date(domain[1]))
        .attr('transform', 'translate(60, 20)');

    var max_count = 0;
    for(var date in news_keywords) {
        var date_parsed = parseDate(date);
        if(date_parsed >= domain[0] && date_parsed <= domain[1]) {
            var sum = 0;
            for(var i=0; i<2; i++) {
                var news_day = {};
                news_day['date'] = date_parsed;
                news_day['Date'] = date;
                news_day['key'] = (i-0.5) * 2;
                news_day['value'] = news_keywords[date][i];
                news_day['base'] = news_keywords[date][0];
                sum += news_keywords[date][i];
                data.push(news_day);
            }
            if(sum > max_count) {
                max_count = sum;
            }
        }
    }

    if(data.length == 0) {
        return;
    }
    data.sort(function(a, b) {  //先对数组按date排序，否则area图会很乱;然后按情感值排序，不然同一天的情感值顺序是随机的
        if(a.date > b.date) {
            return 1;
        } else if(a.date < b.date) {
            return -1;
        } else {
            return a.key>b.key ? 1 : -1;
        }
    });

    area_factor.x(function(d) { return x_price_factor(d.date); });

    var nest_news = nest.entries(data);
    y_factor.domain([0, max_count]);

    svg_factor_g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function(d) {
            return x_price_factor(d.date);
        })
        .attr("y", function(d) {
            if(d.key == 1) {
                return y_factor(d.value) - (height_factor_view-factor_margin.bottom - y_factor(d.base));
            }
            return y_factor(d.value);
        })
        .attr("fill", function (d) {
            if(d.key == -1) {
                return "red";
            }
            return "rgb(5, 128, 20)";
            //return "steelblue";
        })
        .attr("fill-opacity", 0.8)
        .attr("width", function(d) {
            return 1;
        })
        .attr("height", function(d) {
            return height_factor_view-factor_margin.bottom - y_factor(d.value);
        })
        .on('mouseenter', function(d) {
            d3.select(this)
                .attr('fill', 'yellow');
        })
        .on('mouseleave', function(d) {
            d3.select(this)
                .attr('fill', function() {
                    if(d.key == -1) {
                        return "red";
                    }
                    return "rgb(5, 128, 20)";
                });
        })
        .append('title')
        .html(function(d) {
            var hint = 'rise';
            if(d.key == -1) hint = 'down';
            return d.Date + "<br/>"+hint+": " + d.value;
        });

    svg_factor_g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0, "+(height_factor_view-factor_margin.bottom)+")")
        .call(xAxis_factor);
    svg_factor_g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+factor_margin.left+", 0)")
        .call(yAxis_factor);
}

function drawFactorTipLine(x, date) {
    var line = "M" + x +" " + 0 + " L" + x + " " + height_factor_view;
    svg_factor_g.selectAll(".tickline").remove();
    svg_factor_g.selectAll(".value").remove();
    svg_factor_g.append("path")
        .attr("d", line)
        .attr("class", "tickline");

    var date_sentiment = news_sentiment[date];
    if(date_sentiment == undefined) {
        return;
    }
    var count_i = 0;
    for(var i=0; i<5; i++) {
        count_i += date_sentiment[i];
        if(count_i == 0 || date_sentiment[i] == 0) {
            continue;
        }
        var xx = x_price_factor(parseDate(date));
        var y = y_factor(count_i);
        var line_i = "M40 " + y + " L" + xx + " " + y;

        //console.log(line_i);
        svg_factor_g.append("path")
            .attr("d", line_i)
            .attr("class", "tickline");

    }
}

function repaint() {
    svg_factor_g.selectAll(".bar").remove();
    svg_factor_g.selectAll(".layer").remove();
    svg_factor_g.selectAll(".axis").remove();
    svg_factor_g.selectAll("path").remove();
}

function getKeyFromObj(d) {
    for(var key in d) {
        return key;
    }
}