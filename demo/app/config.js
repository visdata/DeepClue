/**
 * Created by WL on 2015/11/6.
 */
//spinner
var target = document.getElementById('spinner');
var spinner = new Spinner(opts);
spinner.spin(target);   //start spinner

//var SERVER = "192.168.1.42";
var SERVER = "139.129.203.9";
//var SERVER = "127.0.0.1";
//var FACTOR_PORT = "6601";
var CONTOUR_PORT = "8001";
var KEYWORD_PORT = "5500";    //主要的
//var KEYWORD_PORT = "5501"; //备份用的
var ARCH_PORT = "6692";
var LIST_NEWS_PORT = 6693;

var request_contour = null; //保存ajax请求，避免重复
var request_list_news = null; //保存ajax请求，避免重复
var request_group_info = null; //保存ajax请求，避免重复
var request_keyword_info = null; //保存ajax请求，避免重复
var request_keyword_recommend = null; //保存ajax请求，避免重复

var all_start_date = '2006-10-20';
var all_end_date = '2015-11-04';


