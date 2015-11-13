var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var nutil = require("util");
var DiscoveryServer = require("./DiscoveryServer")
var StripWrapper = require("./StripWrapper")
var LEDStrip = require("./LEDStrip")
var fs = require("fs");
var request = require("request");
var https = require("https");
var path = require("path");
var util = require("../shared/util");
var async = require("async");

var This = function() {
    this.init.apply(this,arguments);
};

nutil.inherits(This,EventEmitter);
extend(This.prototype,{
    strips:[],
    firmwareReleases:[],
    init:function(config,send) {
        this.config = config;
        this.serverLocation = 'http://localhost:3000';
        this.conduit = util.createConduit(send);

        this.loadConfig(_.bind(function() {
            this.discovery = new DiscoveryServer();
            this.discovery.on("DiscoveredClient",_.bind(this.clientDiscovered,this));
        },this));

        this.loadFirmwareReleaseInfo();

        this.loadPatterns();

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
                console.log(this.config.firmwareFolder,releaseTag);
                strip.uploadFirmware(path.join(this.config.firmwareFolder,releaseTag+".bin"));
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

        this.on("SetGroup",_.bind(function(id,newgroup) {
		    var strip = this.getStrip(id);
            strip.setGroup(newgroup);
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

        //this.on("CreateDummy",_.bind(function() {
        this.on("CreateDummy",_.bind(function() {
            strip = new LEDStrip("du:mm:yy:st:ri:ps",null);
            this.strips.push(strip);
            strip.setVisible(false);
            this.stripAdded(strip);
        },this));

        this.on("RefreshServerPatterns",_.bind(function(callback) {
            request.get(this.serverLocation+"/pattern",_.bind(function(error,response,data) {
                var patterns = JSON.parse(data);
                callback(patterns);
            },this));
        },this));

        this.on("LoadServerPattern",_.bind(function(callback,id) {
            request.get(this.serverLocation+"/pattern/"+id,_.bind(function(error,response,data) {
                callback(id,data);
            },this));
        },this));

        this.on("GetUser",_.bind(function(callback) {
            callback(this.config.user);
        },this));

        this.on("CreateUser",_.bind(function(callback,email,password,display) {
            var opt = {
                url:this.serverLocation+"/user/create",
                json: {
                    email:email,
                    password:password,
                    display:display,
                }
            };
            request.post(opt,_.bind(function(error,response,user) {
                if (response.statusCode != 200) return callback(false,null);

                callback(true,user);
            },this));
        },this));

        this.on("VerifyUser",_.bind(function(callback,email,password) {
            var opt = {
                url:this.serverLocation+"/user/challenge",
                headers:{
                    "Authorization":"Basic " + new Buffer(email + ":" + password).toString("base64"),
                },
                json:true,
            }
            request.post(opt,_.bind(function(error,response,user) {
                if (response.statusCode != 200) return callback(false,null);

                callback(true,user);
            },this));
        },this));

        this.on("SaveCredentials",_.bind(function(callback,email,password,id) {
            this.config.user = {email:email,password:password,id:id};
            this.saveConfig(callback);
        },this));

        this.on("UploadPattern",_.bind(function(callback,pattern) {
            var data = {
                "name":pattern.name,
                "type":"javascript",
                "data":pattern.body,
            }
            var opt = {
                url:this.serverLocation+"/pattern/create",
                headers:{
                    "Authorization":"Basic " + new Buffer(this.config.user.email + ":" + this.config.user.password).toString("base64"),
                },
                json:data
            }
            request.post(opt,_.bind(function(error,response,data) {
                callback(response.statusCode == 200);
            },this));
        },this));

        this.on("DeletePattern",_.bind(function(callback,patternId) {
            var data = {
                "id":patternId,
            }
            var opt = {
                url:this.serverLocation+"/pattern/delete",
                headers:{
                    "Authorization":"Basic " + new Buffer(this.config.user.email + ":" + this.config.user.password).toString("base64"),
                },
                json:data
            }
            request.post(opt,_.bind(function(error,response) {
                callback(response.statusCode == 200);
            },this));
        },this));

        this.on("SavePattern",_.bind(function(pattern) {
            var out = "";
            out += "name:"+pattern.name+"\n";
            if (pattern.Owner) out += "author:"+pattern.Owner.display+"\n";
            out += "\n\n";
            out += pattern.body;

            if (pattern.path) fs.unlinkSync(pattern.path);

            var name = pattern.name.replace(/[^a-zA-z0-9]/,"");
            fs.writeFile(path.join(this.config.patternFolder,name+".pattern"),out,"utf8",_.bind(function(err) {
                this.loadPatterns();
            },this));
        },this));
    },
    loadPatterns:function() {
        fs.readdir(this.config.patternFolder,_.bind(function(err,files) {
            async.map(files,_.bind(function(file,callback) {
                fs.readFile(path.join(this.config.patternFolder,file),'utf8',callback);
            },this),_.bind(function(err,results) {
                this.patterns = [];
                _.each(_.zip(files,results),_.bind(function(info) {
                    var filename=info[0];
                    var content=info[1];
                    var loc = content.indexOf("\n\n");
                    var headerraw = content.substring(0,loc);
                    var body = content.substring(loc+2);
                    if (filename[0] == '.') return;

                    var metadata = {};
                    _.each(headerraw.split("\n"),function(line) {
                        if (line == "") return;
                        var tokens = line.split(":");
                        metadata[tokens[0]] = tokens[1];
                    });

                    metadata.path = path.join(this.config.patternFolder,filename);
                    metadata.body = body;
                    this.patterns.push(metadata);
                },this));

                this.conduit.emit("PatternsLoaded",this.patterns);
            },this));
        },this));
    },
    loadFirmwareReleaseInfo:function() {
        request({
            url:"https://api.github.com/repos/Flickerstrip/FlickerstripFirmware/releases",
            json:true,
            headers: {
                "User-Agent":"Flickerstrip-Dashboard",
            }
        },_.bind(function(error,response,releases) {
            if (error) {
                console.log(error);
                return;
            }
            releases.sort(function(b,a) {
                return util.symanticToNumeric(a["tag_name"]) - util.symanticToNumeric(b["tag_name"]);
            });
            this.firmwareReleases = releases;
            var latest = releases[0];
            this.conduit.emit("LatestReleaseUpdated",latest["tag_name"]);
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
        request("https://github.com/Flickerstrip/FlickerstripFirmware/releases/download/"+release+"/"+release+".bin")
            .on("response",function() {
                    if (cb) cb(true);
            }).pipe(f);
        //download url: https://github.com/Flickerstrip/FlickerstripFirmware/releases/download/v0.0.1/v0.0.1.bin
    },
    eventHandler:function(emitObject) {
        if (emitObject.target) {
        } else if (emitObject.callback) {
            var conduit = this.conduit;
            var cb = function() {
                conduit.respond(emitObject.callback,arguments);
            };
            //console.log("calling",this,[emitObject.name,cb].concat(emitObject.args).concat([emitObject]));
            this.emit.apply(this,[emitObject.name,cb].concat(emitObject.args).concat([emitObject]));
        } else {
            this.emit.apply(this,[emitObject.name].concat(emitObject.args).concat([emitObject]));
        }
    },
    loadConfig:function(cb) {
        if (!fs.existsSync(this.config.configLocation)) {
            if (cb) cb();
            return;
        }
        fs.readFile(this.config.configLocation, "ascii", _.bind(function(err,contents) {
            if (err) return console.log("Failed to load strip data:",err);
            var config = JSON.parse(contents);
            this.config = config;

            //load strips
            this.strips = [];
            _.each(this.config.strips,_.bind(function(strip) {
                var lstrip = new LEDStrip();
                for (var key in strip) {
                    if (key.indexOf("_") === 0) continue;
                    if (strip.hasOwnProperty(key)) {
                        lstrip[key] = strip[key];
                    }
                }
                this.strips.push(lstrip);
                lstrip.visible = false;
                this.stripAdded(lstrip);
            },this));
            if (cb) cb();
        },this));
    },
    stripAdded:function(strip) {
        var self = this;
        strip.onAny(function() {
            self.conduit.emitOn.apply(self,[this.event,"strip",strip].concat(Array.prototype.slice.call(arguments)));
        });

        strip.on("Strip.PatternsUpdated",_.bind(this.saveConfig,this));
        strip.on("NameUpdated",_.bind(this.saveConfig,this));

        this.conduit.emit("StripAdded",strip);
    },
    saveConfig:function(cb) {
        this.config.strips = this.strips;
        var text = JSON.stringify(this.config,function(key,value) {
            if (key.indexOf("_") === 0) {
                return undefined;
            }
            return value;
        });
        fs.writeFile(this.config.configLocation,text,function(err) {
            if (err) console.err("Failed to write strip data",err);
            if (cb) cb();
        });
    },
   /////////////////////
    setStripName:function(id,name) {
        var strip = this.getStrip(id);
        strip.setName(name);
    },
    setBrightness:function(id,value) {
        var strip = this.getStrip(id);
        strip.setBrightness(value);
    },
    forgetStrip:function(id) {
        var index = this.getStripIndex(id);
        this.strips.splice(index,1);
        this.saveConfig()
        this.conduit.emit("StripRemoved",id);
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
            if (strip._ip == ip) found = strip;
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
        console.log("Client identified: ",status.mac,ip);
        var strip = this.getStrip(status.mac);
        if (!strip) {
            console.log("stats mac: ",status.mac,status);
            strip = new LEDStrip(status.mac,ip);
            this.strips.push(strip);
            strip.receivedStatus(status);
            strip.setVisible(true);
            this.saveConfig();
            this.stripAdded(strip);
        } else {
            strip._ip = ip;
            strip.receivedStatus(status);
            strip.setVisible(true);
        }
	}
});

module.exports = This;
