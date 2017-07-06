/**
 * Created by WL on 2016-11-29.
 */

var color = d3.scale.category20();

var max_weight, min_weight;   //��¼���йؼ���Ȩ�ص�����

var HEIGHT = $("#div_contour").height(), WIDTH = $("#div_contour").width();

var svg_contour = d3.select("#svg_contour")
    .attr("width", WIDTH)
    .attr("height", HEIGHT);
var images_zoom = ["icon_zoom_in.png", "icon_zoom_out.png"];

var MDS = 0, TSNE = 1;
var PROJECTION=MDS;

var tx=0, ty= 0, ss=1;
/**
 *
 * �����ؼ���ӳ����ͼ��zoom����
 *
 */
function zoomHandler() {
    tx = d3.event.translate[0];
    ty = d3.event.translate[1];
    ss = d3.event.scale;
    //drawKeywordMap();
    updateEmbedding();
}

/**
 *
 * �ؼ���ӳ����ͼzoom�ķŴ���С��ť�ļ���
 * @param i �������ͣ�0Ϊ�Ŵ�1Ϊ��С
 *
 */
function clickToZoom(i) {
    if(i==0) {
        ss *= 1.148;
    } else {
        ss /= 1.148;
    }
    if(ss < 0.1) ss = 0.1;
    zoomListener
        .scale(ss)
        .translate([tx, ty]);
    //drawKeywordMap();
    updateEmbedding();
}

var zoomListener = d3.behavior.zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", zoomHandler);
svg_contour.call(zoomListener)
    //.on("mousedown.zoom", null)
    //.on("click.zoom", null)
    .on("dblclick.zoom", null);

var map_keyword_info = {};
var keywordsList, pos_tSNE, pos_MDS, keywordsWeight;
var keywordsInfoList = [];   //����ؼ��ʼ���weight��С������
var FILTER_NUM = 10;    //ɸѡȨ��ǰ10��Ĺؼ���
var keywordsInFirstFlag = {};   //��¼ÿ�������Ƿ���ǰʮ���ֵ�
var positions; // tsne result stored here

var RADIUS = 2, RADIUS_BIGGER = 3;

/**
 *
 * ��ʼ���ؼ���ӳ����ͼ���ݲ�����
 *
 */
function initKeywordMap() {
    keywordsList = groups_sort_and_keyword_position['keywordMapList'];
    pos_tSNE = groups_sort_and_keyword_position['pos_tSNE'];
    pos_MDS = groups_sort_and_keyword_position['pos_MDS'];
    keywordsWeight = groups_sort_and_keyword_position['keywordWeight'];

    keywordsInfoList = [];
    keywordsInFirstFlag = {};
    for(var i in keywordsList) {
        var keyword = keywordsList[i];
        var weight = keywordsWeight[i];
        var obj = {};
        obj['keyword'] = keyword;
        obj['weight'] = weight;
        keywordsInfoList.push(obj);
    }
    keywordsInfoList.sort(function(a, b) {
        return Math.abs(b.weight) - Math.abs(a.weight);
    });

    for(var i in keywordsInfoList) {
        if(i < FILTER_NUM) {
            keywordsInFirstFlag[keywordsInfoList[i].keyword] = true;
        } else {
            keywordsInFirstFlag[keywordsInfoList[i].keyword] = false;
        }
    }

    console.log(keywordsInfoList);
    console.log(keywordsInFirstFlag);

    if(PROJECTION==MDS) {
        positions = pos_MDS;
    } else {
        positions = pos_tSNE;
    }
    reProject(positions);

    for(var i in keywordsList) {
        var keyword = keywordsList[i];
        map_keyword_info[keyword] = {};
        map_keyword_info[keyword]['position'] = positions[i];
        map_keyword_info[keyword]['weight'] = keywordsWeight[i];
    }

    max_weight = d3.max(keywordsWeight, function(d) {return Math.abs(d);});
    min_weight = d3.min(keywordsWeight, function(d) {return Math.abs(d);});

    drawKeywordMap();
}

var groups, nodes, nodes2;
/**
 *
 * ���ƹؼ���ӳ����ͼ
 *
 */
