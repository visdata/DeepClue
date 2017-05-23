/**
 * Created by WL on 2015/11/6.
 */

//设置页面大小及布局
var width, height_price;
var height_focus, height_context;
var tranlate_x = 120;
var area_margin = {left: 0, top: 10, right: 60, bottom: 20}; //设置曲线的边距
width = $("#div_chart").width() - tranlate_x - 20;
var height_chart_option = $('#chart_option').height();
height_price = $("#div_stock").height();
height_focus = $("#div_stock").height();
height_context = $('#div_context').height();

$('#canvas_chart').height(height_price);
$('#div_context').width(width);
$('#canvas_chart').width(width);
$('#div_price').height(height_focus);

var TYPE_PRICE = 1, TYPE_YIELD = 2;
var type_chart = TYPE_PRICE;


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

var selected_curves = [0, 1, 2];    //画哪条曲线
var isPercent, lastIsPercent; //记录是否是百分比模式和上一次的模式
var firstVals = [0, 0]; //记录百分比时第一天的值，以便计算

var brush_extent = null;
var all_news_statistics = null;
var news_chart = {}, news_arr = [];

var percent = d3.format(".2%");    //portion format

var x_context  = d3.time.scale().range([5 + area_margin.left, width-tranlate_x-15]),
    y_context  = d3.scale.linear().range([height_context-10, 0]);  //上下间距

var x_price  = d3.time.scale().range([5 + area_margin.left, width-tranlate_x-35]),
    y_price  = d3.scale.linear().range([height_focus-area_margin.bottom, 0 + 1.5*area_margin.top]);
var delta = 20; //修改spectrum的区间
var max_y_right = height_focus/2-area_margin.bottom-delta;
var y_right  = d3.scale.linear().range([max_y_right, 0]);

var xAxis_context = d3.svg.axis().scale(x_context).orient("top").ticks(8);
var xAxis_price = d3.svg.axis().scale(x_price).orient("bottom").ticks(8).tickFormat(customTimeFormat),
    xAxis_double_spectrum = d3.svg.axis().scale(x_price).orient("bottom").ticks(8).tickFormat(function(d) {return '';}),
    yAxis_price = d3.svg.axis().scale(y_price).orient("left").ticks(5);
var yAxis_right = d3.svg.axis().scale(y_right).orient("right").ticks(5);

var added_factors = [];
var y_factor = d3.scale.linear().range([height_focus-area_margin.bottom, (height_focus+area_margin.top-area_margin.bottom)/2]);
var yAxis_factor = d3.svg.axis().scale(y_factor).orient('right').ticks(5).tickFormat(d3.format('d'));

var svg_context = d3.select("#svg_context");
var svg_price = d3.select("#svg_price");
//var svg_x_price = d3.select('#svg_x_price');

//document.getElementById('svg_price').style.cursor = "url(img/hand.cur), pointer";

var svg_context_g = svg_context.append('g')
    .attr('transform', 'translate('+tranlate_x+', 0)');
var svg_price_g = svg_price.append("g")
    .attr('index', 0)
    .attr("class", "svg_g")
    .attr('id', 'svg_price_g')
    .attr("transform", "translate("+tranlate_x+", 0)");
var svg_double_spectrum = null;

function create_svg_double_spectrum() {
    svg_double_spectrum = svg_price.append('g')
        .attr('index', 2)
        .attr('class', 'svg_g')
        .attr('id', 'svg_double_spectrum')
        .attr('transform', 'translate('+tranlate_x+', '+0+')');
    $('#svg_double_spectrum')
        .insertBefore($('#svg_price_g'));
}

//context的brush
var brush_context = d3.svg.brush()
    .x(x_context)
    .on("brush", context_brushed);
//detail的brush
var brush_price = d3.svg.brush()
    .x(x_price)
    .on("brushend", brushed);

//overview的起止日期
d3.selectAll('.period')
    .on('click', function(d, i) {
        clearZoomSelection();
        var extent = brush_context.empty() ? x_context.domain() : brush_context.extent();
        //console.log(extent);
        if(i == 0) {    //起始日期，单击加一天
            zoomPeriod(addDate(extent[0], 'd', 1), extent[1]);
        } else {        //终止日期
            zoomPeriod(extent[0], addDate(extent[1], 'd', 1));
        }
        //console.log(extent);
    });

