/**
 * Created by WL on 2015/11/6.
 */

/*
* ����ַ�����ǰ��ո�
* @param str ԭʼ�ַ���
* @return ���ǰ��ո���ַ���
 */
function strip(str) {
     return str.replace(/(^\s*)|(\s*$)/g,'');
}

/*
* �ж��Ƿ�Ԫ�ذ�����
* @param d htmlԪ��
* @param cls ���
* @return has_class Ԫ���Ƿ�������
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
* ���Ԫ�ص�ĳһ���
* @param d htmlԪ��
* @param cls ���
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
* ���Ԫ�ص�ĳһ���
* @param d htmlԪ��
* @param cls ���
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
* �ж��������Ƿ����ĳ��Ԫ��
* @param arr ����
* @param e Ԫ��
* @return flag �Ƿ����
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
* ��������ɾ��ĳ��Ԫ��
* @param arr ����
* @param item Ԫ��
 */
function removeElemFromArr(arr, item) {
    for(var i = arr.length-1; i>=0 ;i--) {
        if(arr[i] === item) {
            arr.splice(i, 1);
        }
    }
}

/*
* ��ȡÿ���µ�����
* @param year ���
* @param month �·�
* @return ���µ�����
 */
function getDaysOfMonth(year, month) {
    // month ȡ��Ȼֵ���� 1-12 �����Ǵ� 0 ��ʼ
    return new Date(year, month, 0).getDate();

    // ��� month �� javascript �Ķ���� 0 ��ʼ�Ļ�����
    // return new Date(year, month + 1, 0).getDate()
}


/*
* ��date����num��ʱ���interval
* @param date ��ǰ����
* @param interval ʱ��δ�С
* @param num ʱ��θ���
* @return  date ��Ӻ������
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
* ��ȡĳһ���������µĵڼ���
* @param year month day ������
* @return �����µĵڼ���
 *///
var getMonthWeek = function (year, month, day) {
    /*  a = d = ��ǰ����
    **  b = 6 - w = ��ǰ�ܵĻ��м������(�������)
    **  a + b �ĺ��ڳ���7 ���ǵ����ǵ�ǰ�·ݵĵڼ���
    */
    var date = new Date(year, month-1, day),
        w = date.getDay(),
        d = date.getDate();
    return Math.ceil(  (d + 6 - w) / 7  );
};

/*
* ��ȡĳһ�������ܵĵ�һ�������
* @param year month day ������
* @return �����ܵĵ�һ�������
 *///
var getFirstDayOfWeek = function(year, month, day) {
    /*
      �õ���һ������һ�ܣ�����������·�
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




