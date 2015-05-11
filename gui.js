var _ = require("underscore")._;
var fs = require("fs");

define(['jquery','tinycolor','patterns.js','ControlsView.js','LEDStripRenderer.js', 'SelectList.js','jquery.contextMenu'],
function($, tinycolor, patterns, ControlsView, LEDStripRenderer, SelectList) {
    var This = function(window) {
        this.window = window;
        var document = window.document;
        this.document = window.document;
        $(document).ready(_.bind(function() {
            this.init(document);

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
        stripData:null,
        canvas:null,
        stripListComponent:null,
        stripRenderer:null,
        activePattern:null,
        init:function(document) {
            this.$el = $(document.body);

            fs.readFile("./stripList.html", "ascii", _.bind(function(err,contents) {
                this.stripListTemplate = _.template(contents);

                this.showStripList();
            },this));


            this.showStripList();

            this.on("StripsUpdated",_.bind(function(e,stripData) {
                this.setStrips(stripData);
            },this));
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
        },
        selectSingleStrip:function(strip) {
            this.$el.find("#identifierValue").show().text(strip.id);
            this.$el.find("#nameValue").text(strip.name);

            this.$el.find("#nameValue").off("dblclick");
            this.doubleClickEditable(this.$el.find("#nameValue"),_.bind(this.nameUpdated,this));

            var statusIndicator = this.$el.find("#activeStrip .statusIndicator").css("visibility","visible");
            statusIndicator.removeClass("unknown").removeClass("connected").removeClass("error");
            if (strip.visible) {
                statusIndicator.addClass("connected").attr("title","connected");
            } else {
                statusIndicator.addClass("error").attr("title","disconnected");
            }
        },
        selectMultipleStrips:function(strips){
            var $el = this.$el.find("#activeStrip");
            $el.find("#nameValue").off("dblclick");
            $el.find("#identifierValue").hide();
            $el.find("#nameValue").text(strips.length+" selected");
            $el.find(".statusIndicator").css("visibility","hidden");
        },
        nameUpdated:function(newval) {
            var strip = this.selectedStrips[0];
            strip.name = newval;

            this.selectList.refresh();

            $(this).trigger("StripNameUpdated",[strip.id,strip.name]);
        },
        showStripList:function() {
            if (!(this.stripData && this.$el && this.stripListTemplate)) return;

            this.$el.empty();
            this.$el.append(this.stripListTemplate());

            this.activePattern = null; //todo: select correct pattern
            var $stripList = this.$el.find("#strip-list");
            var selectList = new SelectList(this.stripData,this.stripElementRenderer);
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

            var $modes = this.$el.find("#modes");
            _.each(patterns,_.bind(function(pat,index) {
                $modes.append($("<div class='mode-bubble'>").text(pat.name).data("index",index));
            },this));

            $modes.children().click(_.bind(function(e) {
                var $el = $(e.target);

                $modes.children().removeClass("selected");
                $el.addClass("selected");

                this.activatePattern($el.data("index"));
            },this));

            //debug buttons
            /*var $div = $("<div />");
            var $a = $("<a href='#' />").text("click A").click(_.bind(function() {
                self.sendStripData();
            },this));
            var $b = $("<a href='#' />").text("click B").click(_.bind(function() {
                $(self).trigger("SendData",[this.stripData[0].id,"50,0,0"]);
            },this));
            $div.append($a).append("<br/>").append($b);
            this.$el.find("#modes").after($div);
            */

            var $preview = this.$el.find("#preview");
            var canvas = this.document.createElement("canvas");
            canvas.width = $preview.width();
            canvas.height = $preview.height();
            this.stripRenderer = new LEDStripRenderer(canvas);
            $preview.append(canvas);
        },
        stripElementRenderer:function(strip,$el) {
            if ($el) {
                $el.find(".stripName").text(strip.name);
                var statusClass = strip.visible ? "connected" : "error";
                $el.find(".statusIndicator").removeClass("connected").removeClass("error").addClass(statusClass);
            } else {
                $el = $("<div class='listElement' />");
                var statusClass = strip.visible ? "connected" : "error";
                $el.append($("<span class='statusIndicator'></span>").addClass(statusClass));
                $el.append($("<span class='stripName'></span>").text(strip.name));
            }
            return $el;
        },
        doubleClickEditable:function($el,editCallback) {
            $el.dblclick(_.bind(function(e) {
                if ($el.find("input").length) return;
                var $input = $("<input class='seamless'>");
                $input.height($el.height());
                var oldval = $el.text();
                $input.val(oldval);
                $el.empty().append($input);
                $input.focus();
                $input.blur(_.bind(function() {
                    var newval = $input.val();
                    $el.empty();
                    $el.text(newval);
                    editCallback(newval);
                },this));
            },this));

        },
        controlsUpdated:function(e,$eel) {
            var controlValues = this.controlView.getValues();
            var p = this.activePattern;
            this.stripRenderer.setRenderer(function(x,t) {
                return p.renderer(x,t,controlValues);
            });
        },
        activatePattern:function(index) {
            var p = patterns[index];
            this.activePattern = p;
            this.stripRenderer.setMetrics(p.leds,p.frames,p.fps);
            this.$el.find("#controls").empty();
            if (p.controls) {
                this.controlView = new ControlsView(this.window,p.controls,{});
                var controlValues = this.controlView.getValues();
                $(this.controlView).on("Change",_.bind(this.controlsUpdated,this));
                this.$el.find("#controls").append(this.controlView.el);
                this.stripRenderer.setRenderer(function(x,t) {
                    return p.renderer(x,t,controlValues);
                });
            } else {
                this.stripRenderer.setRenderer(p.renderer);
            }
            console.log("activeating pattern",this.selectedStrips);
            this.trigger("PatternActivated",[this.selectedStrips]);
        },
        setStrips:function(stripData) {
            this.stripData = stripData;
            this.showStripList();
        },
        on:function(evt,cb) {
            $(this).on(evt,cb);
        },
        trigger:function(evt,args) {
            $(this).trigger(evt,args);
        },
    });


    return This;
});
