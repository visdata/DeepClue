/**
 * Created by WL on 2015/10/9.
 */

var _mouse_x, _mouse_y;
var dict_all_keyword_info = {};
$(document).ready(function() {
    //�ĵ��������
    $(document).mousemove(function($e){
        _mouse_x = $e.pageX;
        _mouse_y = $e.pageY;
    });

    if($(window).width() > 1500) {
        var title = 'DeepClue: Visual Interpretation of Text-based Deep Stock Prediction - ';
        $('#title').text(title);
    }

    var scroll_timer;
    $(document).scroll(function() {
        //clearInterval(scroll_timer);
        //scroll_timer = setInterval(function() {
        clearTimeout(scroll_timer);
        scroll_timer = setTimeout(function() {
            $('#div_factor_title')
                .animate({'margin-top': $(document).scrollTop()}, 500);
        }, 500);
        //$('#div_factor_title')
        //    .css('margin-top', $(document).scrollTop());
    });

    //d3.json('../data/result_AAPL.json', function(error, data) {
    //d3.json('../data/result_GOOG.json', function(error, data) {
    //    console.log(data);
    //    dict_all_keyword_info = eval(data);
    //});
});

var spinner_news_list = new Spinner(opts);
var target_news_list = document.getElementById("spinner_news_list");
var spinner_keyword_line = new Spinner(opts);
var target_keyword_line = document.getElementById("spinner_keyword_line");
var spinner_contour = new Spinner(opts);
var target_contour = document.getElementById("spinner_contour");


//var parseDate = d3.time.format("%b %Y").parse;
var parseDate = d3.time.format("%Y-%m-%d").parse;
var parseDate2 = d3.time.format("%Y/%m/%d").parse;
var format_date = d3.time.format('%Y/%m/%d');
var format_date2 = d3.time.format('%Y-%m-%d');
var format_date3 = d3.time.format('%y/%m/%d');

//��ʼ������
var first_day, last_day;   //��¼�ɼ۵�һ������һ��
var prices = ["adjclose", "open", "close", "high", "low"];
//var model_names = ['news_word', 'news_sentiment', 'news_event',
//                    'twitter_word', 'twitter_sentiment', 'twitter_event'];
var model_names = ['news_word', 'twitter_word'];

var contour_types = ['cluster', 'point'], which_contour = 0;
var factor_types = ['count ratio', 'prediction ratio'], which_factor = 0;
var keyword_types = ['all', 'rise', 'down'], which_keyword_type = 0;

//var spectrums = [PREDICTION, ACTUAL, ERROR, ERROR_RATE, VOLUME], which_spectrum = 0,
var spectrums = [PREDICTION, ACTUAL, ERROR, PREDICTION_TEXT, OFF], which_spectrum = 0,
    double_spectrums = [PREDICTION, ACTUAL, ERROR, PREDICTION_TEXT], which_double_spectrum1 = PREDICTION,
    which_double_spectrum2 = PREDICTION_TEXT, measures = ['height', 'color'], which_measure = 0;
var which_contour_type = 'all';
var change_types = ['actual', 'percentage'], which_change = 0;
var correlation_types = ['actual', 'prediction', 'risk'], which_correlation = 0;
var timeline_types = ['correlation', 'frequency', 'hidden'], which_timeline = 0, last_timeline_type=0;
var coherence_types = ['all', 'same', 'differ'], which_coherence = 0;
var coherence_all_info = {};    //��¼�ܵ�ÿ���׶ε��ǻ��ǵ�������factorɸѡ
var window_types = ['adaptive', 'by week', 'by month', 'by year', 'none'], which_window = 0;
var sort_types = ['relevance', 'positive', 'negative', 'correlation'], which_sort = 0;
var histogram_types = ['both', 'only pred', 'only #docs', 'none'], which_histogram = 0;
var POS_types = ['noun', 'verb', 'adj', 'other'], selected_POS=[0,1,2];

