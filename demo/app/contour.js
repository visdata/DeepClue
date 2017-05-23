/**
 * Created by WL on 2015/11/16.
 */

var svg_contour = d3.select("#svg_contour");
var _width = $("#div_contour").width();
var height = $("#div_contour").height();

//var tmp = _width;
//_width = height;
//height = tmp;  //TODO: 需要修改滚动条位置

var selected_clusters = [], selected_contours = [];
var ctrl_down = false, shift_down = false;
d3.select("body")
    .on("keydown", function() {
        ctrl_down = d3.event.ctrlKey;
        shift_down = d3.event.shiftKey;
    })
    .on("keyup", function() {
        ctrl_down = false;
        shift_down = false;
    });

var clusters_info, _keywords;

function drawClusters() {

}

function drawExample(positions, predictions, mapClusters, k) {
    var _postions = [];
    var scale = 20*ss;

    clusters_info = [];
    var points = [];
    for(var i=0; i<k; i++) {
        points[i] = [];
        clusters_info[i] = [];
    }

    positions.forEach(function(d, i) {
        _postions[i] = [Math.round(d[0]*scale+_width/2+tx), Math.round(d[1]*scale+height/2+ty)]
        points[mapClusters[i]].push(_postions[i]);
    });

    var CONTOUR_RAIDUS = 0;
    points.forEach(function(d, i) {
        var number = d.length;
        var xSum = 0, ySum = 0, centerX, centerY;
        var x1=10000, x2=0, y1=10000, y2=0;
        for(var j=0; j<number; j++) {
            xSum += d[j][0];
            ySum += d[j][1];
            x1 = Math.min(x1, d[j][0]);
            x2 = Math.max(x2, d[j][0]);
            y1 = Math.min(y1, d[j][1]);
            y2 = Math.max(y2, d[j][1]);
        }
        centerX = xSum/number;
        centerY = ySum/number;

        CONTOUR_RAIDUS = Math.max(centerX-x1, x2-centerX, centerY-y1, y2-centerY);

        clusters_info[i]["center"] = [centerX, centerY];
        clusters_info[i]["count"] = number;
    });

    var r = Math.round(scale*2.5);

    var matrix_data = [];
    var matrix_time = []; //记录每个点由几个影响
    var border = 0;
    for(var i=0; i<height-border; i++) {
        matrix_data[i] = [];
        matrix_time[i] = [];
        for(var j=0; j<_width-border; j++) {
            matrix_data[i][j] = 0;
            matrix_time[i][j] = 0;
        }
    }

    predictions = normalize_array(predictions);  //正规化到-1到1之间

    var min_x=999, max_x=0, min_y=999, max_y=0;
    var min_pos=999, max_pos=0, min_neg=-999, max_neg=0;     //分别记录正负数的(绝对值)最大最小值
    for(var i=0; i<_postions.length; i++) {
        var kernal = getGaussMatrix(r, predictions[i]);    //从-1到1，分成绿和红

        if(predictions[i]>0) {
            max_pos = Math.max(max_pos, predictions[i]);
            min_pos = Math.min(min_pos, predictions[i]);
        } else {
            max_neg = Math.min(max_neg, predictions[i]);
            min_neg = Math.max(min_neg, predictions[i]);
        }

        var x = _postions[i][0];
        var y = _postions[i][1];

        min_x = Math.min(min_x, x-r);
        max_x = Math.max(max_x, x+r);
        min_y = Math.min(min_y, y-r);
        max_y = Math.max(max_y, y+r);

        var x_start = Math.max(0, x-r);
        var x_end = Math.min(matrix_data.length-1, x+r);
        var y_start = Math.max(0, y-r);
        var y_end = Math.min(matrix_data.length-1, y+r);

        for(var ii=x_start; ii<=x_end; ii++) {
            for(var j=y_start; j<=y_end; j++) {
                matrix_time[ii][j]++;  //每次都加一，最终知道有几个影响
                matrix_data[ii][j] += kernal[ii-x+r][j-y+r];
            }
        }
    }

    var values_pos = [], values_neg = [];
    for(var i=0; i<matrix_data.length; i++) {
        for(var j=0; j<matrix_data[i].length; j++) {
            if(matrix_time[i][j] != 0) {
                matrix_data[i][j] /= matrix_time[i][j];
                if(matrix_data[i][j]>0) {
                    values_pos.push(matrix_data[i][j]);
                } else {
                    values_neg.push(matrix_data[i][j]);
                }
            }
        }
    }

    values_neg.sort();
    values_pos.sort();

    var levels = 5;
    var zs_neg = [0, 0, 0, 0, 0], zs_pos = [0, 0, 0, 0, 0];

    if(values_pos.length != 0) {
        zs_pos = [];
        for(var i=0; i<levels; i++) {
            var index = Math.round(values_pos.length/(levels+2)*(i+1));
            zs_pos.push(values_pos[index]);
        }
    }
    if(values_neg.length != 0) {
        zs_neg = [];
        for(var i=0; i<levels; i++) {
            var index = Math.round(values_neg.length/(levels+2)*(i+1));
            zs_neg.push(values_neg[index]);
        }
    }

    var zs = [-100].concat(zs_neg).concat(zs_pos).concat([100]);
    console.log(zs);

    var xs = d3.range(0, matrix_data[0].length),
    ys = d3.range(0, matrix_data.length),
    xScale = d3.scale.linear().range([0, _width]).domain([0, matrix_data[0].length]),
    yScale = d3.scale.linear().range([0, height]).domain([0, matrix_data.length]);

    //TODO: 调整等高图的颜色
    //var zs = [-100, -0.9, -0.6, -0.3, -0.1, -0.01, 0.01, 0.05, 0.1, 0.3, 0.6, 100],
    //var zs = [-100, -0.9, -0.6, -0.3, -0.1, -0.01, 0.01, 0.1, 0.3, 0.6, 0.9, 100],
    var color_red = getRed((zs.length-3)/2),
        color_green = getGreen((zs.length-3)/2),
        color_range = color_red.concat(["white"]).concat(color_green.reverse()),
        color_range = ["useless"].concat(color_range),
        colours = d3.scale.linear()
            .domain(zs)
            .range(color_range);

    var isoBands = [];
    for (var i = 1; i < zs.length; i++) {
        var lowerBand = zs[i-1];
        var upperBand = zs[i];
        if(lowerBand+upperBand != 0) { //等于0时说明是白色，会遮盖住之前的绿色，因此过滤掉
            var band = MarchingSquaresJS.IsoBands(matrix_data, lowerBand, upperBand - lowerBand);
            //console.log('band', band);
            isoBands.push({"coords": band, "level": i, "val": zs[i]});
        }
    }

    isoBands.sort(function(aa, bb) {
        return Math.abs(aa.val) > Math.abs(bb.val);
    });  //对contour图进行排序，避免path遮盖

    var mousedown = false;
    svg_contour.selectAll(".contour").remove();
    var groups_contour = svg_contour.selectAll(".group")
        .data(isoBands)
        .enter()
        .append("g")
        .attr("class", "group contour");

    groups_contour.each(function(d, i) {
        d3.select(this)
            .selectAll("path")
            .data(d.coords)
            .enter()
            .append("path")
            //.attr("class", "contour")
            .attr("id", function (dd, ii) {
                return "contour" + i + "_" + ii;
            })
            .style("fill", function () {
                return colours(d.val);
            })
            .style("stroke", function (dd, ii) {
                var _color = "none";
                var key = i + "_" + ii;
                if (hasElemInArr(selected_contours, key)) {
                    _color = 'red';
                    if (d.val > 0) {
                        _color = 'green';
                    }
                }
                return _color;
            })
            .style('opacity', function () {
                return 1;
            })
            .attr("d", function (dd) {
                var p = (d3.svg.line()
                            .x(function (dat) {
                                return dat[1];
                            })
                            .y(function (dat) {
                                return dat[0];
                            })
                            //.x(function(dat){ return xScale(dat[1]); })
                            //.y(function(dat){ return yScale(dat[0]); })
                            .interpolate("linear")
                    )(dd) + "Z";
                return p;
            });
    });
}

