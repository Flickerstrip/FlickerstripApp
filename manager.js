var $ = require("jquery");
var _ = require("underscore")._;
var Communication = require("./Communication")
var util = require("util");
var fs = require("fs");

var This = function() {
    console.log("initting manager");
    this.init();
};

$.extend(This.prototype,{
    knownStripsFile:"./known_strips.json",
    stripData:[],
    init:function() {
        console.log("loading");
        this.loadStrips();
        this.comm = new Communication();
    },
    loadStrips:function() {
        fs.readFile(this.knownStripsFile, "ascii", _.bind(function(err,contents) {
            if (err) return console.log("Failed to load strip data:",err);
            try {
                this.stripData = JSON.parse(contents);
                this.updateActiveStrips();
            } catch (e) {
                return console.log("Failed to parse strip data: ",e);
            }
        },this));
    },
    updateActiveStrips:function() {
        console.log("loaded");
        var visibleStrips = this.comm.getVisibleStrips();
        _.each(this.stripData,function(strip) {
            strip.visible = _.contains(visibleStrips,strip.id);
            if (strip.visible) {
                visibleStrips.splice(_.indexOf(visibleStrips,strip.id),1);
            }
        });
        _.each(visibleStrips,_.bind(function(stripIdentifier) {
            this.stripData.push({
                id:stripIdentifier,
                visible:true,
                name:"Unknown Strip"
            });
        },this));

        this.saveStrips();
        $(this).trigger("StripDataReady");
    },
    findStrip:function(id) {
        var found = null;
        _.each(this.stripData,function(strip,index) {
            if (found != null) return;
            if (strip.id == id) found = index;
        });
        return found;
    },
    getStrips:function() {
        return this.stripData;
    },
    setStripName:function(id,name) {
        var index = this.findStrip(id);
        this.stripData[index].name = name;
        this.saveStrips();
    },
    saveStrips:function() {
        fs.writeFile(this.knownStripsFile,JSON.stringify(this.stripData),function(err) {
            if (err) console.err("Failed to write strip data",err);
        });
    }
});

module.exports = This;
