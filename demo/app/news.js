/**
 * Created by WL on 2015/11/6.
 */


var spinner_contour = new Spinner(opts);
var target_contour = document.getElementById("spinner_contour");

var color = d3.scale.category20();

var positions; // tsne result stored here

var embeddings=[], titles=[], dates=[], times=[], sentiments=[],
    clusters=[], cluster_k=0, keywords=[], cluster_mean=[], predict_changes=[],
    sentiment_words=[], event_words=[];
var max_change = 0, min_change = 100;   //记录所有新闻的预测值区间

var cluster_filename = ""; //记录聚类的文件名，在选择聚类时可以查询后台

var HEIGHT = $("#div_contour").height(), WIDTH = $("#div_contour").width();
WIDTH = Math.min(HEIGHT, WIDTH);
$("#div_contour").width(WIDTH);
$("#contour").width(WIDTH);

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

var _symbol = "";

function showNews(symbol, which_contour_change) {
    //showNews1(symbol);
    showNews2(symbol, which_contour_change);
}

function changeContourType(type) {

    if(type == which_contour_type) {
        return;
    }
    document.getElementById(which_contour_type).getElementsByTagName("a")[0].className = "";
    which_contour_type = type;
    document.getElementById(type).getElementsByTagName("a")[0].className = "cur";
    var symbol = companies[which_stock]['symbol'];
    showNews2(symbol, type);
}

function showNews1(symbol) {
    tx=0, ty=0, ss=1;
    _symbol = symbol;
    zoomListener
        .scale(ss)
        .translate([tx, ty]);

    spinner_contour.spin(target_contour);

    titles=[], dates=[], times=[], sentiments=[], clusters=[], predict_changes=[];

    var domain = x_price.domain();
    if(brush_extent != null && brush_extent[0] != 0) {
        domain = brush_extent;
        //console.log('!=null!!!!');

    }
    var parse_date = d3.time.format('%Y-%m-%d');

    var start = parse_date(domain[0]);
    var end = parse_date(domain[1]);

    var model_name = model_names[which_model];
    d3.json('data/contour_example_data2.json', function(error, data) {
        spinner_contour.spin();
        var news_server_info = eval(data);
        //var news_server_info = eval('(' + data + ')');
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
        if(model_name.split("_")[0] == "news") {
            times = news_server_info["times"];
        }
        titles = news_server_info["titles"];
        cluster_filename = news_server_info['filename'];
        //console.log(cluster_filename);
        dates = news_server_info["dates"];
        positions = news_server_info["positions"];
        clusters = news_server_info["clusters"];
        keywords = news_server_info["keywords"];
        cluster_mean = news_server_info["cluster_mean"];
        predict_changes = news_server_info["predict_changes"];
        if(model_name == "news_sentiment") {
            sentiment_words = news_server_info["sentiment_words"];
        } else if(model_name == "news_event") {
            event_words = news_server_info["event_words"];
        }
        //console.log(cluster_mean);
        cluster_mean = normalize_array(cluster_mean);
        //console.log(cluster_mean);
        //console.log(positions);
        cluster_k = keywords.length;

        var max_rise_news, max_down_news;
        var max_rise= 0, max_down= 0, max_rise_id, max_down_id;
        predict_changes.forEach(function(d, i) {
            if(d>max_rise) {
                max_rise = d;
                max_rise_id = i;
            } else if(d < max_down) {
                max_down = d;
                max_down_id = i;
            }
        });
        max_rise_news = {date:dates[max_rise_id], time:times[max_rise_id], title:
                        titles[max_rise_id], is_down:false};
        max_down_news = {date:dates[max_down_id], time:times[max_down_id], title:
                        titles[max_down_id], is_down:true};
        addNewsLabel(max_rise_news);
        addNewsLabel(max_down_news);
        finishLayout(true);
    });
}


