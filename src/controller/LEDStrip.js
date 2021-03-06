var extend = require("extend");
var request = require("request");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var fs = require("fs");
var Pattern = require("../shared/Pattern.js");

var This = function() {
    this.init.apply(this,arguments);
};

function param(params) {
    var query = Object.keys(params)
        .map(function(k) { return params[k] == null ? encodeURIComponent(k) : encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
    return query;
}

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
    receivedStatus:function(status,err) {
        if (err) {
            if (this.visible) this.setVisible(false);
            return;
        }
        if (!status) status = {};
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
            cb(null,"DISCONNECTED");
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
        //For upload status: r.req.connection.socket._bytesDispatched
        request(opt,_.bind(function(error, response, body) {
            this.startWatchdogTimer();
            if (error) {
                this.setVisible(false);
                if (error.code != "ETIMEDOUT") console.log("error!",error,command);
                if (cb) cb(null,error.code);
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
        if (seconds === false) seconds = 0;
        this.sendCommand("config/cycle?value="+parseInt(seconds));
	},
	setLength:function(length) {
        this.sendCommand("config/length?value="+parseInt(length));
	},
	setStart:function(value) {
        if (value === false) value = 0;
        this.sendCommand("config/start?value="+parseInt(value));
	},
	setEnd:function(value) {
        if (value === false) value = -1;
        this.sendCommand("config/end?value="+parseInt(value));
	},
	setFade:function(value) {
        if (value === false) value = 0;
        this.sendCommand("config/fade?value="+parseInt(value));
	},
	setReversed:function(value) {
        this.sendCommand("config/reversed?value="+(value ? 1 : 0));
	},
	setGroup:function(name) {
        this.sendCommand("config/group",null,{"name":name});
	},
    removeFromQueue(command) {
        var newQueue = [];
        _.each(this._queue,function(queued) {
            if (!queued[0].startsWith("brightness")) {
                newQueue.push(queued);
            }
        });
        this._queue = newQueue;
    },
	setBrightness:function(brightness) {
        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;
        this.removeFromQueue("brightness");
        this.sendCommand("brightness?value="+brightness);
	},
    toggle:function(value) {
        this.sendCommand(value ? "power/on" : "power/off");
    },
    loadPattern:function(pattern,isPreview,callback) {
        var data = pattern.pixelData;
        var bufferSize = pattern.pixels*pattern.frames*3;
        var payload = new Buffer(bufferSize);
        for (var i=0; i<data.length; i++) payload.writeUInt8(data[i],i);

        var p = {
            name: pattern.name,
            frames: pattern.frames,
            pixels: pattern.pixels,
            fps: pattern.fps,
        }

        if (isPreview) p.preview = null;

        this.sendCommand("pattern/create?"+param(p),_.bind(function(content,err) {
            this.emit("Strip.UploadPatternComplete");
            if (callback) callback(err);
        },this),payload,true);

        if (!isPreview) this.requestStatus();
    },
    selectPattern:function(index) {
        if (index < 0) index = 0;
        if (index > this.patterns.length-1) index = this.patterns.length-1;
        this.selectedPattern = index;
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
