define(["jquery","view/util.js","text!../tmpl/progressDialog.html"],function($,util,template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(text,waiting) {
            this.$el = $("<div class='progressDialog'/>");

            this.$el.append(template);

            this.set(text,waiting);
        },
        set:function(text,waiting) {
            this.waiting = waiting;
            this.text = text;

            if (this.text) this.$el.find(".mtitle").html(text);
            if (this.waiting) this.$el.find(".progress-bar").css("width","100%").text("");
        },
        update:function(percent) {
            if (this.waiting) {
                this.$el.find(".progress-bar").css("width","100%").text("");
            } else {
                this.$el.find(".progress-bar").css("width",percent+"%").text(percent+"%");
            }
        },
//        error:function(e,strip,session) {
//            this.$el.find(".progress-bar").addClass("progress-bar-danger");
//            this.$el.find(".mtitle").text("Upload Failed");
//            setTimeout(_.bind(function() {
//                this.hide();
//                $(this).trigger("Complete");
//            },this),500);
//        },
        show:function() {
            $(document.body).append(this.$el);
            if (platform == "desktop") {
                this.$el.modal({
                    "backdrop":"static"
                });
                this.$el.modal('show');
            }
			return this;
        },
        hide:function() {
            if (platform == "desktop") {
                this.$el.modal('hide');
                this.$el.remove();
            } else {
                this.$el.remove();
            }
        }
    });

    return This;
});

