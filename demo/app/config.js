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
var KEYWORD_PORT = "5500";    //��Ҫ��
//var KEYWORD_PORT = "5501"; //�����õ�
var ARCH_PORT = "6692";
var LIST_NEWS_PORT = 6693;

var request_contour = null; //����ajax���󣬱����ظ�
var request_list_news = null; //����ajax���󣬱����ظ�
var request_group_info = null; //����ajax���󣬱����ظ�
var request_keyword_info = null; //����ajax���󣬱����ظ�
var request_keyword_recommend = null; //����ajax���󣬱����ظ�

var all_start_date = '2006-10-20';
var all_end_date = '2015-11-04';


