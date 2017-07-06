/**
 * Created by WL on 2015/11/6.
 */

/*
* 清除字符串的前后空格
* @param str 原始字符串
* @return 清除前后空格的字符串
 */
function strip(str) {
     return str.replace(/(^\s*)|(\s*$)/g,'');
}

/*
* 判断是否元素包含类
* @param d html元素
* @param cls 类别
* @return has_class 元素是否包含类别
 */
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

/*
* 清除元素的某一类别
* @param d html元素
* @param cls 类别
 */
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

/*
* 添加元素的某一类别
* @param d html元素
* @param cls 类别
 */
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

/*
* 判断数组中是否包含某个元素
* @param arr 数组
* @param e 元素
* @return flag 是否包含
 */
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

/*
* 从数组中删除某个元素
* @param arr 数组
* @param item 元素
 */
function removeElemFromArr(arr, item) {
    for(var i = arr.length-1; i>=0 ;i--) {
        if(arr[i] === item) {
            arr.splice(i, 1);
        }
    }
}

/*
* 获取每个月的天数
* @param year 年份
* @param month 月份
* @return 该月的天数
 */
function getDaysOfMonth(year, month) {
    // month 取自然值，从 1-12 而不是从 0 开始
    return new Date(year, month, 0).getDate();

    // 如果 month 按 javascript 的定义从 0 开始的话就是
    // return new Date(year, month + 1, 0).getDate()
}


/*
* 对date加上num个时间段interval
* @param date 当前日期
* @param interval 时间段大小
* @param num 时间段个数
* @return  date 添加后的日期
 *///
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

/*
* 获取某一天是所在月的第几周
* @param year month day 年月日
* @return 所在月的第几周
 *///
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

/*
* 获取某一天所在周的第一天的日期
* @param year month day 年月日
* @return 所在周的第一天的日期
 *///
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




