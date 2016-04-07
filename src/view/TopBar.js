define(["jquery","underscore","view/LoginDialog.js","text!tmpl/topBar.html"],
function($,_,LoginDialog,template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function() {
            this.$el = $(template);
        },
    });

    return This;
});
