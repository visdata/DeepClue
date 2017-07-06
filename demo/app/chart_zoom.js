/**
 * Created by WL on 2016/5/26.
 */
//(function() {
var svg_context_zoom_g = svg_context
    .append('g');
var margin_zoom_x = 30, margin_zoom_y = 25;
var start_x = 30, start_y = 5;
var zoom_options = ['1w', '1m', '3m', '6m', '1y', '5y', 'all'];

svg_context_zoom_g
    .selectAll('.show_point')  //显示出来的点
    .data(zoom_options)
    .enter()
    .append('circle')
    .attr('class', function(d, i) {
        return 'zoom_option option'+i;
    })
    .attr('r', 3)
    .attr('cx', function(d, i) {
        if(i == zoom_options.length-1) {
            //最后一个显示在中间
            return start_x + margin_zoom_x;
        }
        return start_x+margin_zoom_x*(i%3);    //一行显示3个
    })
    .attr('cy', function(d, i) {
        return start_y+margin_zoom_y*Math.floor(i/3);
    })
    .attr('fill', 'gray');

svg_context_zoom_g
    .selectAll('.hide_cicle')   //不显示，只用来让用户更好的选择该点
    .data(zoom_options)
    .enter()
    .append('circle')
    .attr('class', function(d, i) {
        return 'zoom_option';
    })
    .attr('r', 8)
    .attr('cx', function(d, i) {
        if(i == zoom_options.length-1) {
            //最后一个显示在中间
            return start_x + margin_zoom_x;
        }
        //一行显示3个
        return start_x+margin_zoom_x*(i%3);
    })
    .attr('cy', function(d, i) {
        return start_y+margin_zoom_y*Math.floor(i/3);
    })
    .attr('fill-opacity', 0);

//添加文字
svg_context_zoom_g
    .selectAll('.option')
    .data(zoom_options)
    .enter()
    .append('text')
    .attr('class', function(d, i) {
        return 'zoom_option option'+i;
    })
    .attr('x', function(d, i) {
        //一行显示3个
        if(i == zoom_options.length-1) {
            //最后一个显示在中间
            return start_x + margin_zoom_x-8;
        }
        return start_x+margin_zoom_x*(i%3)-8;
    })
    .attr('y', function(d, i) {
        return start_y+15+margin_zoom_y*Math.floor(i/3);
    })
    .attr('fill', 'gray')
    .text(function(d, i) {
        return d;
    });

//添加虚线
svg_context_zoom_g
    .selectAll('path')
    .data(zoom_options)
    .enter()
    .append('path')
    .attr('stroke', 'gray')
    .attr('stroke-dasharray', '4 4')
    .attr('d', function(d, i) {
        var s_x = start_x+5+margin_zoom_x*(i%3),
            s_y = start_y+margin_zoom_y*Math.floor(i/3),
            e_x = start_x-2+margin_zoom_x*(i%3+1),
            e_y = s_y;
        if(i == zoom_options.length-1 || i%3==2) {    //最后一个不需要虚线
            d3.select(this)
                .attr('stroke', 'none');
        }
        var line = 'M'+s_x+' '+s_y+' L'+e_x+' '+e_y;
        return line;
    });

svg_context_zoom_g
    .selectAll('.zoom_option')
    .on('click', function(d, i) {
        i = i%zoom_options.length;  //0~5,6~10
        changeZoomOption(zoom_options[i]);
        clearZoomSelection();
        svg_context_zoom_g
            .selectAll('.option'+i)
            .attr('fill', 'red');
    });


var calendar_start = d3.select('#calendar_start');
var calendar_end = d3.select('#calendar_end');
$('#btn_reset').click(clearPeriodSelection);

/**
 *
 改变区间长度的选择
 option 当前选中的类型：all、1y……
 *
 */
function changeZoomOption(option) {
    brush_context.extent([0, 0]);
    d3.select(".x.brush_context").call(brush_context);
    var start_day = x_price.domain()[0];
    var end_day;
    if(option == 'all') {
        start_day = first_day;
        end_day = last_day;
        //zoomPeriod(first_day, last_day);
    } else {
        var year = start_day.getFullYear();
        var month = start_day.getMonth();
        var day = start_day.getDate();
        var end = new Date(year, month, day);
        var interval = option.substring(1);
        var num = parseInt(option.substring(0, 1));
        addDate(end, interval, num);

        end_day = parseDate(end.getFullYear()+"-"+(end.getMonth()+1)+"-"+end.getDate());
        //zoomPeriod(start_day, last_day);
    }
    zoomPeriod(start_day, end_day);
    change_context_brush(start_day, end_day);

}

/**
 *
 取消时间窗口选择
 *
 */
function clearZoomSelection() {
    svg_context_zoom_g
        .selectAll('.zoom_option')
        .attr('fill', 'gray');
}