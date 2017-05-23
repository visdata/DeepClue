/**
 * Created by WL on 2016-11-25.
 */



//在添加div画factor chart的时候创建该对象
//在排序或者其他调整位置的时候,遍历当前树结构，相应改变div的位置
//不管进行什么操作，只要发生了改变，则根据当前树结构画展开线
function FactorDiv() {
    this.children = []; //创建对象的时候赋值一个子节点的空数组
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
    keywords: [],   //新添加的关键词，单独放在一个数组里
    isNewAdd: false,
    index: 0,   //在父节点的位置
    parent: null,
    expand_count: 0, //已经展开的字节点的个数
    expand_index: 0, //TODO:已经展开到第几个,用于展开更多
    insertChild: function(child) {  //在最开始插入子节点
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
        //得到是group的父节点（如果是bigram即返回其父节点的父节点）
        if(this.type == GROUP) {
            return this;
        } else if(this.type == KEYWORD) {
            return this.parent;
        } else if(this.type == BIGRAM) {
            return this.parent.parent;
        }
    },
    moveToFirst: function() {
        //移动到其父节点的第一个子节点
        var parent = this.parent;
        var tmp = [];
        this.index = 0; //当前节点的idx是0，即第一个
        tmp.push(this);
        for(var i in parent.children) {
            var child = parent.children[i];
            if(child != this) {
                child.index = tmp.length;   //修改非当前节点的序号
                tmp.push(child);
            }
        }
        parent.children = tmp;
    },
    sortLevel: function(start, end) {   //按选中窗口的起止日期进行排序
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
                return abs_sum_b-abs_sum_a; //按绝对值排序，大的在前
            } else if(which_sort == 1) {
                return sum_b-sum_a; //大的在前，正相关排序
            } else if(which_sort == 2) {
                return sum_a-sum_b; //小的在前，负相关
            }
        });
        children.forEach(function(d, i) {
            d.index = i;    //修改子节点的index
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
            d.index = i;    //修改子节点的index
            d.sortByCorrelation();  //递归排序
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
    //根据factor（group，keyword，bigram）得到对应的div
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
        this.children = [];     //删除所有子节点
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
                tmp.push(child);    //把不相同的子节点放入数组，最后赋给父节点
            }
        }
        parentDiv.children = tmp;
        parentDiv.expand_count = tmp.length;
    },
    isLastChildOfParent: function() {
        return this.index == this.parent.children.length-1;
    }
};