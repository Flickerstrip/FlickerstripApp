var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
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

function bufferFromNumber(number,bytes,be) {
	var buf = new Buffer(bytes);
    if (be) {
        buf.writeUIntBE(number,0,bytes);
    } else {
        buf.writeUIntLE(number,0,bytes);
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
    GET_PATTERNS: 2,
    CLEAR_PATTERNS: 3,
    DELETE_PATTERN: 4,
    SELECT_PATTERN: 5,
    SAVE_PATTERN: 6,
    PATTERN_BODY: 7,
}

util.inherit(This,EventEmitter);
extend(This.prototype,{
	id:-1,
	sendBuffer:[],
    session:null,
	socket:null,
	init:function(socket) {
        if (socket) {
            this.connect(socket);
        }
	},
    connect:function(socket) {
		this.socket = socket;

		var buffer = "";
		socket.on('data', _.bind(function(data) {
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
			$(this).trigger("Disconnect",[this]);
		},this));

		socket.on('error',_.bind(function(error) {
			if (error.code == "ECONNRESET") {
				$(this).trigger("Disconnect",[this,error]);
			} else {
				console.log("uncaught error: ",error);
			}
		},this));

        this.idlePingTimer = setInterval(_.bind(this.idlePing,this),1000);
    },
    idlePing:function() {
        var now = new Date().getTime();
        if (now - this.lastReceivedData > 1500) {
            this.socket.end();
			$(this).trigger("Disconnect",[this]);
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
    sendCommand:function(command,param1,param2,payload) {
        param1 = param1 | 0;
        param2 = param2 | 0;
        var buffer = Buffer.concat([bufferFromNumber(command,4),bufferFromNumber(param1,4),bufferFromNumber(param2,4)]);
        if (payload) {
            buffer = Buffer.concat([buffer,payload]);
        }
        this.queueData("bin",buffer);
    },
    queueData:function(type,data) {
        var buf = this._prepareBuffer(type,data);

        if (this.session) {
            this.session.buffers.push(buf);
            this.session.size ++;
        } else {
            this.sendBuffer.push(buf);
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
	sendPattern:function(name,fps,data) {
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
        this.sendCommand(This.packetTypes.SAVE_PATTERN,0,0,metadata);
        //this.queueData("bin",Buffer.concat([new Buffer("save\0"),metadata]));
        for (var i=0; i<frames; i++) {
            for (var l=0; l<len; l++) {
                if (offset >= bufferSize) {
                    this.sendCommand(This.packetTypes.PATTERN_BODY,0xff,page,payload);
                    //this.queueData("bin",Buffer.concat([new Buffer("body\0"),new Buffer([0xff]),bufferFromNumber(page,4),payload]));

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
                payload.writeUIntLE(data[i][l],offset++,1);
            }
        }
        this.sendCommand(This.packetTypes.PATTERN_BODY,0xff,page,payload);
        //this.queueData("bin",Buffer.concat([new Buffer("body\0"),new Buffer([0xff]),bufferFromNumber(page,4),payload]));
        this.endSession();
    },

    ///////////////////////////////// Private Methods Below ///////////////////////////////////////////////////

	_stripReady:function() {
        this.status = "ready";
		this._manageQueue();
    },
	_manageQueue:function() {
		if (this.sendBuffer.length != 0) {
			this.status = "busy";
			var next = this.sendBuffer.shift();
            var buf = null;
            if (next.buffers) {
                buf = next.buffers.shift();
                if (next.buffers.length != 0) {
                    this.sendBuffer.unshift(next);
                }
            } else {
                buf = next;
            }
			if (buf != null) {
                this.socket.write(buf);
            }
            $(this).trigger("ProgressUpdate",[this]);
		}
	},
	_receivedClientData:function(socket,data) {
        this.lastReceivedData = new Date().getTime();
        stringData = trim(String(data));
		if (stringData.length == 0) return;

        var match = stringData.match(/id:(.*)/);
        if (match) {
            var id = match[1].trim();
            this.id = id;
            this.sendBuffer = [];
            this._stripReady();

			$(this).trigger("Connect",[this]);
            return;
        }

        if (stringData.startsWith("patterns")) {
            var lines = stringData.split("\n");
            lines.splice(0,1);
            var patternData = [];
            _.each(lines,function(line) {
                var tokens = line.split(",");
                patternData.push({
                    index: parseInt(tokens[0]),
                    name: tokens[1],
                    address: parseInt(tokens[2]),
                    len: parseInt(tokens[3]),
                    frames: parseInt(tokens[4]),
                    flags: parseInt(tokens[5]),
                    fps: parseInt(tokens[6])
                });
            });
			this.patterns = patternData;
            $(this).trigger("ReceivedPatternMetadata",[this,patternData]);
            return;
        }

        match = stringData.match(/ready/);
        if (match) {
			this._stripReady();
            return;
        }

        console.log("got unexpected data: ",stringData);
    },
    _prepareBuffer:function(type,data) {
        if (type == "bin") {
            var buf = Buffer.concat([bufferFromNumber(data.length,4),data]);
            return buf;
        } else if (type == "str") {
            throw "ERROR, using string!";
            //var dataBuffer = new Buffer(data+"\n\n");
            //return Buffer.concat([new Buffer([1]),dataBuffer]);
        }
    },
});

module.exports = This;