function getDistance(p1, p2) {
    return Math.abs(p1[0]-p2[0]) + Math.abs(p1[1]-p2[1]);
    //return Math.sqrt(Math.pow(p1[0]-p2[0], 2) + Math.pow(p1[1]-p2[1], 2));
}

function drawContour(positions, mapClusters, k, keywords, color, cluster_mean, dataChanged) {

    console.log("news count: " + positions.length);
    if(dataChanged) {
        selected_contours = [];
        selected_clusters = [];
        console.log("data changed! restore...");
    } else {
        //console.log("data not changed!");
    }

    _positions = positions;
    _mapClusters = mapClusters;
    _k = k;
    _keywords = keywords;
    _color = color;

    var data = [];
    var border = 0;
    for(var i=0; i<height-border; i++) {
        data[i] = [];
        for(var j=0; j<_width-border; j++) {
            data[i][j] = 0;
        }
    }
    clusters_info = [];
    var points = [];
    for(var i=0; i<k; i++) {
        points[i] = [];
        clusters_info[i] = [];
    }

    var scale = 20*ss;
    positions.forEach(function(d, i) {
        points[mapClusters[i]].push([d[0]*scale+_width/2+tx, d[1]*scale+height/2+ty]);
    });

    var CONTOUR_RAIDUS = 0;
    points.forEach(function(d, i) {
        var number = d.length;
        var xSum = 0, ySum = 0, centerX, centerY;
        var x1=10000, x2=0, y1=10000, y2=0;
        for(var j=0; j<number; j++) {
            xSum += d[j][0];
            ySum += d[j][1];
            x1 = Math.min(x1, d[j][0]);
            x2 = Math.max(x2, d[j][0]);
            y1 = Math.min(y1, d[j][1]);
            y2 = Math.max(y2, d[j][1]);
        }
        centerX = xSum/number;
        centerY = ySum/number;

        CONTOUR_RAIDUS = Math.max(centerX-x1, x2-centerX, centerY-y1, y2-centerY);

        clusters_info[i]["center"] = [centerX, centerY];
        clusters_info[i]["count"] = number;
    });

    var min_x=999, max_x=0, min_y=999, max_y=0;
    var EXTRA_RADIUS = 20;
    for(var i=0; i<k; i++) {
        var r = EXTRA_RADIUS+Math.floor(clusters_info[i]["count"]/positions.length/5*k * height);
        r = Math.floor(r*ss);
        if(isNaN(clusters_info[i]["center"][0])) {
            r=0;
            clusters_info[i]["center"] = [0, 0];
        }

        //console.log(cluster_mean[i]);
        var kernal = getGaussMatrix(r, cluster_mean[i]);    //从-1到1，分成绿和红

        var x = Math.floor(clusters_info[i]["center"][0]);
        var y = Math.floor(clusters_info[i]["center"][1]);

        min_x = Math.min(min_x, x-r);
        max_x = Math.max(max_x, x+r);
        min_y = Math.min(min_y, y-r);
        max_y = Math.max(max_y, y+r);

        var x_start = Math.max(0, x-r);
        var x_end = Math.min(data.length-1, x+r);
        var y_start = Math.max(0, y-r);
        var y_end = Math.min(data.length-1, y+r);

        //console.log([x_start, x_end, y_start, y_end]);

        for(var ii=x_start; ii<=x_end; ii++) {
            for(var j=y_start; j<=y_end; j++) {
                data[ii][j] += kernal[ii-x+r][j-y+r];
                if(isNaN(kernal[ii-x+r][j-y+r])) {
                    console.log('nan');
                }
            }
        }
    }

    ////根据超出边界的范围画滚动条，提示当前位置
    //var scroll_scale_x = _width/(max_x-Math.min(0, min_x)),
    //    scroll_start_x = scroll_scale_x*Math.max(0, -min_x),
    //    scroll_length_x= scroll_scale_x*_width,
    //    scroll_scale_y = height/(max_y-Math.min(0, min_y)),
    //    scroll_start_y = scroll_scale_y*Math.max(0, -min_y),
    //    scroll_length_y= scroll_scale_y*height;

    //console.log([min_x, max_x, min_y, max_y]);
    //console.log([scroll_start_x, scroll_length_x,
    //             scroll_start_y, scroll_length_y]);

    var xs = d3.range(0, data[0].length),
        ys = d3.range(0, data.length),
        xScale = d3.scale.linear().range([0, _width]).domain([0, data[0].length]),
        yScale = d3.scale.linear().range([0, height]).domain([0, data.length]);

    //TODO: 调整等高图的颜色
    var zs = [-100, -0.9, -0.6, -0.3, -0.1, -0.01, 0.01, 0.1, 0.3, 0.6, 0.9, 100],
        color_red = getRed((zs.length-3)/2),
        color_green = getGreen((zs.length-3)/2),
        color_range = color_red.concat(["white"]).concat(color_green.reverse()),
        color_range = ["useless"].concat(color_range),
        colours = d3.scale.linear()
            .domain(zs)
            .range(color_range);

    var isoBands = [];
    for (var i = 1; i < zs.length; i++) {
        var lowerBand = zs[i-1];
        var upperBand = zs[i];
        if(lowerBand+upperBand != 0) { //等于0时说明是白色，会遮盖住之前的绿色/红色，因此过滤掉
            var band = MarchingSquaresJS.IsoBands(data, lowerBand, upperBand - lowerBand);
            //console.log('band', band);
            isoBands.push({"coords": band, "level": i, "val": zs[i]});
        }
    }

    isoBands.sort(function(aa, bb) {
        return Math.abs(aa.val) > Math.abs(bb.val);
    });  //对contour图进行排序，避免path遮盖

    var mousedown = false;
    svg_contour.selectAll(".contour").remove();
    var groups_contour = svg_contour.selectAll(".group")
        .data(isoBands)
        .enter()
        .append("g")
        .attr("class", "group contour");

    groups_contour.each(function(d, i) {
        d3.select(this)
            .selectAll("path")
            .data(d.coords)
            .enter()
            .append("path")
            //.attr("class", "contour")
            .attr("id", function(dd, ii) {
                return "contour"+i+"_"+ii;
            })
            .style("fill",function() {
                return colours(d.val);
            })
            .style("stroke", function(dd, ii) {
                var _color = "none";
                var key = i+"_"+ii;
                if(hasElemInArr(selected_contours, key)) {
                    _color = 'red';
                    if(d.val > 0) {
                        _color = 'green';
                    }
                }
                return _color;
            })
            .style('opacity', function() {
                return 1;
            })
            .attr("d", function(dd) {
                var p = (d3.svg.line()
                          .x(function(dat){ return dat[1]; })
                          .y(function(dat){ return dat[0]; })
                          //.x(function(dat){ return xScale(dat[1]); })
                          //.y(function(dat){ return yScale(dat[0]); })
                          .interpolate("linear")
                         )(dd) + "Z";
                return p;
            })
            .on("click", function(dd, ii) {
                //alert("click!");    //useless
            })
            .on("mousedown", function(dd, ii) {

                if(!ctrl_down) {
                    selected_contours = [];
                    selected_clusters = [];
                }
                console.log(selected_contours);
                var contained_clusters = [];
                for(var j=0; j<clusters_info.length; j++) {
                    var pt = clusters_info[j]['center'];
                    if(isPointInPoly(dd, [pt[1], pt[0]])) {
                        contained_clusters.push(j);
                    }
                }

                var key = i+"_"+ii;
                if(hasElemInArr(selected_contours, key)) {
                    d3.select('#contour'+key).style("stroke", "none");
                    removeElemFromArr(selected_contours, key);
                    console.log(selected_clusters);
                    selected_clusters = array_sub(selected_clusters, contained_clusters);
                } else{
                    var _color = 'red';
                    if(d.val > 0) {
                        _color = 'green';
                    }
                    d3.select("#contour"+key).style("stroke", _color);
                    selected_contours = array_add(selected_contours, [key]);
                    selected_clusters = array_add(selected_clusters, contained_clusters);
                }
                finishLayout(false);
                selected_clusters_changed();
            })
            .on("mouseup", function() {
                mousedown = false;
            })
            .on("mouseenter", function(dd, ii) {
                var key = i+"_"+ii;
                var _color = 'red';
                if(d.val > 0) {
                    _color = 'green';
                }
                d3.select("#contour"+key).style("stroke", _color);
                document.getElementById("contour"+key).style.cursor="hand";

                for(var j=0; j<clusters_info.length; j++) {
                    var pt = clusters_info[j]['center'];
                    if(isPointInPoly(dd, [pt[1], pt[0]])) {
                        d3.selectAll(".key" +j)
                            .style("font-weight", "bold");
                            //.style("fill", "red");
                    }
                }
            })
            .on("mouseleave", function(dd, ii) {
                d3.selectAll(".keywords")
                            .style("font-weight", "normal");
                            //.style("fill", "black");
                for(var j=0; j<selected_clusters.length; j++) {
                    d3.selectAll(".key"+selected_clusters[j])
                        .style("font-weight", "bold");
                        //.style("fill", "red");
                }
                var key = i+"_"+ii;
                if(!hasElemInArr(selected_contours, key)) {
                    d3.select('#contour'+key).style("stroke", "none");
                    document.getElementById("contour"+key).style.cursor="default";
                }
            });
    });

    svg_contour.selectAll(".cluster")
        .data(clusters_info)
        .enter()
        .append("circle")
        .attr("class", "cluster contour")
        .attr("cx", function(d, i) {
            return d["center"][0];
        })
        .attr("cy", function(d, i) {
            return d["center"][1];
        })
        .attr("r", function(d) {
            if(d["center"] == [0,0]) {
                return 0;
            }
            return 3;
        })
        .attr("fill", function(d, i) {
            return color(i);
        });


    //var bar_width = 4, bar_color = "rgb(192, 192, 192)";
    //svg_contour.selectAll(".scrollBar").remove();
    //svg_contour.append("rect")
    //    .attr("class", "scrollBar scroll_x")
    //    .attr("x", scroll_start_x)
    //    .attr("y", height-bar_width)
    //    .attr("width", scroll_length_x)
    //    .attr("height", bar_width)
    //    .attr("fill", function(d, i) {
    //        if(scroll_length_x >= _width && scroll_start_x==0) {
    //            return "white";
    //        }
    //        return bar_color;
    //    });
    //svg_contour.append("rect")
    //    .attr("class", "scrollBar scroll_y")
    //    .attr("x", _width-bar_width)
    //    .attr("y", scroll_start_y)
    //    .attr("width", bar_width)
    //    .attr("height", scroll_length_y)
    //    .attr("fill", function(d, i) {
    //        if(scroll_length_y>=height && scroll_start_y==0) {
    //            return "white";
    //        }
    //        return bar_color;
    //    });
}

