/**
 * Created by WL on 2016-11-25.
 */



//�����div��factor chart��ʱ�򴴽��ö���
//�����������������λ�õ�ʱ��,������ǰ���ṹ����Ӧ�ı�div��λ��
//���ܽ���ʲô������ֻҪ�����˸ı䣬����ݵ�ǰ���ṹ��չ����
function FactorDiv() {
    this.children = []; //���������ʱ��ֵһ���ӽڵ�Ŀ�����
    this.keywords = [];
    this.expand_count = 0;
    this.isNewAdd = false;
}

FactorDiv.prototype = {
    constructor: FactorDiv,
    div: null,
    factor_data: undefined,
    type: "default",
    children: [],
    keywords: [],   //����ӵĹؼ��ʣ���������һ��������
    isNewAdd: false,
    index: 0,   //�ڸ��ڵ��λ��
    parent: null,
    expand_count: 0, //�Ѿ�չ�����ֽڵ�ĸ���
    expand_index: 0, //TODO:�Ѿ�չ�����ڼ���,����չ������
    insertChild: function(child) {  //���ʼ�����ӽڵ�
        child.type = child.factor_data.type;
        child.parent = this;
        child.index = this.children.length;
        this.children.unshift(child);
    },
    addChild: function(child) {
        child.type = child.factor_data.type;
        child.parent = this;
        child.index = this.children.length;
        this.children.push(child);
        this.expand_count += 1;
    },
    getGroupParent: function() {
        //�õ���group�ĸ��ڵ㣨�����bigram�������丸�ڵ�ĸ��ڵ㣩
        if(this.type == GROUP) {
            return this;
        } else if(this.type == KEYWORD) {
            return this.parent;
        } else if(this.type == BIGRAM) {
            return this.parent.parent;
        }
    },
    moveToFirst: function() {
        //�ƶ����丸�ڵ�ĵ�һ���ӽڵ�
        var parent = this.parent;
        var tmp = [];
        this.index = 0; //��ǰ�ڵ��idx��0������һ��
        tmp.push(this);
        for(var i in parent.children) {
            var child = parent.children[i];
            if(child != this) {
                child.index = tmp.length;   //�޸ķǵ�ǰ�ڵ�����
                tmp.push(child);
            }
        }
        parent.children = tmp;
    },
    sortLevel: function(start, end) {   //��ѡ�д��ڵ���ֹ���ڽ�������
        var children = this.parent.children;
        children.sort(function(a, b) {
            var factor_info_a = a.factor_data.info;
            var factor_info_b = b.factor_data.info;
            if(which_sort == 3) {
                var factor_a, factor_b, type = a.type;
                if(type == GROUP) {
                    factor_a = a.factor_data.group;
                    factor_b = b.factor_data.group;
                } else {
                    factor_a = a.factor_data.text;
                    factor_b = b.factor_data.text;
                }
                var unit = getUnit();
                var corr_a = getPeriodCrossCorrelationKeywordPrediction(factor_a, type, start, end, unit);
                var corr_b = getPeriodCrossCorrelationKeywordPrediction(factor_b, type, start, end, unit);
                return corr_b-corr_a;
            }
            var sum_a = 0, sum_b = 0;
            var abs_sum_a= 0, abs_sum_b=0;
            for(var Date in factor_info_a) {
                var date = parseDate(Date);
                if(date>=start && date<=end) {
                    sum_a += factor_info_a[Date][1];    //0:freq, 1:weight
                    abs_sum_a += Math.abs(factor_info_a[Date][1]);    //0:freq, 1:weight
                }
            }
            for(var Date in factor_info_b) {
                var date = parseDate(Date);
                if(date>=start && date<=end) {
                    sum_b += factor_info_b[Date][1];    //0:freq, 1:weight
                    abs_sum_b+=Math.abs(factor_info_b[Date][1]);
                }
            }
            if(which_sort == 0) {
                return abs_sum_b-abs_sum_a; //������ֵ���򣬴����ǰ
            } else if(which_sort == 1) {
                return sum_b-sum_a; //�����ǰ�����������
            } else if(which_sort == 2) {
                return sum_a-sum_b; //С����ǰ�������
            }
        });
        children.forEach(function(d, i) {
            d.index = i;    //�޸��ӽڵ��index
        });
        reDrawFactorDivs();
    },
    sortByCorrelation: function() {
        var children = this.children;
        children.sort(function(a, b) {
            var start = x_price.domain()[0];
            var end = x_price.domain()[1];
            var factor_a, factor_b, type = a.type;
            if(type == GROUP) {
                factor_a = a.factor_data.group;
                factor_b = b.factor_data.group;
            } else {
                factor_a = a.factor_data.text;
                factor_b = b.factor_data.text;
            }
            var unit = getUnit();
            var corr_a = getPeriodCrossCorrelationKeywordPrediction(factor_a, type, start, end, unit);
            var corr_b = getPeriodCrossCorrelationKeywordPrediction(factor_b, type, start, end, unit);
            return corr_b-corr_a;
        });
        children.forEach(function(d, i) {
            d.index = i;    //�޸��ӽڵ��index
            d.sortByCorrelation();  //�ݹ�����
        });
        reDrawFactorDivs();
    },
    getAllChildArr: function() {
        var all_child_div = [];
        for(var i in this.children) {
            var child = this.children[i];
            all_child_div.push(child);
            var child_arr = child.getAllChildArr();
            for(var j in child_arr) {
                all_child_div.push(child_arr[j]);
            }
        }
        return all_child_div;
    },
    //����factor��group��keyword��bigram���õ���Ӧ��div
    getDivByFactor: function(factor) {
        for(var i in this.children) {
            var child = this.children[i];
            if(child.factor_data.text == factor) {
                return child;
            } else {
                var targetDiv = child.getDivByFactor(factor);
                if(targetDiv != null) {
                    return targetDiv;
                }
            }
        }
        return null;
    },
    removeAllChildren: function() {
        this.children = [];     //ɾ�������ӽڵ�
        this.expand_count = 0;
    },
    removeFromParent: function() {
        var parentDiv = this.parent;
        var tmp = [];
        var idx = 0;
        for(var i in parentDiv.children) {
            var child = parentDiv.children[i];
            if(child != this) {
                child.index = idx++;
                tmp.push(child);    //�Ѳ���ͬ���ӽڵ�������飬��󸳸����ڵ�
            }
        }
        parentDiv.children = tmp;
        parentDiv.expand_count = tmp.length;
    },
    isLastChildOfParent: function() {
        return this.index == this.parent.children.length-1;
    }
};