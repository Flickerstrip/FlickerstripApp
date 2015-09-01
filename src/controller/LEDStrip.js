var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var StripWrapper = require("./StripWrapper");
var fs = require("fs");

var This = function() {
    this.init.apply(this,arguments);
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
	id:null,
    name:null,
    connection:null,
    patterns:[],
    memory:null,
	init:function(connection) {
        if (connection) this.setConnection(connection);
	},
    setConnection:function(connection) {
        this._connection = connection;
        if (this.id == null) this.id = this._connection.id;
        if (this.id != this._connection.id) throw "Error, connection ID mismatch: "+this.id+" =/= "+this._connection.id;

		connection.on("ReceivedStatus",_.bind(this.receivedStatus,this));
		connection.on("ProgressUpdate",_.bind(this.progressUpdate,this));
		connection.on("Disconnect",_.bind(this.connectionReset,this));

        this.requestStatus();
    },
    clearConnection:function() {
        if (this._connection) this._connection.destroy();
        this._connection = null;
    },
    progressUpdate:function(connection) {
        var session = connection.getCurrentSession();
        this.emit("Strip.ProgressUpdated",this,session);
    },
    receivedStatus:function(connection,stripStatus) {
        this.patterns = stripStatus.patterns;
        this.memory = stripStatus.memory;
        this.brightness = stripStatus.brightness;
        this.selectedPattern = stripStatus.selectedPattern;
        this.emit("Strip.StatusUpdated",stripStatus);
    },
    connectionReset:function(connection,error) {
        this.clearConnection();
        this.emit("Disconnect",this);
    },
    uploadFirmware:function(path) {
        var stream = fs.createReadStream(path);
        var stats = fs.statSync(path)
        var hexSize = stats["size"];
        console.log("Uploading Firmware: ",path,hexSize);

        var setup = false;
        var done = false;
        var frameSize = 1000;
        var bytesSent = 0;
        stream.on("readable",_.bind(function() {
            this._connection.sendCustom(_.bind(function(socket) {
                if (!setup) {
                    setup = true;
                    this._connection.pauseDataHandler();
                    var buf = this._connection._prepareCommand(StripWrapper.packetTypes.UPLOAD_FIRMWARE,hexSize);
                    socket.write(this._connection._prepareBuffer("bin",buf));
                    function dataHandler() {
                        if (done) return;

                        var buf = stream.read(frameSize);
                        if (!buf) {
                            console.log("loading remaining..");
                            buf = stream.read();
                            if (buf) console.log("got remaining: "+buf.length);
                        }

                        if (buf) { 
                            bytesSent += buf.length;
                            socket.write(buf);
                            console.log("sending: "+bytesSent+" of "+hexSize);
                        } else {
                            console.log("done sending!");
                            socket.removeListener("data",_.bind(dataHandler,this));
                            setTimeout(_.bind(function() {
                                done = true;
                                this._connection.status = "ready";
                                this._connection._manageQueue();
                            },this),5);
                        }
                    }
                    socket.on("data",_.bind(dataHandler,this));
                    dataHandler.call(this);
                    return false;
                } else if (done) {
                    console.log("returning true from f call");
                    this._connection.resumeDataHandler();
                    return true;
                }
            },this));
        },this));
    },
    requestStatus:function() {
	    this._connection.sendCommand(StripWrapper.packetTypes.GET_STATUS);
    },
	setBrightness:function(brightness) {
        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;
	    this._connection.sendCommand(StripWrapper.packetTypes.SET_BRIGHTNESS,brightness);
	},
    toggle:function(value) {
        this._connection.sendCommand(StripWrapper.packetTypes.TOGGLE_POWER,value);
    },
    loadPattern:function(name,fps,data,isPreview) {
        this._connection.sendPattern(name,fps,data,isPreview);
        if (!isPreview) this.requestStatus();
    },
    selectPattern:function(index) {
        this._connection.sendCommand(StripWrapper.packetTypes.SELECT_PATTERN,index);
    },
	forgetPattern:function(index) {
        this._connection.sendCommand(StripWrapper.packetTypes.DELETE_PATTERN,index);
        this.requestStatus();
    },
	disconnectStrip:function() {
        this._connection.sendCommand(StripWrapper.packetTypes.DISCONNECT_NETWORK);
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