function drawKeywords() {
        var w, h;
    var clusterskey = svg_contour.selectAll(".clusterskey")
        .data(_keywords)
        .enter()
        .append("svg")
        .attr("class", "clusterskey contour");

    clusterskey.each(function(ele, index) { //index是第几个聚类
        d3.select(this)
            .selectAll(".keywords")
            .data(function () {
                var len = _keywords[index].length;
                var slice_len = Math.min(3, len);
                var arr = _keywords[index].slice(0, slice_len);
                return arr;
            })
            .enter()
            .append("text")
            .attr("class", function() {
                return "keywords key"+index;
            })
            .text(function (d, i) {
                return d["word"];
            })
            .on('mouseenter', function() {
                d3.select(this)
                    .attr('cursor', 'pointer')
                    .attr('fill', 'red');
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .attr('fill', 'black');
            })
            .on("mousedown", function(d, i) {
                //addSearchWord(d['word']);
                searchBox.val(d['word']);

                if(!ctrl_down) {
                    selected_contours = [];
                    selected_clusters = [];
                }
                if(hasElemInArr(selected_clusters, index)) {
                    if(shift_down) {
                        for(var j=0; j<cluster_mean.length; j++) {
                            if(cluster_mean[index] * cluster_mean[j] > 0) {
                                removeElemFromArr(selected_clusters, j);
                            }
                        }
                    } else {
                        removeElemFromArr(selected_clusters, index);
                    }
                    console.log(selected_clusters);
                } else {
                    if(shift_down) {
                        for(var j=0; j<cluster_mean.length; j++) {
                            if(cluster_mean[index] * cluster_mean[j] > 0) {
                                selected_clusters = array_add(selected_clusters, [j]);
                            }
                        }
                    } else {
                        selected_clusters = array_add(selected_clusters, [index]);
                    }
                    console.log(selected_clusters);
                }
                finishLayout(false);
                selected_clusters_changed();
            })
            .attr("font-weight", function(d, i) {
                if(hasElemInArr(selected_clusters, index)) {
                    return "bold";
                }
                return "normal";
            })
            //.attr("fill", function(d, i) {
            //    if(hasElemInArr(selected_clusters, index)) {
            //        return "red";
            //    }
            //    return "black";
            //})
            .attr("font-size", function(d) {
                return 10 + Math.round(d["tfidf"]*8);
            })
            .attr("x", function(d, i) {
                //console.log(this.getComputedTextLength());
                var box = this.getBBox();
                w = box.width;
                return clusters_info[index]["center"][0] - w/2;
            })
            .attr("y", function(d, i) {
                var box = this.getBBox();
                h = box.height + 0;
                var deltaH = 0;
                if(i%2==0){
                    deltaH = i/2*h;
                } else {
                    deltaH = -Math.floor((i/2+1))*h;
                }
                return clusters_info[index]["center"][1]+deltaH;
            });
    });

}

