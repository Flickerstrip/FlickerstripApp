define(['jquery',"view/util.js",'view/SelectList.js',"view/LoadPatternDialog.js","view/ProgressDialog.js","text!tmpl/groupDetailPanel.html","view/BrightnessControl.js","view/StripDetailsDialog.js","jquery.touchwipe.min"],function($,util,SelectList,LoadPatternDialog,ProgressDialog,template,BrightnessControl,StripDetailsDialog) {

    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(send,strip,gui) {
            this.gui = gui;
            this.send = send;
            this.$el = $("<div class='groupDetails' />");
            this.$el.empty().append(template);
            this.strip = strip;
            if (strip && strip.patterns) this.refreshPatterns();
            if (strip && strip.memory) this.updateAvailableIndicator(strip.memory.used,strip.memory.total);
            if (strip && strip.brightness) this.$el.find(".brightnessField").val(strip.brightness);

            $(strip).on("Strip.StatusUpdated",_.bind(this.statusUpdated,this));

            $(".uploadFirmware").toggle(this.gui.latestRelease != this.strip.firmware);

            this.$el.find(".backButton").click(_.bind(function(e) {
                $(this).trigger("GroupDetailsDismissed");
                e.stopPropagation();
            },this));

            this.statusUpdated();

            this.$el.find(".navigationBar").click(_.bind(this.showDetailsClicked,this));

            this.brightnessControl = new BrightnessControl(this.$el.find(".brightnessControl"),this.send,strip);

            this.$el.find(".loadPattern").on("click",_.bind(this.loadPatternClicked,this));
            this.$el.find(".uploadFirmware").on("click",_.bind(this.uploadFirmwareClicked,this));

            this.$el.find(".disconnectStripButton").on("click",_.bind(function() {
                console.log("sending strip disconnect");
                this.send("DisconnectStrip",this.strip.id);
            },this));
        },
        showDetailsClicked:function() {
            this.detailsDialog = new StripDetailsDialog(this.send,this.strip,this.gui);
            this.detailsDialog.show();
        },
        statusUpdated:function() {
            $(".uploadFirmware").toggle(this.gui.latestRelease != this.strip.firmware);
            this.updateAvailableIndicator(this.strip.memory.used,this.strip.memory.total);
            this.updateValues(this.strip);
            this.refreshPatterns();
        },
        updateAvailableIndicator:function(used,total) {
            var percent = Math.floor(100*used/total);
            this.$el.find(".spaceAvailableIndicator").css("width",percent+"%").text(percent+"% used");
        },
        updateValues:function(strip) {
            var $header = this.$el.find(".stripHeader");
            $header.find(".identifierValue").text(strip.id);
            var name = strip.name || "Unknown Strip";
            $header.find(".name").text(name);

            $header.find(".name").off("dblclick");
            util.doubleClickEditable($header.find(".name"),_.bind(this.nameUpdated,this));

            var statusIndicator = $header.find(".statusIndicator").css("visibility","visible");
            statusIndicator.removeClass("unknown").removeClass("connected").removeClass("error");
            if (strip.visible) {
                statusIndicator.addClass("connected").attr("title","connected");
            } else {
                statusIndicator.addClass("error").attr("title","disconnected");
            }
        },
        nameUpdated:function(name) {
            this.strip.name = name;
            $(this.strip).trigger("NameUpdated",this.strip.id,name);
            this.send("RenameStrip",this.strip.id,name);
        },
        selectPatternClicked:function(e) {
            var pattern = $(e.target).closest(".listElement").data("object");
            this.send("SelectPattern",this.strip.id,pattern.index);
        },
        loadPatternClicked:function(e) {
            var patternDialog = new LoadPatternDialog();
            $(patternDialog).on("LoadPatternClicked",_.bind(this.savePattern,this));
            patternDialog.show();
        },
        uploadFirmwareClicked:function(e) {
            this.send("UploadFirmware",this.strip.id);
        },
        savePattern:function(e,name,fps,pattern,isPreview) {
            var len = pattern.length * pattern[0].length;
            this.send("LoadPattern",this.strip.id,name,fps,pattern,isPreview);
            var progressDialog = new ProgressDialog(true);
            progressDialog.show();
            $(this.strip).one("Strip.UploadPatternComplete",function() {
                progressDialog.hide();
            });
        },
        forgetPatternClicked:function(e) {
            var pattern = $(e.target).closest(".listElement").data("object");
			this.send("ForgetPattern",this.strip.id,pattern.index);

            e.preventDefault();
            e.stopPropagation();
            return true;
        },
        refreshPatterns:function() {
            this.patternList = new SelectList(this.strip.patterns,this.patternListRenderer,this)
            if (this.strip.selectedPattern !== undefined) this.patternList.select(this.strip.selectedPattern); //TODO is index okay?
            $(this.patternList).change(_.bind(this.patternSelected,this));
            this.$el.find(".patterns").empty().append(this.patternList.$el);
        },
        patternSelected:function(e,selectedItems,selectedIndexes) {
            if (selectedItems.length == 0) return;
            this.$el.find(".listElement").removeClass("showDeleteButton");
            var selectedPattern = selectedItems[0]
            this.send("SelectPattern",this.strip.id,selectedPattern.index);
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
                    $el.touchwipe({
                         wipeRight: _.bind(function() {
                            if ($el.hasClass("showDeleteButton")) {
                                $el.removeClass("showDeleteButton");
                            } else {
                                this.$el.find(".listElement").removeClass("showDeleteButton");
                                $el.addClass("showDeleteButton");
                            }
                         },this),
                         wipeLeft: _.bind(function() {
                            $el.removeClass("showDeleteButton");
                         },this),
                         min_move_x: 20,
                         min_move_y: 20,
                         preventDefaultEvents: true
                    });
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
