var _ = require("underscore")._;
var $ = require("jquery");
//var tinycolor = require("tinycolor2");

define([],function() {
    var This = function(window,form,data) {
        this.window = window;
        this.init(form,data);
    }

    $.extend(This.prototype,{
        init:function(form,data) {
            console.log("foo");
        },
        computeControlValues:function(p,$el) {
            var data = {};
            _.each(p.controls,function(controlInfo) {
                var $fel = $el.find("[name='"+controlInfo.id+"']");
                var value = controlInfo.default;
                if ($fel.length) value = $fel.val();
                data[controlInfo.id] = value;
            });
            return data;
        },
        generateForm:function(form) {
            var $form = $("<div />");
            _.each(form,function(control) {
                var type = control.type;
                if (type == "foo") {

                } else {
                    var $el = $("<input />");
                    $el.attr("type",type);
                    $el.attr("name",control.id);
                    $el.val(tinycolor(control.default).toHexString());
                    $form.append($el);
                    $el.change(function() {
                        $form.trigger("Change",[$(this)]);
                    });
                }
            });
            return $form;
        },
    });

    return This;
});
