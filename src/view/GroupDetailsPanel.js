define(['jquery',"util.js",'SelectList.js',"LoadPatternDialog.js","ProgressDialog.js","text!../tmpl/groupDetailPanel.html"],function($,util,SelectList,LoadPatternDialog,ProgressDialog,template) {

    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(send,strip) {
            this.send = send;
            this.$el = $("<div class='panel panel-info flexcol' />");
            this.$el.empty().append(_.template(template)());
            this.strip = strip;
            if (strip && strip.patterns) this.refreshPatterns();
            $(strip).on("Strip.PatternsUpdated",_.bind(this.refreshPatterns,this));

            this.updateValues(strip);
            $(strip).on("Strip.Connected",_.bind(function() {
                strip.connection = true;
                this.updateValues(strip);
            },this));
            $(strip).on("Strip.Disconnected",_.bind(function() {
                strip.connection = false;
                this.updateValues(strip);
            },this));

            this.$el.find(".loadPattern").on("click",_.bind(this.loadPatternClicked,this));
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
            if (strip.connection) {
                statusIndicator.addClass("connected").attr("title","connected");
            } else {
                statusIndicator.addClass("error").attr("title","disconnected");
            }
        },
        nameUpdated:function(name) {
            this.strip.name = name;
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
        savePattern:function(e,name,fps,pattern) {
            var len = pattern.length * pattern[0].length;
            this.send("LoadPattern",this.strip.id,name,fps,pattern);
            var progressDialog = new ProgressDialog(this.strip);
            progressDialog.show();
            $(progressDialog).on("Complete",function() {
                //console.log("Complete!");
            });
        },
        forgetPatternClicked:function(e) {
            var pattern = $(e.target).closest(".listElement").data("object");
			this.send("ForgetPattern",this.strip.id,pattern.index);
        },
        refreshPatterns:function() {
            this.patternList = new SelectList(this.strip.patterns,this.patternListRenderer,this)
            this.$el.find(".patterns").empty().append(this.patternList.$el);
        },
        patternListRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                var $select = $("<button class='selectPattern btn btn-success btn-xs'><span class='glyphicon glyphicon-play'></span></button>");
                var $forget = $("<button class='forgetPattern btn btn-danger btn-xs'><span class='glyphicon glyphicon-minus'></span></button>");

                $forget.on("click",_.bind(this.forgetPatternClicked,this));
                $select.on("click",_.bind(this.selectPatternClicked,this));
                $el.append($select);
                $el.append($("<span class='name'></span>").text(pattern.name));
                $el.append($forget);
            }
            return $el;
        },
    });

    return This;
});
