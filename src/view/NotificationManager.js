define(["jquery","underscore"],
function($,_) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function() {
            this.$el = $("<div class='notifications'/>");
        },
        setWindow:function(window) {
            console.log("set window");
            this.window = window;
            console.log("adding to body",window.document.body,this.$el);
            $(window.document.body).append(this.$el);
        },
        //success info warning danger
        notify:function(type,content,duration,buttons) {
            if (duration === undefined) duration = 5000;
            var $alert = $("<div class='alert' />").addClass("alert-"+type);
            var $body = $("<div class='alertbody'>").html(content);
            $alert.append($body);
            var $buttons = $("<div class='alertbuttons'></div>");
            _.each(buttons,function(button) {
                button.addClass("btn-xs");
                $buttons.append(button);
            });
            $alert.append($buttons);
            this.$el.append($alert);
            $alert.fadeIn();
            //$alert.addClass("alert-dismissable");
            if (duration === true) {
                $('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>').appendTo($alert);
            } else if (duration) {
                setTimeout(function() {
                    $alert.fadeOut(function() {
                        $alert.remove();
                    });
                },duration);
            }
        },
    });

    return new This();
});
