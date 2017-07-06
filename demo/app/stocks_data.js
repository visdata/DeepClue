/**
 * Created by WL on 2016/6/11.
 */

/*
* ���ÿһ��Ĺɼ����ݲ��������ֵ���
* @return ÿ��ɼ۵��ֵ�����
 */
function getAllStocksDataByDay() {
    //�������ݴ浽�ֵ���ȥ
    var dict_stocks_data = {};
    stocks_data.forEach(function(d) {
        var model_name = model_names[which_model];
        dict_stocks_data[d.Date] = {};
        dict_stocks_data[d.Date][ACTUAL] = d['actual_change'];
        dict_stocks_data[d.Date][PREDICTION_TEXT] = d['predict_text_'+model_name];
        dict_stocks_data[d.Date][PREDICTION] = d['pred_close_'+model_name];
        dict_stocks_data[d.Date][ERROR] = d['pred_close_'+model_name]- d.adjclose;
        dict_stocks_data[d.Date][VOLUME] = d.volume;
        dict_stocks_data[d.Date]['close'] = d.adjclose;
        dict_stocks_data[d.Date]['adjclose'] = d.adjclose;
        dict_stocks_data[d.Date]['open'] = d.open;
        dict_stocks_data[d.Date]['adjopen'] = d.adjopen;
        dict_stocks_data[d.Date]['pred_close_'+model_name] = d['pred_close_'+model_name];
        dict_stocks_data[d.Date]['bias_'+model_name] = d['bias_'+model_name];
        dict_stocks_data[d.Date]['risk'] = Math.abs(d.close-d['pred_close_'+model_name]);
        dict_stocks_data[d.Date]['fund'] = d['fund_'+model_name];
    });
    return dict_stocks_data;
}

/*
* ���ÿһ��ľ�����Ϣ
* @return ÿһ��ľ�����Ϣ���ֵ�����
 */
function getGroupDataByDay() {
    var dict_group_data = {};
    for(var i in groups_info_by_date) {
        var d = groups_info_by_date[i];
        dict_group_data[d.group] = d;
        //dict_group_data[d.key] = d;
    }
    return dict_group_data;
}


/*
* ���ÿ��Ĺؼ�����Ϣ
* @return ÿ��Ĺؼ��ʵ��ֵ�����
 */
function getKeywordDataByDay() {
    //if(delay != 0) {
    //    return getKeywordDataByDayDelay(delay);
    //}
    list_all_keywords = [];
    var dict_keyword_data = {};
    var keywordCount = keywords_count_by_date;
    for(var i in keywordCount) {
        var d = keywordCount[i];
        dict_keyword_data[d.keyword] = d;
        list_all_keywords.push(d.keyword);
    }
    return dict_keyword_data;
}

/*
* ���ÿ��Ķ�Ԫ�������Ϣ���ֵ�
* @return ÿ��Ķ�Ԫ������ֵ�����
 */
function getBigramDataByDay() {
    //if(delay != 0) {
    //    return getKeywordDataByDayDelay(delay);
    //}
    var dict_bigram_data = {};
    for(var keyword in bigram_info_of_keywords) {
        var bigram_info_keyword = bigram_info_of_keywords[keyword];
        for(var i in bigram_info_keyword) {
            var d = bigram_info_keyword[i];
            dict_bigram_data[d.bigram] = d;
        }
    }
    return dict_bigram_data;
}