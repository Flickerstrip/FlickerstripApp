define(["jquery","util.js","text!../tmpl/progressDialog.html"],function($,util,template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(strip) {
            this.$el = $("<div class='progressDialog modal'/>");

            this.strip = strip;
            $(strip).one("ProgressUpdated",_.bind(this.update,this));

            this.$el.append(_.template(template)());
        },
        update:function(e,strip,session) {
            console.log(arguments);
            if (session == null) {
                this.$el.modal('hide')
                $(this).trigger("Complete");
            } else {
                var percent = Math.floor(100*(session.size-session.buffers.length)/session.size);
                this.$el.find(".progress-bar").css("width",percent+"%").text(percent+"%");
                this.strip.one("ProgressUpdated",_.bind(this.update,this));
            }
        },
        show:function() {
            $(document.body).append(this.$el);
            this.$el.modal('show');
        }
    });

    return This;
});

