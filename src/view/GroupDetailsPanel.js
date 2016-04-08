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

            util.bindClickEvent(this.$el.find(".backButton"),_.bind(function(e) {
                $(this).trigger("GroupDetailsDismissed");
                e.stopPropagation ? e.stopPropagation() : e.srcEvent.stopPropagation();
            },this));

            _.each(this.strips,_.bind(function(strip) {
                $(strip).on("NameUpdated",_.bind(this.statusUpdated,this));
            },this));

            this.statusUpdated();

            util.bindClickEvent(this.$el.find(".createGroupFromSelected"),_.bind(this.createGroupClicked,this));
            util.bindClickEvent(this.$el.find(".groupNextPattern"),_.bind(this.groupNextPattern,this));

            if (platform == "mobile") {
                util.bindClickEvent(this.$el.find(".navigationBar"),_.bind(this.showDetailsClicked,this));
            } else {
                this.$el.find(".stripInfoButton").click(_.bind(this.showDetailsClicked,this));
            }

            util.bindClickEvent(this.$el.find(".loadPattern"),_.bind(this.loadPatternClicked,this));
            util.bindClickEvent(this.$el.find(".uploadFirmware"),_.bind(this.uploadFirmwareClicked,this));

            util.bindClickEvent(this.$el.find(".disconnectStripButton"),_.bind(function() {
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

                //update header
                var $header = this.$el.find(".stripHeader");
                $header.find(".identifierValue").text(strip.id);
                var name = strip.name || "Unknown Strip";
                $header.find(".name").text(name);

                this.$el.toggleClass("disconnected",!strip.visible);

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

				var renderedPatternHash = _.pluck(strip.patterns,"name").join("\t");
				if (renderedPatternHash == this.renderedPatternHash) return; //most times the patterns are identical
				this.renderedPatternHash = renderedPatternHash;

                //update pattern space available indicator
                var percent = Math.floor(100*strip.memory.used/strip.memory.total);
                this.$el.find(".spaceAvailableIndicator").css("width",percent+"%").text(percent+"% used");
            } else {
                this.$el.find(".stripHeader .name").text("Multiple selected");
            }

            if (this.strips.length > 1) {
                var allPatternsByName = {};
                var allPatternsList = [];
                _.each(this.strips,function(strip) {
                    _.each(strip.patterns,function(pattern) {
                        if (!allPatternsByName[pattern.name]) {
                            var patternWrapper = {name:pattern.name,strips:{}};
                            allPatternsByName[pattern.name] = patternWrapper;
                            allPatternsList.push(patternWrapper);
                        }
                        allPatternsByName[pattern.name]["strips"][strip.id] = pattern.index;
                    });
                });

                _.each(allPatternsList,_.bind(function(pattern) {
                    var stripMembership = Object.keys(pattern["strips"]).length;
                    pattern.patternInGroup = stripMembership;
                    if (stripMembership == this.strips.length) pattern.patternInGroup = true;
                },this));

                this.patternList = new SelectList(allPatternsList,this.patternListRenderer,this);
                //if (strip.selectedPattern !== undefined) this.patternList.select(strip.selectedPattern);
                $(this.patternList).change(_.bind(this.patternSelected,this));
                this.$el.find(".patterns").empty().append(this.patternList.$el);
            }
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
                    if (!isPreview) this.patternDialog.hide();
                },this));
            }
        },
        forgetPatternClicked:function(e) {
            if (this.strips.length == 1) {
                var strip = this.strips[0];
                var pattern = $(e.target).closest(".listElement").data("object");
                this.conduit.emit("ForgetPattern",strip.id,pattern.index);

                e.preventDefault();
                e.stopPropagation ? e.stopPropagation() : e.srcEvent.stopPropagation();
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
            } else if (this.strips.length > 1) {
                var selectedPattern = selectedItems[0]
                _.each(selectedPattern.strips,_.bind(function(index,id) {
                    this.conduit.emit("SelectPattern",id,index);
                },this));
            }
        },
        patternListRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                //var $select = $("<button class='selectPattern btn btn-success'><span class='glyphicon glyphicon-play'></span></button>");
                var $forget;
			    if (platform == "desktop") {
					$forget = $("<button class='forgetPattern btn btn-danger'><span class='glyphicon glyphicon-minus'></span></button>");
				} else {
					$forget = $("<button class='mobileSlideButton forgetPattern btn btn-danger'>Forget</span></button>");
				}

                $forget.on("click",_.bind(this.forgetPatternClicked,this));

                if (platform == "mobile") {
                    new Hammer($el.get(0)).on("panright",_.bind(function() {
                        if ($el.hasClass("showSlideButton")) {
                            $el.removeClass("showSlideButton");
                        } else {
                            this.$el.find(".listElement").removeClass("showSlideButton");
                            $el.addClass("showSlideButton");
                        }
                    },this)).on("panleft",_.bind(function() {
                        $el.removeClass("showSlideButton");
                    },this));
                }
                //$el.append($select);
                $el.append($("<span class='name'></span>").text(pattern.name));
                $el.append($("<span class='aside'></span>").text(pattern.patternInGroup === true ? "" : pattern.patternInGroup));
                if (pattern.patternInGroup != undefined && pattern.patternInGroup !== true) $el.addClass("disabled");
                $el.append($forget);
            }
            return $el;
        },
    });

    return This;
});
