/**
 * Created by WL on 2016/3/1.
 */

//var all_period = d3.select("#all_period"),
var selected_start = d3.select("#select_start"),
    selected_end = d3.select("#select_end"),
    //select_button = d3.select("#btn_select"),
    clear_button = d3.select("#btn_clear");

//select_button.on("click", selectPeriod);
clear_button.on("click", clearPeriodSelection);

var oCalendarEn=new PopupCalendar("oCalendarEn"); //初始化控件时,请给出实例名称如:oCalendarEn
    oCalendarEn.separator = "/";
    //oCalendarEn.startYear = extent[0].getFullYear();
    //oCalendarEn.endYear = extent[1].getFullYear();
    oCalendarEn.setRefreshFunc(selectPeriod);
    oCalendarEn.Init();

function selectPeriod() {
    var parseDateOfDay = d3.time.format("%Y-%m-%d %X").parse;
    var starts = d3.select("#select_start").attr("value").split("/");
    var ends = d3.select("#select_end").attr("value").split("/");
    var start = parseDateOfDay(starts[0]+"-"+starts[1]+"-"+starts[2]+" 00:00:00");
    var end = parseDateOfDay(ends[0]+"-"+ends[1]+"-"+ends[2]+" 23:59:59");
    if(end<start) {
        alert("End date cannot be earlier than the start date!");
        return;
    }
    zoomPeriod(start, end);
}

function clearPeriodSelection() {
    svg_price_g.select(".tip-node").remove();
    drawStock(stocks_data, which_price, true);
}