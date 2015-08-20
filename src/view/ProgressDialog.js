define(["jquery","view/util.js","text!../tmpl/progressDialog.html"],function($,util,template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(strip) {
            this.$el = $("<div class='progressDialog'/>");

            this.strip = strip;
            $(strip).one("Strip.ProgressUpdated",_.bind(this.update,this));
            $(strip).one("Strip.Disconnect",_.bind(this.error,this));

            this.$el.append(template);
        },
        update:function(e,strip,session) {
            if (session == null) {
                this.hide();
                $(this).trigger("Complete");
            } else {
                var percent = Math.floor(100*(session.size-session.buffers.length)/session.size);
                this.$el.find(".progress-bar").css("width",percent+"%").text(percent+"%");
                $(this.strip).one("Strip.ProgressUpdated",_.bind(this.update,this));
            }
        },
        error:function(e,strip,session) {
            this.$el.find(".progress-bar").addClass("progress-bar-danger");
            this.$el.find(".mtitle").text("Upload Failed");
            setTimeout(_.bind(function() {
                this.hide();
                $(this).trigger("Complete");
            },this),500);
        },
        show:function() {
            $(document.body).append(this.$el);
            if (platform == "desktop") {
                this.$el.modal({
                    "backdrop":"static"
                });
                this.$el.modal('show');
            }
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