var symbols, stocks_data=[],
    news_show=[],
    news_sentiment, //ֻ�ǹ�˾ÿ�ո������ֵ��������
    news_keywords = null,  //��ѯ�Ĺؼ��ֵ�������Ԥ��ֵ����Ϣ
    mode_keywords = false;  //�Ƿ�����ʾ�ؼ����������������������ŵ����������Ϣ
var which_stock = 0, which_price = 2, which_model = 0, justSwitched=true;//��¼�ϴε�stock
var selected_models = [0], model_legend_colors = ['green', 'red', 'black'];
var companies = [];
var pre_stock = -1;
var trained_symbols = ['AAPL', 'T', 'GM', 'WMT', 'XOM', 'BA', 'BAC', 'GOOG'];//TODO:��ʱȥ��, 'GSPC'
var POINT = 2;  //С����λ��
var isInitInterface = true;
var flag_double_histogram = false;  //�Ƿ�����spectrum histogram
var vue_checkbox_histogram; //histogram��vue����

var stock_info_by_date = {};

var groups_info_by_date;   //�����ڵ�ÿ���ؼ��ʾ������Ϣinfo
var groups_sort_and_keyword_position;   //���������������͹ؼ��ʵ�contour map����
var keywords_count_by_date, keywords_news_by_date;  //�����ڵĹؼ���Ƶ���Լ�����
var bigram_info_of_keywords = {};   //�����ڵ�ÿ���ؼ��ʵ�bigram��Ϣ
var dict_stocks_data, dict_keyword_data;  //���ֵ���ʽ����ɼ����ݺ͹ؼ������ݣ��Ա������ض�
var dict_bigram_data;  //���ֵ���ʽ����bigram�����ݣ��Ա������ض�
var dict_group_data;    //���ֵ���ʽ����group��Ϣ��
var list_all_keywords;  //�������йؼ��ʣ�����������ʾʱ��

var list_all_news, list_selected_news;      //��������title���б��Լ���ѡ�е��б�
var list_selected_keywords, selected_start_date, selected_end_date;
var map_news_id_idx = {};    //��������title�е�id��index��ӳ���ϵ���Ա�ɸѡÿ���ؼ��ʵ�title

//����d3Ԫ��

