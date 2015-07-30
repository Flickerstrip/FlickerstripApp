var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var DiscoveryServer = require("./DiscoveryServer")
var StripWrapper = require("./StripWrapper")
var LEDStrip = require("./LEDStrip")
var fs = require("fs");
//var USBCommunication = require("./USBCommunication");
//var WirelessManager = require("./WirelessManager");

var This = function() {
    this.init.apply(this,arguments);
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
    knownStripsFile:"./known_strips.json",
    strips:[],
    init:function(send) {
        this.send = send;
        this.discovery = new DiscoveryServer();

        //this.wifi = new WirelessManager();
        //this.usb = new USBCommunication();

        this.loadStrips();

        this.discovery.on("ClientConnected",_.bind(this.clientConnected,this));

        ///////////////////////////////////////// Strip actions
        this.on("SelectPattern",_.bind(function(id,index) {
            console.log("select pattern triggered");
		    var strip = this.getStrip(id);
            console.log("strip",strip);
            if (!strip) return;
            strip.selectPattern(index);
        },this));
		
        this.on("LoadPattern",_.bind(function(id,name,fps,data) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            strip.loadPattern(name,fps,data);
        },this));

		this.on("ForgetPattern",_.bind(function(id,index) {
		    var strip = this.getStrip(id);
            if (!strip) return;
			strip.forgetPattern(index);
		},this));

        this.on("RenameStrip",_.bind(function(id,newname) {
            this.setStripName(id,newname);
        },this));

        this.on("ForgetStrip",_.bind(function(id) {
            this.forgetStrip(id);
        },this));
        ///////////////////////////////////////// Strip actions
    },
    eventHandler:function() {
        console.log("manager received event",arguments);
        var slicedArgs = Array.prototype.slice.call(arguments, 1);
        this.emit.apply(this,arguments);
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
                delete lstrip.connection; //todo better way of doing this
                delete lstrip._events;
                delete lstrip._all;
                this.strips.push(lstrip);
                this.stripAdded(lstrip);
            },this));
        },this));
    },
    stripAdded:function(strip) {
        var self = this;
        strip.onAny(function() {
            console.log("StripEvent: ",this.event,arguments);
            console.log(self.send);
            self.send.apply(self,[this.event,strip.id].concat(arguments));
        });
        this.send("StripAdded",strip);
    },
    saveStrips:function() {
        var text = JSON.stringify(this.strips,function(key,value) {
            if (key == "connection") return false;
            if (key == "_events") return false;
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
        this.send("StripRemoved",id);
    },
///////////////////////////////////////////////////////////////////////////////
    getStrips:function() {
        return this.strips;
    },
    getStripIndex:function(id) {
        var found = null;
        console.log("Strips",this.strips);
        _.each(this.strips,function(strip,index) {
            console.log("args",arguments);
            console.log("finding strip",id,strip,strip.id);
            if (found != null) return;
            console.log("cmp",strip.id,id);
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
            this.send("Strip.StatusUpdated",strip.id);
        } else {
            strip = new LEDStrip(connection);
            this.strips.push(strip);
            this.saveStrips();
            this.stripAdded(strip);
        }
        strip.lastSeen = new Date();

        strip.on("Strip.PatternsUpdated",_.bind(this.saveStrips,this));
        strip.on("NameUpdated",_.bind(this.saveStrips,this));
        strip.on("Disconnect",_.bind(this.clientDisconnected,this));

        this.send("Strip.Connected",strip.id);
	},
	clientDisconnected:function(strip) {
        this.send("Strip.StatusUpdated",strip.id);
		this.send("Strip.Disconnected",strip.id);
	},
});

module.exports = This;
