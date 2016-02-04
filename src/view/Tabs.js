define(['jquery','underscore'],function($,_) {
    var This = function(data,renderer) {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        defaultOpts:{
            multiple:true,
        },
        init:function(config) {
            this.$el = $("<ul class='nav nav-pills'></ul>");
            _.each(config,_.bind(function(info,key) {
                var $el = $("<li><a href='#'>"+info.label+"</a></li>");
                info.key = key;
                $el.data("info",info);
                if (info.default === true) $el.addClass("active");
                this.$el.append($el);
            },this));
            this.$el.find("a").click(_.bind(function(e) {
                var $el = $(e.target).closest("li");
                $(this).trigger("select",$el.data("info").key);
                this.$el.find("li").removeClass("active");
                $el.addClass("active");
                e.preventDefault();
                e.stopPropagation();
            },this));
        }
    });

    return This;
});