d3.json("data/SP500_info.json", function(error, data) {
    data = eval('(' + data + ')');
    for (var i=0; i<data.length; i++) {
        var company = [];
        company['symbol'] = data[i][0];
        company['name'] = data[i][1]["name"];
        company['sector'] = data[i][1]["sector"];
        if(hasElemInArr(trained_symbols, company['symbol'])) {
            companies.unshift(company);     //������ͷ������Ԫ��
        } else {
            companies.push(company);
        }
    }
    for(var i=0; i<companies.length; i++) {
        if(companies[i]['symbol'] == 'AAPL') {
        //if(companies[i]['symbol'] == 'GSPC') {
            which_stock = i;
            break;
        }
    }

    d3.select("#symbol")
        .attr("onchange", "changeBox(this)")
        .selectAll(".option")
        .data(companies)
        .enter()
        .append("option")
        .attr("value", function(d, i) {
            if(i==which_stock) {
                d3.select(this)
                    .attr("selected", "selected");
            }
            if(i >= trained_symbols.length) {
                d3.select(this)
                    .attr("disabled", "");
            }
            return "symbol#"+i;
        })
        .html(function(d) {
            var symbol = d['name'];
            if(symbol.length > 20) {
                symbol = symbol.substr(0, 17)+'...';
            }
            return symbol;
        });

    //d3.select("#select_contour")
    //    .attr("onchange", "changeBox(this)")
    //    .selectAll(".option")
    //    .data(contour_types)
    //    .enter()
    //    .append("option")
    //    .attr("value", function(d, i) {return "contours#"+i;})
    //    .html(function(d) {return d;});

    //d3.select("#select_spectrum")
    //    .attr("onchange", "changeBox(this)")
    //    .selectAll(".option")
    //    .data(spectrums)
    //    .enter()
    //    .append("option")
    //    .attr("value", function(d, i) {return "spectrums#"+i;})
    //    .html(function(d) {return d;});

    vue_checkbox_histogram = new Vue({
        el: "#doubleSpectrum",
        data: function() {
            var arr = [];
            for(var i in double_spectrums) {
                var option = {};
                option.text = double_spectrums[i];
                option.index = i;   //���ڵڼ���λ��
                if(i == 0) {
                    option.checked = true;
                } else {
                    option.checked = false;
                }
                arr.push(option);
            }
            return {
                selectedCount: 1,   //ѡ�еĸ���
                showDoubleSpectrum: false,
                options: arr
            };
        },
        methods: {
            changeStatus: function(option) {
                if(option.checked) {    //��Ϊѡ��
                    if(this.selectedCount == 2) {
                        option.checked = false;
                        return;
                    } else {
                        var idx = this.selectedCount;   //�͵ڼ���λ�ý���
                        this.options[idx].index = option.index;
                        option.index = idx;
                        this.selectedCount++;
                    }
                } else {    //��Ϊ��ѡ��
                    if(this.selectedCount==2 && option.index == 0) { //�͵ڶ�������λ��
                        this.options[1].index = 0;
                        option.index = 1;
                    }
                    this.selectedCount--;
                }
                this.options.sort(function (a, b) {
                    return a.index - b.index;
                });
                which_double_spectrum1 = this.options[0].text;
                which_double_spectrum2 = this.options[1].text;
                drawSpectrum(this.selectedCount); //draw double spectrum
            }
        }
    });
    //addOptionOnDiv('select_doubleSpectrum', double_spectrums, 'checkbox');
    addOptionOnDiv('select_spectrum', spectrums, 'radio');

    addCheckBoxOptionDiv('select_POS', POS_types, selected_POS);

    d3.select("#select_measure")
        .attr("onchange", "changeBox(this)")
        .selectAll(".option")
        .data(measures)
        .enter()
        .append("option")
        .attr("value", function(d, i) {return "measures#"+i;})
        .html(function(d) {return d;});

    d3.select("#select_factor")
        .attr("onchange", "changeBox(this)")
        .selectAll(".option")
        .data(factor_types)
        .enter()
        .append("option")
        .attr("value", function(d, i) {return "factors#"+i;})
        .html(function(d) {return d;});

    d3.select("#select_keyword")
        .attr("onchange", "changeBox(this)")
        .selectAll(".option")
        .data(keyword_types)
        .enter()
        .append("option")
        .attr("value", function(d, i) {return "keywords#"+i;})
        .html(function(d) {
            if(d == 'down') {
                return 'fall';
            }
            return d;
        });

    d3.select("#select_change")
        .attr("onchange", "changeBox(this)")
        .selectAll(".option")
        .data(change_types)
        .enter()
        .append("option")
        .attr("value", function(d, i) {return "changes#"+i;})
        .html(function(d) {return d;});

    d3.select('#select_timeline')
        .attr('onchange', 'changeBox(this)')
        .selectAll('.option')
        .data(timeline_types)
        .enter()
        .append('option')
        .attr('value', function(d, i) {return 'timelines#'+i;})
        .html(function(d) {return d;});

    d3.select('#select_coherence')
        .attr('onchange', 'changeBox(this)')
        .selectAll('.option')
        .data(coherence_types)
        .enter()
        .append('option')
        .attr('value', function(d, i) {return 'coherences#'+i;})
        .html(function(d) {return d;});

    d3.select('#select_histogram')
        .attr('onchange', 'changeBox(this)')
        .selectAll('.option')
        .data(histogram_types)
        .enter()
        .append('option')
        .attr('value', function(d, i) {return 'histograms#'+i;})
        .html(function(d) {return d;});

    d3.select('#select_window')
        .attr('onchange', 'changeBox(this)')
        .selectAll('.option')
        .data(window_types)
        .enter()
        .append('option')
        .attr('value', function(d, i) {return 'windows#'+i;})
        .html(function(d) {return d;});

    d3.select('#select_correlation')
        .attr('onchange', 'changeBox(this)')
        .selectAll('.option')
        .data(correlation_types)
        .enter()
        .append('option')
        .attr('value', function(d, i) {return 'correlations#'+i;})
        .html(function(d) {return d;});

    d3.select('#select_sort')
        .attr('onchange', 'changeBox(this)')
        .selectAll('.option')
        .data(sort_types)
        .enter()
        .append('option')
        .attr('value', function(d, i) {return 'sorts#'+i;})
        .html(function(d) {return d;});

    d3.select('#select_delay')
        .attr('onchange', 'changeBox(this)')
        .selectAll('.option')
        .data(["-1 day", "none", "+1 day"])
        .enter()
        .append('option')
        .attr('value', function(d, i) {
            if(d == 'none') {
                d3.select(this).attr('selected', 'selected');
            }
            return 'delays#'+i;
        })
        .html(function(d) {return d;});

    $('#btn_double').click(function() {
        //$('#doubleSpectrum').toggleClass('hidden');
        vue_checkbox_histogram.showDoubleSpectrum = !vue_checkbox_histogram.showDoubleSpectrum;
        flag_double_histogram = !flag_double_histogram;
        if(vue_checkbox_histogram.showDoubleSpectrum) {
            $(this).attr('src', 'img/sub.png');
            create_svg_double_spectrum();
            drawSpectrum(vue_checkbox_histogram.selectedCount); //��double spectrum
            $('#div_double_option')
                .insertBefore($('#select_spectrum'));
        } else {
            $(this).attr('src', 'img/add.png');
            svg_double_spectrum.remove();
            $('#div_double_option')
                .insertAfter($('#select_spectrum'));

        }
    });

    visualize(which_stock, which_price);
});

