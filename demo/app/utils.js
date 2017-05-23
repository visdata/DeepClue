/**
 * Created by WL on 2015/11/6.
 */

function strip(str) {
     return str.replace(/(^\s*)|(\s*$)/g,'');
}

function hasClass(d, cls) {
    var classes = d.attr("class").split(" ");
    var has_class = false;
    for(var c in classes) {
        if(classes[c] == cls) {
            has_class = true;
        }
    }
    return has_class;
}

function removeClass(d, cls) {
    var classes = d.attr("class").split(" ");
    var temp_classes = [];
    for(var c in classes) {
        if(classes[c] != cls) {
            temp_classes.push(classes[c]);
        }
    }
    d.attr("class", temp_classes.join(" "));
}

function addClass(d, cls) {
    var classes = d.attr("class").split(" ");
    var hasClass = false;
    for(var c in classes) {
        if(classes[c] == cls) {
            hasClass = true;
        }
    }
    if(!hasClass) {
        var classes = d.attr("class") + " " + cls;
        d.attr("class", classes);
    }
}

function hasElemInArr(arr, e) {
    var flag = false;
    for(var i=0; i<arr.length; i++) {
        if(arr[i] == e) {
            flag = true;
            break;
        }
    }
    return flag;
}

function removeElemFromArr(arr, item) {
    for(var i = arr.length-1; i>=0 ;i--) {
        if(arr[i] === item) {
            arr.splice(i, 1);
        }
    }
}

function hasKeyInDic(dic, e) {
    var flag = false;
    for(var key in dic) {
        if(key == e) {
            flag = true;
            break;
        }
    }
    return flag;
}

function removeKeyFromDic(dic, e) {
    var temp = {};
    for(var key in dic) {
        if(key != e) {
            temp[key] = e;
        }
    }
    dic = temp;
    return dic;
}

function getDaysOfMonth(year, month) {
    // month 取自然值，从 1-12 而不是从 0 开始
    return new Date(year, month, 0).getDate();

    // 如果 month 按 javascript 的定义从 0 开始的话就是
    // return new Date(year, month + 1, 0).getDate()
}

function getYesterday(today) {
    var y = today.getFullYear();
    var m = today.getMonth();
    var d = today.getDate();
    var yesterday = new Date(y, m, d-1);
    return yesterday;
}

function getDateDiff(startDate, endDate) {
    var startTime = new Date(startDate).getTime();
    var endTime = new Date(endDate).getTime();
    var dates = Math.abs((startTime - endTime))/(1000*60*60*24);
    return  dates;
}

//计算月份差
function getMonthDiff(startDate, endDate, sep) {
    var dates1 = startDate.split(sep);
    var dates2 = endDate.split(sep);
    var year1 =  dates1[0];
    var year2 =  dates2[0];
    var month1 = dates1[1];
    var month2 = dates2[1];
    var diff=Math.abs((year2-year1)*12+(month2-month1));
    return diff;
}

//对date加上num个时间段interval
function addDate(date, interval, num) {
    switch(interval) {
        case 'y':
            date.setFullYear(date.getFullYear()+num);
            return date;
            break;
        case 'm':
            date.setMonth(date.getMonth()+num);
            return date;
            break;
        case 'w':
            date.setDate(date.getDate()+num*7);
            return date;
            break;
        case 'd':
            date.setDate(date.getDate()+num);
            return date;
            break;
        default:
            date.setDate(date.getDate()+num);
            return date;
            break;
    }
    return date;
}

var getMonthWeek = function (year, month, day) {
    /*  a = d = 当前日期
    **  b = 6 - w = 当前周的还有几天过完(不算今天)
    **  a + b 的和在除以7 就是当天是当前月份的第几周
    */
    var date = new Date(year, month-1, day),
        w = date.getDay(),
        d = date.getDate();
    return Math.ceil(  (d + 6 - w) / 7  );
};

