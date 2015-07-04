var _ = require("underscore")._;
var util = require("./util.js");

define(['jquery','SelectList.js',"LoadPatternDialog.js"],function($,SelectList,LoadPatternDialog) {
    var template = util.loadTemplate("./groupDetailPanel.html");

    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(gui,strip) {
            this.gui = gui;
            this.$el = $("<div />");
            this.$el.empty().append(template());
            this.strip = strip;
            console.log("strip",strip);
            if (strip.strip && strip.strip.patterns) this.refreshPatterns(strip.patterns);

            this.updateValues(strip);

            this.$el.find(".loadPattern").on("click",_.bind(this.loadPatternClicked,this));
            this.$el.find(".forgetPattern").on("click",_.bind(this.forgetPatternClicked,this));
            this.$el.find(".selectPattern").on("click",_.bind(this.selectPatternClicked,this));
        },
        updateValues:function(strip) {
            var $header = this.$el.find(".stripHeader");
            $header.find(".identifierValue").text(strip.id);
            $header.find(".name").text(strip.name);

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
        nameUpdated:function() {
            console.log("name updated",arguments);
        },
        selectPatternClicked:function(e) {
            var selectedPatterns = this.patternList.getSelected();
            if (selectedPatterns.length > 1) return alert("Multiple patterns selected, choose one!");
            $(this.gui).trigger("SelectPattern",[this.strip.id,selectedPatterns[0].index]);
        },
        loadPatternClicked:function(e) {
            var patternDialog = new LoadPatternDialog();
            $(patternDialog).on("LoadPattern",_.bind(this.savePattern,this));
            patternDialog.show();
        },
        savePattern:function(e,name,fps,pattern) {
            var len = pattern.length * pattern[0].length;
            console.log("saving pattern size: ",len);
            $(this.gui).trigger("SavePattern",[this.strip.id,name,fps,pattern]);
        },
        forgetPatternClicked:function(e) {
		    var selectedPatterns = this.patternList.getSelected();
            if (selectedPatterns.length > 1) return alert("Multiple patterns selected, choose one!");
			$(this.gui).trigger("ForgetPattern",[this.strip.id,selectedPatterns[0].index]);
        },
        refreshPatterns:function(patterns) {
            console.log("refreshing patterns",patterns);
            this.patternList = new SelectList(patterns,this.patternListRenderer)
            this.$el.find(".patterns").empty().append(this.patternList.$el);
        },
        patternListRenderer:function(pattern,$el) {
            if ($el) {
                $el.find(".name").text(pattern.name);
            } else {
                $el = $("<div class='listElement' />");
                $el.append($("<span class='name'></span>").text(pattern.name));
            }
            return $el;
        },
    });

    return This;
});
