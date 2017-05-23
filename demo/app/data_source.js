/**
 * Created by WL on 2016-11-28.
 */

var data_sources = ['News', 'Tweets', 'Reports'];
//var div_data_source = div_zoom
//    .append('div')
//    .attr('id', 'div_data_source');
var div_data_source = d3.select('#div_data_source');
div_data_source
    .append('div')
    .attr('id', 'div_source_label')
    //.text('Data: ');
    .text('Data Source: ');
var div_sources = div_data_source
    .selectAll('.data_source')
    .data(data_sources)
    .enter()
    .append('div')
    .attr("class", 'data_source');
div_sources
    .each(function(d, i) {
        var this_source = d3.select(this);
        var label = this_source
            .append('label')
            .attr('class', 'source_label')
            .attr('id', 'source_' + d);
        label.append("input")
            .attr('type', 'radio')
            .attr('name', function() {
                if(i == 0) {
                    d3.select(this)
                        .attr('checked', '');   //有checked属性即选中
                }
                return 'source';
            })
            .on('change', function() {
                //TODO: 更换数据源操作
                //if(i >= 2) return;
                which_model = i;
                visualize(which_stock, which_price);
                //alert('change to '+d+' data!');
            });
        label
            .append('text')
            .attr('class', 'data_source_label')
            .style('cursor', 'pointer')
            .text(function () {
                return d;
            });
    });
