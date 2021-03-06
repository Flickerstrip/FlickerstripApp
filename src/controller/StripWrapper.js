var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var net = require('net');

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

function bufferFromNumber(number,be) {
	var buf = new Buffer(4);
    if (be) {
        buf.writeUInt32BE(number,0);
    } else {
        buf.writeUInt32LE(number,0);
    }
	return buf;
}

function trim(str) {
	return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

var This = function() {
    this.init.apply(this,arguments);
};

This.packetTypes = {
    UNUSED: 0,
    PING: 1,
    GET_STATUS: 2,
    CLEAR_PATTERNS: 3,
    DELETE_PATTERN: 4,
    SELECT_PATTERN: 5,
    SAVE_PATTERN: 6,
    PATTERN_BODY: 7,
    DISCONNECT_NETWORK: 8,
    SET_BRIGHTNESS: 9,
    TOGGLE_POWER: 10,
    SAVE_TEST_PATTERN: 11,
    UPLOAD_FIRMWARE: 12,
}

util.inherits(This,EventEmitter);
extend(This.prototype,{
	id:-1,
	sendBuffer:[],
    session:null,
	socket:null,
    ignoreData:false,
	init:function(socket) {
        if (socket) {
            this.connect(socket);
        }
	},
    connect:function(socket) {
		this.socket = socket;

		var buffer = "";
		socket.on('data', _.bind(function(data) {
            this.lastReceivedData = new Date().getTime();
            if (this.ignoreData) return;
                /*
            var bytes = [];
            for (var i = 0; i < buffer.length; ++i) {
                bytes.push(buffer.charCodeAt(i));
            }
            console.log("data raw:", bytes);
            */

			data = String(data);
            data = data.replace(/\r/g,"");
			if (data.length == 0) return;
			buffer += data;
            while(true) {
                var index = buffer.indexOf("\n\n");
                if (index == -1) break;

                var line = buffer.substring(0,index);
                this._receivedClientData(socket,line);
                buffer = buffer.substring(index+1);
            }
		},this));
		
		socket.on('disconnect',_.bind(function () {
			this.emit("Disconnect",this);
		},this));

		socket.on('error',_.bind(function(error) {
			if (error.code == "ECONNRESET") {
				this.emit("Disconnect",this,error);
			} else {
				console.log("uncaught error: ",error);
			}
		},this));

        this.idlePingTimer = setInterval(_.bind(this.idlePing,this),1000);
    },
    pauseDataHandler:function() {
        this.ignoreData = true;
    },
    resumeDataHandler:function() {
        this.ignoreData = false;
    },
    idlePing:function() {
        var now = new Date().getTime();
        //console.log(now-this.lastReceivedData,now,this.lastReceivedData);
        if (now - this.lastReceivedData > 2500) {
            this.socket.end();
            console.log("Disconecting idle connection");
			this.emit("Disconnect",this);
        }
        if (this.socket && this.sendBuffer.length == 0 && this.status == "ready") {
            this.sendCommand(This.packetTypes.PING);
        }
    },
    destroy:function() {
        if (this.idlePingTimer) clearInterval(this.idlePingTimer);
        try {
            if (this.socket) this.socket.end();
        } catch (e) {console.log("error closing socket");}
    },
	getId:function() {
		return this.id;
	},
	getSocket:function() {
		return this.socket;
	},
    _prepareCommand:function(command,param1,param2,payload) {
        param1 = param1 | 0;
        param2 = param2 | 0;
        var buffer = Buffer.concat([bufferFromNumber(command),bufferFromNumber(param1),bufferFromNumber(param2)]);
        if (payload) {
            buffer = Buffer.concat([buffer,payload]);
        }
        return buffer;
    },
    updateCommand:function(command,param1,param2,payload) {
        var found = null;
        _.each(this.sendBuffer,function(item) {
            if (item.info == command) {
                //found command, update it
                found = item;
            }
        });
        if (found == null) {
            this.sendCommand(command,param1,param2,payload);
        } else {
            var data = this._prepareCommand(command,param1,param2,payload);
            var buf = this._prepareBuffer("bin",data);
            found.payload = buf;
        }
    },
    sendCommand:function(command,param1,param2,payload) {
        var buffer = this._prepareCommand(command,param1,param2,payload);
        this.queueData("bin",buffer,command);
    },
    sendCustom:function(fn,info) {
        this.sendBuffer.push({"payload":fn,"info":info});
        this._manageQueue()
    },
    queueData:function(type,data,info) {
        var buf = this._prepareBuffer(type,data);

        if (this.session) {
            this.session.buffers.push({
                payload:buf,
                info:info,
            });
            this.session.size ++;
        } else {
            this.sendBuffer.push({
                payload:buf,
                info:info,
            });
        }
        this._manageQueue()
    },
    getCurrentSession:function() {
        if (this.sendBuffer.length && this.sendBuffer[0].buffers) {
            return this.sendBuffer[0];
        } else {
            return null;
        }
    },
    startSession:function() {
        this.session = {buffers:[],size:0};
    },
    endSession:function() {
        this.sendBuffer.push(this.session);
        this.session = null;
        this._manageQueue();
    },
	sendPattern:function(name,fps,data,isPreview) {
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
        var sendPages = 2;
        var page = 0;
        var bufferSize = Math.min(len*frames,sendPages*0x100);
        var payload = new Buffer(bufferSize);
        var offset = 0;

        this.startSession();
        if (isPreview) {
            this.sendCommand(This.packetTypes.SAVE_TEST_PATTERN,0,0,metadata);
        } else {
            this.sendCommand(This.packetTypes.SAVE_PATTERN,0,0,metadata);
        }
        //this.queueData("bin",Buffer.concat([new Buffer("save\0"),metadata]));
        for (var i=0; i<frames; i++) {
            for (var l=0; l<len; l++) {
                if (offset >= bufferSize) {
                    this.sendCommand(This.packetTypes.PATTERN_BODY,0xff,page,payload);

                    bufferSize = Math.min(len*frames - (page+sendPages)*0x100,sendPages*0x100);
                    if (bufferSize > 0) {
                        payload = new Buffer(bufferSize);
                    } else {
                        payload = null;
                    }

                    page += sendPages;
                    offset = 0;
                }
                if (payload == null) console.log("ERROR: payload null",i,l,offset);
                payload.writeUInt8(data[i][l],offset++);
            }
        }
        this.sendCommand(This.packetTypes.PATTERN_BODY,0xff,page,payload);
        this.endSession();
    },

    ///////////////////////////////// Private Methods Below ///////////////////////////////////////////////////

	_stripReady:function() {
        this.status = "ready";
		this._manageQueue();
    },
	_manageQueue:function() {
		if (this.status == "ready" && this.sendBuffer.length != 0) {
			this.status = "busy";
			var next = this.sendBuffer.shift();
            var buf = null;
            var payload = next.payload;
            var info = next.info;
            if (typeof(payload) === "function") {
                if (!payload(this.socket)) {
                    this.sendBuffer.unshift(next);
                }
            } else if (next.buffers) {
                buf = next.buffers.shift().payload;
                if (next.buffers.length != 0) {
                    this.sendBuffer.unshift(next);
                }
            } else {
                buf = payload;
            }
			if (buf != null) {
                this.socket.write(buf);
            }
            this.emit("ProgressUpdate",this);
		}
	},
	_receivedClientData:function(socket,data) {
        stringData = trim(String(data));

		if (stringData.length == 0) return;

        if (!stringData.match(/ready/)) {
            //console.log("StringData: "+stringData);
        }

        var match = stringData.match(/id:(.*)/);
        if (match) {
            var id = match[1].trim();
            this.id = id;
            this.sendBuffer = [];
            this._stripReady();

			this.emit("Connect",this);
            return;
        }

        if (stringData.startsWith("{")) { //TODO come up with a better way of doing this
            try {
                var json = JSON.parse(stringData);
            } catch(e) {
                console.log("failed to parse json: "+stringData);
            }
            var type = json.type;
            //console.log("type",type);
            if (type == "ready") {
                this._stripReady();
            } else if (type == "status") {
                this.emit("ReceivedStatus",this,json);
            }
            return;
        }

        console.log("got unexpected data: ",stringData);
    },
    _prepareBuffer:function(type,data) {
        if (type == "bin") {
            var buf = Buffer.concat([bufferFromNumber(data.length),data]);
            return buf;
        } else if (type == "str") {
            throw "ERROR, using string!";
        }
    },
});

module.exports = This;
