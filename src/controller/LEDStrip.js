var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var StripWrapper = require("./StripWrapper");

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

		connection.on("ReceivedPatternMetadata",_.bind(this.receivedPatternMetadata,this));
		connection.on("ReceivedAvailableBlocks",_.bind(this.receivedAvailableBlocks,this));
		connection.on("ReceivedBrightness",_.bind(this.receivedBrightness,this));
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
    receivedPatternMetadata:function(connection,patterns) {
        this.patterns = patterns;
        this.emit("Strip.PatternsUpdated",patterns);
    },
    receivedAvailableBlocks:function(connection,available,total) {
        this.memory = {
            available:available,
            total:total
        }
        this.emit("Strip.AvailableBlocks",available,total);
    },
    receivedBrightness:function(connection,brightness) {
        this.emit("Strip.Brightness",brightness);
    },
    connectionReset:function(connection,error) {
        this.clearConnection();
        this.emit("Disconnect",this);
    },
    requestStatus:function() {
        this.requestPatterns();
        this.requestAvailable();
	    this._connection.sendCommand(StripWrapper.packetTypes.GET_BRIGHTNESS);
    },
	requestPatterns:function() {
	    this._connection.sendCommand(StripWrapper.packetTypes.GET_PATTERNS);
	},
	requestAvailable:function() {
	    this._connection.sendCommand(StripWrapper.packetTypes.AVAILABLE_BLOCKS);
	},
	setBrightness:function(brightness) {
        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;
	    this._connection.sendCommand(StripWrapper.packetTypes.SET_BRIGHTNESS,brightness);
	},
    loadPattern:function(name,fps,data) {
        this._connection.sendPattern(name,fps,data);
        this.requestStatus();
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
