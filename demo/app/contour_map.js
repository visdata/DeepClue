/**
 * Created by WL on 2015/11/6.
 */


var spinner_contour = new Spinner(opts);
var target_contour = document.getElementById("spinner_contour");

var color = d3.scale.category20();

var positions; // tsne result stored here

var arr_news = [];
var max_change, min_change;   //记录所有新闻的预测值区间

var cluster_filename = ""; //记录聚类的文件名，在选择聚类时可以查询后台

var HEIGHT = $("#div_contour").height(), WIDTH = $("#div_contour").width();

var svg_contour = d3.select("#svg_contour")
    .attr("width", WIDTH)
    .attr("height", HEIGHT);

var images = ["icon_zoom_in.png", "icon_zoom_out.png"];

var zoomListener = d3.behavior.zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", zoomHandler);
svg_contour.call(zoomListener)
    //.on("mousedown.zoom", null)
    //.on("click.zoom", null)
    .on("dblclick.zoom", null);

var filterVal = 200;
var lastMax = 200;
//var contour_slider = $('.contour_slider');
//$('.contour_slider').val(filterVal);
//contour_slider.jRange({
//    //from: 0,
//    //to: 3,
//    //step: 0.1,
//    //scale: [1,10,100,1000],
//    //format: 'exp',
//    from: 1,
//    to: 500,
//    step: 1,
//    scale: [1, 160, 320, 500],
//    //format: 'exp',
//    width: WIDTH/3,
//    //showLabels: false,
//    //isRange: true,
//    onstatechange: filterNewsBySlider,
//    //ondragend: filterNewsBySlider,
//    showScale: true
//});

var _symbol = "";

function showNews(symbol, which_contour_change) {
    showNews2(symbol, which_contour_change);
}

function changeContourType(type) {

    if(type == which_contour_type) {
        return;
    }
    which_contour_type = type;
    var symbol = companies[which_stock]['symbol'];
    showNews2(symbol, type);
}

function filterNews(keyword) {
    nodes.each(function(d, i) {
       if(d.title.toLowerCase().indexOf(keyword) < 0) {
           d3.select(this)
               .attr('fill-opacity', 0.2);
       } else {
           d3.select(this)
               .attr('r', 4);
       }
    });
}

function clearFilter() {
    nodes.each(function(d, i) {
       d3.select(this)
           .attr('r', 2.5)
           .attr('fill-opacity', d.opacity);
    });
}

