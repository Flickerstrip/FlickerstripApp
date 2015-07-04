var _ = require("underscore")._;

define(['jquery'],function($) {
    var This = function(data,renderer) {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        defaultOpts:{
            multiple:true,
        },
        init:function(data,renderer,opts) {
            this.$el = $("<div />");
            this.$el.attr("tabindex","0");
            this.$el.css("user-select","none");
            this.selectedIndexes = [];
            this.cursorIndex = -1;
            this.opts = opts ? opts : this.defaultOpts;

            this.data = data;
            this.renderer = renderer;

            _.each(this.data,_.bind(function(value,index) {
                value.index = index;
                var $el = this.renderer(value);
                $el.data("index",index);
                $el.data("object",value);
                this.$el.append($el);
            },this));

            this.addBehavior();

            this.$el.focus(_.bind(this.focused,this));
            this.$el.blur(_.bind(this.blurred,this));
            this.$el.keydown(_.bind(this.keyDown,this));
        },
        refresh:function() {
            var self = this;
            this.$el.children(".listElement").each(function() {
                var index = $(this).data("index");
                self.renderer(self.data[index],$(this));
            });
        },
        focused:function(e) {
            this.focused = true;
        },
        blurred:function(e) {
            this.focused = false;
        },
        keyDown:function(e) { //todo: handle ctrl-a, ctrl-c
            if (this.focused) {
                if (e.keyCode == 40) { //down
                    if (this.selectedIndexes.length == 0) {
                        this.select(0);
                    } else if (this.selectedIndexes.length >= 1) {
                        this.select(this.cursorIndex+1,e.shiftKey);
                    }
                } else if (e.keyCode == 38) { //up
                    if (this.selectedIndexes.length == 0) {
                        this.select(this.data.length-1);
                    } else if (this.selectedIndexes.length >= 1) {
                        this.select(this.cursorIndex-1,e.shiftKey);
                    }
                }
            }
        },
        select:function(index,appendSelection) {
            if (index < 0) index = 0;
            if (index >= this.data.length) index = this.data.length-1;
            this.cursorIndex = index;

            if (appendSelection) {
                if (!_.contains(this.selectedIndexes,index)) {
                    this.selectedIndexes.push(index);
                }
            } else {
                this.selectedIndexes = [index];
            }
            var selectedMap = _.reduce(this.selectedIndexes,function(memo,ind) {
                memo[ind] = true;
                return memo;
            },{});

            var i = 0;
            var self = this;
            this.$el.children().each(function() {
                $(this).toggleClass("selected",selectedMap[i] == true);
                i++;
            });

            var args = [this.getSelected(),this.selectedIndexes];
            $(self).trigger("change",args);
        },
        getSelected:function() {
            var selectedObjects = _.map(this.selectedIndexes,_.bind(function(index) {
                return this.data[index];
            },this));
            return selectedObjects;
        },
        addBehavior:function() {
            var $el = this.$el;
            var self = this;
            $el.children(".listElement").each(function() {
                $(this).click(function(e) {
                    if (self.opts.multiple && e.shiftKey) {
                        var clickedIndex = $(this).data("index");
                        var min = Math.min(clickedIndex,self.cursorIndex);
                        var max = Math.max(clickedIndex,self.cursorIndex);
                        for (var i=min; i<=max; i++) {
                            self.select(i,true);
                        }
                    } else {
                        self.select($(this).data("index"),e.ctrlKey);
                    }
                });
            });
        }
    });

    return This;
});
