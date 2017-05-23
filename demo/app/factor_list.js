/**
 * Created by WL on 2016/2/26.
 */

var spinner_factor_list = new Spinner(opts);
var target_factor_list = document.getElementById("spinner_factor_list");

//spinner_factor_list.spin(target_factor_list);
//setTimeout(getData, 3000);

var oLi = document.getElementById("tabList").getElementsByTagName("li");
var aCon = new Array();

$('.factor_list').each(function(){
    this.style.display = "none";
    aCon.push(this);//这里 this获得的就是每一个dom对象 如果需要jquery对象 需要写成$(this)
});
aCon[0].style.display = "block";
for (var i = 0; i < oLi.length; i++) {
    oLi[i].index = i;
    //oLi[i].onmouseover = function() {
    oLi[i].onclick = function() {
        show(this.index);
    }
}

var div_content = d3.select('#Content');
var div_sentiment = d3.select('#Sentiment');
var div_event = d3.select('#Event');

//div_content.append('text').html('content');
//div_sentiment.append('text').html('sentiment');
//div_event.append('text').html('event');

function show(index) {
    for (var j = 0; j < oLi.length; j++) {
        oLi[j].className = "";
        aCon[j].style.display = "none";
    }
    oLi[index].className = "cur";
    aCon[index].style.display = "block";
}

function getData() {
    spinner_factor_list.spin();
}

function getClusterFactorList(clusters_arr) {
    spinner_factor_list.spin(target_factor_list);

    var sep = ' ||| ';

    var url = "http://"+SERVER+":"+FACTOR_PORT+"/getClusterFactorList?filename="+
        cluster_filename+"&clusters="+clusters_arr+"&symbol="+companies[which_stock]["symbol"];
    console.log(url);
    $.ajax({
        url: url,
        context: document.body,
        async: true,
        success: function(data){
            pre_stock = which_stock;

            var factor_list = eval("("+data+")");
            spinner_factor_list.spin();     //end spinner
            console.log(factor_list);
            var list_content = factor_list['contents'];
            var list_sentiment = factor_list['sentiments'];
            var list_event = factor_list['events'];

            d3.selectAll('.factor').remove();
            div_content.selectAll('.factor')
                .data(list_content)
                .enter()
                .append('li')
                .attr("class", 'factor')
                .text(function(d, i) {
                    return d.split(sep)[0];
                })
                .append('title')
                .text(function(d, i) {
                    var args = d.split(sep);
                    return args[1] + ' ' + args[2] + ' ' + args[3];
                });
            div_sentiment.selectAll('.factor')
                .data(list_sentiment)
                .enter()
                .append('li')
                .attr("class", 'factor')
                .text(function(d, i) {
                    return d.split(sep)[0];
                })
                .append('title')
                .text(function(d, i) {
                    var args = d.split(sep);
                    return args[1] + ' ' + args[2];
                });
            div_event.selectAll('.factor')
                .data(list_event)
                .enter()
                .append('li')
                .attr("class", 'factor')
                .text(function(d, i) {
                    return d.split(sep)[0];
                })
                .append('title')
                .text(function(d, i) {
                    var args = d.split(sep);
                    return args[1] + ' ' + args[2];
                });
        },
        error: function(error) {
            alert("error!");
            console.log(error);
            spinner_factor_list.spin();
        }
    });
}

function getClusterSentimentNewsAndDraw(clusters_arr) {

    spinner_factor.spin(target_factor);

    var url = "http://"+SERVER+":"+FACTOR_PORT+"/getClusterNewsSentiment?filename="+
        cluster_filename+"&clusters="+clusters_arr+"&symbol="+companies[which_stock]["symbol"];
    console.log(url);
    $.ajax({
        url: url,
        context: document.body,
        async: true,
        success: function(data){
            pre_stock = which_stock;

            news_sentiment = eval("("+data+")");
            spinner_factor.spin();     //end spinner
            drawSentimentNews(news_sentiment);
        },
        error: function(error) {
            alert("error!");
            console.log(error);
            spinner_factor.spin();
        }
    });
}
