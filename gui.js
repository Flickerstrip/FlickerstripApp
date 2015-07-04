var _ = require("underscore")._;
var fs = require("fs");
var $$ = require("jquery");
var util = require("./util");

define(['jquery','tinycolor','patterns.js','ControlsView.js','LEDStripRenderer.js', 'SelectList.js',"GroupDetailsPanel.js",'jquery.contextMenu'],
function($, tinycolor, patterns, ControlsView, LEDStripRenderer, SelectList, GroupDetailsPanel) {
    var stripListTemplate = util.loadTemplate("./stripList.html");

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

            this.showStripList();

            this.on("StripsUpdated",_.bind(function(e,stripData) {
                this.setStrips(stripData);
            },this));

            this.on("ReceivedPatternMetadata",_.bind(function(e,strip,patterns) {
                console.log("receive pattern metadata called..");
                if (this.groupDetails) console.log(this.groupDetails,this.groupDetails.strip.id,strip.id,patterns);
                if (this.groupDetails && this.groupDetails.strip.id == strip.id) {
                    console.log("refreshing patterns");
                    this.groupDetails.refreshPatterns(patterns);
                }
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
            this.groupDetails = new GroupDetailsPanel(this,strip);
            this.$el.find(".groupDetails").empty().append(this.groupDetails.$el);
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
        addDebugButtons:function() {
//            //debug buttons
//            var self = this;
//            var $div = $("<div />");
//            var $a = $("<a href='#' />").text("click A").click(_.bind(function() {
//                //self.sendStripData();
//            },this));
//            var $b = $("<a href='#' />").text("click B").click(_.bind(function() {
//                
//                //$(this.view).on("SavePattern",_.bind(function(e,id,name,address,fps,data) {
//                data = [
//                    [10,0,0],
//                    [0,10,0],
//                    [0,0,10]
//                ];
//                $$(self).trigger("SavePattern",[this.stripData[0].id,"pattern",0x400,1,data]);
//            },this));
//            $div.append($a).append("<br/>").append($b);
//            this.$el.find("#modes").after($div);
        },
        showStripList:function() {
            if (!(this.stripData && this.$el)) return;

            this.$el.empty();
            this.$el.append(stripListTemplate());

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

            //addDebugButtons();
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
