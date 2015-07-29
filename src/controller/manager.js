var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore")._;
var util = require("util");
var DiscoveryServer = require("./DiscoveryServer")
var StripWrapper = require("./StripWrapper")
var LEDStrip = require("./LEDStrip")
var fs = require("fs");
//var USBCommunication = require("./USBCommunication");
//var WirelessManager = require("./WirelessManager");

var This = function(view) {
    this.init(view);
};

util.inherits(This,EventEmitter);
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

        this.discovery.on("ClientConnected",_.bind(this.clientConnected,this));

        ///////////////////////////////////////// Strip actions
        this.on("SelectPattern",_.bind(function(id,index) {
		    this.getStrip(id).selectPattern(index);
        },this));
		
        this.on("LoadPattern",_.bind(function(id,name,fps,data) {
            this.getStrip(id).loadPattern(name,fps,data);
        },this));

		this.on("ForgetPattern",_.bind(function(id,index) {
			this.getStrip(id).forgetPattern(index);
		},this));

        this.on("RenameStrip",_.bind(function(id,newname) {
            this.setStripName(id,newname);
        },this));

        this.on("ForgetStrip",_.bind(function(id) {
            this.forgetStrip(id);
        },this));
        ///////////////////////////////////////// Strip actions
    },
    loadStrips:function() {
        fs.readFile(this.knownStripsFile, "ascii", _.bind(function(err,contents) {
            if (err) return console.log("Failed to load strip data:",err);
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
                console.log("emitting stripadded",lstrip);
                this.emit("StripAdded",lstrip);
            },this));
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
        this.view.emit("StripsUpdated",this.getStrips());
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
    clientConnected:function(socket) {
        var connection = new StripWrapper(socket);
        connection.on("Connect",_.bind(this.clientIdentified,this));
    },
	clientIdentified:function(connection) {
        var strip = this.getStrip(connection.id);
        if (strip) {
            strip.setConnection(connection);
            strip.emit("StripStatusUpdated",strip);
        } else {
            strip = new LEDStrip(connection);
            this.strips.push(strip);
            this.saveStrips();
            this.emit("StripAdded",strip);
        }
        strip.lastSeen = new Date();

        strip.on("PatternsUpdated",_.bind(this.saveStrips,this));
        strip.on("StripConnected",_.bind(this.saveStrips,this));
        strip.on("NameUpdated",_.bind(this.saveStrips,this));

        strip.on("Disconnect",_.bind(this.clientDisconnected,this));
        this.emit("StripConnected",strip);
	},
	clientDisconnected:function(strip) {
        strip.emit("StripStatusUpdated",strip);
		this.emit("StripDisconnected",strip);
	},
});

module.exports = This;
