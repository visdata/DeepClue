/**
 * Created by WL on 2016/3/1.
 */

var svg_change_spectrum = svg_price.append('g')
        .attr('index', 2)
        .attr('class', 'svg_g')
        .attr('transform', 'translate('+tranlate_x+', '+0+')');
var RED = 'red', GREEN = 'green', BLUE = 'blue';
var height_cell = 10, width_cell = 1;
var ACTUAL='actual',PREDICTION = 'predicted', ERROR = 'error', ERROR_RATE = 'error rate',
    VOLUME = 'volume', VARIANCE = 'variance', OFF='off', PREDICTION_TEXT='pred(text)';   //ɫ��ͼ��ʾ�ĸ�
var which_to_show = PREDICTION;  // prediction
var which_to_show_double;  //���µ���״ͼ

var MAX_BAR_WIDTH = 15; //�������������
var MAX_NUM = 2e10, MIN_NUM = -2e10; //���ֵ����Сֵ�����ڱȽ�

var reds   = ['#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15'];
var greens = ['#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c'];
var blues  = ['#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];

var scale_height_cell = d3.scale.linear().range([10, 30]);

/*
* �����ק����
* @param svg Ҫ��ӵ�svgԪ��
* @param listener ����������
 */
function addDragListener(svg, listener) {
    var drag = d3.behavior.drag()
        .on('drag', function() {
            var dx = d3.event.dx;
            var dy = d3.event.dy;
            listener(dx, dy);
        });
    svg.call(drag);
    //d3.selectAll('.double_spectrum')
    //    .selectAll('rect')
    //    .call(drag);
}

/*
* ��ק�ڶ���ɫ��ͼ
* @param deltaX ��ק�ĺ���ƫ����
* @param deltaY ��ק������ƫ����
 */
function dragDoubleSpectrum(deltaX, deltaY) {
     d3.selectAll('.double_spectrum')
        .attr('transform', function() {
            var before_transform = d3.select(this).attr('transform');
            var now_transform = "translate(0, "+deltaY+")";
            if(before_transform) {
                now_transform = before_transform + " " + now_transform;
            }
            return now_transform;
        });
}

/*
* ��ɫ��ͼ
 */
function drawSpectrum() {

    var flag_double_up_down = false;

    which_to_show = spectrums[which_spectrum];
    how_to_show = measures[which_measure];
    var flag_double_spectrum = false;
    var id = 'price', strokeWidth=3;
    if(arguments.length > 0) {  //��double spectrum
        flag_double_spectrum = true;
        id = 'double';
        strokeWidth=2;
        svg_change_spectrum = svg_double_spectrum;
        which_to_show = which_double_spectrum1;
        if(arguments[0] == 2) {
            flag_double_up_down = true;
            which_to_show_double = which_double_spectrum2;
        } else if(arguments[0] == 0) {
            delete_spectrum(svg_change_spectrum);
            svg_change_spectrum.select('#xAxis_double').remove();
            return;
        }
    } else {
        svg_change_spectrum = svg_price_g;
        if(which_to_show == OFF) {
            //ɾ��ɫ��
            delete_spectrum(svg_change_spectrum);
            return;
        }
    }
    //��ɾ����һ��ɫ�ף��ٻ�ɫ��
    delete_spectrum(svg_change_spectrum);
    var extent = x_price.domain();
    var start_year = extent[0].getFullYear(),
        end_year = extent[1].getFullYear(),
        start_month = extent[0].getMonth(),
        end_month = extent[1].getMonth();

    var unit = "";
    //�ж�ʱ�����Ƕ��٣�ȷ������ʱ�䵥Ԫ, ʹ�ø�����60~200֮��
    if(end_year - start_year > 3) {
        unit = "month";
    } else if(end_year - start_year > 1 || (end_year-start_year==1)&&(end_month+12-start_month>=12)) {
        unit = 'week';
    } else {
        unit = "day";
    }
    drawSpectrumAdaptively(unit, svg_change_spectrum, flag_double_spectrum); //����unit����Ӧ�Ļ�ɫ��ͼ
    addMouseOver(svg_change_spectrum);
    if(flag_double_up_down) {
        drawDownSpectrumAdaptively(unit, svg_change_spectrum, flag_double_spectrum);
        d3.select('#xAxis_'+id)
            .select('.domain')
            .style('stroke-width', strokeWidth+'px');
    } else {
        d3.select('#xAxis_'+id)
            .select('.domain')
            .style('stroke-width', strokeWidth+'px');
    }
}

/*
* ɾ��ɫ��ͼ
* @param svg Ҫɾ����ɫ��ͼ���ڵ�svgԪ��
 */
function delete_spectrum(svg) {
    svg.selectAll(".spectrum").remove();
    svg.selectAll('.y_right').remove();
}

/*
* ���������
* @param svg_g Ҫ��ӵ�svgԪ��
 */
function addMouseOver(svg_g) {
    svg_g
        .selectAll('.unit')
        .on('mouseenter', function(d) {
            d3.select(this)
                .style('cursor', 'default');
        });
}

/*
* ����Ӧ�Ļ�ɫ��ͼ
* @param unit ʱ�䵥Ԫ��С
* @param svg_change_spectrum ɫ��ͼ���ڵ�svgԪ��
* @param flag_double_spectrum �Ƿ��ǵڶ���ɫ��ͼ
 */
function drawSpectrumAdaptively(unit, svg_change_spectrum, flag_double_spectrum) {
    var model_name = model_names[which_model];
    var extent = x_price.domain();
    var start_date = extent[0],
        end_date   = extent[1];

    var units = [];   //��¼ÿ��ʱ�䵥Ԫ����Ϣ���ǵ���Ϣ���߽�������Ϣ��
    coherence_all_info = {};

    var arr_data = [];
    var max_value = MIN_NUM, min_value = MAX_NUM;

    var max_date_has_data = start_date;  //�����ݵ��������
    //1.ɸѡ��Ԥ��ֵ������
    stocks_data.forEach(function(d) {
        var value;
        if((which_to_show == VOLUME)) {
            value = d.volume;
        } else {
            value = d['pred_change_'+model_name];
        }
        if(d.date>=start_date && d.date<=end_date) {
            if(value != undefined) {  //��Ԥ��ֵ
                arr_data.push(d);
                if(d.date > max_date_has_data) {
                    max_date_has_data = d.date;
                }
            }
        }
    });

    //2.��unit�����ܵ�Ԥ���ǵ������Լ����
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
            var result = getRollupValueByType(d, which_to_show);
            var value = result[0];
            max_value = Math.max(result[1], max_value);
            return value;
        })
        .map(arr_data);

    var end_year = max_date_has_data.getFullYear(), //�����ݵ����һ��
        end_month = max_date_has_data.getMonth() + 1;       //TODO:Ϊ�˵�һ�������һ����������ʱ����

    //3.���ֺ�������ݴ�������units
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
            obj.value = nest_data[key];
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
            if(new Date(year, month-1, 1).getDay() != 0) {    //��ǰ�µĵ�һ�첻�����գ���ǰ�µ�ÿһ�ܶ�Ҫ��һ
                w -= 1;
            }
            obj.date = year+'/'+month+' week '+w;
            obj.value = nest_data[key];
        } else if(unit == 'month') {
            var date = parseDate(key+'-'+1);
            obj.start_date = date;
            var year = date.getFullYear();
            var month = date.getMonth()+1;
            var day = getDaysOfMonth(year, month);
            var end = new Date(year, month-1, day);
            obj.end_date = end;
            obj.date = year+'/'+month;
            obj.value = nest_data[key];
        }
        units.push(obj);
        coherence_all_info[obj.date] = obj.value>=0;
    }

    //console.log(max_value);
    y_right.domain([0, max_value]);
    scale_height_cell.domain([0, max_value]);
    //4.����units���л�ͼ
    svg_change_spectrum
        .append('g')
        .attr('class', function() {
            if(flag_double_spectrum) {
                return 'spectrum double_spectrum';
            }
            return 'spectrum';
        })
        .selectAll('rect')
        .data(units)
        .enter()
        .append('rect')
        .attr('class', 'unit')
        .attr('x', function (d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            var width = Math.min(en-st, MAX_BAR_WIDTH);
            return st-width/2;  //������ʼ��������
            //return st;  //������ʼ����
            //return st-(en-st)/2; //��Ϊ����ʼ���ڵ��м�

            //return x_price(d.start_date);//��Ϊ����ʼ���ڵ��м�
        })
        .attr('y', function(d) {
            //var h = scale_height_cell(Math.abs(d.value));
            var h = y_right(Math.abs(d.value));
            h = max_y_right-adjustSmallBarHeight(max_y_right-h);
            var y = h+delta;
            if(!flag_double_spectrum) {
                y += 0.5*height_price;  // double spectrum���ϰ벿��
            }
            //var y =
            return y;
        })
        .attr('width', function(d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            return Math.min(en-st, MAX_BAR_WIDTH);
            //return en-st;
        })
        .attr('height', function(d) {
            //var h = scale_height_cell(Math.abs(d.value));
            var h = y_right(Math.abs(d.value));
            h = adjustSmallBarHeight(max_y_right-h);
            //return h;
            return h;
        })
        .attr('fill', function(d) {
            if(which_to_show == VOLUME || which_to_show == VARIANCE) {
                return BLUE;
            }
            var fill = RED;
            if(d.value >= 0) {
                fill = GREEN;
            }
            return fill;
        })
        .append('title')
        .html(function (d) {
            if(which_to_show == VOLUME) {
                return 'Date: ' + d.date + "<br>" +
                    'Volume: ' + d.value.toFixed(2) + ' Million';
            } else if(which_to_show == VARIANCE) {
                return 'Date: ' + d.date + "<br>" +
                    'Variance: ' + d.value.toFixed(2);
            }
            return d.date + " : " + d.value.toFixed(2);
                //+"<br>actual change: "+();
        });

    //���ұߵ�����y��
    var y_axis;
    var translate_y = delta;
    if(!flag_double_spectrum) {
        translate_y += 0.5*height_focus;
    }

    y_axis = svg_change_spectrum.append("g")
        .attr("class", function() {
            var cls = "y_right axis measure";
            if(flag_double_spectrum) {
                return cls + " double_spectrum";
            }
            return cls;
        })
        .attr("transform", "translate(" + (x_price.range()[1]+5) + ", "+ (translate_y) +")")
        .call(yAxis_right);

    y_axis
        .append("text")
        .text(function() {
            if(which_to_show == VOLUME) {
                return which_to_show + " (M)";
            }
            return which_to_show + " ($)";
        })
        .attr("class", "measure_label")
        .attr("text-anchor", "start")
        .attr("x", function() {
            //var a=-25;
            var box = this.getBBox();
            var text_width = box.width;
            if(which_to_show == PREDICTION) {
                return -text_width/2-11;
            }
            return (-text_width)/2;
        })
        .attr("y", -10)
        .attr("transform", "");

    if(flag_double_spectrum) {  //Ϊdouble spectrum���ʱ����
        svg_change_spectrum.select('#xAxis_double').remove();
        var xAxis_double = svg_change_spectrum.append("g")
            .attr("class", "x axis double_spectrum")
            .attr('id', 'xAxis_double')
            .attr("transform", "translate(0, " + (max_y_right+translate_y) + ")")
            .call(xAxis_double_spectrum);
        xAxis_double
            .append("text")
            .attr("class", "axislabel")
            .attr("text-anchor", "start")
            .attr("x", width-80)
            .attr("y", 20)
            .text("time");
        var drag_svg = svg_change_spectrum
            .append('rect')
            .attr({
                width: width,
                height: 20,
                class: "double_spectrum",
                opacity: 0,
                id: "drag_svg",
                transform: "translate(0, " + (max_y_right+translate_y-10) + ")"
            });
        addDragListener(xAxis_double, dragDoubleSpectrum);
        addDragListener(drag_svg, dragDoubleSpectrum);
    }
}
//��������·����ı�Ԥ�����״ͼ
/*
* ����Ӧ�Ļ�ɫ��ͼ
* @param unit ʱ�䵥Ԫ��С
* @param svg_change_spectrum ɫ��ͼ���ڵ�svgԪ��
* @param flag_double_spectrum �Ƿ��ǵڶ���ɫ��ͼ
 */
