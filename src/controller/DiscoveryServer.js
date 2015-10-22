var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var dgram = require('dgram'); 
var net = require('net');
var Client = require('node-ssdp').Client;

var This = function() {
    this.init();
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
    init:function() {
        this.ssdp = new Client();

        //handle the ssdp response when the roku is found
        this.ssdp.on('response',_.bind(this.handleResponse,this));

        setInterval(_.bind(this.doSearch,this),1000);
        this.doSearch()
    },
    handleResponse:function (headers, statusCode, rinfo) {
        if (headers.SERVER.indexOf("Flickerstrip") != -1) {
            this.emit("DiscoveredClient",rinfo.address);
        }
    },
    doSearch:function() {
        //ssdp.search("upnp:rootdevice")
        this.ssdp.search("ssdp:all")
    },
});

module.exports = This;