var svg_overview_period = d3.select('#svg_overview_period');
svg_overview_period
    .selectAll('.period')
    .data([0,1])
    .enter()
    .append('circle')
    .attr('class', 'overview_period_point')
    .attr('r', 3)
    .attr('fill', 'rgb(50,50,50)')
    .attr('cx', 5)
    .attr('cy', function(d, i) {
        return 9+i*20;
    })
    .on('click', function(d, i) {
        if(i==0) {  //起始日期加一天
            clearZoomSelection();
            var extent = brush_context.empty() ? x_context.domain() : brush_context.extent();
            zoomPeriod(addDate(extent[0], 'd', 1), extent[1]);
        } else {    //终止日期加一天
            clearZoomSelection();
            var extent = brush_context.empty() ? x_context.domain() : brush_context.extent();
            zoomPeriod(extent[0], addDate(extent[1], 'd', 1));
        }
    })
;
svg_overview_period
    .append('path')
    .attr('stroke', 'rgb(50,50,50)')
    .attr('stroke-width', 1)
    .attr('d', function() {
        return 'M5 10 L5 30';
    });

//日期区间的遮罩
svg_price_g.append('rect')
    .attr('class', 'mark')
    .attr('height', height_price)
    .attr('y', 0);

var thumb_size = {w:9, h:31};
var images = ['img/thumb.png', 'img/thumb.png'];
var thumbs = svg_price_g
    .append('svg')
    .attr('class', 'svg_thumb')
    .selectAll('image')
    .data(images)
    .enter()
    .append("image")
    .attr('class', 'thumb')
    .attr('display', 'none')
    .attr("xlink:href", function(d, i) {
        return d;
    })
    .attr("src", function(d, i) {
        return d;
    })
    .attr("width", thumb_size.w)
    .attr("height", thumb_size.h);

var line_context = d3.svg.line()
    .x(function(d) {
        return x_context(d.date);
    })
    .y(function(d) {
        return y_context(d.close);
    });
var line_price = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) {
        return x_price(d.date);
    })
    .y(function(d) {
        return y_price(d.value);
    });
    //.interpolate("step");
var line_factor = d3.svg.line()
    .x(function(d) {
        return x_price(d.date);
    })
    .y(function(d) {
        return y_factor(d.value);
    });

var risk_area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) {
        return x_price(d.date);
    })
    .y0(function(d) {
        return y_price(d.lower);
    })
    .y1(function(d) {
        return y_price(d.upper);
    });

var zoom = d3.behavior.zoom()
    .scaleExtent([0.003, 300])
    .on('zoom', zoomed);
svg_price.call(zoom);
svg_price
    .on('mousedown.zoom', null)
    .on('mousemove.zoom', null)
    .on('touchstart.zoom', null);   //为了避免和brush冲突，将其解绑


