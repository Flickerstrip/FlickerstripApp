define(["jquery","tinycolor","view/util.js","view/SelectList.js","view/patterns.js","view/LEDStripRenderer.js","view/ControlsView.js","text!tmpl/loadPatternDialogMobile.html"],
function($,tinycolor,util,SelectList,patterns,LEDStripRenderer,ControlsView,template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(conduit,gui) {
            this.conduit = conduit;
            this.gui = gui;
            this.$el = $("<div class='loadPatternDialog'/>");

            this.$el.append(template);
            this.$el = this.$el.children();
			this.$preview = this.$el.find(".preview");

			this.$el.find(".loadPatternButton").click(_.bind(this.loadPatternClicked,this));
			this.$el.find(".previewPatternButton").click(_.bind(this.previewPatternClicked,this));

            this.$el.find(".hideButton").click(_.bind(function() {
                this.hide()
            },this));

            var ledCount = 150;
            this.stripRenderer = new LEDStripRenderer(ledCount);
            this.$preview.empty().append(this.stripRenderer.$el);
            this.$el.find(".serverPatterns").addClass("empty");
            this.refreshPatterns();
        },
        refreshPatterns:function() {
            this.$el.find(".right").addClass("deselected");
            this.conduit.request("RefreshServerPatterns",_.bind(function(patterns) {
                this.patternSelect = new SelectList(patterns,this.patternOptionRenderer,{multiple:false});
                this.$el.find(".serverPatterns").empty().append(this.patternSelect.$el).removeClass("empty");
                $(this.patternSelect).on("change",_.bind(this.patternSelected,this));
            },this));
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
	    previewPatternClicked:function() {
			util.evaluatePattern(this.selectedPattern,null);
			this.conduit.emit("LoadPattern",this.gui.selectedStrips[0].id,this.selectedPattern,true);
	    },
	    loadPatternClicked:function() {
			util.evaluatePattern(this.selectedPattern,null);
			this.conduit.emit("LoadPattern",this.gui.selectedStrips[0].id,this.selectedPattern,false);
			this.hide();
	    },
        patternSelected:function(e,selectedObjects,selectedIndexes) {
            if (selectedObjects.length == 0) return;

            var pattern = selectedObjects[0];
            this.conduit.request("LoadServerPattern",pattern.id,_.bind(function(id,body) {
                if (pattern.type == "bitmap") {
					var binary_string =  window.atob(body);
					var len = binary_string.length;
					var bytes = [];
					for (var i = 0; i < len; i++) {
						bytes[i] = binary_string.charCodeAt(i);
					}
					body = bytes;
                }
                pattern.body = body;
                this.selectedPattern = pattern;
                if (!pattern.type) pattern.type = "javascript";
                util.evaluatePattern(this.selectedPattern);

                this.stripRenderer.setPattern(pattern.rendered);

                setTimeout(_.bind(function() {
                    this.stripRenderer.resizeToParent();
                },this),5);
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
        },

        hide:function() {
            var $body = $(document.body);
            $(document.body).removeClass("loadPatternShowing");
            $(document.body).removeClass("configurePatternShowing");
            this.$el.find(".hideButton").unbind("click");

            if (platform == "desktop") {
                this.$el.modal('hide');
                this.$el.remove();
            } else if (platform == "mobile") {
                setInterval(_.bind(function() { //delay until the animation finishes
                    this.$el.remove();
                },this),500);
            }
            this.destroy();
        },

        destroy:function() {
            this.stripRenderer.destroy();
        }
    });

    return This;
});