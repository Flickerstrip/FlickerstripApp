var extend = require("extend");
var request = require("request");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var StripWrapper = require("./StripWrapper");
var fs = require("fs");

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

var visibleTimeout = 9000;

util.inherits(This,EventEmitter);
extend(This.prototype,{
	init:function(id,ip) {
        this.id = id;
        this.ip = ip;
        this._busy = false;
        this._queue = [];
	},
    startWatchdogTimer:function() {
        if (this._timer) return;
        this._timer = setInterval(_.bind(function() {
            this.requestStatus();
        },this),visibleTimeout*.3);
    },
    stopWatchdogTimer:function() {
        if (!this._timer) return;
        clearInterval(this._timer);
        this._timer = null;
    },
    setVisible:function(visible) {
        var updated = visible != this.visible;
        this.visible = visible;

        if (visible) {
            this.lastSeen = new Date().getTime()
            this.startWatchdogTimer();
        }

        if (!visible && updated) {
            console.log("Client disconnected: "+this.ip);
            this.ip = null;
            this._busy = false;
            this._queue = [];
            this.stopWatchdogTimer();
            this.emit("Strip.StatusUpdated",{"visible":false});
        }
    },
    uploadFirmware:function(path) {
        clearInterval(this._timer); this._timer = null;
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
        this.status = true;
        status.visible = this.visible;
        status.ip = this.ip;
        this.emit("Strip.StatusUpdated",status);
    },
    handleQueue:function() {
        if (!this._queue.length) return;

        var args = this._queue.shift();
        this.sendCommand.apply(this,args);
    },
    sendCommand:function(command,cb,data,notimeout) {
        if (!this.ip) {
            console.log("ERROR: sending command to disconnected strip");
            return;
        }
        if (this._busy) {
            this._queue.push(Array.prototype.slice.call(arguments));
            return;
        }
        this._busy = true;
        this.stopWatchdogTimer();
        var opt = {
            uri:"http://"+this.ip+"/"+command
        };
        if (data) {
            if (typeof data === 'object' && !(data instanceof Buffer)) { 
                opt.json = data;
            } else {
                opt.body = data;
            }
        }
        if (!notimeout) opt.timeout = 2000;
        console.log("req",opt);
        request(opt,_.bind(function(error, response, body) {
            this.startWatchdogTimer();
            if (error) {
                this.setVisible(false);
                if (error.code != "ETIMEDOUT") console.log("error!",error,command);
                return;
            }
            var json = body;
            try {
                if (typeof(json) === "string") json = JSON.parse(json);
            } catch (e) {
                console.log("error parsing response",opt,body);
            }
            this._busy = false;
            if (cb) cb(json);
            this.handleQueue();
        },this));
    },
    requestStatus:function() {
        this.sendCommand("status",_.bind(this.receivedStatus,this));
    },
	setName:function(name) {
        this.sendCommand("config/name",null,{"name":name});
	},
	setCycle:function(seconds) {
        console.log("setting cycle....",seconds);
        this.sendCommand("config/cycle?value="+parseInt(seconds));
	},
	setGroup:function(name) {
        console.log("setting group!",this.id,name);
        this.sendCommand("config/group",null,{"name":name});
	},
	setBrightness:function(brightness) {
        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;
        this.sendCommand("brightness?value="+brightness);
	},
    toggle:function(value) {
        this.sendCommand(value ? "power/on" : "power/off");
    },
    loadPattern:function(renderedPattern,isPreview) {
        var frames = renderedPattern.rendered.frames;
        var pixels = renderedPattern.rendered.pixels;
        var fps = renderedPattern.rendered.fps;
        var data = renderedPattern.rendered.data;
        var metadata = _c.packSync("PatternMetadata",{
            name:renderedPattern.name,
            address: 0,
            len: pixels*frames*3, //payload total size
            frames: frames,
            flags: 0x0000,
            fps: fps,
        });
        var page = 0;
        var bufferSize = pixels*frames*3;
        var payload = new Buffer(bufferSize);

        for (var i=0; i<data.length; i++) {
            payload.writeUInt8(data[i],i);
        }

        var concatted = Buffer.concat([metadata,payload]);

        this.sendCommand(isPreview ? "pattern/test" : "pattern/save",_.bind(function() {
            this.emit("Strip.UploadPatternComplete");
        },this),concatted,true);

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
    getName:function() {
        return this.name;
    },
});

module.exports = This;