function drawStock(data, which_price) {   //which_price:展示哪一个price（high、low…）

    if(arguments[2]) { //标记是否是画全部数据
        x_price.domain(d3.extent(data.map(function(d) { return d.date; })));
    }

    //每次都要重新绘图，删除以前的元素
    removeAxisLabel();
    svg_price_g.selectAll("g").remove();
    svg_price_g.selectAll(".bar").remove();
    svg_price_g.selectAll(".axis.measure, .measure_label").remove();
    svg_price_g.selectAll("path").remove();
    svg_price_g.select(".tip-node").remove();

    selected_start.attr("value", function() {
        return format_date(x_price.domain()[0]);
    });

    selected_end.attr("value", function() {
        return format_date(x_price.domain()[1]);
    });

    //下面画context
    svg_context_g.selectAll('g').remove();
    svg_context_g.selectAll('path').remove();
    x_context.domain(d3.extent(data.map(function(d) { return d.date; })));
    y_context.domain([0, d3.max(data, function(d) {return d.close;})]);
    svg_context_g.append("path")
        .datum(data)
        .attr("class", "price_context")
        .attr("d", line_context);

    svg_context_g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height_context-1) + ")")
        .call(xAxis_context);

    svg_price_g.append("g")
        .attr("class", "x brush_price")
        .call(brush_price)
        .selectAll("rect")
        .attr("y", height_price-height_context)
        .attr("height", height_context);
    svg_context_g.append("g")
        .attr("class", "x brush_context")
        .call(brush_context)
        .selectAll("rect")
        .attr("y", 0)
        .attr("height", height_context);

    svg_context_g.selectAll(".resize").append('path')
        .attr('d', resizePath);

    //brush_context.extent([0, 0]);
    //全部区间
    change_context_brush(first_day, last_day);

    //svg_x_price.selectAll('g').remove();
    svg_price_g.append("g")
        .attr("class", "x axis")
        .attr('id', "xAxis_price")
        .attr("transform", "translate(0, " + (height_focus-area_margin.bottom) + ")")
        .call(xAxis_price)
        .append("text")
        .attr("class", "axislabel")
        .attr("text-anchor", "start")
        .attr("x", width-80)
        .attr("y", 20)
        .text("time");

    svg_price_g.append("g")
        .attr("class", "y axis font")
        .attr("transform", "translate(" + (area_margin.left) + ", "+ (0) +")")
        .call(yAxis_price)
        .append("text")
        .text(function() {
            if(type_chart == TYPE_PRICE) {
                return 'stock price ($)';
            }
            return 'yield rate';
        })
        .attr("class", "axislabel")
        .attr('id', 'chart_y_axis_label')
        .attr("text-anchor", "start")
        .attr("x", function() {
            var box = this.getBBox();
            return -box.width/2;
        })
        .attr("y", 10);

    spinner.spin();     //end spinner

    zoomPeriod(x_price.domain()[0], x_price.domain()[1], arguments[2]);
    //addTips();
    //if(mode_keywords) drawKeywordsFlow(news_keywords);
    //else getSentimentNewsAndDraw();  //factor view
}

function updateNewsLabel() {
    svg_price_g.selectAll(".news-label").remove();
    svg_price_g.selectAll(".news-title").remove();
    var date = news_chart.date;
    var is_down = news_chart.is_down;
    stocks_data.forEach(function(d) {
        if (d.Date == date) {
            var x = x_price(d["date"]);
            var y = y_price(d[prices[which_price]]);
            if(x>x_price.range()[1] || x<x_price.range()[0]) {
                return;
            }
            var line = "M" + x + " " + y + " L" + x + " " + (y-30);
            if(is_down) {
                line = "M" + x + " " + y + " L" + x + " " + (y+30);
            }
            svg_price_g.append("path")
                .attr("d", line)
                .attr("class", "news-label");
            var width = 0;
            svg_price_g.append("text")
                .attr("class", "news-title")
                .text(news_chart.title)
                .attr("x", function() {
                    var box = this.getBBox();
                    width = box.width;
                    if(x+width/2 > x_price.range()[1]) {
                        return x-width;
                    } else if(x-width/2 < x_price.range()[0]) {
                        return x;
                    } else {
                        return x-width/2;
                    }
                })
                .attr("y", function() {
                    if(is_down) {
                        return y+35;
                    } else {
                        return y-35;
                    }
                });
        }
    });
}

function addNewsLabel(news) {

    svg_price_g.selectAll(".news-label").remove();
    svg_price_g.selectAll(".news-title").remove();
    var date = news.date;
    news_chart = news;
    var has = false;
    news_arr.forEach(function(d) {
        if(d.title == news.title) {
            has = true;
        }
    });
    if(!has) {
        news_arr.push(news);
    }
    var x = news.x;
    var y = news.y;
    var line = "M" + x + " " + y + " L" + x + " " + (15);

    svg_price_g.append("path")
        .attr("d", line)
        .attr("class", "news-label");
    var width = 0;
    svg_price_g.append("text")
        .attr("class", "news-title text_pointer")
        .text(news.title)
        .attr("x", function() {
            var box = this.getBBox();
            width = box.width;
            if(x+width/2 > x_price.range()[1]) {
                return x-width;
            } else if(x-width/2 < x_price.range()[0]) {
                return x;
            } else {
                return x-width/2;
            }
        })
        .attr("y", function() {
            return 15;
        })
        .call(drag_text)
    ;
}

