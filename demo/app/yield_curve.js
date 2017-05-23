/**
 * Created by WL on 2017-03-02.
 */

var y_yield = d3.scale.linear()
    .range([height_focus-area_margin.bottom, 0 + 1.5*area_margin.top])
    .domain([0, 2]);

var line_yield = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) {
        return x_price(d.date);
    })
    .y(function(d) {
        return y_price(d.value);
        //return y_yield(d.value);
    });

function drawYieldCurve() {
    var yield_data = [];
    var model_name = model_names[which_model];
    var yield_ratio = 0;    //计算当前时间区间第一天与1的比值，等比修改所有收益
    var min_value = MAX_NUM, max_value = MIN_NUM;
    Object.keys(stock_info_by_date)
        .forEach(function(key, i) {
            var d = stock_info_by_date[key];
            if(d.date >= x_price.domain()[0] && d.date <= x_price.domain()[1]) {
                var fund = d['fund_'+model_name];
                if(yield_ratio == 0) {
                    yield_ratio = 1 / fund;
                }
                fund *= yield_ratio;
                yield_data.push({date: d.date, value: fund});
                min_value = Math.min(min_value, fund);
                max_value = Math.max(max_value, fund);
            }
        });
    var min_domain = min_value,
        max_domain = max_value,
        extra = 3;
    //yAxis_price.tickFormat(function(d) {return d.toFixed(2);});
        //min_domain = Math.max(0, min_price-(max_price-min_price)/(extra-1)); // not 0
    min_domain = min_domain-(max_domain-min_domain)/(extra-1); // not 0
    console.log(min_domain, max_domain);
    y_price.domain([min_domain, max_domain]);

    svg_price_g.selectAll(".yield.curve").remove();
    svg_price_g.append("path")
        .datum(yield_data)
        .attr("class", function(d, i) {
            return 'yield curve';
        })
        .attr('stroke', function(d, i) {
            return 'red';
        })
        .attr('fill', 'none')
        .attr('opacity', 1)
        .attr("d", line_yield);



    yAxis_price.tickFormat(function(d) {
        return d.toFixed(2);
    });

    svg_price_g.select('.y.axis')
        .call(yAxis_price); //坐标轴
    d3.select("#chart_y_axis_label")
        .text('yield rate');
}
