var $ = require("jquery");
var _ = require("underscore")._;
var util = require("util");
var fs = require("fs");
var dgram = require('dgram'); 

var This = function() {
    console.log("initting comms");
    this.init();
};

$.extend(This.prototype,{
    init:function() {
        //-->                                                     freq,multicast addr   ,sprt,dprt
        this.announcementServer = this.startAnnouncementBroadcast(3000,"255.255.255.255",1836,2836);
        this.startServer();
    },
    startAnnouncementBroadcast:function(frequency,ip,sport,dport) {
        var server = dgram.createSocket("udp4"); 

        server.bind(sport,function() {
            server.setBroadcast(true)
            server.setMulticastTTL(128);
        });

        setInterval(function() {
            var message = "Announcement broadcast"; //TODO server info?
            server.send(message, 0, message.length, dport, ip);
            console.log("Sent " + message + " to the wire...");
        }, frequency);

        return server;
    },
    startServer:function() {

    },
    getVisibleStrips:function() {
		return [
			"strip123",
			"strip335"
		];
    }
});

module.exports = This;
