var EventEmitter = require("eventemitter2").EventEmitter2;
var extend = require("extend");
var _ = require("underscore")._;
var util = require("util");
var fs = require("fs");

var This = function() {
    this.init.apply(this,arguments);
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
	init:function(configLocation,firmwareFolder,userPatternFolder,basicPatternFolder) {
        this.configLocation = configLocation;
        this.firmwareFolder = firmwareFolder;
        this.userPatternFolder = userPatternFolder;
		this.basicPatternFolder = basicPatternFolder;
	},
});

module.exports = This;