function addTimeLine(x) {
    removeTimeLine();
    removeAxisLabel();
    //var line = "M" + x + " 0 L" + x + " " + (height_focus-area_margin.bottom);
    var line = "M" + x + " 0 L" + x + " " + (height_focus-height_context);
    svg_price_g.append("path")
        .attr("d", line)
        .attr("class", "subline");

    d3.selectAll('.tips').style('display', 'block');
    var delta = x_price(parseDate('2010-01-02')) - x_price(parseDate('2010-01-01'));
    var date = x_price.invert(x+delta/2);
    var parse_date = d3.time.format('%Y-%m-%d');
    var Date = format_date(date);
    d3.select(".tips-date")
        .text(" "+Date);

    var isFind = false;

    var axis_label_width = 50,
        axis_label_height = 20;

    var Date_compare = format_date2(date);
    date = parseDate(Date_compare);
    var d = dict_stocks_data[Date_compare];
    var value_close, value_pred, value_pred_text,
        value_open, value_yield; //分别记录实际值和预测值
    var yield_ratio = 1;    //计算当前时间区间第一天与1的比值，等比修改所有收益
    Object.keys(stock_info_by_date)
        .forEach(function(key, i) {
            var d = stock_info_by_date[key];
            if(d.date >= x_price.domain()[0] && d.date <= x_price.domain()[1]) {
                var fund = d['fund_'+model_name];
                if(yield_ratio == 0) {
                    yield_ratio = 1 / fund;
                }
            }
        });
    //console.log(yield_ratio);
    if(d) { //找到
        var model_name = model_names[which_model];
        value_close = d.adjclose;
        value_open = d.adjopen;
        //value_open = d.open;
        value_pred = (d["pred_close_"+model_name]);
        value_pred_text = value_pred- d['bias_'+model_name];
        value_yield = d['fund']*yield_ratio;
        //console.log(value_yield);
        var y = y_price(value_close);
        var xx = x_price(date);
        line = "M" + area_margin.left +" " + y + " L" + xx + " " + y;
        svg_price_g.append("path")
            .attr("d", line)
            .attr("class", "tickline");

        svg_price_g.select(".tip-node").remove();
        svg_price_g.append("circle")
            .attr("class", "tip-node")
            .attr("fill", "steelblue")
            .attr("cx", xx)
            .attr("cy", y)
            .attr("r", 3);

        value_close = value_close.toFixed(POINT);
        value_open = value_open.toFixed(POINT);
        value_pred = value_pred.toFixed(POINT);
        value_pred_text = value_pred_text.toFixed(POINT);
        value_yield = value_yield.toFixed(2);
        if(value_close == value_pred) {
            value_pred = 'No';
            value_pred_text = 'No';
        }
        addAxisLabel(area_margin.left-axis_label_width-1, y-axis_label_height/2,
            axis_label_width, axis_label_height, value_close);
    } else {
        value_close = "  0";
        value_pred = "  0";
        value_pred_text = "  0";
        value_yield = "  0";
        value_open = "  0";
    }
    //value_volume += " million";
    svg_price.select("#tips_value_close")
        .text("   " + value_close);
    svg_price.select("#tips_value_pred")
        .text("   " + value_pred);
    svg_price.select("#tips_value_pred_text")
        .text("   " + value_pred_text);
    svg_price.select("#tips_value_yield")
        .text("   " + value_yield);
    svg_price.select("#tips_value_open")
        .text("   " + value_open);
}

function removeTimeLine() {
    d3.selectAll(".subline").remove();
    d3.selectAll(".tickline").remove();
    d3.selectAll('.tips').style('display', 'none');
    d3.selectAll(".tip-node").remove();
}

function addAxisLabel(x, y, axis_label_width, axis_label_height, text) {
    svg_price_g.append("rect")
        .attr("class", "axis_label")
        .attr("width", axis_label_width)
        .attr("height", axis_label_height)
        .attr("x", x)
        .attr("y", y)
        .attr("fill", "rgb(200,200,200)");
    svg_price_g.append("text")
        .attr("class", "axis_label")
        .text(function() {
            return text;
        })
        .attr("x", function() {
            var box = this.getBBox();
            var w = box.width;
            return x+(axis_label_width-w)/2;
        })
        .attr("y", function() {
            var box = this.getBBox();
            var h = box.height;
            return y+h+1;
        });
}

function removeAxisLabel() {
    svg_price_g.selectAll(".axis_label")
        .remove();
}

