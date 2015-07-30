define(['jquery','underscore','util.js','tinycolor','ControlsView.js','LEDStripRenderer.js', 'SelectList.js',"GroupDetailsPanel.js","text!../tmpl/stripList.html",'jquery.contextMenu'],
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

            this.render();
        },
        eventHandler:function() {
            if (arguments[0].indexOf("Strip.") === 0) {
                var strip = this.findStripId(arguments[1]);
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
            this.selectList.addElement(strip);
            var self = this;
            $(strip).on("Strip.Connected",_.bind(function() {
                strip.connection = true;
                self.selectList.updateElement(strip);
            },this));
            $(strip).on("Strip.Disconnected",_.bind(function() {
                strip.connection = false;
                self.selectList.updateElement(strip);
            },this));
            $(strip).on("NameUpdated",function(strip) {
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
        },
        selectSingleStrip:function(strip) {
            this.groupDetails = new GroupDetailsPanel(this.send,strip);
            this.$el.find(".groupDetails").empty().append(this.groupDetails.$el);
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
            this.$el.append(_.template(template)());

            this.activePattern = null; //todo: select correct pattern
            var $stripList = this.$el.find("#strip-list");
            var selectList = new SelectList([],this.stripElementRenderer);
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
                $el.find(".stripName").text(name);
                var statusClass = strip.connection ? "connected" : "error";
                $el.find(".statusIndicator").removeClass("connected").removeClass("error").addClass(statusClass);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                var statusClass = strip.connection ? "connected" : "error";
                $el.append($("<span class='statusIndicator'></span>").addClass(statusClass));
                $el.append($("<span class='stripName'></span>").text(name));
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
