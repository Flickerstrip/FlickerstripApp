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
var pjson = require('../package.json');
var os = require("os");
var getPixels = require("get-pixels")
var yauzl = require("yauzl");
var mkdirp = require("mkdirp");
var progress = require('request-progress');

var This = function() {
    this.init.apply(this,arguments);
};

nutil.inherits(This,EventEmitter);
extend(This.prototype,{
    strips:[],
    firmwareReleases:[],
    init:function(folderConfig,send,platform) {
        this.folderConfig = folderConfig;
        this.platform = platform;
        this.serverLocation = pjson.patternRepository;
        this.conduit = util.createConduit(send);

        this.config = {};
        this.loadConfig(_.bind(function() {
            this.discovery = new DiscoveryServer();
            this.discovery.on("DiscoveredClient",_.bind(this.clientDiscovered,this));
        },this));

        this.loadFirmwareReleaseInfo();
        this.checkForUpdates();

        this.loadPatterns();

        ///////////////////////////////////////// Strip actions
        this.on("SelectPattern",_.bind(function(id,index) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            strip.selectPattern(index);
        },this));
		
        this.on("LoadPattern",_.bind(function(id,renderedPattern,isPreview) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            this.conduit.emit("ShowProgress","Uploading",true);
            strip.loadPattern(renderedPattern,isPreview,_.bind(function() {
                this.conduit.emit("HideProgress");
            },this));
        },this));

        this.on("UploadFirmware",_.bind(function(id) {
		    var strip = this.getStrip(id);
            if (!strip) return;
            var releaseTag = this.firmwareReleases[0]["tag_name"];
            console.log("uploading firmware: ",releaseTag);
            this.downloadFirmware(releaseTag,_.bind(function() {
                console.log(this.folderConfig.firmwareFolder,releaseTag);
                strip.uploadFirmware(path.join(this.folderConfig.firmwareFolder,releaseTag+".bin"));
            },this));
        },this));

        this.on("AllChangeMode",_.bind(function() {
            _.each(this.strips,function(s) {
                var select = s.selectedPattern+1;
                if (select >= s.patterns.length) select = 0;
                s.selectPattern(select);
            });
        },this));

		this.on("ForgetPattern",_.bind(function(id,index) {
		    var strip = this.getStrip(id);
            if (!strip) return;
			strip.forgetPattern(index);
		},this));

        this.on("SetCycle",_.bind(function(id,seconds) {
            var strip = this.getStrip(id);
            strip.setCycle(seconds);
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

        this.on("CreateDummy",_.bind(function() {
            strip = new LEDStrip("du:mm:yy:st:ri:ps",null);
            this.strips.push(strip);
            strip.setVisible(false);
            this.stripAdded(strip);
        },this));

        this.on("SaveImage",_.bind(function(dataUrl,savePath) {
            var data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
            var buf = new Buffer(data, 'base64');
            fs.writeFile(savePath, buf,function(err) {
                if (err) console.log("There was an error saving the image!");
            });
        },this));

        this.on("InstallUpdate",_.bind(this.installUpdate,this));

        this.on("OpenImage",_.bind(function(callback,imagePath) {
            getPixels(imagePath,function(err,info) {
                var width = info.shape[0];
                var height = info.shape[1];
                var bpp = info.shape[2];
                info.data = Array.prototype.slice.call(info.data);
                if (bpp == 4) {
                    for (var i=info.data.length-1; i>=0; i--) {
                        if (i % 4 == 3) {
                            info.data.splice(i,1);
                        }
                    }
                }
                callback(width,height,info.data);
            });
        },this));

        this.on("RefreshServerPatterns",_.bind(function(callback) {
            request.get(this.serverLocation+"/pattern",_.bind(function(error,response,data) {
                var patterns = util.parseJson(data);
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
                "type":pattern.type,
                "data":pattern.body,
            }
            if (pattern.type == "bitmap") {
                data["fps"] = pattern.fps;
                data["frames"] = pattern.frames;
                data["pixels"] = pattern.pixels;
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
            _.each(pattern,function(value,key) {
                if (key == "body" || key == "rendered" || key == "path") return;
                if (typeof value == "string") {
                    out += key+":"+value+"\n";
                } else {
                    out += key+":"+JSON.stringify(value)+"\n";
                }
            })
            out += "\n";
            var body = typeof(pattern.body) == "string" ? pattern.body : JSON.stringify(pattern.body);
            out += body;

            if (pattern.path) fs.unlinkSync(pattern.path);

            var name = pattern.name.replace(/[^a-zA-z0-9]/,"");
            fs.writeFile(path.join(this.folderConfig.patternFolder,name+".pattern"),out,"utf8",_.bind(function(err) {
                this.loadPatterns();
            },this));
        },this));
    },
    populatePattern:function(content) {
        var loc = content.indexOf("\n\n");
        var headerraw = content.substring(0,loc);
        var body = content.substring(loc+2);

        var pattern = {};
        _.each(headerraw.split("\n"),function(line) {
            if (line == "") return;
            var index = line.indexOf(":");
            var tokens = [line.substring(0,index),line.substring(index+1)];
            if (tokens[1][0] == "[" || tokens[1][0] == "{") {
                //assume json
                tokens[1] = util.parseJson(tokens[1]);
            }
            pattern[tokens[0]] = tokens[1];
        });

        pattern.body = body[0] == "[" || body[0] == "{" ? util.parseJson(body) : body;
        return pattern;
    },
    loadPatterns:function() {
        fs.readdir(this.folderConfig.patternFolder,_.bind(function(err,files) {
            if (err) return console.log("ERROR READING DIR",err);
            async.map(files,_.bind(function(file,callback) {
                fs.readFile(path.join(this.folderConfig.patternFolder,file),'utf8',callback);
            },this),_.bind(function(err,results) {
                this.patterns = [];
                _.each(_.zip(files,results),_.bind(function(info) {
                    var filename=info[0];
                    var content=info[1];
                    if (filename[0] == '.') return;
                    var pattern = this.populatePattern(content);

                    pattern.path = path.join(this.folderConfig.patternFolder,filename);
                    this.patterns.push(pattern);
                },this));

                this.conduit.emit("PatternsLoaded",this.patterns);
            },this));
        },this));
    },
    installUpdate:function(version) {
        var downloadName = null;
        if (process.platform == "darwin")  {
            downloadName = "FlickerstripApp-OSX64-"+version+".zip";
        } else if (process.platform == "win32") {
            downloadName = "FlickerstripApp-Win64-"+version+".zip";
        } else if (process.platform == "linux") {
            downloadName = "FlickerstripApp-Linux64-"+version+".zip";
        }

        var unpackDirectory = path.join(os.tmpdir(),util.generateGuid());
        fs.mkdirSync(unpackDirectory);
        //var unpackDirectory = 'C:\\Users\\Julian\\AppData\\Local\\Temp\\71024787-c519-9a6b-d233-6e65473a954b';

        var zipPath = path.join(unpackDirectory,downloadName);
        var f = fs.createWriteStream(zipPath);

        function updateFiles() {
            this.conduit.emit("HideProgress");
            var folderPath = path.join(unpackDirectory,path.parse(zipPath).name);
            this.conduit.emit("Update",folderPath);
        }

        function unpackZip() {
            this.conduit.emit("ShowProgress","Unpacking...",false);
            yauzl.open(zipPath, {lazyEntries: true},_.bind(function(err, zipfile) {
                if (err) throw err;
                zipfile.readEntry();
                var entriesTotal = zipfile.entryCount;
                var entriesRead = 0;
                zipfile.on("entry",_.bind(function(entry) {
                    entriesRead++;
                    this.conduit.emit("UpdateProgress",Math.floor(100*entriesRead/entriesTotal));
                    if (/\/$/.test(entry.fileName)) {
                        // directory file names end with '/' 
                        mkdirp(path.join(unpackDirectory,entry.fileName), function(err) {
                            if (err) throw err;
                            zipfile.readEntry();
                        });
                    } else {
                        // file entry 
                        zipfile.openReadStream(entry, function(err, readStream) {
                            if (err) throw err;
                            // ensure parent directory exists 
                            mkdirp(path.join(unpackDirectory,path.dirname(entry.fileName)), function(err) {
                                if (err) throw err;
                                readStream.pipe(fs.createWriteStream(path.join(unpackDirectory,entry.fileName)));
                                readStream.on("end", function() {
                                    zipfile.readEntry();
                                });
                            });
                        });
                    }
                },this));
                zipfile.once("end",_.bind(updateFiles,this));
            },this));
        }
		
        this.conduit.emit("ShowProgress","Downloading Version <strong>"+version+"</strong>",false);
        progress(request("https://github.com/Flickerstrip/FlickerstripApp/releases/download/"+version+"/"+downloadName,_.bind(function() {
			setTimeout(_.bind(unpackZip,this),300);
        },this)))
        .on("progress",_.bind(function(state) {
            this.conduit.emit("UpdateProgress",state.percent);
        },this))
        .pipe(f);
        //https://github.com/Flickerstrip/FlickerstripApp/releases/download/v0.3.1/FlickerstripApp-Linux64-v0.3.1.zip
    },
    checkForUpdates:function() {
        request({
            url:"https://api.github.com/repos/Flickerstrip/FlickerstripApp/releases",
            json:true,
            headers: {
                "User-Agent":"Flickerstrip-Dashboard",
            }
        },_.bind(function(error,response,releases) {
            if (error) {
                console.log("Failed to load flickerstrip app release information: ",error.code);
                return;
            }
            releases.sort(function(b,a) {
                return util.symanticToNumeric(a["tag_name"]) - util.symanticToNumeric(b["tag_name"]);
            });
            this.appReleases = releases;
            var latest = releases[0];
            var tagName = latest["tag_name"];
            if (util.symanticToNumeric(tagName) > util.symanticToNumeric(pjson.version)) {
                this.conduit.emit("UpdateAvailable",tagName);
            }
        },this));
        
    },
    loadFirmwareReleaseInfo:function() {
        console.log("LOAD FIRMWARE RELEASE IS CURRENTLY DISABLED: TODO cache this");
        return;
        request({
            url:"https://api.github.com/repos/Flickerstrip/FlickerstripFirmware/releases",
            json:true,
            headers: {
                "User-Agent":"Flickerstrip-Dashboard",
            }
        },_.bind(function(error,response,releases) {
            if (error) {
                console.log("Failed to load firmware release information: ",error.code);
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
         if (!fs.existsSync(this.folderConfig.firmwareFolder)){
            fs.mkdirSync(this.folderConfig.firmwareFolder);
        }
        var binPath = path.join(this.folderConfig.firmwareFolder,release+".bin");
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
        if (!fs.existsSync(this.folderConfig.configLocation)) {
            if (cb) cb();
            return;
        }
        fs.readFile(this.folderConfig.configLocation, "ascii", _.bind(function(err,contents) {
            if (err) return console.log("Failed to load strip data:",err);
            console.log("loading json config file",contents);
            try {
                var config = util.parseJson(contents);
                this.config = config;

                //load strips
                this.strips = [];
                if (!this.config || !this.config.strips) {
                    this.config = {};
                    console.log("returning");
                    if (cb) cb();
                    return;
                }
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
            } catch (e) {
                console.log("error loading config file",e);
            }
            if (cb) cb();
        },this));
    },
    stripAdded:function(strip) {
        var self = this;
        strip.onAny(function() {
            self.conduit.emitOn.apply(self,[this.event,"strip",strip].concat(Array.prototype.slice.call(arguments)));
        });

        strip.on("Strip.StatusUpdated",_.bind(this.saveConfig,this));
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
        fs.writeFile(this.folderConfig.configLocation,text,function(err) {
            if (err) console.err("Failed to write strip data",err);
            if (cb && typeof(cb) == "function") cb();
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
            if (strip.ip == ip) found = strip;
        });
        if (found != null) {
            found.setVisible(true);
            return;
        }

        request("http://"+ip+"/status",_.bind(function(error, response, body) {
            if (error) return console.log("Failed to connect to "+ip);
            var status = util.parseJson(body);
            this.clientIdentified(ip,status);
        },this));
    },
	clientIdentified:function(ip,status) {
        console.log("Client identified: ",status.mac,ip);
        var strip = this.getStrip(status.mac);
        if (!strip) {
            strip = new LEDStrip(status.mac,ip);
            this.strips.push(strip);
            strip.receivedStatus(status);
            strip.setVisible(true);
            this.saveConfig();
            this.stripAdded(strip);
        } else {
            strip.ip = ip;
            strip.receivedStatus(status);
            strip.setVisible(true);
        }
	}
});

module.exports = This;