function addTips() {
    svg_price.selectAll(".tips").remove();
    var tips = svg_price
        .append("g")
        .attr("class", "tips");

    tips.attr("transform", "translate("+(5)+","+(15)+")");
    tips.append('rect')
        .attr('class', 'tips-border')
        .attr('width', 90)
        .attr('height', 230)
        .attr('rx', 5)
        .attr('ry', 5);

    var i = 1, h = 18, left = 3;
    tips.append('text')
        .attr('x', left)
        .attr('y', h*i++)
        .text('date: ');
    tips.append('text')
        .attr('class', 'tips-date')
        .attr('x', left)
        .attr('y', h*i++)
        .text('');

    tips.append('text')
        .attr('x', left)
        .attr('y', h*i++)
        .text('open ($): ');
    tips.append('text')
        .attr('id', 'tips_value_open')
        .attr('x', left)
        .attr('y', h*i++)
        .text('');

    tips.append('text')
        .attr('x', left)
        .attr('y', h*i++)
        .text('close ($): ');
    tips.append('text')
        .attr('id', 'tips_value_close')
        .attr('x', left)
        .attr('y', h*i++)
        .text('');

    tips.append('text')
        .attr('x', left)
        .attr('y', h*i++)
        .text('pred (all): ');
    tips.append('text')
        .attr('id', 'tips_value_pred')
        .attr('x', left)
        .attr('y', h*i++)
        .text('');

    tips.append('text')
        .attr('x', left)
        .attr('y', h*i++)
        .text('pred (text): ');
    tips.append('text')
        .attr('id', 'tips_value_pred_text')
        .attr('x', left)
        .attr('y', h*i++)
        .text('');

    tips.append('text')
        .attr('x', left)
        .attr('y', h*i++)
        .text('yield rate: ');
    tips.append('text')
        .attr('id', 'tips_value_yield')
        .attr('x', left)
        .attr('y', h*i++)
        .text('');

    var mousedown = false;
    d3.select("#svg_price")
        .on('mousedown', function(d) {
            mousedown = true;

            var mouse = d3.mouse(this); //返回鼠标位置
            var x = mouse[0] - 50;
            var y = mouse[1];

            brush_extent = brush_price.extent();
            var new_start = brush_extent[0];
            var new_end =   brush_extent[1];

            //console.log(new_start+' '+new_end);

            //if(x >= x_price(new_start)-thumb_size.w && x <= x_price(new_end)+thumb_size.w) {
            //    document.getElementById('svg_price').style.cursor = 'move';
            //} else {
            //    document.getElementById('svg_price').style.cursor = 'url(img/drag.cur), move';
            //}
        })
        .on('mouseup', function(d) {
            mousedown = false;
            var mouse = d3.mouse(this); //返回鼠标位置
            var x = mouse[0] - 50;

            brush_extent = brush_price.extent();
            var new_start = brush_extent[0];
            var new_end =   brush_extent[1];

            //if(x >= x_price(new_start) && x <= x_price(new_end)) {
            //    document.getElementById('svg_price').style.cursor = 'move';
            //} else {
            //    document.getElementById('svg_price').style.cursor = 'url(img/hand.cur), pointer';
            //}
        })
        .on("mousemove", function(d) {
            var mouse = d3.mouse(this); //返回鼠标位置
            var x = mouse[0] - tranlate_x;
            var y = mouse[1];
            //var x = event.offsetX - 50;
            if(x < x_price.range()[0] || x > x_price.range()[1]) {
                return;
            }
            if(x<120 && y<100 || y<height_context) {    //在图例内部，直接返回
                return;
            }
            brush_extent = brush_price.extent();
            var new_start = brush_extent[0];
            var new_end =   brush_extent[1];
            //if(!mousedown) {
            //    if(x >= x_price(new_start) && x <= x_price(new_end)) {
            //        document.getElementById('svg_price').style.cursor = 'move';
            //    } else {
            //        document.getElementById('svg_price').style.cursor = 'url(img/hand.cur), pointer';
            //    }
            //}
            addTimeLine(x);
            //d3.selectAll('.tips')
            //    .attr('transform', 'translate('+(x+30)+', '+(y-20)+')');
        })
        .on('mouseleave', function() {
            var mouse = d3.mouse(this); //返回鼠标位置
            var x = mouse[0] - 50;
            //var x = event.offsetX - 50;
            if(x < 5 + area_margin.left || x > width - area_margin.right-5) {
                removeTimeLine();
            }
        });
}

