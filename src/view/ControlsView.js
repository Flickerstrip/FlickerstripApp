define(['jquery','tinycolor','jquery.spectrum'],function($,tinycolor) {
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
        wrapWithLabel:function(id,label,element) {
            var $el = $("<div class='form-group'><label></label></div>");
            $el.find("label").text(label).attr("for",id);
            $el.append(element);
            return $el;
        },
        generateForm:function(form) {
            var self = this;
            var $form = $("<form class='controlsView' />");
            _.each(form,function(control) {
                var type = control.type;
                var $el;
                if (type == "color") {
                    $el = $("<div />")
                    var $input = $("<input />");
                    $el.append($input);
                    $input.attr("type","text");
                    $input.attr("id",control.id);
                    if (control.style) $input.attr("style",control.style);
                    $input.attr("name",control.id);
                    setTimeout(_.bind(function() {
                        $input.spectrum({
                            color: control.default,
                            change: function(color) {
                                $(self).trigger("Change",[$(this)]);
                            }
                        });
                    },this),5);

                } else if (type == "text") {
                    $el = $("<textarea />");
                    $el.attr("name",control.id);
                    $el.attr("id",control.id);
                    $el.addClass("form-control");
                    if (control.style) $el.attr("style",control.style);
                    $el.val(control.default);
                    $el.change(function() {
                        $(self).trigger("Change",[$(this)]);
                    });
                } else {
                    $el = $("<input />");
                    $el.attr("type",type);
                    $el.addClass("form-control");
                    $el.attr("name",control.id);
                    $el.attr("id",control.id);
                    if (control.style) $el.attr("style",control.style);
                    $el.val(control.default);
                    $el.change(function() {
                        $(self).trigger("Change",[$(this)]);
                    });
                }

                $form.append(self.wrapWithLabel(control.id,control.name,$el));
            });
            return $form;
        },
    });

    return This;
});