/**
 * 此函数返回高斯核函数
 */
function getGaussMatrix(radius, cluster_mean, sigma) {
    radius = Math.floor(radius) || 3;
    sigma = sigma || radius / 3;

    var a = 1 / ((2 * Math.PI) * sigma*sigma);
    var b = -1 / (2 * sigma * sigma);

    var kernalData = [];
    var row = 0;
    for(var i=-radius; i<=radius; i++) {
        kernalData[row] = [];
        var column = 0;
        for(var j=-radius; j<=radius; j++) {
            var x2 = i*i;
            var y2 = j*j;
            kernalData[row][column] = Math.exp(b*(x2 + y2)); //不乘以a，在0~1之间
            kernalData[row][column] *= cluster_mean; //乘以涨跌的平均值，在-1到1之间
            //kernalData[row][column] = a*Math.exp(b*(x2 + y2));
            column++;
        }
        row++;
    }
    return kernalData;
}

var timer_clusters = null;
function selected_clusters_changed() {
    console.log("changed!");
    //changeClusters();
    if(timer_clusters) clearTimeout(timer_clusters);
    // 等待两秒后执行
    timer_clusters = setTimeout(changeClusters, WAIT_TIME);
}

function changeClusters() {
    //TODO: 改变选择的聚类，相应改变factor list
    console.log("request...");
    var clusters_arr = selected_clusters.join(".");
    //getClusterFactorList(clusters_arr);

    //getClusterSentimentNewsAndDraw(clusters_arr);
}
