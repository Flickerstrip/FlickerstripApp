var $ = require("jquery");
var _ = require("underscore")._;
var util = require("util");
var dgram = require('dgram'); 
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
	console.log("strip wrapper initted",arguments);
    this.init.apply(this,arguments);
};

$.extend(This.prototype,{
	id:-1,
	sendBuffer:[],
	socket:null,
	init:function(socket) {
		console.log("init function",arguments);
		var buffer = "";
		this.socket = socket;
		socket.on('data', _.bind(function(data) {
			data = String(data).replace("\r","");
			console.log("socket data",data);
			if (data.length == 0) return;
			buffer += data;
            while(true) {
                var index = buffer.indexOf("\n\n");
                if (index == -1) break;

                var line = buffer.substring(0,index);
                this.receivedClientData(socket,line);
                buffer = buffer.substring(index+1);
                console.log("splitting.. buffer remains: ",buffer);
            }
		},this));
		
		socket.on('end',_.bind(function () {
			$(this).trigger("Disconnect",[this]);
		},this));

		socket.on('error',_.bind(function(error) {
			if (error.code == "ECONNRESET") {
				$(this).trigger("Disconnect",[this,error]);
			} else {
				console.log("uncaught error: ",error);
			}
		},this));
	},
	getId:function() {
		return this.id;
	},
	getSocket:function() {
		return this.socket;
	},
	_stripReady:function() {
        this.status = "ready";
		this.manageQueue();
    },
	manageQueue:function() {
		console.log("manage queue called");
		if (this.sendBuffer.length != 0) {
			console.log("sending queued: queue size: ",this.sendBuffer.length)
			this.status = "busy";
			var buf = this.sendBuffer.shift();
			this.socket.write(buf);
		}
	},
	receivedClientData:function(socket,data) {
        stringData = trim(String(data));
        console.log("string data received",stringData);
		if (stringData.length == 0) return;

        var match = stringData.match(/id:(.*)/);
        if (match) {
            var id = match[1].trim();
            this.id = id;
			this.stripConnected();
			$(this).trigger("Connect",[this]);
            return;
        }

        if (stringData.startsWith("patterns")) {
            var lines = stringData.split("\n");
            lines.splice(0,1);
            console.log("lines",lines);
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
            console.log("triggering pattern metadata..",this);
            $(this).trigger("PatternMetadata",[this,patternData]);
            return;
        }

        match = stringData.match(/ready/);
        if (match) {
			console.log("ready received");
			this._stripReady();
			
            $(this).trigger("Ready",[this]);
            return;
        }

        console.log("got unexpected data: ",stringData);
    },
	stripConnected:function() {
        console.log("Strip Connected: ",this.id);
        this.sendBuffer = [];
        this._stripReady();
		
		this.requestPatterns();
    },
	requestPatterns:function() {
		console.log("requesting patterns");
	    this._sendData("str","mem");
	},
    selectPattern:function(id,index) {
        this._sendData("bin",Buffer.concat([new Buffer("select\0"),bufferFromNumber(index,1)]));
    },
	forgetPattern:function(index) {
        this._sendData("bin",Buffer.concat([new Buffer("del\0"),bufferFromNumber(index,1)]));
		this.requestPatterns();
    },
	savePattern:function(name,fps,data) {
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
        console.log("pattern size: ",len*frames);
        var sendPages = 2;
        var page = 0;
        var bufferSize = Math.min(len*frames,sendPages*0x100);
        var payload = new Buffer(bufferSize);
        var offset = 0;

        this._sendData("bin",Buffer.concat([new Buffer("save\0"),metadata]));
        for (var i=0; i<frames; i++) {
            for (var l=0; l<len; l++) {
                if (offset >= bufferSize) {
                    this._sendData("bin",Buffer.concat([new Buffer("body\0"),new Buffer([0xff]),bufferFromNumber(page,4),payload]));

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
        this._sendData("bin",Buffer.concat([new Buffer("body\0"),new Buffer([0xff]),bufferFromNumber(page,4),payload]));

		this.requestPatterns();
    },
    _prepareBuffer:function(type,data) {
        if (type == "bin") {
            var buf = Buffer.concat([new Buffer([0]),bufferFromNumber(data.length,4),data]);
            return buf;
        } else if (type == "str") {
            var dataBuffer = new Buffer(data+"\n\n");
            return Buffer.concat([new Buffer([1]),dataBuffer]);
        }
    },
    _sendData:function(type,data) {
        var buf = this._prepareBuffer(type,data);
        console.log("senddata BUFFER",buf);

        if (this.status != "ready") {
			console.log("adding to queue");
            this.sendBuffer.push(buf);
        } else {
            console.log("strip ready, sending");
            this.status = "busy";
            this.socket.write(buf);
        }
    },
});

module.exports = This;