function drawDownSpectrumAdaptively(unit, svg_change_spectrum, flag_double_spectrum) {
    var model_name = model_names[which_model];
    var extent = x_price.domain();
    var start_date = extent[0],
        end_date   = extent[1];

    var units = [];   //��¼ÿ��ʱ�䵥Ԫ����Ϣ���ǵ���Ϣ���߽�������Ϣ��

    var arr_data = [];
    var max_value = MIN_NUM, min_value = MAX_NUM;

    var max_date_has_data = start_date;  //�����ݵ��������
    //1.ɸѡ��Ԥ��ֵ������
    stocks_data.forEach(function(d) {
        var value;
        if((which_to_show_double == VOLUME)) {
            value = d.volume;
        } else {
            value = d['pred_change_'+model_name];
        }
        if(d.date>=start_date && d.date<=end_date) {
            if(value != undefined) {  //��Ԥ��ֵ
                arr_data.push(d);
                if(d.date > max_date_has_data) {
                    max_date_has_data = d.date;
                }
            }
        }
    });

    //2.��unit�����ܵ�Ԥ���ǵ������Լ����
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

            var result = getRollupValueByType(d, which_to_show_double);
            var value = result[0];
            max_value = Math.max(result[1], max_value);
            return value;
        })
        .map(arr_data);

    var end_year = max_date_has_data.getFullYear(), //�����ݵ����һ��
        end_month = max_date_has_data.getMonth() + 1;       //TODO:Ϊ�˵�һ�������һ����������ʱ����

    //3.���ֺ�������ݴ�������units
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
            obj.value = nest_data[key];
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
            if(new Date(year, month-1, 1).getDay() != 0) {    //��ǰ�µĵ�һ�첻�����գ���ǰ�µ�ÿһ�ܶ�Ҫ��һ
                w -= 1;
            }
            obj.date = year+'/'+month+' week '+w;
            obj.value = nest_data[key];
        } else if(unit == 'month') {
            var date = parseDate(key+'-'+1);
            obj.start_date = date;
            var year = date.getFullYear();
            var month = date.getMonth()+1;
            var day = getDaysOfMonth(year, month);
            var end = new Date(year, month-1, day);
            obj.end_date = end;
            obj.date = year+'/'+month;
            obj.value = nest_data[key];
        }
        units.push(obj);
    }

    //console.log(max_value);
    y_right.domain([0, max_value]);
    scale_height_cell.domain([0, max_value]);
    //4.����units���л�ͼ
    svg_change_spectrum
        .append('g')
        .attr('class', 'spectrum double_spectrum')
        .selectAll('rect')
        .data(units)
        .enter()
        .append('rect')
        .attr('class', 'unit')
        .attr('x', function (d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            var width = Math.min(en-st, MAX_BAR_WIDTH);
            return st-width/2;  //������ʼ��������
            //return st-(en-st)/2; //��Ϊ����ʼ���ڵ��м�

            //return x_price(d.start_date);//��Ϊ����ʼ���ڵ��м�
        })
        .attr('y', function(d) {
            //var h = y_right(Math.abs(d.value));
            //h = adjustSmallBarHeight(h);
            //var y = h+delta;
            //if(!flag_double_spectrum) {
            //    y += 0.5*height_price;  // double spectrum���ϰ벿��
            //}
            var y = height_price-delta;
            //if(flag_double_spectrum) {
                y -= 0.5*height_price;  //���м�λ��
            //}
            y+=2;   //������һ�㣬�ֿܷ�������״ͼ
            return y;
        })
        .attr('width', function(d) {
            var st = x_price(d.start_date);
            var en = x_price(d.end_date);
            return Math.min(en-st, MAX_BAR_WIDTH);
            //return en-st;
        })
        .attr('height', function(d) {
            //var h = scale_height_cell(Math.abs(d.value));
            var h = y_right(Math.abs(d.value));
            h = adjustSmallBarHeight(max_y_right-h);
            return h;
            //var h = y_right(Math.abs(d.value));
            //h = adjustSmallBarHeight(h);
            //return max_y_right-h;
        })
        .attr('fill', function(d) {
            var fill = RED;
            if(d.value >= 0) {
                fill = GREEN;
            }
            return fill;
        })
        .append('title')
        .html(function (d) {
            return d.date + " : " + d.value.toFixed(2);
                //+"<br>actual change: "+();
        });

    ////���ұߵ�����y��
    //var y_axis;
    //var translate_y = delta;
    //if(!flag_double_spectrum) {
    //    translate_y += 0.5*height_focus;
    //}
    //svg_change_spectrum.selectAll('.y_right').remove();
    //y_axis = svg_change_spectrum.append("g")
    //    .attr("class", "y_right axis measure")
    //    .attr("transform", "translate(" + (x_price.range()[1]+5) + ", "+ (translate_y) +")")
    //    .call(yAxis_right);
    //
    //y_axis
    //    .append("text")
    //    .text(which_to_show)
    //    .attr("class", "measure_label")
    //    .attr("text-anchor", "start")
    //    .attr("x", function() {
    //        //var a=-25;
    //        var box = this.getBBox();
    //        var text_width = box.width;
    //        return (-text_width)/2;
    //    })
    //    .attr("y", -10)
    //    .attr("transform", "")
    //    .text(which_to_show);
    //
    //if(flag_double_spectrum) {  //Ϊdouble spectrum���ʱ����
    //    svg_change_spectrum.select('#xAxis_double').remove();
    //    svg_change_spectrum.append("g")
    //        .attr("class", "x axis")
    //        .attr('id', 'xAxis_double')
    //        .attr("transform", "translate(0, " + (max_y_right+translate_y) + ")")
    //        .call(xAxis_double_spectrum)
    //        .append("text")
    //        .attr("class", "axislabel")
    //        .attr("text-anchor", "start")
    //        .attr("x", width-80)
    //        .attr("y", 20)
    //        .text("time");
    //}
}

