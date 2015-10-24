var extend = require("extend");
var request = require("request");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var StripWrapper = require("./StripWrapper");
var fs = require("fs");
var streamifier = require("streamifier");

var _c = require("c-struct");
var PatternMetadata = new _c.Schema({
    name: _c.type.string(16),
    address: _c.type.uint32,
    len: _c.type.uint32,
    frames: _c.type.uint16,
    flags: _c.type.uint8,
    fps: _c.type.uint8,
});
_c.register("PatternMetadata",PatternMetadata);

var This = function() {
    this.init.apply(this,arguments);
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
	init:function(id,ip) {
        this.id = id;
        this.ip = ip;
        this.visibleTimeout = 9000;

		//connection.on("ReceivedStatus",_.bind(this.receivedStatus,this));
		//connection.on("ProgressUpdate",_.bind(this.progressUpdate,this));
		//connection.on("Disconnect",_.bind(this.connectionReset,this));
	},
    setVisible:function(visible) {
        var updated = visible != this.visible;
        this.visible = visible;

        if (visible) {
            this.lastSeen = new Date().getTime()
            if (!this._timer) {
                this._timer = setInterval(_.bind(function() {
                    this.requestStatus();
                },this),this.visibleTimeout*.3);
            }
        } else {
            if (this._timer) {
                clearInterval(this._timer);
                this._timer = null;
            }
        }

        if (updated) {
            this.emit("Strip.StatusUpdated");
            if (visible == false) {
                console.log("Client disconnected: "+this.ip);
//                  var e = new Error('dummy');
//                  var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
//                      .replace(/^\s+at\s+/gm, '')
//                      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
//                      .split('\n');
//                  console.log(stack);
            }
        }
    },
    progressUpdate:function(connection) {
        var session = connection.getCurrentSession();
        this.emit("Strip.ProgressUpdated",this,session);
    },
    uploadFirmware:function(path) {
        //var stream = fs.createReadStream(path);
        //var stats = fs.statSync(path)
        //var hexSize = stats["size"];

        clearInterval(this._timer); this.timer = null;
        fs.readFile(path,_.bind(function(err,data) {
            var hexSize = data.length
            console.log("Uploading Firmware: ",path,hexSize);
            request.put({uri:"http://"+this.ip+"/update",body:data}).on("end",_.bind(function(error, response, body) {
                console.log("upload complete!");
            },this));
        },this));
    },
    receivedStatus:function(status) {
        extend(this,status);
        this.setVisible(true);
        status.visible = this.visible;
        this.emit("Strip.StatusUpdated",status);
    },
    sendCommand:function(command,cb,data) {
        if (data) {
            request({"timeout":2000,uri:"http://"+this.ip+"/"+command,body:data},_.bind(function(error, response, body) {
                if (error) {
                    this.setVisible(false);
                    if (error.code != "ETIMEDOUT") console.log("error!",error);
                    return;
                }
                var json = JSON.parse(body);
                if (cb) cb(json);
            },this));
        } else {
            request({"timeout":2000,uri:"http://"+this.ip+"/"+command},_.bind(function(error, response, body) {
                if (error) {
                    this.setVisible(false);
                    if (error.code != "ETIMEDOUT") console.log("error!",error);
                    return;
                }
                var json = JSON.parse(body);
                if (cb) cb(json);
            },this));
        }
    },
    requestStatus:function() {
        this.sendCommand("status",_.bind(this.receivedStatus,this));
    },
	setBrightness:function(brightness) {
        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;
        this.sendCommand("brightness?value="+brightness);
	},
    toggle:function(value) {
        this.sendCommand(value ? "power/on" : "power/off");
    },
    loadPattern:function(name,fps,data,isPreview) {
        var frames = data.length;
        var len = data[0].length;
        var metadata = _c.packSync("PatternMetadata",{
            name:name,
            address: 0,
            len: len*frames, //payload total size
            frames: frames,
            flags: 0x0000,
            fps: fps,
        });
        var page = 0;
        var bufferSize = Math.min(len*frames);
        var payload = new Buffer(bufferSize);

        var offset = 0;
        for (var i=0; i<frames; i++) {
            for (var l=0; l<len; l++) {
                payload.writeUInt8(data[i][l],offset++);
            }
        }

        var concatted = Buffer.concat([metadata,payload]);

        this.sendCommand(isPreview ? "pattern/test" : "pattern/save",false,concatted);


        //this._connection.sendPattern(name,fps,data,isPreview);
        if (!isPreview) this.requestStatus();
    },
    selectPattern:function(index) {
        this.sendCommand("pattern/select?index="+index);
    },
	forgetPattern:function(index) {
        this.sendCommand("pattern/forget?index="+index);
        this.requestStatus();
    },
	disconnectStrip:function() {
        this.sendCommand("disconnect");
    },
    setName:function(name) {
        this.name = name;
        this.emit("NameUpdated",this);
    },
    getName:function() {
        return this.name;
    },
});

module.exports = This;