function visualize(which_stock, which_price) { //visualize(names, i, price)

    stock_info_by_date = {};
    keywords_count_by_date = null;  //ÿ�����¿��ӻ���Ҫ���֮ǰ������

    var data_info = d3.select('#data_info');
    if(which_model == 0) {
        data_info
            .html('News 2006~2015');
    } else if(which_model == 1) {
        data_info
            .html('Twitter 2015/04~2015/11');
    } else {
        data_info
            .html('Reports 2007~2014');
    }
    //�ȵõ��ù�˾��ARCH model��ϵ��
    //var url = "http://"+SERVER+":"+ARCH_PORT+"/getArchModelParams?symbol="+companies[which_stock]["symbol"]+"&p=1&q=0&average=yes";
    //console.log(url);
    //var params = [];
    //$.ajax({
    //    //url: url,
    //    context: document.body,
    //    async: false,   //ͬ��
    //    //async: true,  //�첽
    //    success: function(data){
    //        params = eval(data);
    //    },
    //    error: function(error) {
    //        alert("arch model error!");
    //        console.log(error);
    //    }
    //});
    //var omega = params[1];
    //var alpha = params[2];
    //console.log('omega: '+omega);
    //console.log('alpha: '+alpha);
    var omega= 0, alpha=0;  //ȥ��ARCHģ��

    var this_symbol = companies[which_stock]["symbol"];
    var isPredicted = false;
    var filename = "500Stock_Prices/"+this_symbol+".history.price.csv";
    if(hasElemInArr(trained_symbols, this_symbol)) {
        isPredicted = true;
        filename = "stock_prices_predict/"+this_symbol+".history.price.predict.csv";
    }
    var random = Math.random();
    var fund = 1,   //�ʽ�ģ�⽻�׵�����
        PREDICT_RISE = 0,
        PREDICT_DOWN = 1,
        PREDICT_NONE = 2,   //�ֱ���Ԥ���ǡ�����ǰһ��û��Ԥ����
        predict_state = PREDICT_NONE; //Ԥ�⵱�յ��ǵ�
    d3.csv("../data/"+filename+'?id='+random, function(error, data) {

        var change = 0;
        var news_start_date = "2006-10-20";
        if(which_model == 1) {
            news_start_date = '2015-04-13'; //twitter�����Ǵ�2015-04-13��ʼ��
        }
        var start_id = data.length;
        first_day = parseDate(news_start_date);
        last_day = parseDate2(data[0].Date);
        if(last_day == null) {
            last_day = parseDate(data[0].Date);
        }
        console.log(last_day);
        data.reverse(); //����ʹ�������˳���ǰ�ʱ������
        var last_error = 0; //��¼��һ��������ڼ��㵱ǰ��ķ���
        var max_std = 0, min_std = 100, max_date, min_date;
        var isFirst = true, lastClose;
        var lastDayInfo;
        data.forEach(function(d, i) {
            d.date = parseDate(d.Date);
            if(d.date == null) {
                d.date = parseDate2(d.Date);
            }
            d.Date = format_date2(d.date);
            if(d.date >= parseDate(news_start_date)) {
                if(start_id == data.length) {
                    start_id = i;
                }
                d.open = parseFloat(d.Open);
                d.close = parseFloat(d.Close);
                d.adjclose = parseFloat(d["Adj Close"]);
                d.Close = d.close;
                d.close = d.adjclose;
                d.volume = parseFloat(d.Volume) / 1000000;  //��λ������

                if(isFirst) {
                    lastClose = d.close;
                    isFirst = false;
                    d.adjopen = d.adjclose;
                } else {
                    var diff_close = d.Close-lastDayInfo.Close;
                    var diff_close_open = d.Close- d.open;
                    var diff_adjclose = d.adjclose-lastDayInfo.adjclose;
                    var diff_adj_close_open = diff_close_open*
                        (diff_adjclose/diff_close);
                    //console.log(diff_adj_close_open);
                    d.adjopen = d.adjclose-diff_adj_close_open;
                    //console.log(d.adjopen);
                    if(isNaN(d.adjopen) || d.adjopen === Number.POSITIVE_INFINITY
                        || d.adjopen === Number.NEGATIVE_INFINITY) {
                        d.adjopen = d.adjclose* d.open/ d.Close
                    }
                }

                var ratio = 0.1;
                if(i % 10 == 0) {
                    change = 1+Math.random()*ratio*2-ratio; //-0.1~0.1 + 1
                }
                d.pred_close = d.close*change;

                var upper=1.2, lower=0.8;
                d.upper_close = d.close*upper;
                d.lower_close = d.close*lower;

                if(isPredicted) {
                    var model_name = model_names[which_model];
                    var predict_change = d['predict_'+model_name];
                    //var predict_change = d['predict_news_word'];
                    //var error = d.close - d.open;  //Ԥ����Ϊ�˼�����յķ���
                    var error = d.close - lastClose;  //Ԥ����Ϊ�˼�����յķ���
                    if(predict_change != '') {  //��Ԥ��ֵ
                        error -= predict_change;
                    }
                    //ARCHģ�ͣ�omega + alpha*RESID(-1)^2
                    d['variance'] = omega + alpha*Math.pow(last_error, 2);
                    d['std'] = Math.sqrt(d['variance']);
                    last_error = error;

                    //for(var i=0; i<model_names.length; i++) {
                    //    var model_name = model_names[i];
                    //    var model_name = model_names[which_model];
                    //    var predict_change = d['predict_'+model_name];

                    //�����Ǹ���ǰһ���Ԥ�������㵱�������
                    switch(predict_state) {
                        case PREDICT_NONE:
                            d['fund_'+model_name] = fund;   //û��Ԥ��ֵ�򲻽���
                            break;
                        case PREDICT_RISE:
                            d['fund_'+model_name] = fund*d.adjclose/d.adjopen;
                            //if(d.adjclose > d.adjopen) {
                            //    console.log(true);
                            //} else {
                            //    console.log(false);
                            //}
                            break;
                        case PREDICT_DOWN:
                            d['fund_'+model_name] = fund*d.adjopen/d.adjclose;
                            //if(d.adjclose < d.adjopen) {
                            //    console.log(true);
                            //} else {
                            //    console.log(false);
                            //}
                            break;
                        default:
                            console.log('ERROR IN CALCULATING YIELD!');
                    }
                    //console.log(d.Date);
                    //console.log(fund);
                    //console.log(d['fund_'+model_name]);
                    //console.log("price: "+ d.Close+" " + d.open);
                    //console.log("adj: " + d.adjclose+" " + d.adjopen);
                    fund = d['fund_'+model_name];   //����fundֵ

                    if(predict_change != '') {  //��Ԥ��ֵ
                        predict_change = parseFloat(predict_change);
                        predict_state = predict_change>0 ? PREDICT_RISE : PREDICT_DOWN;

                        d['pred_close_'+model_name] = lastClose+predict_change;
                        d['pred_change_'+model_name] = predict_change;

                        d['predict_text_'+model_name] = parseFloat(d['predict_text_'+model_name]);
                        var bias = d['bias_'+model_name];
                        //var bias = parseFloat(d['bias_'+model_name]);
                        //console.log(d['predict_text_'+model_name]+ ' + ' + bias+' = '+ d['pred_change_'+model_name]);
                        //if(isNaN(d['predict_text_'+model_name])) {
                        //    d['predict_text_'+model_name] = predict_change;
                        //}
                        var upper, lower;
                        if(bias > 0) {
                            upper = d['pred_close_'+model_name];
                            //lower = d['predict_text_'+model_name];
                            lower = d['pred_close_'+model_name]-bias;
                        } else {
                            upper = d['pred_close_'+model_name]-bias;
                            //upper = d['predict_text_'+model_name];
                            lower = d['pred_close_'+model_name];
                        }
                        d['upper_close_'+model_name] = upper;
                        d['lower_close_'+model_name] = lower;

                        //d['upper_close_'+model_name] = d.close+ d.std;
                        //d['lower_close_'+model_name] = d.close- d.std;

                    } else {
                        predict_state = PREDICT_NONE;
                        d['pred_close_'+model_name] = d.close;
                        d['upper_close_'+model_name] = d.close;
                        d['lower_close_'+model_name] = d.close;
                    }
                } else {
                    //for(var i=0; i<model_names.length; i++) {
                    //    var model_name = model_names[i];
                        var model_name = model_names[which_model];
                        d['pred_close_'+model_name] = d.pred_close;
                        //d['pred_change_'+model_name] = d.pred_close- d.open;
                        d['pred_change_'+model_name] = d.pred_close- lastClose;
                        d['upper_close_'+model_name] = d.upper_close;
                        d['lower_close_'+model_name] = d.lower_close;
                    //}
                }

                stock_info_by_date[d.Date] = d;

                d['actual_change'] = d.close - lastClose;  //ʵ�ʱ仯ֵ
                lastClose = d.close;
                lastDayInfo = d;
            }
        });
        stocks_data = data.slice(start_id);

        console.log(stock_info_by_date);

        var extent = d3.extent(stocks_data.map(function(d) { return d.date; }));

        oCalendarEn.ChangePeriod(extent[0].getFullYear(), extent[1].getFullYear());

        dict_stocks_data = getAllStocksDataByDay();

        addSortOption();    //�������б��������ѡ��
        drawStock(stocks_data, which_price, true);
        //showNews(companies[which_stock]["symbol"], which_contour_type);
        //��ȡ����ʾ�ؼ��ֺ�����
        //showRecommendKeywords();
        getAllTitlesAndShow();
        getKeywordGroupInfo();
        showOrHiddenFactorSpectrum();

        //testAnimatedTimeline(300); //test��̬ʱ��ͼ, 300msһ��
    });
}

