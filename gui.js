var _ = require("underscore")._;
var $ = require("jquery");
var async = require("async");
var fs = require("fs");
var tinycolor = require("tinycolor2");
var SelectList = require("./SelectList");

var LEDStripRenderer = require("./LEDStripRenderer");

var patterns = [
	{
		name:"Solid Color",
		leds: 100,
		frames: 1,
		fps: 30,
		renderer: function(x,t) {
				return new tinycolor({r:255,g:0,b:0});
			}
	},
	{
		name:"Rainbow Fade",
		leds: 100,
		frames: 360,
		fps: 30,
		renderer: function(x,t) {
				var c = new tinycolor({h:t%360,s:100,v:100});
				return c;
			}
	},
	{
		name:"Color Pulse",
		leds: 100,
		frames: 200,
		fps: 30,
        controls: [
            {
                name: "Color",
                id: "color",
                type: "color",
                default: "#00f"
            }
        ],
		renderer: function(x,t,args) {
            t = t > 100 ? (100-(t-100)) : t;
            //console.log("t ",t);
            var color = tinycolor(args.color).toRgb();
            var r = color.r/2.0 + (color.r/2.0)*(t/100);
            var g = color.g/2.0 + (color.g/2.0)*(t/100);
            var b = color.b/2.0 + (color.b/2.0)*(t/100);
            //console.log("b: ",b);
            var c = new tinycolor({r:r,g:g,b:b});
            //var c = new tinycolor({r:args.color.r,g:args.color.g,b:args.color.b});
            return c;
        }
	},
	{
		name:"Rainbow Chase",
		leds: 100,
		frames: 100,
		fps: 30,
		renderer: function(x,t) {
				var c = new tinycolor({h:360*(((t+x)%100)/100),s:100,v:100});
				return c;
			}
	}
]
			
var This = function(document) {
	this.document = document;
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
	init:function(document) {
		this.$el = $(document.body);

		fs.readFile("./stripList.html", "ascii", _.bind(function(err,contents) {
			this.stripListTemplate = _.template(contents);

			this.showStripList();
		},this));


		this.showStripList();
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

		var $stripList = this.$el.find("#strip-list");
		$stripList.find("option").eq(this.selectedStrips[0].index).text(newval);

        $(this).trigger("StripNameUpdated",[strip.id,strip.name]);
	},
	showStripList:function() {
		if (!(this.stripData && this.$el && this.stripListTemplate)) return;

		this.$el.empty();
		this.$el.append(this.stripListTemplate());

		var $stripList = this.$el.find("#strip-list");
        var selectList = new SelectList(this.stripData,this.stripElementRenderer);
        $stripList.append(selectList.$el);

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

		var $preview = this.$el.find("#preview");
		var canvas = this.document.createElement("canvas");
        canvas.width = $preview.width();
        canvas.height = $preview.height();
		this.stripRenderer = new LEDStripRenderer(canvas);
		$preview.append(canvas);
	},
    stripElementRenderer:function(strip,$el) {
        if ($el) {
             //update
        } else {
            $el = $("<div class='listElement' />");
            statusClass = strip.visible ? "connected" : "error";
            $el.append($("<span class='statusIndicator'></span>").addClass(statusClass));
            $el.append(strip.name);
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
    computeControlValues:function(p,$el) {
        var data = {};
        _.each(p.controls,function(controlInfo) {
            var $fel = $el.find("[name='"+controlInfo.id+"']");
            var value = controlInfo.default;
            if ($fel.length) value = $fel.val();
            data[controlInfo.id] = value;
        });
        return data;
    },
    createControlForm:function(p) {
        var $form = $("<div />");
        _.each(p.controls,function(controlInfo) {
            var type = controlInfo.type;
            if (type == "foo") {

            } else {
                var $el = $("<input />");
                $el.attr("type",type);
                $el.attr("name",controlInfo.id);
                $el.val(tinycolor(controlInfo.default).toHexString());
                $form.append($el);
                $el.change(function() {
                    $form.trigger("Change",[$(this)]);
                });
            }
        });
        return $form;
    },
    controlsUpdated:function(e,$eel) {
        console.log(arguments);
        var controlValues = this.computeControlValues(this.activePattern,this.$el.find("#controls"));
        console.log(controlValues);
        var p = this.activePattern;
        this.stripRenderer.setRenderer(function(x,t) {
            return p.renderer(x,t,controlValues);
        });
    },
	activatePattern:function(index) {
		var p = patterns[index];
        this.activePattern = p;
		this.stripRenderer.setMetrics(p.leds,p.frames,p.fps);
        if (p.controls) {
            var $el = this.createControlForm(p);
            var controlValues = this.computeControlValues(p,$el)
            $el.on("Change",_.bind(this.controlsUpdated,this));
            this.$el.find("#controls").empty().append($el);
            console.log("control values: ",controlValues);
            this.stripRenderer.setRenderer(function(x,t) {
                return p.renderer(x,t,controlValues);
            });
        } else {
            this.stripRenderer.setRenderer(p.renderer);
        }
	},
	setStrips:function(stripData) {
		this.stripData = stripData;
		this.showStripList();
	}
});
module.exports = This;
