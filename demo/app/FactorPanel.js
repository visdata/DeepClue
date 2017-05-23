/**
 * Created by WL on 2016/5/21.
 */

var FactorPanel = {
    sound : "miao miao miao~",
    count : 0,
    createNew: function(){
        var cat = {};
        cat.makeSound = function(){ alert(FactorPanel.sound); };
        cat.changeSound = function(x){ FactorPanel.sound = x; };
        FactorPanel.count++;
        return cat;
    },
    removeObj: function() {
        FactorPanel.count--;
    }
};