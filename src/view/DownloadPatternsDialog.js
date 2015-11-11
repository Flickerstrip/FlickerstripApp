var sandbox = require("sandbox");

define(["jquery","tinycolor","view/util.js","view/SelectList.js","view/patterns.js","view/LEDStripRenderer.js","view/ControlsView.js","text!tmpl/downloadPatternDialog.html"],
function($,tinycolor,util,SelectList,patterns,LEDStripRenderer,ControlsView,desktop_template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(conduit,gui) {
            this.conduit = conduit;
            this.gui = gui;
            this.$el = $("<div class='downloadPatternDialog largemodal'/>");

            this.$el.append(desktop_template);
            this.$el = this.$el.children();

            this.$el.find(".hideButton").click(_.bind(function() {
                this.hide()
            },this));

            this.$preview = this.$el.find(".patternPreview");

            var ledCount = 150;
            this.stripRenderer = new LEDStripRenderer(ledCount);
            this.$preview.empty().append(this.stripRenderer.$el);
            setTimeout(_.bind(function() {
                this.stripRenderer.resizeToParent();
            },this),5);

            this.conduit.request("RefreshServerPatterns",_.bind(function(patterns) {
                this.patternSelect = new SelectList(patterns,this.patternOptionRenderer,{multiple:false});
                this.$el.find(".serverPatterns").empty().append(this.patternSelect.$el);
                $(this.patternSelect).on("change",_.bind(this.patternSelected,this));
            },this));

            this.$el.find(".downloadPattern").click(_.bind(this.doDownloadPattern,this));
        },
        doDownloadPattern:function() {
            $(this).trigger("DownloadPattern",this.selectedPattern);
        },
        getPattern:function(patternSpec) { //TODO dedupe me
            var args = {};
            if (patternSpec.controls) {
                _.each(patternSpec.controls,function(control) {
                    args[control.id] = control.default;
                });
            }
            if (typeof(patternSpec.pattern) === "function") return patternSpec.pattern(args);
            return patternSpec.pattern;
        },
        patternSelected:function(e,selectedObjects,selectedIndexes) {
            if (selectedObjects.length == 0) return;

            var patternObject = selectedObjects[0];
            this.conduit.request("LoadServerPattern",patternObject.id,_.bind(function(id,body) {
                patternObject.body = body;
                this.selectedPattern = patternObject;
                var patternSpec = eval("("+body+")");

                var pattern = this.getPattern(patternSpec);

                this.stripRenderer.setPattern(pattern);

                //update titlebar
                var frameInfo = pattern.frames > 1 ? (pattern.frames/pattern.fps).toFixed(2)+"s" : "static";
                this.$el.find(".patternTitle").text(patternObject.name+ " ("+frameInfo+")");
            },this));
        },
        patternOptionRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
                $el.find(".aside").text(pattern.Owner.display);
            } else {
                $el = $("<ul class='list-group-item listElement' />");
                $el.append($("<span class='name'></span>").text(pattern.name));
                $el.append($("<span class='aside'></span>").text(pattern.Owner.display));
            }
            return $el;
        },
        show:function() {
            if (platform == "mobile") {
                var $mainContainer = $(document.body).find(".mainContainer");
                $mainContainer.append(this.$el);
            } else {
                $(document.body).append(this.$el);
                this.$el.modal('show');
            }
            
            setTimeout(function() {
                $(document.body).addClass("loadPatternShowing");
            },5);
            return this;
        },

        hide:function() {
            var $body = $(document.body);
            $(document.body).removeClass("loadPatternShowing");
            $(document.body).removeClass("configurePatternShowing");
            $(document.body).find(".hideButton").unbind("click");

            if (platform == "desktop") {
                this.$el.modal('hide');
                this.$el.remove();
            } else if (platform == "mobile") {
                setInterval(_.bind(function() { //delay until the animation finishes
                    this.$el.remove();
                },this),500);
            }

            return this;
        }
    });

    return This;
});
