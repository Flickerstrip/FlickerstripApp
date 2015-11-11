define(['jquery',"shared/util.js","text!tmpl/stripDetailsDialogMobile.html","text!tmpl/stripDetailsDialog.html","jquery.touchwipe.min"],function($,util,mobile_template,desktop_template) {

    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(conduit,strips,gui) {
            this.gui = gui;
            this.conduit = conduit;
            this.strip = strips[0];

            this.$el = $("<div class='stripDetails' />");
            if (platform == "desktop") this.$el.addClass("modal");

            this.$el.append(platform == "mobile" ? mobile_template : desktop_template);

            $(this.strip).on("Strip.StatusUpdated NameUpdated",_.bind(this.update,this));
            $(this.gui).on("LatestReleaseUpdated",_.bind(this.update,this));

            this.update();

            this.$el.find(".closeDetails").click(_.bind(this.hide,this));
        },
        doUpdateClicked:function(e) {
            this.conduit.emit("UploadFirmware",this.strip.id);

            return false;
        },
        update:function() {
            var name = this.strip.name || "Unknown Strip";
            this.$el.find(".name").text(name);

            this.$el.find(".infoList").empty();


            var firmware = "";
            var nl = util.symanticToNumeric(this.gui.latestRelease)
            var nf = util.symanticToNumeric(this.strip.firmware)
            if (nl == nf) {
                firmware = this.strip.firmware;
            } else if (nl > nf) {
                firmware = $("<span class='version outofdate'><a class='doupdate' href='#'>Update Available</a> "+this.strip.firmware+"</span>");
            } else if (nf > nl) {
                firmware = $("<span class='version devversion'>"+this.strip.firmware+"</span>");
            }

            this.generateList([
                {"key":"Name","value":name,"click":_.bind(this.renameStrip,this)},
                {"key":"MAC Address","value":this.strip.id},
                {"key":"Firmware Version","value":firmware},
                {"key":"Used Space","value":this.strip.memory.used},
                {"key":"Available Space","value":this.strip.memory.free},
            ],this.$el.find(".infoList"));

            var statusIndicator = this.$el.find(".statusIndicator").css("visibility","visible");
            statusIndicator.removeClass("unknown").removeClass("connected").removeClass("error");
            if (this.strip.visible) {
                statusIndicator.addClass("connected").attr("title","connected");
            } else {
                statusIndicator.addClass("error").attr("title","disconnected");
            }

            this.$el.find(".doupdate").click(_.bind(this.doUpdateClicked,this));
        },
        renameStrip:function() {
            var newName = prompt("Enter a new name for the strip.",this.strip.name || "Unknown Strip");
            if (!newName) return;
            this.strip.name = newName;
            this.conduit.emit("RenameStrip",this.strip.id,newName);
            $(this.strip).trigger("NameUpdated",this.strip.id,newName);
        },
        generateList:function(arr,$els) {
            _.each(arr,function(item) {
                var $lel = $("<div class=\"info\"><span class=\"infoLabel\"></span><span class=\"infoValue\"></span></div>");
                $lel.find(".infoLabel").text(item.key);
                $lel.find(".infoValue").append(item.value);
                if (item.click) $lel.click(item.click);
                $els.append($lel);
            });
            return $els;
        },
        show:function() {
            if (platform == "mobile") {
                $(document.body).append(this.$el);

                setTimeout(_.bind(function() {
                    this.$el.addClass("shown");
                },this),5);
            } else {
                $(document.body).append(this.$el);
                this.$el.modal("show");
            }
        },
        hide:function() {
            if (platform == "mobile") {
                this.$el.removeClass("shown");
                setTimeout(_.bind(function() {
                    this.$el.remove();
                },this),500);
            } else {
                this.$el.modal("hide");
                this.$el.remove();
            }
        },
    });

    return This;
});

