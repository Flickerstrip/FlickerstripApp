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
        this.busy = false;
        this.queue = [];
        this.visibleTimeout = 9000;
	},
    startWatchdogTimer:function() {
        if (this._timer) return;
        this._timer = setInterval(_.bind(function() {
            this.requestStatus();
        },this),this.visibleTimeout*.3);
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
            this.busy = false;
            this.queue = [];
            this.stopWatchdogTimer();
            this.emit("Strip.StatusUpdated",{"visible":false});
        }
    },
    uploadFirmware:function(path) {
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
    handleQueue:function() {
        if (!this.queue.length) return;

        var args = this.queue.shift();
        this.sendCommand.apply(this,args);
    },
    sendCommand:function(command,cb,data,notimeout) {
        if (this.busy) {
            this.queue.push(Array.prototype.slice.call(arguments));
            return;
        }
        this.busy = true;
        this.stopWatchdogTimer();
        var opt = {
            uri:"http://"+this.ip+"/"+command
        };
        if (data) opt.body = data;
        if (!notimeout) opt.timeout = 2000;
        request(opt,_.bind(function(error, response, body) {
            this.startWatchdogTimer();
            if (error) {
                this.setVisible(false);
                if (error.code != "ETIMEDOUT") console.log("error!",error,command);
                return;
            }
            var json = JSON.parse(body);
            this.busy = false;
            if (cb) cb(json);
            this.handleQueue();
        },this));
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
    setName:function(name) {
        this.name = name;
        this.emit("NameUpdated",this);
    },
    getName:function() {
        return this.name;
    },
});

module.exports = This;
