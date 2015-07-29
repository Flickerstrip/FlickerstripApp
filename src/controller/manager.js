var extend = require("extend");
var _ = require("underscore")._;
var DiscoveryServer = require("./DiscoveryServer")
var StripWrapper = require("./StripWrapper")
var LEDStrip = require("./LEDStrip")
var fs = require("fs");
//var USBCommunication = require("./USBCommunication");
//var WirelessManager = require("./WirelessManager");

var This = function(view) {
    this.init(view);
};

extend(This.prototype,{
    knownStripsFile:"./known_strips.json",
    strips:[],
    init:function(view) {
        this.view = view;
        //this.wifi = new WirelessManager();
        this.view.setManager(this);
        this.discovery = new DiscoveryServer();
        //this.usb = new USBCommunication();

        this.loadStrips();

        $(this.discovery).on("ClientConnected",_.bind(this.clientConnected,this));

        ///////////////////////////////////////// Strip actions
        this.on("SelectPattern",_.bind(function(e,id,index) {
		    this.getStrip(id).selectPattern(index);
        },this));
		
        this.on("LoadPattern",_.bind(function(e,id,name,fps,data) {
            this.getStrip(id).loadPattern(name,fps,data);
        },this));

		this.on("ForgetPattern",_.bind(function(e,id,index) {
			this.getStrip(id).forgetPattern(index);
		},this));

        this.on("RenameStrip",_.bind(function(e,id,newname) {
            this.setStripName(id,newname);
        },this));

        this.on("ForgetStrip",_.bind(function(e,id) {
            this.forgetStrip(id);
        },this));
        ///////////////////////////////////////// Strip actions
    },
    loadStrips:function() {
        fs.readFile(this.knownStripsFile, "ascii", _.bind(function(err,contents) {
            if (err) return console.log("Failed to load strip data:",err);
            try {
                var strips = JSON.parse(contents);
                this.strips = [];
                _.each(strips,_.bind(function(strip) {
                    var lstrip = new LEDStrip();
                    for (var key in strip) {
                        if (strip.hasOwnProperty(key)) {
                            lstrip[key] = strip[key];
                        }
                    }
                    this.strips.push(lstrip);
                    $(this).trigger("StripAdded",[lstrip]);
                },this));
            } catch (e) {
                return console.log("Failed to parse strip data: ",e,contents);
            }
        },this));
    },
    saveStrips:function() {
        var text = JSON.stringify(this.strips,function(key,value) {
            if (key == "connection") return false;
            return value;
        });
        fs.writeFile(this.knownStripsFile,text,function(err) {
            if (err) console.err("Failed to write strip data",err);
        });
    },
   /////////////////////
    setStripName:function(id,name) {
        var index = this.findStrip(id);
        this.strips[index].name = name;
        this.saveStrips();
    },
    forgetStrip:function(id) {
        var index = this.findStrip(id);
        this.strips.splice(index,1);
        this.saveStrips()
        this.view.trigger("StripsUpdated",[this.getStrips()]);
    },
///////////////////////////////////////////////////////////////////////////////
    getStrips:function() {
        return this.strips;
    },
    getStripIndex:function(id) {
        var found = null;
        _.each(this.strips,function(strip,index) {
            if (found != null) return;
            if (strip.id == id) found = index;
        });
        return found;
    },
    getStrip:function(id) {
        var index = this.getStripIndex(id);
        if (index != null) return this.strips[index];
        return null;
    },
    clientConnected:function(e,socket) {
        var connection = new StripWrapper(socket);
        $(connection).on("Connect",_.bind(this.clientIdentified,this));
    },
	clientIdentified:function(e,connection) {
        var strip = this.getStrip(connection.id);
        if (strip) {
            strip.setConnection(connection);
            $(strip).trigger("StripStatusUpdated",[strip]);
        } else {
            strip = new LEDStrip(connection);
            this.strips.push(strip);
            this.saveStrips();
            $(this).trigger("StripAdded",[strip]);
        }
        strip.lastSeen = new Date();

        strip.on("PatternsUpdated",_.bind(this.saveStrips,this));
        strip.on("StripConnected",_.bind(this.saveStrips,this));
        strip.on("NameUpdated",_.bind(this.saveStrips,this));

        strip.on("Disconnect",_.bind(this.clientDisconnected,this));
        $(this).trigger("StripConnected",[strip]);
	},
	clientDisconnected:function(e,strip) {
        $(strip).trigger("StripStatusUpdated",[strip]);
		$(this).trigger("StripDisconnected",[strip]);
	},
    /////////////////////////////
    on:function(trigger,callback) {
        $(this).on(trigger,callback);
    },
    trigger:function(trigger,args) {
        $(this).trigger(trigger,args);
    },
});

module.exports = This;
