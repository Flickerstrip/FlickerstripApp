define(['jquery'],function($) {
    var This = function(data,renderer) {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        defaultOpts:{
            multiple:true,
        },
        init:function(data,renderer,rendererthis,opts) {
            this.rendererthis = rendererthis;
            this.$el = $("<ul class='list-group'/>");
            this.$el.attr("tabindex","0");
            this.$el.css("user-select","none");
            this.selectedIndexes = [];
            this.cursorIndex = -1;
            this.opts = opts ? opts : this.defaultOpts;

            this.renderer = renderer;

            _.each(data,_.bind(function(value,index) {
                value.index = index;
                var $el = this.renderer.call(this.rendererthis,value);
                $el.data("index",index);
                $el.data("object",value);
                this.$el.append($el);
            },this));

            this.addBehavior();

            this.$el.focus(_.bind(this.focused,this));
            this.$el.blur(_.bind(this.blurred,this));
            this.$el.keydown(_.bind(this.keyDown,this));
        },
        addElement:function(element) {
            var $el = this.renderer.call(this.rendererthis,element);
            this.$el.append($el);
            this.addBehavior($el);
            var index = this.$el.find(".listElement").length-1;
            $el.data("index",index);
            $el.data("object",element);
        },
        updateElement:function(element) {
            var self = this;
            this.$el.find(".listElement").each(function() {
                if ($(this).data("object") == element) {
                    self.renderer.call(self.rendererthis,element,$(this));
                }
            });
        },
        refresh:function() {
            var self = this;
            this.$el.children(".listElement").each(function() {
                var index = $(this).data("index");
                self.renderer.call(self.rendererthis,self.data[index],$(this));
            });
        },
        each:function(cb) {
            this.$el.children(".listElement").each(function() {
                var obj = $(this).data("object");
                var index = $(this).data("index");
                var $el = $(this);
                cb(obj,$el);
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
                    return true;
                } else if (e.keyCode == 38) { //up
                    if (this.selectedIndexes.length == 0) {
                        this.select(this.getSize()-1);
                    } else if (this.selectedIndexes.length >= 1) {
                        this.select(this.cursorIndex-1,e.shiftKey);
                    }
                    return true;
                }
            }
        },
        getSize:function() {
            return this.$el.find(".listElement").length;
        },
        select:function(index,appendSelection) {
            if (index < 0) index = 0;
            if (index >= this.getSize()) index = this.getSize()-1;
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
            var selectedObjects = [];
            this.$el.children().each(function() {
                if ($(this).is(".selected")) {
                    selectedObjects.push($(this).data("object"));
                }
            });
            return selectedObjects;
        },
        addBehavior:function($el) {
            var $nodes = null;
            if ($el) {
                $nodes = $el;
            } else {
                $nodes = this.$el.children(".listElement");
            }
            var self = this;
            $nodes.each(function() {
                $(this).click(function(e) {
                    var clickedIndex = $(this).data("index");
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