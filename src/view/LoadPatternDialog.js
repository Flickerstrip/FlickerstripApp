var sandbox = require("sandbox");

define(["jquery","tinycolor","view/util.js","view/SelectList.js","view/patterns.js","view/LEDStripRenderer.js","view/EditPatternDialog.js","view/DownloadPatternsDialog.js","view/ControlsView.js","view/LoginDialog.js","text!tmpl/loadPatternDialogMobile.html","text!tmpl/loadPatternDialog.html"],
function($,tinycolor,util,SelectList,patterns,LEDStripRenderer,EditPatternDialog,DownloadPatternsDialog,ControlsView,LoginDialog,mobile_template,desktop_template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(conduit,gui) {
            this.conduit = conduit;
            this.gui = gui;
            this.$el = $("<div class='loadPatternDialog largemodal'/>");

            this.$el.append(platform == "mobile" ? mobile_template : desktop_template);
            this.$el = this.$el.children();
            this.$choices = this.$el.find(".patternChoices")
            this.$preview = this.$el.find(".patternPreview");
            this.$config = this.$el.find(".patternConfiguration");

            var ledCount = 150;
            this.stripRenderer = new LEDStripRenderer(ledCount);
            this.$preview.empty().append(this.stripRenderer.$el);
            setTimeout(_.bind(function() {
                this.stripRenderer.resizeToParent();
            },this),5);

            this.$el.find(".downloadPatterns").click(_.bind(this.downloadPatternsButtonClicked,this));
            this.$el.find(".createPattern").click(_.bind(this.createPatternClicked,this));
            this.$el.find(".uploadPattern").click(_.bind(this.uploadPatternClicked,this));
            this.$el.find(".editPattern").click(_.bind(this.editPatternClicked,this));
            this.$el.find(".loadPatternButton").click(_.bind(this.loadPatternButtonClicked,this));
            this.$el.find(".previewPatternButton").click(_.bind(this.previewPatternButtonClicked,this));
            this.$el.find(".hideButton").click(_.bind(this.hide,this));
            this.$el.find(".backButton").click(_.bind(function() {
                this.patternOptions.deselect();
                $(document.body).removeClass("configurePatternShowing");
            },this));

            $(this.gui).on("PatternsLoaded",_.bind(this.patternsLoaded,this));
            this.patternsLoaded();
        },
        patternsLoaded:function() {
            this.patternOptions = new SelectList(this.gui.patterns,this.patternOptionRenderer,{multiple:false});
            this.$choices.empty().append(this.patternOptions.$el);

            this.$el.find(".patternTitle").empty();
            this.stripRenderer.setPattern(null);
            this.$el.find(".patternConfiguration").empty();

            $(this.patternOptions).on("change",_.bind(this.patternSelected,this));
        },
        uploadPattern:function() {
            if (!this.selectedPatternObject) return;
            console.log("upload pattern called",this.selectedPatternObject);
            this.conduit.request("UploadPattern",this.selectedPatternObject,_.bind(function() {

            },this));
        },
        uploadPatternClicked:function() {
            if (!this.selectedPatternObject) return;
            this.conduit.request("GetUser",_.bind(function(user) {
                if (!user)  {
                    this.loginDialog = new LoginDialog(this.conduit).show();
                    $(this.loginDialog).on("Login",_.bind(function(e,user,password) {
                        this.conduit.request("SaveCredentials",user,password,_.bind(function() {
                            this.uploadPattern();
                        },this));
                    },this));
                } else {
                    this.uploadPattern();
                }
            },this));
        },
        createPatternClicked:function(e) {
            this.editPatternDialog = new EditPatternDialog(this.conduit,this.gui,{}).show();
            $(this.editPatternDialog).on("Save",_.bind(function(e,pattern) {
                this.conduit.emit("SavePattern",pattern);
                this.editPatternDialog.hide();
            },this));
        },
        downloadPatternsButtonClicked:function(e) {
            this.downloadPatternsDialog = new DownloadPatternsDialog(this.conduit,this.gui).show();
            $(this.downloadPatternsDialog).on("DownloadPattern",_.bind(function(e,pattern) {
                this.conduit.emit("SavePattern",pattern);
            },this));
        },
        editPatternClicked:function(e) {
            this.editPatternDialog = new EditPatternDialog(this.conduit,this.gui,this.selectedPatternObject).show();
            $(this.editPatternDialog).on("Save",_.bind(function(e,pattern) {
                this.conduit.emit("SavePattern",pattern);
                this.editPatternDialog.hide();
            },this));
        },
        loadPatternButtonClicked:function(e) {
            this.hide();

            setTimeout(_.bind(function() { //this is to fix a weird delay that was happening when dismissing the dialog..
                var pattern = this.getPattern(this.activePattern)
                var pixelData = this.generatePattern();
                $(this).trigger("LoadPatternClicked",[this.activePattern.name,pattern.fps,pixelData,false]);
            },this),5);
        },
        previewPatternButtonClicked:function(e) {
            setTimeout(_.bind(function() { //this is to fix a weird delay that was happening when dismissing the dialog..
                var pattern = this.getPattern(this.activePattern)
                var pixelData = this.generatePattern();
                $(this).trigger("LoadPatternClicked",[this.activePattern.name,pattern.fps,pixelData,true]);
            },this),5);
        },
        getPattern:function(patternSpec) {
            if (typeof(patternSpec.pattern) === "function") return patternSpec.pattern(this.controlView ? this.controlView.getValues() : null);
            return patternSpec.pattern;
        },
        generatePattern:function() {
            var pattern = this.getPattern(this.activePattern);
            var render = pattern.render;
            var pixelValues = [];
            for (var t=0;t<pattern.frames; t++) {
                var timeSlice = [];
                for (var x=0;x<pattern.pixels; x++) {
                    var c = new tinycolor(render(x,t)).toRgb();
                    timeSlice.push(c.r,c.g,c.b);
                }
                pixelValues[t] = timeSlice;
            }
            return pixelValues;
        },
        patternSelected:function(e,selectedObjects,selectedIndexes) {
            if (selectedObjects.length == 0) return;

            $(document.body).addClass("configurePatternShowing"); //for mobile

            var patternObject = selectedObjects[0];
            this.selectedPatternObject = patternObject;
            var patternSpec = eval("("+patternObject.body+")");

            if (patternSpec.controls) {
                this.controlView = new ControlsView(this.window,patternSpec.controls,{});
                $(this.controlView).on("Change",_.bind(this.controlsUpdated,this));
            } else {
                this.controlView = null;
            }

            var pattern = this.getPattern(patternSpec);
            this.activePattern = patternSpec;

            this.stripRenderer.setPattern(pattern);

            //update titlebar
            var frameInfo = pattern.frames > 1 ? (pattern.frames/pattern.fps).toFixed(2)+"s" : "static";
            this.$el.find(".patternTitle").text(patternObject.name+ " ("+frameInfo+")");

            this.$config.empty();
            setTimeout(_.bind(function() {
                if (this.controlView) {
                    this.$config.append(this.controlView.el);
                    this.$config.removeClass("nocontrols");
                } else {
                    this.$config.addClass("nocontrols");
                    this.$config.text("No controls for this pattern");
                }
            },this),5);
        },
        controlsUpdated:function(e,$el) {
            var controlValues = this.controlView.getValues();
            var patternSpec = this.activePattern;
            var pattern = this.getPattern(patternSpec);
            this.stripRenderer.setPattern(pattern);

            var frameInfo = pattern.frames > 1 ? (pattern.frames/pattern.fps).toFixed(2)+"s" : "static";
            this.$el.find(".patternTitle").text(patternSpec.name+ " ("+frameInfo+")");
        },

        patternOptionRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                $el.append($("<span class='name'></span>").text(pattern.name));
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