//根据日历选择更改显示
function zoomPeriod(start, end) {
    x_price.domain([start, end]);
    zoom.x(x_price);
    zoomed();
}

var reDrawKeywordTimer = null;
var filterNewsTimer = null;

function zoomed() {
    svg_price_g.select(".tip-node").remove();
    svg_price_g.selectAll(".curve").remove();
    svg_price_g.select('.risk_area').remove();

    var new_start = x_price.domain()[0];
    var new_end = x_price.domain()[1];

    //当改变股价图时间区间时，相应改变overview
    change_context_brush(new_start, new_end);

    selected_start.attr("value", function() {
        return format_date(new_start);
    });
    selected_end.attr("value", function() {
        return format_date(new_end);
    });

    calendar_start.text(function() {
        return format_date(new_start);
    });
    calendar_end.text(function() {
        return format_date(new_end);
    });

    if(type_chart == TYPE_PRICE) {
        drawPriceCurve();   //画股价图
    } else {
        drawYieldCurve(); //画收益曲线图
    }

    drawSpectrum();   //画涨跌色谱图
    if(flag_double_histogram) {
        drawSpectrum(vue_checkbox_histogram.selectedCount);   //画double涨跌色谱图
    }

    clearTimeout(filterNewsTimer);
    filterNewsTimer = setTimeout(function() {
        filterNewsTable(new_start, new_end);
    }, 500);
    clearAllKeywordBrush();
    clearTimeout(reDrawKeywordTimer);
    if(keywords_count_by_date) {
        spinner_keyword_line.spin(target_keyword_line);
        spinner_contour.spin(target_contour);
        //showNewsTable(keywords_news_by_date);
        reDrawKeywordTimer = setTimeout(function() {
            //showRecommendKeywords();
            if(which_model == 1) {  //如果是twitter，则重新获取tweets数据
                getAllTitlesAndShow();
            }
            getKeywordGroupInfo();
            //drawKeywordLines();//重画关键词曲线图
            //spinner_keyword_line.spin();
            //spinner_contour.spin();
            //clearKeywordHighlight();
            //changeContour();
        }, 2000);
    }

    //为股价曲线图增加图例
    var curves = ['actual', 'predicted', 'risk'];
    var CURVE_ACTUAL = 0,
        CURVE_PREDICT = 1,
        CURVE_RISK = 2;
    svg_price_g.selectAll(".chartLegend").remove();

    var legend_price = svg_price_g
        .append('g')
        .attr('class', 'chartLegend font');
    var legend_yield = svg_price_g
        .append('g')
        .attr('class', 'chartLegend font');

    addDragListener(legend_price, dragLegend);
    addDragListener(legend_yield, dragLegend);

    legend_price.append('rect')
        .attr('class', function() {
            var cls = 'legend-border price';
            if(type_chart == TYPE_PRICE) {
                cls += " active";
            }
            return cls;
        })
        .attr('transform', 'translate(4, 10)')
        .attr('width', 124)
        .attr('height', 45)
        .attr('rx', 5)
        .attr('ry', 5)
        .on('click', function() {
            changeChartType(TYPE_PRICE);
        });
    legend_yield.append('rect')
        .attr('class', function() {
            var cls = 'legend-border yield';
            if(type_chart == TYPE_YIELD) {
                cls += " active";
            }
            return cls;
        })
        .attr('transform', 'translate(134, 10)')
        .attr('width', 120)
        .attr('height', 45)
        .attr('rx', 5)
        .attr('ry', 5)
        .on('click', function() {
            changeChartType(TYPE_YIELD);
        });
    var legends_price = legend_price.selectAll(".curveLegend")
        .data(curves)
        .enter()
        .append('g')
        .attr('class', 'curveLegend')
        .on('mousedown', function(d, i) {
            if(hasElemInArr(selected_curves, i)) {
                d3.select(this)
                    .select('text')
                    .attr('fill', 'gray');
                svg_price_g.select('.'+d)
                    .attr('opacity', 0);
                removeElemFromArr(selected_curves, i);
            } else {
                d3.select(this)
                    .select('text')
                    .attr('fill', 'black');
                svg_price_g.select('.'+d)
                    .attr('opacity', 1);
                selected_curves.push(i);
            }
        })
        .attr('transform', function(d, i) {
                return 'translate(10,'+(13*i+20)+')';
            })
        ;

    legends_price.each(function(d, i) {
        var legend = d3.select(this);
        switch(i) {
            case CURVE_ACTUAL:
            case CURVE_PREDICT:
                var line = 'M0 0 L50 0';
                legend.append('path')
                    .attr('d', line)
                    .attr('class', function() {
                        return 'legend_'+d;
                    });
                break;
            case CURVE_RISK:
                legend.append('rect')
                    .attr('x', 0)
                    .attr('y', -5)
                    .attr('width', 50)
                    .attr('height', 10)
                    .attr('class', function() {
                        return 'legend_'+d;
                    });
                break;
            //case 3:

        }

        legend.append('text')
            .attr('fill', function() {
                if(hasElemInArr(selected_curves, i)) {
                    return 'black';
                } else {
                    return 'gray';
                }
            })
            .attr('transform', 'translate(57, 3)')
            .text(d);
    });
    var yield_g = legend_yield
        .append('g')
        .attr('class', 'curveLegend')
        .attr('transform', function(d, i) {
            return 'translate(140,'+(13*0+20)+')';
        });

    var line = 'M0 0 L50 0';
    yield_g.append('path')
        .attr('d', line)
        .attr('class', function() {
            return 'legend_yield';
        });

    yield_g.append('text')
        .attr('fill', function() {
            return 'black';
        })
        .attr('transform', 'translate(57, 3)')
        .text('yield');
    addTips();
}