function showNews2(symbol, which_contour_change) {
    return; //TODO：去掉
    tx=0, ty=0, ss=1;
    _symbol = symbol;
    zoomListener
        .scale(ss)
        .translate([tx, ty]);

    spinner_contour.spin(target_contour);

    titles=[], dates=[], times=[], sentiments=[], clusters=[], predict_changes=[];

    var domain = x_price.domain();
    //if(brush_extent != null && brush_extent[0] != 0) {
    //    domain = brush_extent;
    //}
    var parse_date = d3.time.format('%Y-%m-%d');

    var start = parse_date(domain[0]);
    var end = parse_date(domain[1]);

    var url = "http://"+SERVER+":"+CONTOUR_PORT+"/getPeriodNews?symbol="+_symbol+
                    "&start="+start+"&end="+end+"&contour_change="+which_contour_change
                    ;//+"&max_count="+lastMax;  //获取200条新闻，太多的话MDS布局会很慢
    if(which_model == 1) {
        url += "&source=twitter";
    }
    console.log(url);
    if(request_contour != null) {
        request_contour.abort();
    }
    request_contour = $.ajax({
        url: url,
        context: document.body,
        //async: false, //是否支持异步，false为不支持（即同步）
        success: function (data) {
            console.log("success! ");
            var news_server_info = eval('(' + data + ')');
            console.log(news_server_info);
            var result = news_server_info["result"];
            if(result == "none") {
                console.log("no contour news data!!!!");
                d3.selectAll(".u").remove();
                svg_contour.selectAll(".contour").remove();
                spinner_contour.spin();
                var box;
                svg_contour.append("text")
                    .text("No news!")
                    .attr("class", "u")
                    .attr("x", function() {
                        box = this.getBBox();
                        var text_width = box.width;
                        return (WIDTH-text_width)/2;
                    })
                    .attr("y", function() {
                        var text_height = box.height;
                        return (HEIGHT-text_height)/2;
                    });
                return;
            }
            arr_news = news_server_info["news"];

            max_change = 0, min_change = 100;   //记录所有新闻的预测值区间
            var max_rise= 0, max_down= 0, max_rise_id, max_down_id;
            arr_news.forEach(function(d, i) {
                var predict = d['predict_change'];
                if(predict > max_rise) {
                    max_rise = predict;
                    max_rise_id = i;
                } else if(predict < max_down) {
                    max_down = predict;
                    max_down_id = i;
                }
                var abs_predict = Math.abs(predict);
                if(abs_predict > max_change) {
                    max_change = abs_predict;
                }
                if(abs_predict < min_change) {
                    min_change = abs_predict;
                }
            });
            //var max_rise_news = {news: arr_news[max_rise_id], is_down:false};
            //var max_down_news = {news: arr_news[max_down_id], is_down:true};
            //addNewsLabel(max_rise_news);
            //addNewsLabel(max_down_news);

            finishLayout(true);
        },
        error: function(error) {
            console.log(error);
            if(error.statusText == "abort") {
                return;
            }
            alert("failed to get data!reason: " + error.statusText);
            spinner_contour.spin();
            d3.selectAll(".u").remove();
            svg_contour.selectAll(".contour").remove();
            spinner_contour.spin();
            var box;
            svg_contour.append("text")
                .text("No news!")
                .attr("class", "u")
                .attr("x", function() {
                    box = this.getBBox();
                    var text_width = box.width;
                    return (WIDTH-text_width)/2;
                })
                .attr("y", function() {
                    var text_height = box.height;
                    return (HEIGHT-text_height)/2;
                });
        }
    });
}

function updateEmbedding() {
    // move the groups accordingly
    groups.attr("transform", function(d, i) { return "translate(" +
        ((d['position'][0]*20*ss + tx) + WIDTH*0.5) + "," +
        ((d['position'][1]*20*ss + ty) + HEIGHT*0.5) + ")"; });

}

var groups, nodes, texts;
var nodes2; //nodes点大一些的透明的点，方便选择

var focused = -1;

