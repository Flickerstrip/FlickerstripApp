define(['jquery','tinycolor'],function($,tinycolor) {
    var This = function(window,form,data) {
        this.window = window;
        this.init(form,data);
    }

    $.extend(This.prototype,{
        init:function(form,data) {
            this.el = this.generateForm(form);
            this.form = form;
        },
        getValues:function() {
            var data = {};
            _.each(this.form,_.bind(function(control) {
                var $el = this.el.find("[name='"+control.id+"']");
                var value = control.default;
                if ($el.length) value = $el.val();
                data[control.id] = value;
            },this));
            return data;
        },
        generateForm:function(form) {
            var self = this;
            var $form = $("<div class='controlsView' />");
            _.each(form,function(control) {
                var type = control.type;
                if (type == "color") {
                    var $el = $("<input />");
                    $el.attr("type",type);
                    $el.attr("name",control.id);
                    $el.val(tinycolor(control.default).toHexString());
                    $form.append($el);
                    $el.change(function() {
                        $(self).trigger("Change",[$(this)]);
                    });

                } else {
                    var $el = $("<input />");
                    $el.attr("type",type);
                    $el.attr("name",control.id);
                    $el.val(control.default);
                    $form.append($el);
                    $el.change(function() {
                        $(self).trigger("Change",[$(this)]);
                    });
                }
            });
            return $form;
        },
    });

    return This;
});