function showNews2(symbol, which_contour_change) {
    tx=0, ty=0, ss=1;
    _symbol = symbol;
    zoomListener
        .scale(ss)
        .translate([tx, ty]);

    spinner_contour.spin(target_contour);

    titles=[], dates=[], times=[], sentiments=[], clusters=[], predict_changes=[];

    var domain = x_price.domain();
    if(brush_extent != null && brush_extent[0] != 0) {
    //if(brush_extent != null && !brush.empty()) {
        domain = brush_extent;
        //console.log('!=null!!!!');

    }
    var parse_date = d3.time.format('%Y-%m-%d');

    var start = parse_date(domain[0]);
    var end = parse_date(domain[1]);

    var model_name = model_names[which_model];
    var url = "http://"+SERVER+":"+PORT+"/getPeriodNews?symbol="+_symbol+
                    "&start="+start+"&end="+end+"&model="+model_name+"&contour_change="+which_contour_change;
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
            if(model_name.split("_")[0] == "news") {
                times = news_server_info["times"];
            }
            titles = news_server_info["titles"];
            cluster_filename = news_server_info['filename'];
            console.log(cluster_filename);
            dates = news_server_info["dates"];
            positions = news_server_info["positions"];
            clusters = news_server_info["clusters"];
            keywords = news_server_info["keywords"];
            cluster_mean = news_server_info["cluster_mean"];
            predict_changes = news_server_info["predict_changes"];
            if(model_name == "title_sentiment_word") {
                sentiment_words = news_server_info["sentiment_words"];
            } else if(model_name.split("_")[0] == "event") {
                event_words = news_server_info["event_words"];
            }
            //console.log(cluster_mean);
            cluster_mean = normalize_array(cluster_mean);
            //console.log(cluster_mean);
            cluster_k = keywords.length;

            var max_rise_news = {}, max_down_news = {};
            var max_rise= 0, max_down= 0, max_rise_id, max_down_id;
            predict_changes.forEach(function(d, i) {
                if(d>max_rise) {
                    max_rise = d;
                    max_rise_id = i;
                } else if(d < max_down) {
                    max_down = d;
                    max_down_id = i;
                }
                var abs_d = Math.abs(d);
                if(abs_d > max_change) {
                    max_change = abs_d;
                }
                if(abs_d < min_change) {
                    min_change = abs_d;
                }
            });
            max_rise_news = {date:dates[max_rise_id], time:times[max_rise_id], title:
                            titles[max_rise_id], is_down:false};
            max_down_news = {date:dates[max_down_id], time:times[max_down_id], title:
                            titles[max_down_id], is_down:true};
            addNewsLabel(max_rise_news);
            addNewsLabel(max_down_news);

            finishLayout(true);
            var clusters_arr = '';
            for(var i=0; i<cluster_k; i++) {
                clusters_arr+=i;
                if(i != cluster_k-1) {
                    clusters_arr += ".";
                }
            }
            //getClusterFactorList(clusters_arr);
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
        ((positions[i][0]*20*ss + tx) + WIDTH*0.5) + "," +
        ((positions[i][1]*20*ss + ty) + HEIGHT*0.5) + ")"; });

}

var groups, nodes, texts;
var nodes2; //nodes点大一些的透明的点，方便选择

var focused = -1;

function drawEmbedding() {

    d3.selectAll(".u").remove();

    groups = svg_contour.selectAll(".b")
        .data(function() {
            var model_name = model_names[which_model];
            if(model_name.split("_")[0] == "news") {
                return titles;
            } else {
                return event_words;
            }
        })
        .enter().append("g")
        .attr("class", "u");

    nodes = groups.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", function () {
            return 3;
        })
        //.attr("id", function(d, i) {return "nodes"+i;})
        .attr('stroke-width', 1)
        .attr('stroke', function (d, i) {
            return "gray";
        })
        .attr("stroke-opacity", function(d, i) {
            return 0.4;
        })
        .attr('fill', function(d, i) {
            var title = titles[i];
            for(var i in keywords_count_by_date) {
                var keyword = keywords_count_by_date[i].keyword;
                var index = title.indexOf(keyword);
                if(index >= 0) {
                    return color_init_keyword(i);
                }
            }
            return 'gray';
        })
        .attr("fill-opacity", function(d, i) {
            //根据预测值大小设置为0.4~1
            var ratio = (predict_changes[i]-min_change)/(max_change-min_change);
            return 0.4+ratio*0.6;
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
            seeDetail(i);
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
            var title = titles[i];
            var date = dates[i];
            var time = times[i];
            var predict_change = (predict_changes[i]).toFixed(2);

            var model_name = model_names[which_model];
            if(model_name == "title_sentiment_word"){
                return title+"<br>"+sentiment_words[i]+"<br>"
                        +date+"<br>"+time+"<br>"+predict_change;
            } else if(model_name.split("_")[0] == "event") {
                return event_words[i]+"<br>"
                        +date+"<br>"+predict_change;
            }
            return title+"<br>"+date+" "+time+"<br>"+predict_change;
            //return title+"<br>"+date+" "+time+"<br>"+predict_change+"<br>"+
            //    ((positions[i][0]*20*ss + tx) + WIDTH*0.5) + " " +
            //    ((positions[i][1]*20*ss + ty) + HEIGHT*0.5);
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
            return "translate("+(WIDTH-60)+","+(HEIGHT-30)+")";
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

//function seeDetail(i) {
//    var date, time, newsTitle;        //detail infos
//    date = dates[i];
//    time = times[i];
//    newsTitle=titles[i].replace(/\&/g,"%26");
//    var is_down = predict_changes[i]<0;
//    addNewsLabel({date:date, time:time, title:newsTitle, is_down:is_down});
//    window.open("newsDetail.html?date="+date+"&time="+time+"&title="+newsTitle, "new_window","height=400,width=600");
//}

var tx=0, ty= 0, ss=1;
function zoomHandler() {
    tx = d3.event.translate[0];
    ty = d3.event.translate[1];
    ss = d3.event.scale;
    finishLayout(false);
}

function finishLayout(dataChanged) {
    //switch(contour_types[which_contour]) {
    //    case 'cluster':
    //        drawContour(positions, clusters, cluster_k, keywords, color, cluster_mean, dataChanged);
    //        break;
    //    case 'point':
    //        drawExample(positions, predict_changes, clusters, cluster_k);
    //        break;
    //    default :
    //        drawExample(positions, predict_changes);
    //        break;
    //}

    drawEmbedding();
    updateEmbedding();
    //drawKeywords(keywords);   // 显示关键字
    spinner_contour.spin();
}