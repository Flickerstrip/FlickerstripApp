define(['jquery',"text!tmpl/stripDetailsDialogMobile.html","text!tmpl/stripDetailsDialog.html","jquery.touchwipe.min"],function($,mobile_template,desktop_template) {

    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(send,strip) {
            this.send = send;
            this.strip = strip;

            this.$el = $("<div class='stripDetails' />");
            if (platform == "desktop") this.$el.addClass("modal");

            this.$el.append(platform == "mobile" ? mobile_template : desktop_template);

            $(this.strip).on("Strip.StatusUpdated NameUpdated",_.bind(this.update,this));
            this.update();

            this.$el.find(".closeDetails").click(_.bind(this.hide,this));
        },
        update:function() {
            var name = this.strip.name || "Unknown Strip";
            this.$el.find(".name").text(name);

            this.$el.find(".infoList").empty();
            this.generateList([
                {"key":"Name","value":name,"click":_.bind(this.renameStrip,this)},
                {"key":"MAC Address","value":this.strip.id},
                {"key":"Firmware Version","value":this.strip.firmware},
                {"key":"Used Space","value":this.strip.memory.used},
                {"key":"Available Space","value":this.strip.memory.free},
            ],this.$el.find(".infoList"));

            var statusIndicator = this.$el.find(".statusIndicator").css("visibility","visible");
            statusIndicator.removeClass("unknown").removeClass("connected").removeClass("error");
            if (this.strip._connection) {
                statusIndicator.addClass("connected").attr("title","connected");
            } else {
                statusIndicator.addClass("error").attr("title","disconnected");
            }
        },
        renameStrip:function() {
            var newName = prompt("Enter a new name for the strip.",this.strip.name || "Unknown Strip");
            this.strip.name = newName;
            this.send("RenameStrip",this.strip.id,newName);
            $(this.strip).trigger("NameUpdated",this.strip.id,newName);
        },
        generateList:function(arr,$els) {
            _.each(arr,function(item) {
                var $lel = $("<div class=\"info\"><span class=\"infoLabel\"></span><span class=\"infoValue\"></span></div>");
                $lel.find(".infoLabel").text(item.key);
                $lel.find(".infoValue").text(item.value);
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

