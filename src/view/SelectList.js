define(['jquery','view/util.js'],function($,util) {
    var This = function(data,renderer) {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        defaultOpts:{
            multiple:true,
        },
        init:function(data,renderer,rendererthis,opts,grouprenderer) {
            this.rendererthis = rendererthis;
            this.$el = $("<ul class='list-group scrollable'/>");
            this.$el.attr("tabindex","0");
            this.$el.css("user-select","none");
            this.selectedIndexes = [];
            this.cursorIndex = -1;
            this.opts = opts ? opts : this.defaultOpts;

            this.renderer = renderer;
            this.grouprenderer = grouprenderer;

            var self = this;
            function addGroup(items,group) {
                _.each(items,_.bind(function(value,index) {
                    value.index = index;
                    var $el = this.renderer.call(this.rendererthis,value);
                    $el.data("index",index);
                    $el.data("object",value);
                    $el.data("group",group);
                    this.$el.append($el);
                },self));
            }

            if ($.isArray(data)) {
                addGroup(data,null);
            } else {
                _.each(data,function(items,group) {
                    addGroup(items,group);
                });
            }
            this.refreshGroupings();

            this.addBehavior();

            this.$el.focus(_.bind(this.focused,this));
            this.$el.blur(_.bind(this.blurred,this));
            this.$el.keydown(_.bind(this.keyDown,this));
        },
        addElement:function(element,group) {
            var $el = this.renderer.call(this.rendererthis,element);
            this.$el.append($el);
            this.addBehavior($el);
            var index = this.$el.find(".listElement").length-1;
            $el.data("index",index);
            $el.data("object",element);
            $el.data("group",group);

            this.refreshGroupings();
        },
        refreshGroupings:function() {
            var groupMap = {};
            groupMap[""] = [];
            this.$el.find(".listElement").each(function() {
                var group = $(this).data("group");
                group = group || "";
                if (!groupMap[group]) groupMap[group] = [];
                groupMap[group].push(this);
            });

            var keys = Object.keys(groupMap);
            keys.sort(function(a,b) {
                if (a == '' && b == '') return 0;
                if (a == '') return 1;
                if (b == '') return -1;
                return a.localeCompare(b);
            });

            this.$el.children().detach();
            var index = 0;
            _.each(keys,_.bind(function(group) {
                var header = group == "" ? "Ungrouped" : group;
                if (this.grouprenderer && keys.length > 1 && groupMap[group].length > 0) {
                    var $groupHeader = this.grouprenderer(header);
                    util.bindClickEvent($groupHeader,_.bind(function() {
                        //group clicked
                        this.$el.find(".selected").removeClass("selected");
                        $groupHeader.addClass("selected");
                        var args = [false,false,header];
                        $(this).trigger("change",args);
                    },this));
                    this.$el.append($groupHeader);
                }
                _.each(groupMap[group],_.bind(function(item) {
                    $(item).data("index",index++);
                    this.$el.append(item);
                },this));
            },this));
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
                self.renderer.call(self.rendererthis,$(this).data("object"),$(this));
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
                    e.preventDefault();
                    if (this.selectedIndexes.length == 0) {
                        this.select(0);
                    } else if (this.selectedIndexes.length >= 1) {
                        this.select(this.cursorIndex+1,e.shiftKey);
                    }
                    this.scrollToIndex(this.cursorIndex);
                    return true;
                } else if (e.keyCode == 38) { //up
                    e.preventDefault();
                    if (this.selectedIndexes.length == 0) {
                        this.select(this.getSize()-1);
                    } else if (this.selectedIndexes.length >= 1) {
                        this.select(this.cursorIndex-1,e.shiftKey);
                    }
                    this.scrollToIndex(this.cursorIndex);
                    return true;
                }
            }
        },
        scrollToIndex:function(index) {
            var $el = this.$el.children(".listElement").eq(index);
            var currentScroll = this.$el.scrollTop();
            var elOffset = $el.offset().top - this.$el.offset().top + currentScroll;
            var elHeight = $el.outerHeight(true);
            var visibleHeight = this.$el.height();

            var visibleMin = currentScroll;
            var visibleMax = currentScroll+visibleHeight;

            var scrollingTo = null;
            if (elOffset+elHeight > visibleMax) {
                scrollingTo = currentScroll + (elOffset - visibleMax) + elHeight;
            } else if (elOffset < visibleMin) {
                scrollingTo = currentScroll + (elOffset - visibleMin);
            }

            if (scrollingTo != null) {
                this.$el.scrollTop(scrollingTo);
            }
        },
        getSize:function() {
            return this.$el.find(".listElement").length;
        },
        scrollToSelected:function() {
            if (this.selectedIndexes.length) {
                this.scrollToIndex(this.selectedIndexes[0]);
            }
        },
        select:function(index,appendSelection) {
            var selectedMap = {};
            if (index === null || index === undefined) {
            } else {
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
                selectedMap = _.reduce(this.selectedIndexes,function(memo,ind) {
                    memo[ind] = true;
                    return memo;
                },{});
            }

            var i = 0;
            var self = this;
            this.$el.find(".selected").removeClass("selected");
            this.$el.children(".listElement").each(function() {
                $(this).toggleClass("selected",selectedMap[i] == true);
                i++;
            });

            var args = [this.getSelected(),this.selectedIndexes];
            $(self).trigger("change",args);
        },
        deselect:function() {
            this.select(null);
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
                util.bindClickEvent($(this),_.bind(function(e) {
                    var clickedIndex = $(this).data("index");
                    if ($(this).is(".disabled")) return;
                    if (self.opts.multiple && e.shiftKey) {
                        var clickedIndex = $(this).data("index");
                        var min = Math.min(clickedIndex,self.cursorIndex);
                        var max = Math.max(clickedIndex,self.cursorIndex);
                        for (var i=min; i<=max; i++) {
                            self.select(i,true);
                        }
                    } else {
                        self.select($(this).data("index"),e.ctrlKey || e.altKey);
                    }
                },this));
            });
        }
    });

    return This;
});