/*
* �������ͻ�þۼ�ֵ
* @param d ԭʼ����
* @param which_type �ۼ������ͣ���Ԥ��ֵ��ʵ��ֵ�����
* @return �ۼ�ֵ�����ֵ
 */
function getRollupValueByType(d, which_type) {
    var max_value = MIN_NUM, min_value = MAX_NUM;
    var model_name = model_names[which_model];
    var sum_pred_text = d3.sum(d, function(dd){return dd['predict_text_'+model_name];});
    var sum_pred_change = d3.sum(d, function(dd){return dd['pred_change_'+model_name];});
    var sum_actual_change = d3.sum(d, function(dd){return dd['actual_change'];});
    var value;
    switch(which_type) {
        case PREDICTION:
            value = sum_pred_change;
            break;
        case ACTUAL:
            value = sum_actual_change;
            break;
        case ERROR:
            value = sum_pred_change - sum_actual_change;
            break;
        case PREDICTION_TEXT:
            value = sum_pred_text;
            break;
        default :
            alert("error in selection!");
    }
    var abs_value = Math.abs(value);
    max_value = Math.max(max_value, abs_value);
    var tmp = Math.max(Math.abs(sum_pred_change), Math.abs(sum_actual_change));
    tmp = Math.max(tmp, Math.abs(sum_pred_change-sum_actual_change));
    max_value = Math.max(max_value, tmp);
    min_value = Math.min(min_value, abs_value);
    //if(sum_pred_change<0&&which_to_show!=ACTUAL) {
    //    value = -value;     //value����Ԥ����ǵ���Ϣ���ǻ��ǵ���
    //}
    return [value, max_value];
}