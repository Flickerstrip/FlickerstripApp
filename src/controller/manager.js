var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var DiscoveryServer = require("./DiscoveryServer")
var StripWrapper = require("./StripWrapper")
var LEDStrip = require("./LEDStrip")
var fs = require("fs");
var request = require("request")

//var USBCommunication = require("./USBCommunication");
//var WirelessManager = require("./WirelessManager");

var This = function() {
    this.init.apply(this,arguments);
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
    knownStripsFile:"./known_strips.json",
    strips:[],
    firmwareReleases:[],
    init:function(send) {
        this.send = send;
        this.discovery = new DiscoveryServer();

        //this.wifi = new WirelessManager();
        //this.usb = new USBCommunication();

        this.loadFirmwareReleaseInfo();
        this.loadStrips();

        this.discovery.on("ClientConnected",_.bind(this.clientConnected,this));

        ///////////////////////////////////////// Strip actions
        this.on("SelectPattern",_.bind(function(id,index) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            strip.selectPattern(index);
        },this));
		
        this.on("LoadPattern",_.bind(function(id,name,fps,data,isPreview) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            strip.loadPattern(name,fps,data,isPreview);
        },this));

        this.on("UploadFirmware",_.bind(function(id,path) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            strip.uploadFirmware(path);
        },this));

		this.on("ForgetPattern",_.bind(function(id,index) {
		    var strip = this.getStrip(id);
            if (!strip) return;
			strip.forgetPattern(index);
		},this));

        this.on("RenameStrip",_.bind(function(id,newname) {
            this.setStripName(id,newname);
        },this));

        this.on("SetBrightness",_.bind(function(id,value) {
            this.setBrightness(id,value);
        },this));

        this.on("ToggleStrip",_.bind(function(id,value) {
		    var strip = this.getStrip(id);
            strip.toggle(value);
        },this));

        this.on("DisconnectStrip",_.bind(function(id) {
            this.disconnectStrip(id);
        },this));

        this.on("ForgetStrip",_.bind(function(id) {
            this.forgetStrip(id);
        },this));
        ///////////////////////////////////////// Strip actions
    },
    loadFirmwareReleaseInfo:function() {
        function symanticToNumeric(symantic) {
            if (symantic[0] == "v") symantic = symantic.substring(1);
            var parts = symantic.split(".");
            var step = 1000;
            var numeric = parseInt(parts[0])*step*step + parseInt(parts[1])*step + parseInt(parts[2]);
            console.log("sym",symantic,numeric);
            return numeric;
        }
        request({
            url:"https://api.github.com/repos/julianh2o/ESPLEDStrip/releases",
            json:true,
            headers: {
                "User-Agent":"Flickerstrip-Dashboard",
            }
        },function(error,response,releases) {
            releases.sort(function(a,b) {
                return symanticToNumeric(a["tag_name"]) - symanticToNumeric(b["tag_name"]);
            });
            this.firmwareReleases = releases;
            var latest = releases[0];
            console.log("latest release: ",latest["tag_name"]);
        });
        //download url: https://github.com/julianh2o/ESPLEDStrip/releases/download/v0.0.1/v0.0.1.bin
    },
    eventHandler:function() {
        this.emit.apply(this,arguments);
    },
    loadStrips:function() {
        console.log("TODO: implement read/write file");
    /*
        fs.readFile(this.knownStripsFile, "ascii", _.bind(function(err,contents) {
            if (err) return console.log("Failed to load strip data:",err);
            var strips = JSON.parse(contents);
            this.strips = [];
            _.each(strips,_.bind(function(strip) {
                var lstrip = new LEDStrip();
                for (var key in strip) {
                    if (key.indexOf("_") === 0) continue;
                    if (strip.hasOwnProperty(key)) {
                        lstrip[key] = strip[key];
                    }
                }
                this.strips.push(lstrip);
                this.stripAdded(lstrip);
            },this));
        },this));
    */
    },
    stripAdded:function(strip) {
        var self = this;
        strip.onAny(function() {
            self.send.apply(self,[this.event,strip.id].concat(Array.prototype.slice.call(arguments)));
        });
        this.send("StripAdded",strip);
    },
    saveStrips:function() {
        //global.log("TODO fix save");
        return;
        var text = JSON.stringify(this.strips,function(key,value) {
            if (key.indexOf("_") === 0) return false;
            return value;
        });
        fs.writeFile(this.knownStripsFile,text,function(err) {
            if (err) console.err("Failed to write strip data",err);
        });
    },
   /////////////////////
    setStripName:function(id,name) {
        var strip = this.getStrip(id);
        strip.name = name;
        this.saveStrips();
    },
    setBrightness:function(id,value) {
        var strip = this.getStrip(id);
        strip.setBrightness(value);
    },
    forgetStrip:function(id) {
        var index = this.getStripIndex(id);
        this.strips.splice(index,1);
        this.saveStrips()
        this.send("StripRemoved",id);
    },
    disconnectStrip:function(id) {
        var strip = this.getStrip(id);
        strip.disconnectStrip();
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
            this.send("Strip.Connected",strip.id);
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
		this.send("Strip.Disconnected",strip.id);
	},
});

module.exports = This;
