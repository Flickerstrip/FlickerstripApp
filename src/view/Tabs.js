define(['jquery','underscore','view/util.js'],function($,_,util) {
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
                if (info.default === true) {
                    $el.addClass("active");
                    this.selected = info;
                }
                this.$el.append($el);
            },this));
            util.bindClickEvent(this.$el.find("a"),_.bind(function(e) {
                var $el = $(e.target).closest("li");
                this.selected = $el.data("info");
                $(this).trigger("select",$el.data("info").key);
                this.$el.find("li").removeClass("active");
                $el.addClass("active");
                e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            },this));
        },
        getSelectedKey:function() {
            return this.selected.key;
        },
    });

    return This;
});
