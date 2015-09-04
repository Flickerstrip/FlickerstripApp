define(['jquery','underscore','view/util.js','tinycolor','view/ControlsView.js','view/LEDStripRenderer.js', 'view/SelectList.js',"view/GroupDetailsPanel.js","text!tmpl/stripList.html",'jquery.contextMenu'],
function($,_, util, tinycolor, ControlsView, LEDStripRenderer, SelectList, GroupDetailsPanel,template) {
    var This = function(window,send) {
        this.send = send;
        this.window = window;
        var document = window.document;
        this.document = window.document;
        $(document).ready(_.bind(function() {
            this.init(document,send);
        },this));
    }
    function getSelectedArray($el) {
        var selected = [];
        $el.find(":selected").each(function() {
            selected.push($(this).val());
        });
        return selected;
    }

    $.extend(This.prototype,{
        canvas:null,
        stripListComponent:null,
        stripRenderer:null,
        activePattern:null,
        init:function(document,eventRelay) {
            this.eventRelay = eventRelay;
            this.$el = $(document.body);

            $(this).on("StripAdded",_.bind(this.stripAdded,this));
            $(this).on("LatestReleaseUpdated",_.bind(this.releaseUpdated,this));

            this.render();

            this.$el.find(".configureNewStrip").on("click",_.bind(function() {
                var $div = $("<div />");
                $div.css({
                    "position":"absolute",
                    "width":"500px",
                    "height":"500px",
                    "top":"100px",
                    "left":"100px"
                });
                $(document.body).append($div);
                var i = 0;
                var a = setInterval(function() {
                    if (i % 2 == 0) {
                        $div.css({"background-color":"white"});
                    } else {
                        $div.css({"background-color":"black"});
                    }
                    i++;
                    if (i > 100) {
                        $div.remove();
                        clearInterval(a);
                    }
                },100);
                //jxcore("gui_RedirectToSettings").call();
            },this));
        },
        releaseUpdated:function(e,release) {
            this.latestRelease = release;
        },
        eventHandler:function() {
            var preprocessors = {
                "Strip.Connected":function(strip) {
                    strip.connected = true;
                },
                "Strip.Disconnected":function(strip) {
                    strip.connected = false;
                },
                "Strip.StatusUpdated":function(strip,stripStatus) {
                    $.extend(strip,stripStatus);
                },
            };
            if (arguments[0].indexOf("Strip.") === 0) {
                var strip = this.findStripId(arguments[1]);
                if (preprocessors[arguments[0]]) {
                    preprocessors[arguments[0]].apply(this,[strip].concat(Array.prototype.slice.call(arguments, 2)));
                }
                $(strip).trigger(arguments[0],Array.prototype.slice.call(arguments, 2));
            } else {
                $(this).trigger(arguments[0],Array.prototype.slice.call(arguments, 1));
            }
        },
        findStripId:function(id) {
            var found = null;
            this.selectList.each(function(strip) {
                if (strip.id == id) found = strip;
           });
            return found;
        },
        stripAdded:function(e,strip) {
            console.log("Strip Added: ",strip);
            this.selectList.addElement(strip);
            var self = this;
            $(strip).on("Strip.Connected",_.bind(function() {
                strip._connection = true;
                self.selectList.updateElement(strip);
            },this));
            $(strip).on("Strip.Disconnected",_.bind(function() {
                strip._connection = false;
                self.selectList.updateElement(strip);
            },this));
            $(strip).on("NameUpdated Strip.StatusUpdated",function() {
                self.selectList.updateElement(strip);
            });
        },
        stripSelected:function(e,selectedStrips,selectedIndexes) {
            this.selectedStrips = selectedStrips;
            if (selectedStrips.length == 1) {
                this.multipleSelected = false;
                this.selectSingleStrip(selectedStrips[0]);
            } else if (selectedStrips.length > 1) {
                this.multipleSelected = true;
                this.selectMultipleStrips(selectedStrips);
            }

            if (selectedStrips.length >= 1) {
                setTimeout(_.bind(function() {
                    this.$el.addClass("groupDetailsShowing");
                },this),5);
            }
        },
        selectSingleStrip:function(strip) {
            this.groupDetails = new GroupDetailsPanel(this.send,strip,this);
            $(this.groupDetails).on("GroupDetailsDismissed",_.bind(function() {
                this.selectList.deselect();
                this.$el.removeClass("groupDetailsShowing");
            },this));

            this.$el.find(".groupDetails").replaceWith(this.groupDetails.$el);
        },
        selectMultipleStrips:function(strips){
            var $el = this.$el.find("#activeStrip");
            $el.find("#nameValue").off("dblclick");
            $el.find("#identifierValue").hide();
            $el.find("#nameValue").text(strips.length+" selected");
            $el.find(".statusIndicator").css("visibility","hidden");
        },
        render:function() {
            this.$el.empty();
            this.$el.append(template);

            this.activePattern = null; //todo: select correct pattern
            var $stripList = this.$el.find("#strip-list");
            var selectList = new SelectList([],this.stripElementRenderer,this);
            this.selectList = selectList;
            $stripList.append(selectList.$el);

            var self = this;
            $.contextMenu( 'destroy' );
            $.contextMenu({
                selector: ".listElement",
                    items: {
                        foo: {name: "Forget Strip", callback: function(key, opt){
                            var obj = $(this).data("object")
                            $(self).trigger("ForgetStrip",[obj.id]);
                        }},
                        //bar: {name: "Boo", callback: function(key, opt){ console.log("bar arguments: ",arguments); }},
                    }
            });

            $(selectList).on("change",_.bind(this.stripSelected,this));
        },
        stripElementRenderer:function(strip,$el) {
            var name = strip.name;
            if (!name) name = "Unknown Strip";

            if ($el) {
                $el.find(".name").text(name);
                $el.find(".version").text(strip.firmware);
                $el.find(".version").toggleClass("outofdate",strip.firmware != this.latestRelease);
                var statusClass = strip._connection ? "connected" : "error";
                $el.find(".statusIndicator").removeClass("connected").removeClass("error").addClass(statusClass);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                var statusClass = strip._connection ? "connected" : "error";
                $el.append($("<span class='statusIndicator'></span>").addClass(statusClass));
                $el.append($("<span class='name'></span>").text(name));
                $el.append($("<span class='version'></span>").text(strip.firmware));

                $el.find(".version").toggleClass("outofdate",strip.firmware != this.latestRelease);
                $(strip).on("LatestReleaseUpdated",_.bind(function() {
                    $el.find(".version").toggleClass("outofdate",strip.firmware != this.latestRelease);
                },this));

                var $onoff = $("<button class='powerButton'><span class='glyphicon glyphicon-off'></span></button>");
                $onoff.toggleClass("on",strip.power == 1);
                $(strip).on("Strip.StatusUpdated",function() {
                    $onoff.toggleClass("on",strip.power == 1);
                });

                $onoff.click(_.bind(function(e) {
                    if ($onoff.hasClass("on")) {
                        this.send("ToggleStrip",strip.id,0);
                        $onoff.toggleClass("on",false);
                    } else {
                        this.send("ToggleStrip",strip.id,1);
                        $onoff.toggleClass("on",true);
                    }
                    e.stopPropagation();
                    return false;
                },this));
                $el.append($onoff);

            }
            return $el;
        },
        setStrips:function(stripData) {
            this.stripData = stripData;
            this.showStripList();
        }
    });


    return This;
});
