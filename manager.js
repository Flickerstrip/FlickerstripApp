var $ = require("jquery");
var _ = require("underscore")._;
var Communication = require("./Communication")
var util = require("util");
var fs = require("fs");
var USBCommunication = require("./USBCommunication");

var This = function(view) {
    this.init(view);
};

$.extend(This.prototype,{
    knownStripsFile:"./known_strips.json",
    stripData:[],
    init:function(view) {
        this.view = view;
        this.comm = new Communication();
        this.usb = new USBCommunication();

        this.loadStrips();

        setInterval(_.bind(this.tick),100);

        $(this.comm).on("StripListUpdated",_.bind(this.updateActiveStrips,this));
        $(this.comm).on("Ready",_.bind(function(e,id) {
            this.stripReady(id);
        },this));

        $(this.comm).on("StripConnected",_.bind(this.stripConnected,this));

        $(this).on("StripDataReady",_.bind(function() {
            view.trigger("StripsUpdated",[this.getStrips()]);
        },this));

        this.view.on("StripNameUpdated",_.bind(function(e,id,newname) {
            this.setStripName(id,newname);
        },this));

        this.view.on("PatternActivated",_.bind(function(e,selectedStrips) {
            _.each(selectedStrips,_.bind(function(strip) {
                if (this.comm.getClient(strip.id).status == "ready") {
                    this.stripReady(strip.id);
                }
            },this));
        },this));

        this.view.on("ForgetStrip",_.bind(function(e,id) {
            this.forgetStrip(id);
        },this));
    },
    tick:function() {
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
    stripConnected:function(e,id) {
        console.log("Strip Connected: ",id);
        this.stripReady(id);
    },
    stripReady:function(id) {
        if (id == null) throw "ID is null!";
        var client = this.comm.getClient(id);
        if (client == null) throw "Client not found:"+id;
        client.status = "ready";
        if (this.view.activePattern) {
            var leds = this.view.stripRenderer.getCurrentStripState();
            this.sendData(id,"set:"+leds.join(","));
        }
    },
    updateActiveStrips:function() {
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

        //get rid of invalid strips TODO: figure out why we get invalid strips in the first place
        this.stripData = _.reject(this.stripData,_.bind(function(strip) {
                return strip == null || !strip.id || strip.id.length == 0;
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
    forgetStrip:function(id) {
        var index = this.findStrip(id);
        this.stripData.splice(index,1);
        this.saveStrips()
        $(this).trigger("StripDataReady");
    },
    sendData:function(id,data) {
        this.comm.getClient(id).status = "busy";
        this.comm.getClient(id).write(data+"\n");
    },
    saveStrips:function() {
        fs.writeFile(this.knownStripsFile,JSON.stringify(this.stripData),function(err) {
            if (err) console.err("Failed to write strip data",err);
        });
    }
});

module.exports = This;
