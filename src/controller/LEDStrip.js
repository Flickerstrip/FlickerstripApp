var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore")._;
var util = require("util");
var StripWrapper = require("./StripWrapper");

var This = function() {
    this.init.apply(this,arguments);
};

util.inherit(This,EventEmitter);
extend(This.prototype,{
	id:null,
    name:null,
    connection:null,
    patterns:[],
	init:function(connection) {
        if (connection) this.setConnection(connection);
	},
    setConnection:function(connection) {
        this.connection = connection;
        if (this.id == null) this.id = this.connection.id;
        if (this.id != this.connection.id) throw "Error, connection ID mismatch: "+this.id+" =/= "+this.connection.id;

		$(connection).on("ReceivedPatternMetadata",_.bind(this.receivedPatternMetadata,this));
		$(connection).on("ProgressUpdate",_.bind(this.progressUpdate,this));
		$(connection).on("Disconnect",_.bind(this.connectionReset,this));

        this.requestPatterns();
    },
    clearConnection:function() {
        if (this.connection) this.connection.destroy();
        this.connection = null;
    },
    progressUpdate:function(e,connection) {
        var session = connection.getCurrentSession();
        $(this).trigger("ProgressUpdated",[this,session]);
    },
    receivedPatternMetadata:function(e,connection,patterns) {
        this.patterns = patterns;
        $(this).trigger("PatternsUpdated",[patterns]);
    },
    connectionReset:function(e,connection,error) {
        this.clearConnection();
        $(this).trigger("Disconnect",[this]);
    },
	requestPatterns:function() {
	    this.connection.sendCommand(StripWrapper.packetTypes.GET_PATTERNS);
	},
    loadPattern:function(name,fps,data) {
        this.connection.sendPattern(name,fps,data);
        this.requestPatterns();
    },
    selectPattern:function(index) {
        this.connection.sendCommand(StripWrapper.packetTypes.SELECT_PATTERN,index);
    },
	forgetPattern:function(index) {
        this.connection.sendCommand(StripWrapper.packetTypes.DELETE_PATTERN,index);
		this.requestPatterns();
    },
    setName:function(name) {
        this.name = name;
        $(this).trigger("NameUpdated",[this]);
    },
    getName:function() {
        return this.name;
    },
    /////////////////////////////
    on:function(trigger,callback) {
        $(this).on(trigger,callback);
    },
    one:function(trigger,callback) {
        $(this).one(trigger,callback);
    },
});

module.exports = This;