function addCheckBoxOptionDiv(div_id, options, selected) {
    var div_options = d3.select('#'+div_id)
        .selectAll('.option')
        .data(options)
        .enter()
        .append('div')
        .attr("class", 'option');
    div_options
        .each(function(d, i) {
            var this_option = d3.select(this);
            var label = this_option
                .append('label')
                .attr('class', 'option_label');
            label.append("input")
                .attr('type', 'checkbox')   //��ѡ��
                .attr('value', options[i])
                .attr('name', function() {
                    if($.inArray(i, selected)>=0) {
                        d3.select(this)
                            .attr('checked', '');   //��checked���Լ�ѡ��
                    }
                    return div_id;
                })
                .on('change', function() {
                    //TODO: ��������Դ����
                    changeOption(div_id, i);
                });
            label
                .append('text')
                .style('cursor', 'pointer')
                .text(function () {
                    return d;
                });
        });
}

function addOptionOnDiv(div_id, options, type) {
    var div_options = d3.select('#'+div_id)
        .selectAll('.option')
        .data(options)
        .enter()
        .append('div')
        .attr("class", 'option');
    div_options
        .each(function(d, i) {
            var this_option = d3.select(this);
            var label = this_option
                .append('label')
                .attr('class', 'option_label');
            label.append("input")
                .attr('type', type)  //��ѡ��ť or ��ѡ��ť
                .attr('name', function() {
                    if(i == 0) {
                        d3.select(this)
                            .attr('checked', '');   //��checked���Լ�ѡ��
                    }
                    return div_id;
                })
                .on('change', function() {
                    //TODO: ��������Դ����
                    changeOption(div_id, i, type);
                });
            label
                .append('text')
                .style('cursor', 'pointer')
                .text(function () {
                    return d;
                });
        });
}

