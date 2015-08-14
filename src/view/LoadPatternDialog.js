define(["jquery","view/util.js","view/SelectList.js","view/patterns.js","view/LEDStripRenderer.js","view/ControlsView.js","text!tmpl/loadPatternDialog.html"],
function($,util,SelectList,patterns,LEDStripRenderer,ControlsView,template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(strip) {
            this.$el = $("<div class='loadPatternDialog'/>");

            this.$el.append(template);
            this.$choices = this.$el.find(".patternChoices")
            this.$preview = this.$el.find(".patternPreview");
            this.$config = this.$el.find(".patternConfiguration");

            this.patternOptions = new SelectList(patterns,this.patternOptionRenderer,{multiple:false});
            this.$choices.empty().append(this.patternOptions.$el);

            this.stripRenderer = new LEDStripRenderer();
            this.$preview.empty().append(this.stripRenderer.$el);

            $(this.patternOptions).on("change",_.bind(this.patternSelected,this));

            this.$el.find(".loadPatternButton").click(_.bind(this.loadPatternButtonClicked,this));
            this.$el.find(".hideButton").click(_.bind(this.hide,this));
        },
        loadPatternButtonClicked:function(e) {
            this.hide();

            setTimeout(_.bind(function() { //this is to fix a weird delay that was happening when dismissing the dialog..
                var pattern = this.generatePattern();
                $(this).trigger("LoadPatternClicked",[this.activePattern.name,this.activePattern.fps,pattern]);
            },this),5);
        },
        generatePattern:function() {
            var renderer = this.stripRenderer.getRenderer();
            var pixelValues = [];
            for (var t=0;t<this.activePattern.frames; t++) {
                var timeSlice = [];
                for (var x=0;x<this.activePattern.leds; x++) {
                    var c = renderer(x,t).toRgb();
                    timeSlice.push(c.r,c.g,c.b);
                }
                pixelValues[t] = timeSlice;
            }
            return pixelValues;
        },
        patternSelected:function(e,selectedObjects,selectedIndexes) {
            var pattern = selectedObjects[0];
            this.activePattern = pattern;

            this.stripRenderer.setMetrics(pattern.leds,pattern.frames,pattern.fps); //TODO rewrite this
            this.$config.empty();

            if (pattern.controls) {
                this.controlView = new ControlsView(this.window,pattern.controls,{});
                var controlValues = this.controlView.getValues();
                $(this.controlView).on("Change",_.bind(this.controlsUpdated,this));
                this.$config.append(this.controlView.el);
                this.stripRenderer.setRenderer(function(x,t) {
                    return pattern.renderer(x,t,controlValues);
                });
            } else {
                this.stripRenderer.setRenderer(pattern.renderer);
            }
        },
        controlsUpdated:function(e,$el) {
            var controlValues = this.controlView.getValues();
            var pattern = this.activePattern;
            this.stripRenderer.setRenderer(function(x,t) {
                return pattern.renderer(x,t,controlValues);
            });
        },

        patternOptionRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
            } else {
                $el = $("<ul class='list-group-item listElement' />");
                $el.append($("<span class='name'></span>").text(pattern.name));
            }
            return $el;
        },

        show:function() {
            var $mainContainer = $(document.body).find(".mainContainer");
            $mainContainer.append(this.$el);
            if (platform == "desktop") this.$el.modal('show');
            setTimeout(function() {
                $(document.body).addClass("loadPatternShowing");
            },5);
        },

        hide:function() {
            console.log("hide called.. ");
            var $body = $(document.body);
            $body.removeClass("loadPatternShowing");
            $(document.body).find(".hideButton").unbind("click");

            if (platform == "desktop") {
                this.$el.modal('hide');
                this.$el.remove();
            } else if (platform == "mobile") {
                setInterval(_.bind(function() { //delay until the animation finishes
                    this.$el.remove();
                },this),500);
            }
        }
    });

    return This;
});
