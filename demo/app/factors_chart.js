/**
 * Created by WL on 2016/5/15.
 */

var FACTOR_ROOT = new FactorDiv();  //���в�εĸ��ڵ�
var NEW_KEYWORD_ROOT = new FactorDiv(); //����ӵĹؼ��ʵĸ��ڵ�
var GROUP = 'group', KEYWORD = 'keyword', BIGRAM = 'bigram';

var div_init_keyword = d3.select('#div_init_keyword');
$('#div_init_keyword').width(width+10);

var DEFAULT_EXPAND = 5; //Ĭ��չ�����ӽڵ�����
var FONT_SIZE = {'group': 18, 'keyword': 15, 'bigram': 12};

var RATIO_KEYWORD=2/3, RATIO_BIGRAM = 1/3;
var HEIGHT_GROUP=64, HEIGHT_KEYWORD=HEIGHT_GROUP*RATIO_KEYWORD,
    HEIGHT_BIGRAM=HEIGHT_GROUP*RATIO_BIGRAM;
var WIDTH_LEFT = 100;
var X_LINE_GROUP = 10, X_EXPAND_GROUP  = 40,
    X_LINE_KEYWORD=X_EXPAND_GROUP, X_EXPAND_KEYWORD= 70,
    X_LINE_BIGRAM =X_EXPAND_KEYWORD, X_EXPAND_BIGRAM = WIDTH_LEFT;

var HEIGHT_FACTOR = {
        'group': HEIGHT_GROUP,
        'keyword':HEIGHT_KEYWORD,
        'bigram': HEIGHT_BIGRAM
    };
var X_LINE_LEFT = {
        'group': X_LINE_GROUP,
        'keyword':X_LINE_KEYWORD,
        'bigram':X_LINE_BIGRAM
    };
var X_EXPAND_LEFT = {
        'group': X_EXPAND_GROUP,
        'keyword':X_EXPAND_KEYWORD,
        'bigram':X_EXPAND_BIGRAM
    };

var clickPos = [-1, -1];

var y_init_keyword  = d3.scale.linear();
var xAxis_init_keyword = d3.svg.axis().scale(x_price).orient("bottom").ticks(0);
var yAxis_init_keyword = d3.svg.axis().scale(y_init_keyword).orient("left");

var color_init_keyword = d3.scale.category10();
var max_value_spectrum_weight, max_value_spectrum_frequency;

var line_init_keyword = d3.svg.line()
    .x(function(d) {
        return x_price(d.date);
    })
    .y(function(d) {
        return y_init_keyword(d.value);
    });

var delay = 0;  //delay,������ض�ʱ�õ�

$('#btn_add').click(function() {
    var keyword = $('#box_keyword').val();
    addNewKeywordDiv(keyword);
});

/**
 *
 * ��ʾ������������ͼ�е����������
 *
 */
function showOrHiddenTimeline() {
    if(window_types[which_window] != 'none') {    //0:����ԣ�1��Ƶ��
        showCorrTimeline();
    } else {    //2������
        hiddenCorrTimeline();
    }
}

/**
 *
 * ��ʾ������ͼ�е����������
 *
 */
function showCorrTimeline() {
    //show
    d3.selectAll('.keywordLine')
        .style('display', 'block');
    //if(last_timeline_type != which_timeline) {
        drawKeywordLines();
    //}
}

/**
 *
 * ����������ͼ�е����������
 *
 */
function hiddenCorrTimeline() {
    //hidden
    d3.selectAll('.keywordLine')
        .style('display', 'none');
    d3.selectAll('.hidden_axislabel')
        .style('display', 'none');
}

/**
 *
 * ��ȡ��ǰʱ�䴰�ڴ�С�µ�ʱ�䵥λ��С
 * @return ʱ�䵥λ��С
 *
 */