function changeOption(div_id, index, type) {
    var which = div_id.split('_')[1];
    if(which == 'spectrum') {
        which_spectrum = index;
        drawSpectrum();
        if(spectrums[which_spectrum] == OFF) {
            hiddenCorrTimeline();
            return;
        }
        drawKeywordLines(); //��Ӧ�������������
        changeCoherence();
    } else if(which == 'histogram') {
        which_histogram = index;
        drawKeywordLines();
    }
    //else if(which == 'doubleSpectrum') {
    //    which_double_spectrum = index;
    //    drawSpectrum(true); //draw double spectrum
    //
    //}
    else if(which == 'POS') { //��ѡ��ѡ�����
        //alert('change!');
        getKeywordGroupInfo();
    }
}

function changeBox(e) {
    removeTimeLine();
    var args = e.value.split("#");
    var index = parseInt(args[1]);
    if(args[0] == "symbol") {
        justSwitched = true;
        which_stock = index;
        spinner.spin(target);
        visualize(which_stock, which_price);
    } else if(args[0] == 'contours') {
        which_contour = index;
        finishLayout();
        //showNews(companies[which_stock]['symbol']);
    } else if(args[0] == 'spectrums') {
        which_spectrum = index;
        drawSpectrum();
        //drawFactorSpectrum();
    } else if(args[0] == 'measures') {
        which_measure = index;
        drawSpectrum();
        //drawFactorSpectrum();
    } else if(args[0] == 'factors') {
        which_factor = index;
        if(mode_keywords) {
            drawKeywordsFlow(news_keywords);
        }
    } else if(args[0] == 'keywords') {
        which_keyword_type = index;
        if(json_keywords != null) {
            showKeywords(json_keywords);
        }
    } else if(args[0] == 'changes') {
        which_change = index;
        zoomed();
    } else if(args[0] == 'timelines') {
        if(which_timeline!=2) {
            last_timeline_type = which_timeline;
        }
        which_timeline = index;
        showOrHiddenTimeline();
    } else if(args[0] == 'coherences') {
        which_coherence = index;
        changeCoherence();
    } else if(args[0] == 'histograms') {
        which_histogram = index;
        showOrHiddenFactorSpectrum();
        //drawKeywordLines();
    } else if(args[0] == 'windows') {
        which_window = index;
        showOrHiddenTimeline();
    } else if(args[0] == 'correlations') {
        which_correlation = index;
        drawKeywordLines();
    } else if(args[0] == 'delays') {
        delay = index-1;
        drawKeywordLines();
    } else if(args[0] == 'sorts') {
        which_sort = index;
        if(which_sort == 3) {
            FACTOR_ROOT.sortByCorrelation();    //�����������
        } else {    //��relevance����
            drawKeywordLines();
        }
    } else {
        //do nothing
    }
}