var getBeginAndEndOfWeekInMonth = function(year, month, week) {
    var firstDay = new Date(year, month-1, 1);
    if(week == 1) {
        var endDay = new Date(firstDay);
        endDay.setDate(firstDay.getDate()-firstDay.getDay()+6);
        return [firstDay, endDay];
    } else {
        var beginDay = new Date(firstDay);
        var endDay = new Date(firstDay);
        beginDay.setDate(firstDay.getDate()-firstDay.getDay()+7*(week-1));
        endDay.setDate(firstDay.getDate()-firstDay.getDay()+6+7*(week-1));
        if(beginDay.getMonth()+1 > month) {
            alert(year+'-'+month+" doesn't have "+week+'th week!');
            return;
        }
        if(endDay.getMonth()+1 > month) {
            endDay = new Date(year, month-1, getDaysOfMonth(year, month));
        }
        return [beginDay, endDay];
    }
};

var getYearWeek = function (year, month, day) {
    /*  date1是当前日期
    **  date2是当年第一天
    **  d是当前日期是今年第多少天
    **  用d + 当前年的第一天的周差距的和在除以7就是本年第几周
    */
    var date1 = new Date(year, parseInt(month) - 1, day),
        date2 = new Date(year, 0, 1),
        d = Math.round((date1.valueOf() - date2.valueOf()) / 86400000);
    return Math.ceil(  (d + ((date2.getDay() + 1) - 1)) / 7);
};

var getFirstDayOfWeek = function(year, month, day) {
    /*
      得到这一天是哪一周，不区分年和月份
       */
    var date = new Date(year, month-1, day);
    date.setDate(date.getDate()-date.getDay());
    var y = date.getFullYear();
    var m = date.getMonth()+1;
    var d = date.getDate();
    if(m < 10) {
        m = '0'+m;
    }
    if(d < 10) {
        d = '0'+d;
    }
    return y+'-'+m+'-'+d;
};


var getBeginAndEndOfWeekInYear = function(year, week) {
    /*
    **  year
    *   week：是这一年的第week周
     */
    var firstDay = new Date(year, 0, 1);
    if(week == 1) {
        var endDay = new Date(firstDay);
        endDay.setDate(firstDay.getDate()-firstDay.getDay()+6);
        return [firstDay, endDay];
    } else {
        var beginDay = new Date(firstDay);
        var endDay = new Date(firstDay);
        beginDay.setDate(firstDay.getDate()-firstDay.getDay()+7*(week-1));
        endDay.setDate(firstDay.getDate()-firstDay.getDay()+6+7*(week-1));
        if(beginDay.getMonth()+1 > month) {
            alert(year+'-'+month+" doesn't have "+week+'th week!');
            return;
        }
        if(endDay.getMonth()+1 > month) {
            endDay = new Date(year, month-1, getDaysOfMonth(year, month));
        }
        return [beginDay, endDay];
    }
};

function normalize_array(arr) {
    var max = d3.max(arr);
    var min = d3.min(arr);
    var arr_nor = [];
    arr.forEach(function(d, i) {    //正负分别处理
        var e = d;
        if(e>0) {
            e = e/max;
        } else if(e<0) {
            e = -e/min;
        }
        arr_nor.push(e);
    });
    return arr_nor;
}

function normalize_array_1(arr) {
    var max = d3.max(arr);
    var min = d3.min(arr);
    var arr_nor = [];
    arr.forEach(function(d, i) {
        var e = (d-min)/(max-min)*2-1;  // -1 ~ 1
        arr_nor.push(e);
    });
    return arr_nor;
}

function getRed(num) {
    var rgb_arr = [];
    for(var i=0; i<num; i++) {
        rgb_arr[i] = "rgb(240, "+(30+i*40)+", "+(15+i*40)+")";
    }
    return rgb_arr;
}

function getGreen(num) {
    var rgb_arr = [];
    for(var i=0; i<num; i++) {
        rgb_arr[i] = "rgb("+(30+i*40)+", 255, "+(i*40+60)+")";
    }
    return rgb_arr;
}

function isPointInPoly(poly, pt){
    for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1] < poly[i][1]))
        && (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
        && (c = !c);
    return c;
}

function array_add(arr1, arr2) {
    $.merge(arr1, arr2);
    return $.unique(arr1);
}

function array_sub(arr1, arr2) {
    if(arr2.length==0){return arr1}
    var diff=[];
    var str=arr2.join("&quot;&quot;");
    for(var e in arr1){
        if(str.indexOf(arr1[e])==-1){
            diff.push(arr1[e]);
        }
    }
    arr1 = diff;
    return arr1;
}