function dragLegend(deltaX, deltaY) {
    d3.selectAll(".chartLegend")
        .attr('transform', function() {
            var before_transform = d3.select(this).attr('transform');
            var now_transform = "translate("+deltaX+", "+deltaY+")";
            if(before_transform) {
                now_transform = before_transform + " " + now_transform;
            }
            return now_transform;
        });
}

//TODO: 改变y轴
function changeChartType(type) {
    if(type_chart == type) {
        return; //如果没有变化就返回
    }
    type_chart = type;
    d3.selectAll('.legend-border')
        .classed('active', false);
    zoomed();
    if(type_chart == TYPE_PRICE) {
        d3.select('.legend-border.price')
            .classed('active', true);
    } else {
        d3.select('.legend-border.yield')
            .classed('active', true);
    }
}

var timer = null, WAIT_TIME = 2000;
var last_start, last_end;
function brushed() {
    var extent = brush_price.empty() ? x_price.domain() : brush_price.extent();
    var start = addDate(extent[0], 'd', -1);
    var end = addDate(extent[1], 'd', -1);  //起止日期都减一
    filterNewsTable(start, end);
    d3.selectAll('.brush_keyword')
        .select('.extent')
        .attr('width', 0);  //其他brush的宽度设为0，即去掉
}

function drawPriceCurve() {
    var model_name = model_names[which_model];
    var price_str =  prices[which_price];

    var prices_arr = [price_str];
    prices_arr = ['close', 'pred_close_'+model_name];

    var domain = d3.keys(prices_arr);
    //更改price轴的区间
    var isFirstDay = true;
    var close_price = {}, pred_price  = {}; //记录百分比时每天的值

    var price_data = domain.map(function(i) {
        var prices_show = [];
        isFirstDay = true;
        stocks_data.map(function(d) {
            if(d.date >= x_price.domain()[0] && d.date <= x_price.domain()[1]) {
                if(isPercent) {
                    var value = 0;
                    if(isFirstDay) {
                        isFirstDay = false;
                        firstVals[i] = d[prices_arr[i]];
                    } else {
                        value = (d[prices_arr[i]]- firstVals[i])/ firstVals[i];
                    }
                    prices_show.push( {date: d.date, value: value});
                    if(i == 0) {
                        close_price[d.date] = value;
                    } else {
                        pred_price[d.date] = value;
                    }
                } else {
                    prices_show.push( {date: d.date, value: d[prices_arr[i]]});
                }
            }
        });
        return {
            price: prices_arr[i],
            values: prices_show
        };
    });

    //console.log(price_data);

    var min_price = MAX_NUM, max_price = MIN_NUM;
    var prices_risk = [];
    stocks_data.forEach(function(d, i) {
        if(d.date >= x_price.domain()[0] && d.date <= x_price.domain()[1]) {
            //用于上下risk显示
           prices_risk.push({date: d.date, upper: d["upper_close_"+model_name],
                    lower: d["lower_close_"+model_name]});

           min_price = Math.min(min_price, d['adjclose']);
           min_price = Math.min(min_price, d['pred_close_'+model_name]);
           min_price = Math.min(min_price, d['lower_close_'+model_name]);

           max_price = Math.max(max_price, d['adjclose']);
           max_price = Math.max(max_price, d['pred_close_'+model_name]);
           max_price = Math.max(max_price, d['upper_close_'+model_name]);
        }
    });
    //console.log(prices_risk);

    //下面计算曲线的最低高度，要余出1/3的高度
    var extra = 3;
    //var min_price = d3.min(prices_risk, function(d) { return d["lower"]}),
    //    max_price = d3.max(prices_risk, function(d) { return d["upper"]; });
    var min_domain = min_price,
        max_domain = max_price;
    //yAxis_price.tickFormat(function(d) {return d.toFixed(2);});
        //min_domain = Math.max(0, min_price-(max_price-min_price)/(extra-1)); // not 0
    min_domain = min_price-(max_price-min_price)/(extra-1); // not 0
    y_price.domain([min_domain, max_domain]);

    yAxis_price.tickFormat(function(d) {
        if(d < 0) {
            console.log(d+"<0");
            return "";
        } else {
            return d.toFixed(0);
        }
    });

    svg_price_g.select('.y.axis')
        .call(yAxis_price); //坐标轴

    svg_price_g.select('.x.axis')
        .call(xAxis_price); //坐标轴

    //console.log(prices_risk);
    svg_price_g.append("path")
        .datum(prices_risk)
        .attr("class", "risk_area chart risk")
        .style('display', function() {
            if(hasElemInArr(selected_curves, 2)) {
                return 'block';
            }
            return 'none';
        })
        .attr("d", risk_area);

    svg_price_g.selectAll(".curve")
        .data(price_data)
        .enter()
        .append("path")
        .attr("class", function(d, i) {
            if(i == 0) {
                return "curve actual";
            } else if(i >= 1) {
                return "curve predicted";
            }
        })
        .attr('stroke', function(d, i) {
            if(i >= 1) {
                return model_legend_colors[i-1];
            }
        })
        .attr('opacity', function(d, i) {
            if(hasElemInArr(selected_curves, i)) {
                return 1;
            }
            return 0;
        })
        .attr("d", function(d) {
            return line_price(d.values);
        });
    updateNewsLabel();
    d3.select('#chart_y_axis_label')
        .text('stock price ($)');
}

