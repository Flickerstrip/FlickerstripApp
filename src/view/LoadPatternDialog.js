var sandbox = require("sandbox");

define(["jquery","tinycolor","view/util.js","view/ProgressDialog","view/SelectList.js","view/patterns.js","view/LEDStripRenderer.js","view/EditPatternDialog.js","view/DownloadPatternsDialog.js","view/ControlsView.js","view/LoginDialog.js","text!tmpl/loadPatternDialogMobile.html","text!tmpl/loadPatternDialog.html"],
function($,tinycolor,util,ProgressDialog,SelectList,patterns,LEDStripRenderer,EditPatternDialog,DownloadPatternsDialog,ControlsView,LoginDialog,mobile_template,desktop_template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(conduit,gui,strips) {
            this.conduit = conduit;
            this.gui = gui;
            this.$el = $("<div class='loadPatternDialog largemodal'/>");
            this.strips = strips;

            this.$el.append(platform == "mobile" ? mobile_template : desktop_template);
            this.$el = this.$el.children();
            this.$choices = this.$el.find(".patternChoices")
            this.$preview = this.$el.find(".patternPreview");
            this.$config = this.$el.find(".patternConfiguration");

            var ledCount = 150;
            this.stripRenderer = new LEDStripRenderer(ledCount);
            this.$preview.empty().append(this.stripRenderer.$el);
            this.$el.find(".downloadPatterns").click(_.bind(this.downloadPatternsButtonClicked,this));
            this.$el.find(".createPattern").click(_.bind(this.createPatternClicked,this));
            this.$el.find(".createPatternAdvanced").click(_.bind(this.createPatternAdvancedClicked,this));
            this.$el.find(".uploadPattern").click(_.bind(this.uploadPatternClicked,this));
            this.$el.find(".editPattern").click(_.bind(this.editPatternClicked,this));
            this.$el.find(".loadPatternButton").click(_.bind(this.loadPatternButtonClicked,this));
            this.$el.find(".previewPatternButton").click(_.bind(this.previewPatternButtonClicked,this));
            this.$el.find(".hideButton").click(_.bind(this.hide,this));
            this.$el.find(".backButton").click(_.bind(function() {
                this.patternOptions.deselect();
                this.$el.removeClass("deselected");
                $(document.body).removeClass("configurePatternShowing");
            },this));

            $(this.gui).on("PatternsLoaded",_.bind(this.patternsLoaded,this));
            this.patternsLoaded();

            _.each(strips,_.bind(function(strip) {
                $(strip).on("Strip.StatusUpdated",_.bind(this.updateButtonStatus,this));
            },this));
            this.updateButtonStatus();
        },
        updateButtonStatus:function() {
            var allVisible = _.reduce(this.strips,function(memo,item) {return memo = memo && item.visible},true);
            var $previewButton = this.$el.find(".previewPatternButton");
            var $loadButton  = this.$el.find(".loadPatternButton");

            $previewButton.toggleClass("disabled",!allVisible);
            $loadButton.toggleClass("disabled",!allVisible);

            if (allVisible) {
                $previewButton.attr("title","");
                $loadButton.attr("title","");
            } else {
                $previewButton.attr("title","Strip is disconnected!");
                $loadButton.attr("title","Strip is disconnected!");
            }
        },
        patternsLoaded:function() {
            this.$el.addClass("deselected");

            this.patternOptions = new SelectList(this.gui.patterns,this.patternOptionRenderer,{multiple:false});
            this.$choices.empty().append(this.patternOptions.$el);

            this.$el.find(".patternTitle").empty();
            this.stripRenderer.setPattern(null);
            this.$el.find(".patternConfiguration").empty();

            $(this.patternOptions).on("change",_.bind(this.patternSelected,this));
        },
        uploadPattern:function() {
            if (!this.selectedPatternObject) return;

            var progress = new ProgressDialog("Uploading pattern",true).show();
            this.conduit.request("UploadPattern",this.selectedPatternObject,_.bind(function() {
                progress.hide();
                this.$el.find(".uploadPattern").text("Uploaded!").addClass("disabled");
            },this));
        },
        uploadPatternClicked:function(e) {
            if ($(e.target).is(":disabled")) return;
            if (!this.selectedPatternObject) return;
            this.conduit.request("GetUser",_.bind(function(user) {
                if (!user)  {
                    this.loginDialog = new LoginDialog(this.conduit).show();
                    $(this.loginDialog).on("Login",_.bind(function(e,user,password,id) {
                        this.conduit.request("SaveCredentials",user,password,id,_.bind(function() {
                            this.uploadPattern();
                        },this));
                    },this));
                } else {
                    this.uploadPattern();
                }
            },this));
        },
        createPatternClicked:function(e) {
            this.editPatternDialog = new EditPatternDialog(this.conduit,this.gui,{"type":"bitmap"}).show();
            this.stripRenderer.stop();
            $(this.editPatternDialog).on("Save",_.bind(function(e,pattern) {
                this.conduit.emit("SavePattern",pattern);
                this.editPatternDialog.hide();
                this.stripRenderer.start();
            },this));
        },
        createPatternAdvancedClicked:function(e) {
            this.editPatternDialog = new EditPatternDialog(this.conduit,this.gui,{"type":"javascript"}).show();
            this.stripRenderer.stop();
            $(this.editPatternDialog).on("Save",_.bind(function(e,pattern) {
                this.conduit.emit("SavePattern",pattern);
                this.editPatternDialog.hide();
                this.stripRenderer.start();
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
            if ($(e.target).is(".disabled")) return;

            setTimeout(_.bind(function() { //this is to fix a weird delay that was happening when dismissing the dialog..
                util.evaluatePattern(this.selectedPatternObject,this.controlView ? this.controlView.getValues() : null);
                $(this).trigger("LoadPatternClicked",[this.selectedPatternObject,false]);
            },this),5);
        },
        previewPatternButtonClicked:function(e) {
            if ($(e.target).is(".disabled")) return;
            setTimeout(_.bind(function() { //this is to fix a weird delay that was happening when dismissing the dialog..
                util.evaluatePattern(this.selectedPatternObject,this.controlView ? this.controlView.getValues() : null);
                $(this).trigger("LoadPatternClicked",[this.selectedPatternObject,true]);
            },this),5);
        },
        patternSelected:function(e,selectedObjects,selectedIndexes) {
            this.$el.toggleClass("deselected",selectedObjects.length == 0);
            if (selectedObjects.length == 0) return;

            this.$el.find(".uploadPattern").text("Share Pattern").removeClass("disabled");

            $(document.body).addClass("configurePatternShowing"); //for mobile

            this.selectedPatternObject = selectedObjects[0];

            if (!this.selectedPatternObject.type) this.selectedPatternObject.type = "javascript"; //temporary hack TODO
            util.evaluatePattern(this.selectedPatternObject,null);

            if (this.selectedPatternObject.rendered.controls) {
                this.controlView = new ControlsView(this.window,this.selectedPatternObject.rendered.controls,{});
                $(this.controlView).on("Change",_.bind(this.controlsUpdated,this));
            } else {
                this.controlView = null;
            }

            this.stripRenderer.setPattern(this.selectedPatternObject.rendered);

            //update titlebar
            this.updateTitlebar(this.selectedPatternObject);

            this.$config.empty();
            setTimeout(_.bind(function() {
                this.stripRenderer.resizeToParent();

                if (this.controlView) {
                    this.$config.append(this.controlView.el);
                    this.$config.removeClass("nocontrols");
                } else {
                    this.$config.addClass("nocontrols");
                    this.$config.text("No controls for this pattern");
                }
            },this),5);
        },
        updateTitlebar:function() {
            var frameInfo = this.selectedPatternObject.rendered.frames > 1 ? (this.selectedPatternObject.rendered.frames/this.selectedPatternObject.rendered.fps).toFixed(2)+"s" : "static";
            this.$el.find(".patternTitle").text(this.selectedPatternObject.name+ " ("+frameInfo+")");
        },
        controlsUpdated:function(e,$el) {
            var args = this.controlView.getValues();
            util.evaluatePattern(this.selectedPatternObject,args);
            this.stripRenderer.setPattern(this.selectedPatternObject.rendered);

            this.updateTitlebar();
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
        },
    });

    return This;
});
