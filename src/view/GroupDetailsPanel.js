 define(['jquery',"view/util.js",'view/SelectList.js',"view/LoadPatternDialog.js","view/ProgressDialog.js","text!tmpl/groupDetailPanel.html","view/BrightnessControl.js","view/StripDetailsDialog.js","view/MobileLoadPatternDialog.js","hammer"],function($,util,SelectList,LoadPatternDialog,ProgressDialog,template,BrightnessControl,StripDetailsDialog,MobileLoadPatternDialog,Hammer) {

    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(conduit,strips,gui,group) {
            this.gui = gui;
            this.conduit = conduit;
            this.group = group;
            this.strips = strips;
            this.$el = $("<div class='groupDetails' />");
            this.$el.empty().append(template);

            this.brightnessControl = new BrightnessControl(this.$el.find(".brightnessControl"),this.conduit,this.strip);

            if (this.strips.length == 0) {
                this.$el.addClass("none-selected");
            } else if (this.group) {
                this.$el.addClass("group-selected");
            } else if (strips.length == 1) {
                var strip = this.strips[0];
                this.$el.addClass("one-selected");

                $(strip).on("Strip.StatusUpdated",_.bind(this.statusUpdated,this));

                $(this.brightnessControl).on("change",_.bind(function(e,val) {
                   this.conduit.emit("SetBrightness",strip.id,val); 
                },this));
            } else {
                this.$el.addClass("multiple-selected");
            }

            this.$el.find(".backButton").click(_.bind(function(e) {
                $(this).trigger("GroupDetailsDismissed");
                e.stopPropagation();
            },this));

            this.statusUpdated();

            this.$el.find(".createGroupFromSelected").click(_.bind(this.createGroupClicked,this));
            this.$el.find(".groupNextPattern").click(_.bind(this.groupNextPattern,this));

            this.$el.find(".navigationBar").click(_.bind(this.showDetailsClicked,this));

            this.$el.find(".loadPattern").on("click",_.bind(this.loadPatternClicked,this));
            this.$el.find(".uploadFirmware").on("click",_.bind(this.uploadFirmwareClicked,this));

            this.$el.find(".disconnectStripButton").on("click",_.bind(function() {
                this.conduit.emit("DisconnectStrip",this.strip.id);
            },this));
        },
        groupNextPattern:function() {
            _.each(this.strips,_.bind(function(strip) {
                this.conduit.emit("NextPattern",strip.id);
            },this));
        },
        createGroupClicked:function() {
            var groupName = prompt("Enter a name for your group");
            if (groupName == null) return;
            this.gui.setSelectedGroup(groupName);
        },
        showDetailsClicked:function() {
            this.detailsDialog = new StripDetailsDialog(this.conduit,this.strips,this.gui);
            this.detailsDialog.show();
        },
        statusUpdated:function() {
            if (this.strips.length == 0) {
               this.$el.find(".stripHeader .name").text("");
            } else if (this.group) {
                this.$el.find(".stripHeader .name").text("Group: "+this.group);
            } else if (this.strips.length == 1) {
                var strip = this.strips[0];

				var renderedPatternHash = _.pluck(strip.patterns,"name").join("\t");
				if (renderedPatternHash == this.renderedPatternHash) return; //most times the patterns are identical
				this.renderedPatternHash = renderedPatternHash;

                //update header
                var $header = this.$el.find(".stripHeader");
                $header.find(".identifierValue").text(strip.id);
                var name = strip.name || "Unknown Strip";
                $header.find(".name").text(name);

                if (!strip.status) return false; //we dont have any status information on this strip

                //Update firmware upload button visibility
                $(".uploadFirmware").toggle(this.gui.latestRelease != strip.firmware);

                //refresh patterns
                this.patternList = new SelectList(strip.patterns,this.patternListRenderer,this);
                if (strip.selectedPattern !== undefined) this.patternList.select(strip.selectedPattern);
                $(this.patternList).change(_.bind(this.patternSelected,this));
                this.$el.find(".patterns").empty().append(this.patternList.$el);

                //update brightness arrow
                this.brightnessControl.setBrightness(strip.brightness);

                //double click edit name of strip
                $header.find(".name").off("dblclick");
                util.doubleClickEditable($header.find(".name"),_.bind(function() {
                    strip.name = name;
                    $(strip).trigger("NameUpdated",strip.id,name);
                    this.conduit.emit("RenameStrip",strip.id,name);
                },this));

                //update strip status indicator
                var statusIndicator = $header.find(".statusIndicator").css("visibility","visible");
                statusIndicator.removeClass("unknown").removeClass("connected").removeClass("error");
                if (strip.visible) {
                    statusIndicator.addClass("connected").attr("title","connected");
                } else {
                    statusIndicator.addClass("error").attr("title","disconnected");
                }

                //update pattern space available indicator
                var percent = Math.floor(100*strip.memory.used/strip.memory.total);
                this.$el.find(".spaceAvailableIndicator").css("width",percent+"%").text(percent+"% used");
            } else {
                this.$el.find(".stripHeader .name").text("Multiple selected");
                console.log("multistrip update");
            }
        },
        selectPatternClicked:function(e) {
            var pattern = $(e.target).closest(".listElement").data("object");
            this.conduit.emit("SelectPattern",this.strip.id,pattern.index);
        },
        loadPatternClicked:function(e) {
            if (platform == "mobile") {
				this.patternDialog = new MobileLoadPatternDialog(this.conduit,this.gui);
				$(this.patternDialog).on("LoadPatternClicked",_.bind(this.savePattern,this));
				this.patternDialog.show();
			} else {
				this.patternDialog = new LoadPatternDialog(this.conduit,this.gui,this.strips);
				$(this.patternDialog).on("LoadPatternClicked",_.bind(this.savePattern,this));
				this.patternDialog.show();
			}
        },
        uploadFirmwareClicked:function(e) {
            this.conduit.emit("UploadFirmware",this.strip.id);
        },
        savePattern:function(e,renderedPattern,isPreview) {
            if (this.strips.length == 1) {
                var strip = this.strips[0];
                this.conduit.emit("LoadPattern",strip.id,renderedPattern,isPreview);
                $(strip).one("Strip.UploadPatternComplete",_.bind(function() {
                    this.patternDialog.hide();
                },this));
            }
        },
        forgetPatternClicked:function(e) {
            if (this.strips.length == 1) {
                var strip = this.strips[0];
                var pattern = $(e.target).closest(".listElement").data("object");
                this.conduit.emit("ForgetPattern",strip.id,pattern.index);

                e.preventDefault();
                e.stopPropagation();
                return true;
            }
        },
        patternSelected:function(e,selectedItems,selectedIndexes) {
            if (selectedItems.length == 0) return;
            if (this.strips.length == 1) {
                var strip = this.strips[0];
                this.$el.find(".listElement").removeClass("showDeleteButton");
                var selectedPattern = selectedItems[0]
                this.conduit.emit("SelectPattern",strip.id,selectedPattern.index);
            }
        },
        patternListRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                //var $select = $("<button class='selectPattern btn btn-success'><span class='glyphicon glyphicon-play'></span></button>");
                var $forget = $("<button class='forgetPattern btn btn-danger'><span class='mobileOnly'>Forget</span><span class='mobileHide glyphicon glyphicon-minus'></span></button>");

                $forget.on("click",_.bind(this.forgetPatternClicked,this));
                //$select.on("click",_.bind(this.selectPatternClicked,this));

                if (platform == "mobile") {
                    new Hammer($el.get(0)).on("panright",_.bind(function() {
                        if ($el.hasClass("showDeleteButton")) {
                            $el.removeClass("showDeleteButton");
                        } else {
                            this.$el.find(".listElement").removeClass("showDeleteButton");
                            $el.addClass("showDeleteButton");
                        }
                    },this)).on("panleft",_.bind(function() {
                        $el.removeClass("showDeleteButton");
                    },this));
                }
                //$el.append($select);
                $el.append($("<span class='name'></span>").text(pattern.name));
                $el.append($forget);
            }
            return $el;
        },
    });

    return This;
});
