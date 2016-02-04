define(["jquery","tinycolor","view/util.js","view/SelectList.js","view/patterns.js","view/LEDStripRenderer.js","view/ControlsView.js","view/EditPatternDialog.js","view/Tabs.js","text!tmpl/loadPatternDialogMobile.html"],
function($,tinycolor,util,SelectList,patterns,LEDStripRenderer,ControlsView,EditPatternDialog,Tabs,template) {
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

            this.tabs = new Tabs({
                "basic":{"label":"Basic","default":true},
                "user":{"label":"User"},
                "server":{"label":"Shared"}
            });

            this.$el.find(".createPattern").hide().click(_.bind(function() {
                this.editPatternDialog = new EditPatternDialog(this.conduit,this.gui,{"type":"bitmap"}).show();
                this.stripRenderer.stop();
                $(this.editPatternDialog).on("Save",_.bind(function(e,pattern) {
                    this.conduit.emit("SavePattern",pattern);
                    this.editPatternDialog.hide();
                    this.stripRenderer.start();
                },this));
            },this));

            $(this.tabs).on("select",_.bind(function(e,key) {
                this.$el.find(".createPattern").toggle(key == "user");
                if (key == "basic") this.showPatterns(this.gui.basicPatterns);
                if (key == "user") this.showPatterns(this.gui.userPatterns);
                if (key == "server") this.refreshPatterns();
            },this));
            this.$el.find(".tabs").append(this.tabs.$el);
            this.showPatterns(this.gui.basicPatterns);
            $(this.gui).on("BasicPatternsLoaded PatternsLoaded",_.bind(function() {
                var key = this.tabs.getSelectedKey();
                if (key == "basic") this.showPatterns(this.gui.basicPatterns);
                if (key == "user") this.showPatterns(this.gui.userPatterns);
            },this));

			this.$el.find(".loadPatternButton").click(_.bind(this.loadPatternClicked,this));
			this.$el.find(".previewPatternButton").click(_.bind(this.previewPatternClicked,this));

            this.$el.find(".hideButton").click(_.bind(function() {
                this.hide()
            },this));

            var ledCount = 150;
            this.stripRenderer = new LEDStripRenderer(ledCount);
            this.$preview.empty().append(this.stripRenderer.$el);
            this.$el.find(".patternlist").addClass("empty");
        },
        refreshPatterns:function() {
            this.$el.find(".right").addClass("deselected");
            this.conduit.request("RefreshServerPatterns",_.bind(function(patterns) {
                this.showPatterns(patterns);
            },this));
        },
        showPatterns:function(patterns) {
            console.log("showing patterns gui",patterns);
            this.patternSelect = new SelectList(patterns,this.patternOptionRenderer,{multiple:false});
            this.$el.find(".patternlist").empty().append(this.patternSelect.$el).removeClass("empty");
            $(this.patternSelect).on("change",_.bind(this.patternSelected,this));
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
            console.log("selected pattern",pattern);
            if (!pattern.body && pattern.id) {
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
            } else {
                this.selectedPattern = pattern;
                util.evaluatePattern(this.selectedPattern);
                this.stripRenderer.setPattern(pattern.rendered);

                setTimeout(_.bind(function() {
                    this.stripRenderer.resizeToParent();
                },this),5);
            }
        },
        patternOptionRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
                var aside = pattern.Owner ? pattern.Owner.display : "";
                $el.find(".aside").text(aside); 
            } else {
                $el = $("<ul class='list-group-item listElement' />");
                $el.append($("<span class='name'></span>").text(pattern.name));
                var aside = pattern.Owner ? pattern.Owner.display : "";
                $el.append($("<span class='aside'></span>").text(aside));
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