function drawEmbedding() {

    d3.selectAll(".u").remove();
    //筛选出前filterVal的新闻
    var filter_news = arr_news.slice(0, filterVal);
    //var filter_news = arr_news.filter(function(d) {
    //    return (Math.abs(d['predict_change'])-min_change)/(max_change-min_change) >= filterVal;
    //});

    groups = svg_contour.selectAll(".b")
        .data(filter_news)
        .enter().append("g")
        .attr("class", "u");

    nodes = groups.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", function () {
            return 2.5;
        })
        //.attr("id", function(d, i) {return "nodes"+i;})
        .attr('stroke-width', 1)
        .attr('stroke', function (d, i) {
            var title = d['title'];
            for(var i in keywords_count_by_date) {
                var keyword = keywords_count_by_date[i].keyword;
                var index = title.toLowerCase().indexOf(keyword);
                if(index >= 0) {
                    return color_init_keyword(i);   //包含某个关键词，有边框
                }
            }
            //return 'none';  //不包含任何关键词就空心
            return "black";
        })
        .attr("stroke-opacity", function(d, i) {
            return 0;
        })
        .attr('fill', function(d, i) {
            if(d['predict_change'] > 0) {
                return 'green';
            } else {
                return 'red';
            }
        })
        .attr("fill-opacity", function(d, i) {
            //根据预测值大小设置为0.4~1
            var ratio = (Math.abs(d['predict_change'])-min_change)/(max_change-min_change);
            var opacity = 0.4+ratio*0.6;
            d['opacity'] = opacity;
            return opacity;
        });

    nodes2 = groups.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", function (d, i) {
            return 4;
        })
        .attr("id", function(d, i) {return "nodes"+i;})
        .attr("stroke-opacity", function(d, i) {
            return 0;
        })
        .attr("fill-opacity", function(d, i) {
            return 0;
        })
        .on("mousedown", function(d, i) {
            //console.log("down: "+i);
            var date = d['date'];
            var newsTitle=d['title'].replace(/\&/g,"%26");
            var is_down = d['predict_change']<0;
            console.log(d);
            console.log(d['predict_change']);
            console.log(is_down);
            seeDetail(date, newsTitle, is_down);
        })
        .on("click", function(d, i) {

        })
        .on("mouseenter", function(d, i) {
            document.getElementById("nodes"+i).style.cursor="hand";
        })
        .on("mouseleave", function(d, i) {
            document.getElementById("svg_contour").style.cursor="auto";
        });
    nodes2
        .append("title")
        .html(function(d, i) {
            var title = d['title'];
            var date = d['date'];
            var today = new Date(date);
            addDate(today, 'd', 1);
            var to_day = format_date2(today);
            //if(to_day == null) {
            //    to_day = format_date3(today);
            //}
            var change_rate = 0;
            if(stock_info_by_date[to_day]) {
                var close_price = stock_info_by_date[to_day].close;
                change_rate = (d['predict_change']/close_price*100).toFixed(2);
            } else {
                console.log('contour not: ' + to_day);
            }
            return title+"<br>"+date+"<br>"+change_rate+'%';
        });

    nodes
        .each(function() {
            d3.select(this).on("mousedown.zoom", null);
        });
    nodes2
        .each(function() {
            d3.select(this).on("mousedown.zoom", null);
        });

    svg_contour.select(".zoom_g").remove();
    svg_contour.append("g")
        .attr("transform", function() {
            return "translate("+(WIDTH-80)+","+(HEIGHT-30)+")";
        })
        .attr("width", 60)
        .attr("height",30)
        .attr("class", "zoom_g")
        .selectAll(".zoom")
        .data(images)
        .enter()
        .append("svg")
        .attr("class", "zoom")
        .attr("width", 60)
        .attr("height", 30)
        .on("mousedown", function(d, i) {
            clickToZoom(i);
        })
        .append("image")
        .attr("xlink:href", function(d, i) {
            return "img/" + images[i];
        })
        .attr("src", function(d, i) {
            return "img/" + images[i];
        })
        .attr("width", 20)
        .attr("height", 20)
        .attr("x", function(d, i) {
            return 2+30*i;
        })
        .attr("y", 0);
}

function clickToZoom(i) {
    if(i==0) {
        ss *= 1.148;
    } else {
        ss /= 1.148;
    }
    if(ss < 1) ss = 1;
    zoomListener
        .scale(ss)
        .translate([tx, ty]);
    finishLayout(false);
}

function seeDetail(date, title, is_down) {
    var x, y;
    stocks_data.forEach(function(d) {
        if (d.Date == date) {
            x = x_price(d["date"]);
            y = y_price(d[prices[which_price]]);
            //if (x > x_price.range()[1] || x < x_price.range()[0]) {
            //    return;
            //}
        }
    });
    addNewsLabel({date:date, title:title, is_down:is_down, x:x, y:y});
    var left = x+170;
    var top = y+220;
    if(is_down) {
        top += 40;
    }
    if(which_model == 0)
        window.open("newsDetail.html?date="+date+"&title="+title, "new_window","height=300,width=400,left="+left+",top="+top);
}

var tx=0, ty= 0, ss=1;
function zoomHandler() {
    tx = d3.event.translate[0];
    ty = d3.event.translate[1];
    ss = d3.event.scale;
    finishLayout(false);
}

function finishLayout() {
    drawEmbedding();
    updateEmbedding();
    spinner_contour.spin();
}

//var timer_news;
//function filterNewsBySlider() {
//    //0-200:
//    filterVal = parseInt(contour_slider.attr('value'));
//    console.log('change: ' +(filterVal)+', lastMax:'+lastMax);
//    //filterVal = Math.floor(Math.pow(10, filterVal));  //指数比例
//    if(filterVal > lastMax) {
//        //return; //TODO：当超过之前的数量时，重新获取数据
//        console.log('exceed!');
//        lastMax = filterVal;
//        clearTimeout(timer_news);
//        timer_news = setTimeout(changeContour, WAIT_TIME);
//        //changeContour();    //重新获取数据
//    } else {
//        clearTimeout(timer_news);
//        finishLayout();
//    }
//}