function drawKeywordMap() {

    spinner_contour.spin();
    svg_contour.selectAll(".u").remove();
    svg_contour.selectAll('.btn_switch').remove();

    //��Ӱ�ť���л�MDS��tSNE)
    svg_contour.append('rect')
        .attr({
            x: 10,
            y: 10,
            width: 40,
            height: 20,
            class: 'btn_switch btn_mds',
            fill: function() {
                if(PROJECTION == MDS) {
                    return 'rgb(240,240,240)';
                } else {
                    return 'rgb(219,219,219)';
                }
            }
        });
    svg_contour.append('text')
        .text('MDS')
        .attr('class', function() {
            var box = this.getBBox();
            var w = box.width;
            var h = box.height;
            d3.select(this)
                .attr({
                    x: 10+20-w/2,
                    y: 10+20-h/2,
                    fill: function() {
                        if(PROJECTION == MDS) {
                            return 'red';
                        } else {
                            return 'black';
                        }
                    }
                });
            return 'btn_switch btn_mds';
        });
    svg_contour.append('rect')
        .attr({
            x: 51,
            y: 10,
            width: 40,
            height: 20,
            class: 'btn_switch btn_tsne',
            fill: function() {
                if(PROJECTION == TSNE) {
                    return 'rgb(240,240,240)';
                } else {
                    return 'rgb(219,219,219)';
                }
            }
        });
    svg_contour.append('text')
        .text('tSNE')
        .attr('class', function() {
            var box = this.getBBox();
            var w = box.width;
            var h = box.height;
            d3.select(this)
                .attr({
                    x: 51+20-w/2,
                    y: 10+20-h/2,
                    fill: function() {
                        if(PROJECTION == MDS) {
                            return 'black';
                        } else {
                            return 'red';
                        }
                    }
                });
            return 'btn_switch btn_tsne';
        });

    svg_contour.selectAll('.btn_switch')
        .on('click', function() {
            var elem = d3.select(this);
            if(hasClass(elem, 'btn_mds')) {
                PROJECTION = MDS;
            } else {
                PROJECTION = TSNE;
            }
            initKeywordMap();
        });

    groups = svg_contour.selectAll(".b")
        .data(positions)
        .enter().append("g")
        .attr("class", "u");

    nodes = groups.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", function(d, i) {
            if(isNEU(keywordsList[i])) {
                return RADIUS_BIGGER;
            }
            return getKeywordRadius(keywordsList[i]);
        })
        .attr("id", function(d, i) {
            var keyword = removeSpecialChar(keywordsList[i]);
            return "nodes"+keyword;
        })
        .attr('class', 'map_node')
        .attr('stroke-width', 1)
        .attr('stroke', function (d, i) {
            return "black";
        })
        .attr("stroke-opacity", function(d, i) {
            if(isNEU(keywordsList[i])) {
                return 1;
            }
            return 0;
        })
        .attr('fill', function(d, i) {
            if(isNEU(keywordsList[i])) {
                return 'black';
                //return 'none';
            }
            if(keywordsWeight[i] >= 0) {
                return GREEN;
            } else {
                return RED;
            }
        })
        .attr("fill-opacity", function(d, i) {
            if(isNEU(keywordsList[i])) {
                return 1;
            }
            return getKeywordOpacity(keywordsWeight[i]);
        });

    groups.each(function(d, i) {
       if(keywordsInFirstFlag[keywordsList[i]]) {
           d3.select(this)
               .append('text')
               .text(keywordsList[i])
               .attr({
                   class: 'text_pointer keyword_text',
                   id: 'keyword_'+removeSpecialChar(keywordsList[i]),
                   x: function() {
                       var box = this.getBBox();
                       var w = box.width;
                       return -w/2;
                   },
                   y: function() {
                       var box = this.getBBox();
                       var h = box.height;
                       return -RADIUS_BIGGER*2;
                       //return h/2-2;
                   }
               })
               .call(drag_text);
       }
    });

    nodes2 = groups.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", function (d, i) {
            return 4;
        })
        .attr("id", function(d, i) {return "nodes_"+i;})
        .attr("stroke-opacity", function(d, i) {
            return 0;
        })
        .attr("fill-opacity", function(d, i) {
            return 0;
        })
        .on("mousedown", function(d, i) {
            //����µ�factor div
            addNewKeywordDiv(keywordsList[i]);
            //ɸѡ����list
            var factor_data = dict_keyword_data[keywordsList[i]];
            brushNewsTable(factor_data);
        })
        .on("click", function(d, i) {

        })
        .on("mouseenter", function(d, i) {
            document.getElementById("nodes_"+i).style.cursor="hand";
        })
        .on("mouseleave", function(d, i) {
            document.getElementById("svg_contour").style.cursor="auto";
        });
    nodes2
        .append("title")
        .html(function(d, i) {
            return keywordsList[i];
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
        .data(images_zoom)
        .enter()
        .append("svg")
        .attr("class", "zoom")
        .attr("width", 60)
        .attr("height", 30)
        .on("mousedown", function(d, i) {
            clickToZoom(i);
        })
        .append("image")
        .attr('class', 'image_zoom')
        .attr("xlink:href", function(d, i) {
            return "img/" + d;
        })
        .attr("src", function(d, i) {
            return "img/" + d;
        })
        .attr("width", 20)
        .attr("height", 20)
        .attr("x", function(d, i) {
            return 2+30*i;
        })
        .attr("y", 0);
    updateEmbedding();
}

/**
 *
 * ���½ڵ�����
 *
 */
function updateEmbedding() {
    // move the groups accordingly
    groups.attr("transform", function(d, i) { return "translate(" +
        ((d[0]*ss + tx) + WIDTH*0.5) + "," +
        ((d[1]*ss + ty) + HEIGHT*0.5) + ")"; });

}

/**
 *
 * ����ѡ�еĹؼ������ݶ���ͼ���й���
 * @param keywords ��������ͼ��ѡ�еĹؼ�������
 *
 */
function filterKeywordsNode(keywords) {
    svg_contour.selectAll('.map_node')
        .attr("fill-opacity", 0.1);
    svg_contour.selectAll('.keyword_text')
        .attr("opacity", 0);
    for(var i in keywords) {
        var keyword = removeSpecialChar(keywords[i]);
        svg_contour
            .select('#nodes'+keyword)
            .attr("fill-opacity", function() {
                return getKeywordOpacity(map_keyword_info[keywords[i]]['weight']);
            });
        svg_contour
            .select('#keyword_'+keyword)
            .attr('opacity', 1);
    }
}

/**
 *
 * ��չؼ���ӳ����ͼ�ĸ�����ʾ
 *
 */
function clearFilterKeywordsNode() {
    svg_contour.selectAll('.map_node')
        .attr("fill-opacity", function(d, i) {
            if(isNEU(keywordsList[i])) return 1;
            return getKeywordOpacity(keywordsWeight[i]);
        });
    svg_contour.selectAll('.keyword_text')
        .attr("opacity", 1);
}

/**
 *
 * ��ȡ�ؼ��ʽڵ�İ뾶��С
 * @param keyword �ؼ���
 * @return �ڵ�뾶
 *
 */
function getKeywordRadius(keyword) {
    if(keywordsInFirstFlag[keyword]) {
        return RADIUS_BIGGER;
    }
    return RADIUS;
}

/**
 *
 * ����Ȩ�ط��عؼ���͸����
 * @param weight �ؼ��ʵ�Ȩ��
 * @return ͸����
 *
 */
function getKeywordOpacity(weight) {
    return 1;   //��Ϊ����weight�ı�͸���ȣ�����Ϊ1
    //����Ԥ��ֵ��С����Ϊ0.1~1
    //var ratio = (Math.abs(weight)-min_weight)/(max_weight-min_weight);
    //var opacity = 0.1+0.9*ratio;
    //return opacity;
}

/**
 *
 * �жϹؼ����Ƿ�Ϊ���Դ�
 * @param keyword �ؼ���
 * @return true �����Դ�
 *
 */
function isNEU(keyword) {
    return keyword=='#NEU';
}

/**
 *
 * ɾ���ַ����е������ַ�
 * @param str �ַ���
 * @return ɾ�������ַ�����ַ���
 */
function removeSpecialChar(str) {
    return str.replace(/[&\|\\\*^%$.'"#@\+\-]/g,'');
}

/**
 *
 * ����map��С��positionsλ�ý����ض�λ
 * @param postions ��¼ÿ���ڵ�������������
 *
 */
function reProject(positions) {
    //����map��С��positionsλ�ý����ض�λ
    var max_x= 0, max_y = 0;
    positions.forEach(function(d, i) {
        max_x = Math.max(max_x, Math.abs(d[0]));
        max_y = Math.max(max_y, Math.abs(d[1]));
    });
    positions.forEach(function(d, i) {
        d[0] = d[0]*WIDTH/2/max_x;
        d[1] = d[1]*HEIGHT/2/max_y;
    });
}