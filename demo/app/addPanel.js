/**
 * Created by WL on 2016/5/18.
 */

//alert(width);

//d3.select('#btn_test')
//    .on('click', addPanel);

var window_height = $('body').height();
var panel_height = window_height/2-10;
var panel_margin = 5;
var panel_count = -1;

var right_margin = 40;
var x_panel  = d3.time.scale().range([area_margin.left, width-area_margin.right-right_margin]),
    y_panel  = d3.scale.linear().range([panel_height-area_margin.bottom, area_margin.top]);
var y_keyword = d3.scale.linear().range([panel_height-area_margin.bottom, (panel_height+area_margin.top-area_margin.bottom)/2]);

var xAxis_panel = d3.svg.axis().scale(x_panel).orient("bottom").ticks(8).tickFormat(customTimeFormat),
    yAxis_panel = d3.svg.axis().scale(y_panel).orient("left").ticks(5);
var yAxis_keyword = d3.svg.axis().scale(y_keyword).orient('right').ticks(5);

var line_panel = d3.svg.line()
    .x(function(d) {
        return x_panel(d.date);
    })
    .y(function(d) {
        return y_panel(d.value);
    });

var line_keyword = d3.svg.line()
    .x(function(d) {
        return x_panel(d.date);
    })
    .y(function(d) {
        return y_keyword(d.value);
    });

function drawPanel(keyword) {

    var id = '#panel_'+keyword;
    var redraw = arguments[1];
    if($(id)[0] && !redraw) {   //或者判断$(id).length是否 >0
        $('html,body').animate({
            scrollTop: $(id).offset().top
        }, 'slow');
        return;
    }

    var panel_add;
    if(!redraw) {
        panel_count++;
        var scrollTop = window_height+panel_count*(panel_height+panel_margin);
        panel_add = d3.select('#main')
            .append('div')
            .attr('class', 'panel_add')
            .attr('id', 'panel_'+keyword)
            .style('width', function() {
                return width+"px";
            })
            .style('top', function() {
                return scrollTop+'px';
            })
            .style('height', function() {
                return panel_height+'px';
            })
            .style('margin-left', function() {
                return $('#div_model').width()+'px';
            })
        ;
    } else {
        panel_add = d3.select(id);
        panel_add.selectAll('svg').remove();
    }

    var svg_panel = panel_add.append('svg');
    var svg_panel_g = svg_panel.append('g')
        .attr('transform', 'translate(50,0)');


    //确定时间轴区间
    var domain = d3.extent(stocks_data.map(function(d) { return d.date; }));
    if(brush_extent != null && (brush_extent[0]-brush_extent[1]!=0)) {  //判断两日期差是否为0，直接比较不对
        domain = brush_extent;
    }
    x_panel.domain(domain);

        //下面是画关键词时序图
    var keywordCount = keywords_count_by_date;
    var keyword_info = null;
    var max_count = 0;
    var index = -1;
    if(keyword == "POSITIVE") {
        keyword_info = sentimentCount[0];
        index = keywordCount.length;
    } else if(keyword == "NEGATIVE") {
        keyword_info = sentimentCount[1];
        index = keywordCount.length+1;
    } else {
        for(var i in keywordCount) {
            var d = keywordCount[i];
            if(d.keyword == keyword) {
                index = i;
                keyword_info = d;
                break;
            }
        }
    }
    var keyword_count = keyword_info.count;
    var data = [];
    for(var date in keyword_count) {
        var date_parsed = parseDate(date);
        if(date_parsed < domain[0] || date_parsed > domain[1]) {
            continue;
        }
        var obj = {};
        obj['date'] = date_parsed;
        obj['value'] = keyword_count[date];
        data.push(obj);
        if(keyword_count[date] > max_count) {
            max_count = keyword_count[date];
        }
    }
    data.sort(function(a, b) {  //先对数组按date排序，否则area图会很乱;然后按情感值排序，不然同一天的情感值顺序是随机的
        if(a.date > b.date) {
            return 1;
        } else if(a.date < b.date) {
            return -1;
        }
    });

    y_keyword.domain([0, max_count]);
    svg_panel_g
        .append("path")
        .attr("class", 'addKeywordLine')
        .attr('stroke', function(d) {
            return color_init_keyword(index);
        })
        .attr('fill', 'none')
        .attr("d", function() {
            return line_keyword(data);
        })
        //.on('mouseenter', function(d) {
        //    d3.select(this)
        //        .attr('stroke-width', '2px');
        //})
        //.on('mouseleave', function() {
        //    d3.select(this)
        //        .attr('stroke-width', '1px');
        //})
        .append('title')
        .text(function() {
            return keyword_info.keyword;
        });

     //下面是画股价图
    var data_price = [];
    stocks_data.forEach(function (d) {
        if(d.date >= domain[0] && d.date <= domain[1]) {
            data_price.push(d);
        }
    });
    var price_str =  prices[which_price];
    var model_name = model_names[which_model];
    var is_close = (price_str == 'close');
    var prices_arr = [price_str];
    if(is_close) {
        prices_arr.push('pred_close_'+model_name);
    }

    var prices_key = d3.keys(prices_arr);
    var price_data = prices_key.map(function(i) {
        return {
            price: prices_arr[i],
            values: data_price.map(function(d) {
                return {date: d.date, value: d[prices_arr[i]]};
            })
        };
    });

    y_panel.domain([
        0,
        d3.max(data_price, function(d) {return d['pred_close_'+model_name]*1.1})
        //d3.min(data_price, function(d) {return d["lower_"+price_str]*1.1;}), // not 0
        //d3.max(data_price, function(d) {return d["upper_"+price_str]*1.1;})
    ]);

    svg_panel_g.selectAll(".curve")
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
        .attr('stroke', function(d, i) {
            return 'steelblue';
            //if(i >= 1) {
            //    return model_legend_colors[i-1];
            //}
        })
        .attr("d", function(d) {
            return line_panel(d.values);
        });

    svg_panel_g.append("g")
        .attr("class", "x_factor axis")
        .attr("transform", "translate(0, "+(panel_height-area_margin.bottom)+")")
        .call(xAxis_panel);
    svg_panel_g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+area_margin.left+", 0)")
        .call(yAxis_panel);
    svg_panel_g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+(width-area_margin.right-right_margin)+", 0)")
        .call(yAxis_keyword)
        .append('text')
        .attr("class", "axislabel")
        .attr("text-anchor", "start")
        .attr("x", -10)
        .attr("y", function() {
            return (panel_height-area_margin.top-area_margin.bottom)/2;
        })
        .attr("fill", function() {
            return color_init_keyword(index);
        })
        .text(keyword);

    if(!redraw) {
        //$(window).scrollTop(scrollTop);
        $('html,body').animate({
            scrollTop: scrollTop
        }, 'slow');
    }

}

function redrawPanels() {
    var panels = $(".panel_add");
    for(var i=0; i<panels.length; i++) {
        var keyword = panels.eq(i).attr('id').split('_')[1];
        drawPanel(keyword, 'redraw');
    }
}