function getUnit() {
    var extent = x_price.domain();
    var start_year = extent[0].getFullYear(),
        end_year = extent[1].getFullYear(),
        start_month = extent[0].getMonth(),
        end_month = extent[1].getMonth(),
        start_day = extent[0].getDate(),
        end_day = extent[1].getDate();

    var unit = "day";
    if(which_window != 0) { //��window����0ʱ������������Ӧ�ģ�������û�ѡ�������ʾ
        if(window_types[which_window] == 'by year') {
            unit = 'month';
        } else if(window_types[which_window] == 'by month') {
            unit = 'week';
        } else if(window_types[which_window] == 'by week') {
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

/**
 *
 * ���ƹؼ���������ͼ
 *
 */
function drawKeywordLines() {
    spinner_keyword_line.spin(target_keyword_line);
    clearInitKeywords();
    FACTOR_ROOT.removeAllChildren();    //ÿ���ػ���Ҫ���ROOT�������ӽڵ�
    NEW_KEYWORD_ROOT.removeAllChildren();

    var unit = getUnit();
    max_value_spectrum_weight = getKeywordSpectrumMax(unit);

    //TODO:������
    var sort_type = sort_types[which_sort];
    var map_groups = {};
    for(var i in groups_info_by_date) {
        map_groups[groups_info_by_date[i].key] = groups_info_by_date[i];
    }
    var groups_sort = groups_sort_and_keyword_position['groups'];
    //var groups_sort = groups_sort_and_keyword_position['all_relevance'];
    if(which_sort == 1) {
        groups_sort = groups_sort_and_keyword_position['pos_relevance'];
    } else if(which_sort == 2) {
        groups_sort = groups_sort_and_keyword_position['neg_relevance'];
    }
    var tmp_groups_sort = [];
    for(var i in groups_sort) {
        var tmp = groups_sort[i].slice(0);   //deep copy of array
        var key = tmp.sort().join('');
        map_groups[key].text = groups_sort[i];
        tmp_groups_sort.push(map_groups[key]);
    }
    groups_info_by_date = tmp_groups_sort;

    var len = groups_info_by_date.length;
    for(var i in groups_info_by_date) {
        if(i >= DEFAULT_EXPAND) {
            break;
        }
        var div = div_init_keyword
            .append('div')
            .datum(groups_info_by_date[i])
            .attr('class', 'div_keywordLine')
            .attr('id', function() {
                return 'group_line_'+ groups_info_by_date[i]['text'].join('_');
            })
            .style('height', HEIGHT_GROUP*2+'px');
        //drawFactorLine(div, groupsInfo[i], unit);
        var factorDiv = new FactorDiv();
        factorDiv.div = div[0][0];  //d3->DOM
        factorDiv.factor_data = groups_info_by_date[i];
        FACTOR_ROOT.addChild(factorDiv);
        drawFactorLine(factorDiv, unit, true);
    }
    reDrawFactorDivs();
}

/**
 *
 * ������������
 * @param factorDiv Ҫ���Ƶ�div
 * @param unit ��ǰʱ�䵥λ��С
 * @param cacel_redraw �Ƿ��ػ�
 *
 */
function drawFactorLine(factorDiv, unit, cancel_redraw) {

    var div = d3.select(factorDiv.div);
    var factor_data = factorDiv.factor_data;

    var svg_keywordLine = div
        .append('svg')
        .datum(factor_data)
        .on('mouseenter', function() {
            mouseOverFactorChart(factorDiv);
        })
        .on('mouseleave', function() {
            mouseOutFactorChart(factorDiv);
        })
        .attr('class', 'svg_keywordLine');

    var svg_keywordLine_g = svg_keywordLine
        .append('g')
        .attr('class', 'svg_g')
        .attr('transform', 'translate('+tranlate_x+', 0)');

    var type = factor_data.type;
    ////�������ֵ��ȷ��y�᷶Χ
    var height_sep = HEIGHT_FACTOR[type];
    var maxY = height_sep*2-5;
    y_init_keyword
        .range([maxY, 5])
        .domain([-1, 1]);

    yAxis_init_keyword.ticks(2);

    //����brush
    var brush_keyword = d3.svg.brush()
        .x(x_price)
        .on("brushstart", function() {
            var e = d3.event.sourceEvent;
            clickPos = [e.clientX, e.clientY];
        })
        .on("brushend", function() {
            ////ȡ���ؼ��ʸ���
            //clearKeywordHighlight();
            //��������brushȥ��
            var e = d3.event.sourceEvent;
            var extent = brush_keyword.empty() ? x_price.domain() : brush_keyword.extent();
            extent[0] = addDate(extent[0], 'd', -1);
            extent[1] = addDate(extent[1], 'd', -1);
            brushNewsTable(factor_data, extent);    //TODO������
            if(!brush_keyword.empty()&&clickPos[0]== e.clientX&&clickPos[1]== e.clientY) {
                //factorDiv.sortLevel(extent[0], extent[1]);    //�Ե�ǰչ���Ľ�������

                extent = brush_keyword.extent();
                sortAllLevelFactor(factorDiv, extent[0], extent[1]);    //�Ըò����е�����
            }
            //�����ʾ��Ϣ
            svg_keywordLine_g.selectAll('.extent').selectAll('title').remove();
            svg_keywordLine_g.selectAll('.extent')
                .append('title')
                .text(function() {
                    var type = sort_types[which_sort];
                    var extent = brush_keyword.extent();
                    var start = format_date(extent[0]);
                    var end = format_date(extent[1]);
                    console.log(extent);
                    return 'click to sort factors from ' + start +
                        ' to ' + end + ' by ' + type;
                });
        });

    svg_keywordLine_g.append("g")
        .attr("class", "brush_keyword")
        .call(brush_keyword)
        .selectAll("rect")
        .attr("y", 0)
        .attr("height", height_sep);

    //��ʱ����
    svg_keywordLine_g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height_sep) + ")")
        .call(xAxis_init_keyword);
    //��y��
    svg_keywordLine_g.append("g")
        .attr("class", "y_left axis")
        .attr("transform", "translate(1, "+ (0) +")")
        .call(yAxis_init_keyword);

    var legend_x = 0;
    //��ͼ�����ؼ�������
    svg_keywordLine_g.append('text')
        .attr('fill', function() {
            return 'black';
        })
        .attr('class', 'keywordLegend')
        .style('font-size', FONT_SIZE[type]+'px')
        .on('click', function() {
            factorDiv.moveToFirst();
            brushNewsTable(factor_data);
            reDrawFactorDivs();
        })
        .on('mouseenter', function() {

        })
        .text(function() {
            if(type == GROUP) {
                return factor_data['text'].slice(0,DEFAULT_EXPAND).join(', ')+"...";
            }
            return factor_data['text'];
        })
        .attr('transform', function() {
            var box = this.getBBox();
            var width_text = box.width;
            legend_x = width_text+20;
            return 'translate('+(20)+', '+(20)+')';
        });

    svg_keywordLine_g
        .append("g")
        .attr("transform", function() {
            return "translate("+(x_price.range()[1]+20)+","+(2)+")";
            //return "translate("+(legend_x)+","+(2)+")";
        })
        .append("image")
        .attr({
            class: 'delete_icon icon btn',
            title: 'delete'
        })
        .on("click", function() {
            deleteFactorDiv(factorDiv);
        })
        .attr("xlink:href", function() {
            return "img/close_red.png";
        })
        .attr("src", function() {
            return "img/close_red.png";
        });

    //���չ����رյİ�ť�������keyword��group�Ļ���
    if(type != BIGRAM) {
        svg_keywordLine
            .append("g")
            .attr("transform", function() {
                var t_x = X_EXPAND_LEFT[type] - 7;
                var t_y = HEIGHT_FACTOR[type] - 7;   //��ȥ��ť�߶ȵ�һ��
                return "translate("+(t_x)+","+(t_y)+")";
            })
            .append("image")
            .attr('class', 'btn_expand btn')
            .attr("xlink:href", function(d, i) {
                return "img/add.png";
            })
            .attr("src", function(d, i) {
                return "img/add.png";
            })
            .on("click", function() {
                if(type == GROUP) {
                    //var groupDiv = FACTOR_ROOT.getDivByFactor(factor_data.text);
                    var groupDiv = factorDiv;
                    var len = factor_data.text.length;
                    if(factorDiv.expand_count > 0) {    //�Ѿ�չ��
                        groupDiv.removeAllChildren();
                        d3.select(this)
                            .attr("xlink:href", function() {
                                return "img/add.png";
                            })
                            .attr("src", function() {
                                return "img/add.png";
                            });
                    } else {
                        for(var i in factor_data.text) {
                            //var keyword = factor_data.group[len-1-i];
                            var keyword = factor_data.text[i];
                            if(i >= DEFAULT_EXPAND) {
                                break;
                            }
                            d3.select(this)
                                .attr("xlink:href", function() {
                                    return "img/sub.png";
                                })
                                .attr("src", function() {
                                    return "img/sub.png";
                                });
                           var div = div_init_keyword
                               .append('div')
                                .attr('id', 'keyword_line_'+keyword)
                                    .attr('class', 'div_keywordLine')
                                    .style('height', 2*HEIGHT_KEYWORD+'px');
                            var factor_keyword_data = dict_keyword_data[keyword];
                            var keywordDiv = new FactorDiv();
                            keywordDiv.div = div[0][0]; //d3->DOM
                            keywordDiv.factor_data = factor_keyword_data;
                            groupDiv.addChild(keywordDiv);
                            drawFactorLine(keywordDiv, unit);
                        }
                    }
                } else if(type==KEYWORD) {
                    var keywordDiv = factorDiv;
                    if(keywordDiv.expand_count > 0) {
                        keywordDiv.removeAllChildren();
                        d3.select(this)
                            .attr("xlink:href", function(d, i) {
                                return "img/add.png";
                            })
                            .attr("src", function(d, i) {
                                return "img/add.png";
                            });
                    } else {
                        var parameters = {};
                        parameters['keyword'] = factor_data.keyword;
                        parameters['elem'] = this;
                        parameters['unit'] = unit;
                        parameters['factorDiv'] = keywordDiv;
                        if(bigram_info_of_keywords[factor_data.keyword]) {
                            expandBigram(parameters);
                        } else {
                            getKeywordBigramInfo(parameters);
                        }
                    }
                }
                reDrawFactorDivs();
            });
    }
    if(!cancel_redraw) {
        reDrawFactorDivs();
    }
    drawKeywordLineEveryDay(svg_keywordLine_g, factor_data, unit);
    drawSpectrumKeywords(svg_keywordLine_g, factor_data, unit);
}

/**
 *
 * ������ͼ��ѡʱ�仭ˢʱ�����ĵ���ͼ������չʾ
 * @param factor_data ѡ�е����أ�FactorDivԪ��
 * @extent ʱ������ {start����end��}�����ֹ����
 *
 */
function brushNewsTable(factor_data, extent) {
    d3.selectAll('.brush_price')
        .select('.extent')
        .attr('width', 0);  //����brush�Ŀ����Ϊ0����ȥ��
    d3.selectAll('.brush_keyword')
        .each(function(dd, ii) {
            if(dd.text != factor_data.text) {
                d3.select(this)
                    .select('.extent')
                    .attr('width', 0);  //����brush�Ŀ����Ϊ0����ȥ��
            }
        });
    if(!extent) {
        extent = x_price.domain();
    }
    var type = factor_data.type;
    var dict_factor_data, factor_info, keywords_show;
    if(type == GROUP) {
        dict_factor_data = dict_group_data;
        factor_info = dict_factor_data[factor_data.group];
        keywords_show = factor_data.group;
        //factor_info = dict_factor_data[factor_data.key];
    } else if(type == KEYWORD) {
        dict_factor_data = dict_keyword_data;
        factor_info = dict_factor_data[factor_data.text];
        keywords_show = [factor_data.text];
    } else if(type == BIGRAM) {
        //return; // TODO:bigram��ѡ����
        dict_factor_data = dict_bigram_data;
        factor_info = dict_factor_data[factor_data.text];
        keywords_show = factor_data.text.split(' ');
    }
    var newsList = factor_info.newsList;
    var tmp_news_list = [];
    for(var i in newsList) {
        var news = list_all_news[map_news_id_idx[newsList[i]]];
        if(!news) {
            continue;   //���û�и�����¼��������
        }
        var date = parseDate(news.date);
        if(date>=extent[0] && date<=extent[1]) {
            tmp_news_list.push(news);
        }
    }
    showNewsTable(tmp_news_list, keywords_show, extent[0], extent[1]);
}

/**
 *
 * չ����Ԫ������ͼ
 * @param parameters ����keyword��elem
 *
 */
function expandBigram(parameters) {
    var list_bigram = bigram_info_of_keywords[parameters.keyword];
    var bigrams = list_bigram.slice(0, DEFAULT_EXPAND);
    for(var i in bigrams) {
        var bigram_info = bigrams[i];
        var bigram = bigram_info['bigram'];
        var bigram_str = bigram.replace(',', '').replace(' ', '_');
        d3.select(parameters.elem)
            .attr("xlink:href", "img/sub.png")
            .attr("src", "img/sub.png");
        var div = div_init_keyword
            .append('div')
            .attr('id', "bigram_line_"+bigram_str)
            .attr('class', 'div_keywordLine keyword_line_'+parameters.keyword)
            .style('height', 2*HEIGHT_BIGRAM+'px');
        var bigramDiv = new FactorDiv();
        bigramDiv.div = div[0][0];  //d3->DOM
        bigramDiv.factor_data = bigram_info;
        parameters.factorDiv.addChild(bigramDiv);
        drawFactorLine(bigramDiv, parameters.unit);
    }
}

/**
 *
 * ɾ��һ��������ͼ
 * @param factorDiv Ҫɾ�������أ�FactorDivԪ��
 *
 */
function deleteFactorDiv(factorDiv) {
    factorDiv.removeFromParent();
    reDrawFactorDivs();
}

/**
 *
 * ���»���������ͼ
 *
 */
function reDrawFactorDivs() {
    //�Ȱ���FactorDiv�����ṹ��˳������Div
    var all_new_keywordDiv = NEW_KEYWORD_ROOT.getAllChildArr();
    var all_factorDiv = FACTOR_ROOT.getAllChildArr();
    all_factorDiv = all_new_keywordDiv.concat(all_factorDiv);   //������divƴ������
    var div_init_keyword = $('#div_init_keyword');
    div_init_keyword.children().remove();
    for(var i in all_factorDiv) {
        div_init_keyword.append($(all_factorDiv[i].div));   //$()��dom����ת��jquery����
        drawExpandLine(all_factorDiv[i]);
        d3.select(all_factorDiv[i].div)
            .select('.y_left')
            .select('text').remove();   //��ȥ��֮ǰ��text
        if(all_factorDiv[i].type == GROUP) {
            d3.select(all_factorDiv[i].div)
                .select('.y_left')
                .append("text")
                .attr("class", "axislabel hidden_axislabel")
                .attr("text-anchor", "start")
                .attr("x", -30)
                .attr("y", 15)
                .text(function(d) {
                    switch (which_timeline) {
                        case 0:
                            return 'cor.';
                        case 1:
                            return 'feq';
                    }
                    return '';
                });
        }
        if(all_factorDiv[i].isLastChildOfParent() && !all_factorDiv[i].isNewAdd) {
            addMoreBtn(all_factorDiv[i]);
        }
    }
    spinner_keyword_line.spin();
    //showOrHiddenTimeline();
}

//��չ����
/**
 *
 * ��չ����
 * @param factor_div FactorDiv��ʽ����ǰҪ��չ���ߵ�����
 *
 */
function drawExpandLine(factor_div) {
    //����ɾ�����ظ���İ�ť������һ�������
    d3.select(factor_div.div)
        .select('.btn_more').remove();
    //var group
    var svg = d3.select(factor_div.div)
        .select('svg'); //ѡ�е�ǰ��svg
    svg.selectAll('.expand_line').remove();
    //console.log(svg);
    var type = factor_div.type;
    var index = factor_div.index;
    var len = factor_div.parent.children.length;
    var height_sep = HEIGHT_FACTOR[type];
    if(index==0 && type==GROUP || factor_div.isNewAdd) {
        svg.append('circle')
            .attr({
                cx: X_LINE_GROUP,
                cy: height_sep,
                r: 3,
                fill: 'gray',
                class: 'expand_line'
            });
    }
    //��group���ܵ�չ����(��������ӵĹؼ���,���Ҳ������һ��group���ӽڵ�)
    if(type==GROUP ||(!factor_div.isNewAdd && !factor_div.parent.isNewAdd &&
        !factor_div.getGroupParent().isLastChildOfParent())) {
        svg.append('line')
            .attr({
                x1: X_LINE_GROUP,
                y1: function() {
                    if(type == GROUP && index == 0) {
                        return height_sep;
                    }
                    return 0;
                },
                x2: X_LINE_GROUP,
                y2: function() {
                    if(type==GROUP && index==len-1) {
                        return height_sep;
                    }
                    return height_sep*2;
                },
                class: 'expand_line'
            });
    }

    if(type != GROUP && !factor_div.isNewAdd) {
        if(type==BIGRAM && (factor_div.parent.isNewAdd || factor_div.parent.isLastChildOfParent())) {
            //��bigram�����Ǹ��ڵ�keyword������ӵģ��򲻻�չ����
        } else {
            //��keyword���ܵ�չ����
            //������1.����GROUP 2.KEYWORD���ǲ���isNewAdd 3.BIGRAM���Ǹ��ڵ㲻��isNewAddҲ�������һ��
            svg.append('line')
                .attr({
                    x1: X_LINE_KEYWORD,
                    y1: 0,
                    x2: X_LINE_KEYWORD,
                    y2: function() {
                        if(type==KEYWORD && index==len-1) {
                            return height_sep;
                        }
                        return height_sep*2;
                    },
                    class: 'expand_line'
                });
        }
    }
    if(type == BIGRAM) {
        //��bigram���ܵ�չ����
        svg.append('line')
            .attr({
                x1: X_LINE_BIGRAM,
                y1: 0,
                x2: X_LINE_BIGRAM,
                y2: function() {
                    if(index==len-1) {
                        return height_sep;
                    }
                    return height_sep*2;
                },
                class: 'expand_line'
            });
    }
    //����ߵ������Ӱ�ť
    if(!factor_div.isNewAdd) {
        svg.append('line')
        .attr({
            x1: X_LINE_LEFT[type],
            y1: HEIGHT_FACTOR[type],
            x2: WIDTH_LEFT,
            y2: HEIGHT_FACTOR[type],
            class: 'expand_line'
        });
    } else {
        svg.append('line')
        .attr({
            x1: X_LINE_LEFT[GROUP],
            y1: HEIGHT_FACTOR[KEYWORD],
            x2: WIDTH_LEFT,
            y2: HEIGHT_FACTOR[KEYWORD],
            class: 'expand_line'
        });
    }


    //���չ����չ����
    if(factor_div.children.length > 0) {
        svg.append('line')
            .attr({
                x1: X_EXPAND_LEFT[type],
                y1: height_sep,
                x2: X_EXPAND_LEFT[type],
                y2: height_sep*2,
                class: 'expand_line'
            });
    }

}

/**
 *
 * ���չ�����ఴť
 * @param factor_div ��ǰ����
 *
 */
function addMoreBtn(factor_div) {
    var svg = d3.select(factor_div.div)
        .select('svg'); //ѡ�е�ǰ��svg
    var type = factor_div.type;
    var t_x = X_LINE_GROUP-7, t_y = HEIGHT_GROUP;
    if(type == KEYWORD) {
        t_x = X_LINE_KEYWORD-7;
        t_y = HEIGHT_KEYWORD;
    } else if(type == BIGRAM) {
        t_x = X_LINE_BIGRAM-7;
        t_y = HEIGHT_BIGRAM;
    }
    svg
        .append("g")
        .attr("transform", function() {
            return "translate("+(t_x)+","+(t_y)+")";
        })
        .append("image")
        .attr({
            class: 'btn_more btn',
            title: 'more'
        })
        .on("click", function() {
            addMoreChildFactorDiv(factor_div);
        })
        .attr("xlink:href", function() {
            return "img/more.png";
        })
        .attr("src", function() {
            return "img/more.png";
        });
}

/**
 *
 * չ�������ӽڵ�����
 * @param factor_div ��ǰ����
 *
 */
function addMoreChildFactorDiv(factor_div) {
    d3.select(factor_div.div)
        .select('.btn_more').remove();
    var parentDiv = factor_div.parent;
    var expand_count = parentDiv.expand_count;
    var factor_data = factor_div.factor_data;
    var type = factor_div.type;
    var unit = getUnit();
    if(type == GROUP) {   //�ٶ�չ��3��group div
        var groupsInfo = groups_info_by_date.slice(expand_count, expand_count+DEFAULT_EXPAND);
        var len = groupsInfo.length;
        if(len == 0) {
            //alert('No more!');
        }
        for(var i in groupsInfo) {
            if(i >= DEFAULT_EXPAND) {
                break;
            }
            var div = div_init_keyword
                .append('div')
                .datum(groupsInfo[i])
                .attr('class', 'div_keywordLine')
                .attr('id', function() {
                    return 'group_line_'+ groupsInfo[i]['text'].slice(0,5).join('_');
                })
                .style('height', HEIGHT_GROUP*2+'px');
            //drawFactorLine(div, groupsInfo[i], unit);
            var factorDiv = new FactorDiv();
            factorDiv.div = div[0][0];  //d3->DOM
            factorDiv.factor_data = groupsInfo[i];
            parentDiv.addChild(factorDiv);
            drawFactorLine(factorDiv, unit);
        }
    } else if(type == KEYWORD) {  //�ٶ�չ��3��keyword div
        var group_keywords = parentDiv.factor_data.group;
        var keywords = group_keywords.slice(expand_count, expand_count+DEFAULT_EXPAND);
        if(keywords.length == 0) {
            //alert('No more!');
        }
        for(var i in keywords) {
            var keyword = keywords[i];
            //var div = d3.select('#group_line_'+group_keywords.slice(0,5).join('_'))
            var div = div_init_keyword
                .append('div')
                .attr('id', 'keyword_line_'+keyword)
                    .attr('class', 'div_keywordLine')
                    .style('height', 2*HEIGHT_KEYWORD+'px');
            var factor_keyword_data = dict_keyword_data[keyword];
            //drawFactorLine(div, factor_keyword_data, unit);//���һ�������Ȼ���
            var keywordDiv = new FactorDiv();
            keywordDiv.div = div[0][0]; //d3->DOM
            keywordDiv.factor_data = factor_keyword_data;
            parentDiv.addChild(keywordDiv);
            drawFactorLine(keywordDiv, unit);
        }
    } else if(type == BIGRAM) { //�ٶ�չ��3��bigram
        var keyword = parentDiv.factor_data.keyword;
        var list_bigram = bigram_info_of_keywords[keyword];
        var bigrams = list_bigram.slice(expand_count, expand_count+DEFAULT_EXPAND);
        if(bigrams.length == 0) {
            //alert('No more!');
        }
        for(var i in bigrams) {
            var bigram_info = bigrams[i];
            var bigram = bigram_info['bigram'];
            var bigram_str = bigram.replace(',', '').replace(' ', '_');
            //var div = d3.select('#keyword_line_'+keyword)
            var div = div_init_keyword
                .append('div')
                .attr('id', "bigram_line_"+bigram_str)
                .attr('class', 'div_keywordLine keyword_line_'+keyword)
                .style('height', 2*HEIGHT_BIGRAM+'px');
            //drawFactorLine(div, bigram_info, unit);
            var bigramDiv = new FactorDiv();
            bigramDiv.div = div[0][0];  //d3->DOM
            bigramDiv.factor_data = bigram_info;
            parentDiv.addChild(bigramDiv);
            drawFactorLine(bigramDiv, unit);
        }
    }
    reDrawFactorDivs();
}

/**
 *
 * ����µĹؼ���������ͼ
 * @param keyword Ҫ��ӵ��µĹؼ���
 *
 */
function addNewKeywordDiv(keyword) {
    var keywordInfo = dict_keyword_data[keyword];
    if(!keywordInfo) {
        alert('no keyword "'+keyword+'" !');
        return;
    }
    var div = div_init_keyword
        .append('div')
        .attr('id', 'keyword_line_'+keyword)
            .attr('class', 'div_keywordLine')
            .style('height', 2*HEIGHT_KEYWORD+'px');
    var factor_keyword_data = dict_keyword_data[keyword];
    var unit = getUnit();
    //drawFactorLine(div, factor_keyword_data, unit);//���һ�������Ȼ���
    var keywordDiv = new FactorDiv();
    keywordDiv.div = div[0][0]; //d3->DOM
    keywordDiv.factor_data = factor_keyword_data;
    keywordDiv.isNewAdd = true; //������û�����ӵĹؼ���
    //FACTOR_ROOT.insertChild(keywordDiv);    //TODO: ����ӵ�keyword������ǰ��
    NEW_KEYWORD_ROOT.insertChild(keywordDiv);    //TODO: ����ӵ�keyword������ǰ��
    drawFactorLine(keywordDiv, unit);
    reDrawFactorDivs();
}

/**
 *
 * ���ؼ���������ͼ������һ��λ��
 * @param keyword Ҫ�ƶ��Ĺؼ���
 *
 */
function moveKeywordLineToFirst(keyword) {
     $('#keyword_line_' + keyword).insertBefore($('.div_keywordLine').first());
}

/**
 *
 * ��ÿ��Ĺؼ���������ͼ
 * @param svg_keywordLine_g svgԪ��
 * @param factor_data ��������
 * @param unit ʱ�䵥λ��С
 *
 */
function drawKeywordLineEveryDay(svg_keywordLine_g, factor_data, unit) {

    var type = factor_data.type;
    var lines = []; //�����߶�
    var prev_cross = 0, prev_date = '';

    var data = [];
    var extent = x_price.domain();
    var start_year = extent[0].getFullYear(),
        end_year = extent[1].getFullYear(),
        start_month = extent[0].getMonth(),
        end_month = extent[1].getMonth(),
        start_day = extent[0].getDate(),
        end_day = extent[1].getDate();
    var keyword_count = factor_data.info;    //TODO������ÿ���ؼ��ʵ�������Ϊ�����ֵ���Ϣ��ֵ��Ƶ�ʺ�Ԥ��ֵ�����飡����
    //����ɸѡ����ʱ����֮�ڵ�����
    for(var date=new Date(start_year, start_month, start_day);
            date<=extent[1]; addDate(date, 'd', 1)) {
        var date_format = format_date2(date);
        var obj = {};
        obj['date'] = parseDate(date_format);
        var value = 0;
        if(keyword_count[date_format]) {
            value = keyword_count[date_format][0];  // 0: feq
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
            var value = d3.sum(d, function(dd){return dd['value']});
            return value;
        })
        .map(data);

    var factor_info = {};
    factor_info['type'] = type;
    factor_info[type] = factor_data['text'];  //keyword or bigram, assign
    factor_info['count'] = nest_data;

    for(var date in factor_info.count) {
        var u = 'm';
        if(unit == 'month') {
            u = 'y';
        } else if(unit == 'week') {
            u = 'm';
        } else if(unit == 'day') {
            u = 'w';
        }
        var cross, cross_next;
        var factor;
        if(type==GROUP) {
            factor = factor_data['group'];
        } else {
            factor = factor_data['text'];
        }
        //�����ȥһ��u�����ڵ������
        if(prev_date == date) {
            cross = prev_cross;
            //console.log('equals!');
        } else {
           cross = getUnitPeriodCrossCorrelation(factor, type, format_date2(addDate(parseDate(date), u, -1)), u);
        }
        var date_next = addDate(parseDate(date), unit[0], 1);
        prev_date = format_date2(date_next);
        //console.log(prev_date+" # "+date + " : "+ format_date2(date_next));
        var cross_next = getUnitPeriodCrossCorrelation(factor, type, format_date2(addDate(date_next, u, -1)), u);
        prev_cross = cross_next;    //��¼�ϴμ�������ں������

        var line = [];  //һ���߶�
        var obj = {};
        //obj['date'] = parseDate(date);
        obj['date'] = addDate(parseDate(date), unit[0], -1);
        obj['frequency'] = factor_info.count[date];
        obj['correlation'] = cross;
        var obj_next = {};
        obj_next['date'] = parseDate(date);
        //obj_next['date'] = addDate(parseDate(date), unit[0], 1);
        var value_next = factor_info.count[format_date2(addDate(parseDate(date), unit[0], 1))];
        //var value_next = keywordCount.count[format_date2(obj_next['date'])];
        if(value_next == undefined) {
            value_next = factor_info.count[date];
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

/**
 *
 * ��ͬһ������ؽ�������
 * @param factor_div FactorDivԪ��
 * @param start ��ʼ����
 * @param end ��������
 *
 */
function sortAllLevelFactor(factor_div, start, end) {
    spinner_keyword_line.spin(target_keyword_line);
    var parentDiv = factor_div.parent;
    var level_expand_count = parentDiv.expand_count;
    var type = factor_div.type;
    var text = factor_div.factor_data.text;
    var unit = getUnit();
    var tmp_factors = [];
    if(type == GROUP) { //��group��������
        tmp_factors = groups_info_by_date.concat();
    } else if(type == KEYWORD) {
        var keywords = parentDiv.factor_data.group;
        for(var i in keywords) {
            var keyword = keywords[i];
            var factor_keyword_data = dict_keyword_data[keyword];
            tmp_factors.push(factor_keyword_data);
        }
    } else if(type == BIGRAM) {
        var keyword = parentDiv.factor_data.keyword;
        var bigrams = bigram_info_of_keywords[keyword];
        tmp_factors = bigrams.concat();
    }
    //console.log(tmp_factors.concat());
    tmp_factors.sort(function(a, b) {
        var factor_info_a = a.info;
        var factor_info_b = b.info;
        if(which_sort == 3) {
            var factor_a, factor_b;
            if(type == GROUP) {
                factor_a = a.group;
                factor_b = b.group;
            } else {
                factor_a = a.text;
                factor_b = b.text;
            }
            var unit = getUnit();
            var corr_a = getPeriodCrossCorrelationKeywordPrediction(factor_a, type, start, end, unit);
            var corr_b = getPeriodCrossCorrelationKeywordPrediction(factor_b, type, start, end, unit);
            return corr_b-corr_a;
        }
        var sum_a = 0, sum_b = 0;
        var abs_sum_a= 0, abs_sum_b=0;
        for(var Date in factor_info_a) {
            var date = parseDate(Date);
            if(date>=start && date<=end) {
                sum_a += factor_info_a[Date][1];    //0:freq, 1:weight
                abs_sum_a += Math.abs(factor_info_a[Date][1]);    //0:freq, 1:weight
            }
        }
        for(var Date in factor_info_b) {
            var date = parseDate(Date);
            if(date>=start && date<=end) {
                sum_b += factor_info_b[Date][1];    //0:freq, 1:weight
                abs_sum_b+=Math.abs(factor_info_b[Date][1]);
            }
        }
        if(which_sort == 0) {
            return abs_sum_b-abs_sum_a; //������ֵ���򣬴����ǰ
        } else if(which_sort == 1) {
            return sum_b-sum_a; //�����ǰ�����������
        } else if(which_sort == 2) {
            return sum_a-sum_b; //С����ǰ�������
        }
    });
    //console.log(tmp_factors.concat());
    parentDiv.removeAllChildren();  //ɾ����ǰ�������ӽڵ�
    tmp_factors = tmp_factors.slice(0, level_expand_count); //ѡȡǰn���ӽڵ�
    var exists = false;
    for(var i in tmp_factors) {
        var factor_data = tmp_factors[i];
        if(text == factor_data.text) {  //��������Լ�����ֱ����ӽ�ȥ
            exists = true;
            parentDiv.addChild(factor_div);
        } else {
            var div = div_init_keyword
               .append('div')
                //.attr('id', 'keyword_line_'+keyword)
                .attr('class', 'div_keywordLine')
                .style('height', 2*HEIGHT_FACTOR[type]+'px');
            var keywordDiv = new FactorDiv();
            keywordDiv.div = div[0][0]; //d3->DOM
            keywordDiv.factor_data = factor_data;
            parentDiv.addChild(keywordDiv);
            drawFactorLine(keywordDiv, unit, true); //true: ��Ҫÿ���ػ�
        }
    }
    if(!exists) {   //����������Լ�������Լ����������
        parentDiv.addChild(factor_div);
    }
    reDrawFactorDivs();
}

/**
 *
 * ����Ƴ�����ͼ�Ĳ���
 * @param factor_div FactorDivԪ��
 *
 */
function mouseOutFactorChart(factorDiv) {
    var svg = d3.select(factorDiv.div)
        .select('.svg_keywordLine');
    //���ɾ����ť
    removeClass(svg.select('.delete_icon'), 'show');
    svg.select('.factor_border').remove();
    //����뿪�������keywords map�ĸ���
    clearFilterKeywordsNode();
}

/**
 *
 * ������������ͼ�Ļص�����
 * @param factor_div FactorDivԪ��
 *
 */
function mouseOverFactorChart(factorDiv) {
    var svg = d3.select(factorDiv.div)
        .select('.svg_keywordLine');
    var type = factorDiv.type;
    //���ɾ����ť
    addClass(svg.select('.delete_icon'), 'show');
    d3.selectAll('.factor_border').remove();
    //��ӷ���߿�
    svg.append('rect')
        .attr({
            class: 'factor_border',
            x: WIDTH_LEFT-20,
            y: 0,
            width: x_price.range()[1]+80,
            height: 2*HEIGHT_FACTOR[type],
            stroke: RED,
            fill: 'none'
        });
    var type = factorDiv.type;
    var text = factorDiv.factor_data.text;
    if(type==KEYWORD) {
        filterKeywordsNode([text]);
    } else if(type==GROUP) {
        filterKeywordsNode(text);
    }
}

/**
 *
 * ����������ص�ʱ��ˢ
 */
function clearAllKeywordBrush() {
    d3.selectAll('.brush_keyword')
        .each(function(dd, ii) {
            d3.select(this)
                .select('.extent')
                .attr('width', 0);  //����brush�Ŀ����Ϊ0����ȥ��
        });
}

/**
 *
 * ��ճ�ʼ��������ͼ
 *
 */
function clearInitKeywords() {
    div_init_keyword.selectAll('div').remove();
    div_init_keyword.selectAll('svg').remove();
}

/**
 *
 * ���������������ɼ�֮��������
 * @param factor ����
 * @param type ���ͣ���ΪGROUP��BIGRAM��KEYWORD
 * @param start ��ʼ����
 * @param unit �����ʱ�䵥Ԫ��С
 *
 */
function getUnitPeriodCrossCorrelation(factor, type, start, unit) {

    var start_date = parseDate(start);
    var end_date = parseDate(start);
    end_date = addDate(end_date, unit, 1);

    return getPeriodCrossCorrelationKeywordPrediction(factor, type, start_date, end_date, unit);
}

/**
 *
 * ���������������ɼ�֮��������
 * @param factor ����
 * @param type ���ͣ���ΪGROUP��BIGRAM��KEYWORD
 * @param start_date ��ʼ����
 * @param end_date ��������
 * @param unit �����ʱ�䵥Ԫ��С
 *
 */
function getPeriodCrossCorrelationKeywordPrediction(factor, type, start_date, end_date, unit) {

    var dict_factor_data;
    if(type == GROUP) {
        dict_factor_data = dict_group_data;
    }
    if(type == KEYWORD) {
        dict_factor_data = dict_keyword_data;
    } else if(type == BIGRAM) {
        dict_factor_data = dict_bigram_data;
    }

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
        //if(type==GROUP) {
        //    factor = factor.
        //}
        if(dict_factor_data[factor].info[keyword_date] && dict_stocks_data[date]) {
            var idx = 0;
            if(which_histogram == 0) {
                idx = 1;    // weight
            } else {
                idx = 0;    //frequency
            }
            arr_keyword_predicted.push(dict_factor_data[factor].info[keyword_date][idx]);//0:frequency��1��prediction, 2:keyword weight

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