function context_brushed() {
    clearZoomSelection();
    var extent = brush_context.empty() ? x_context.domain() : brush_context.extent();
    //TODO: 为了方便选择9/30/2011 ~ 12/30/2011，当起始日期在9.30附近时设为9.30
    var tmp_start = parseDate('2011-09-20');
    var tmp_end = parseDate('2011-10-08');
    if(extent[0]>tmp_start && extent[0]<tmp_end) {
        extent[0] = parseDate('2011-09-30');
    }
    //TODO: 2014/01/01
    tmp_start = parseDate('2013-12-20');
    tmp_end = parseDate('2014-01-08');
    if(extent[0]>tmp_start && extent[0]<tmp_end) {
        extent[0] = parseDate('2014-01-01');
    }
    zoomPeriod(extent[0], extent[1]);
}

function change_context_brush(start, end) {
    clearZoomSelection();
    brush_context.extent([start, end]);
    d3.select(".x.brush_context").call(brush_context);
}

function resizePath(d) {
    var e = +(d == "e"),
        x = e ? 1 : -1,
        y = height_context / 3;
    return "M" + (.5 * x) + "," + y
        + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
        + "V" + (2 * y - 6)
        + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
        + "Z"
        + "M" + (2.5 * x) + "," + (y + 8)
        + "V" + (2 * y - 8)
        + "M" + (4.5 * x) + "," + (y + 8)
        + "V" + (2 * y - 8);
}
