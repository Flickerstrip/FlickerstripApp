var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var DiscoveryServer = require("./DiscoveryServer")
var StripWrapper = require("./StripWrapper")
var LEDStrip = require("./LEDStrip")
var fs = require("fs");
var request = require("request");
var https = require("https");
var path = require("path");

//var USBCommunication = require("./USBCommunication");
//var WirelessManager = require("./WirelessManager");

var This = function() {
    this.init.apply(this,arguments);
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
    strips:[],
    firmwareReleases:[],
    init:function(config,send) {
        this.config = config;
        this.send = send;

        //this.loadStrips(_.bind(function() {
            this.discovery = new DiscoveryServer();
            this.discovery.on("DiscoveredClient",_.bind(this.clientDiscovered,this));
        //},this));

        this.loadFirmwareReleaseInfo();

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

        this.on("UploadFirmware",_.bind(function(id) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            var releaseTag = this.firmwareReleases[0]["tag_name"];
            console.log("uploading firmware: ",releaseTag);
            this.downloadFirmware(releaseTag,_.bind(function() {
                strip.uploadFirmware(path.join(this.firmwareDirectory,releaseTag+".bin"));
            },this));
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
        },_.bind(function(error,response,releases) {
            if (error) {
                console.log(error);
                return;
            }
            releases.sort(function(a,b) {
                return symanticToNumeric(a["tag_name"]) - symanticToNumeric(b["tag_name"]);
            });
            this.firmwareReleases = releases;
            var latest = releases[0];
            this.send("LatestReleaseUpdated",latest["tag_name"]);
            this.downloadFirmware(latest["tag_name"],function(downloaded) {
                if (downloaded) {
                    console.log("downloaded firmware: ",latest["tag_name"]);
                } else {
                    console.log("already downloaded firmware: ",latest["tag_name"]);
                }
            });
        },this));
    },
    downloadFirmware:function(release,cb) {
         if (!fs.existsSync(this.config.firmwareFolder)){
            fs.mkdirSync(this.config.firmwareFolder);
        }
        var binPath = path.join(this.config.firmwareFolder,release+".bin");
        if (fs.existsSync(binPath)) {
            if (cb) cb(false);
            return;
        }
        var f = fs.createWriteStream(binPath);
        request("https://github.com/julianh2o/ESPLEDStrip/releases/download/"+release+"/"+release+".bin")
            .on("response",function() {
                    if (cb) cb(true);
            }).pipe(f);
        //download url: https://github.com/julianh2o/ESPLEDStrip/releases/download/v0.0.1/v0.0.1.bin
    },
    eventHandler:function() {
        this.emit.apply(this,arguments);
    },
    loadStrips:function(cb) {
        if (!fs.existsSync(this.config.configLocation)) {
            if (cb) cb();
            return;
        }
        fs.readFile(this.config.configLocation, "ascii", _.bind(function(err,contents) {
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
            if (cb) cb();
        },this));
    },
    stripAdded:function(strip) {
        var self = this;
        strip.onAny(function() {
            self.send.apply(self,[this.event,strip.id].concat(Array.prototype.slice.call(arguments)));
        });

        strip.on("Strip.PatternsUpdated",_.bind(this.saveStrips,this));
        strip.on("NameUpdated",_.bind(this.saveStrips,this));

        this.send("StripAdded",strip);
    },
    saveStrips:function() {
        var text = JSON.stringify(this.strips,function(key,value) {
            if (key.indexOf("_") === 0) return false;
            return value;
        });
        fs.writeFile(this.config.configLocation,text,function(err) {
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
    clientDiscovered:function(ip) {
        var found = null;
        _.each(this.strips,function(strip,index) {
            if (strip.ip == ip) found = strip;
        });
        if (found != null) {
            found.setVisible(true);
            return;
        }

        request("http://"+ip+"/status",_.bind(function(error, response, body) {
            var status = JSON.parse(body);
            this.clientIdentified(ip,status);
        },this));
    },
	clientIdentified:function(ip,status) {
        console.log("client identified",ip,status);
        var strip = this.getStrip(status.mac);
        if (!strip) {
            strip = new LEDStrip(status.mac,ip);
            this.strips.push(strip);
            strip.receivedStatus(status);
            strip.setVisible(true);
            this.saveStrips();
            this.stripAdded(strip);
        } else {
            strip.ip = ip;
            strip.receivedStatus(status);
            strip.setVisible(true);
        }
	}
});

module.exports = This;
