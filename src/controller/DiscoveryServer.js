var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var dgram = require('dgram'); 
var net = require('net');

var This = function() {
    this.init();
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
    init:function() {
        var tcpport = 3836;
        var message = "announce\0"+tcpport+"\0\0";
        //-->                                                     message,freq,multicast addr   ,sprt,dprt
        this.announcementServer = this.startAnnouncementBroadcast(message,3000,"255.255.255.255",1836,2836);
        this.startServer(tcpport);
    },
    startAnnouncementBroadcast:function(message,frequency,ip,sport,dport) {
        var server = dgram.createSocket("udp4"); 

        server.bind(sport,function() {
            server.setBroadcast(true)
            server.setMulticastTTL(128);
        });

        var sendBroadcast = function() {
            var buf = Buffer(message);
            server.send(buf, 0, buf.length, dport, ip);
        }

        sendBroadcast();
        setInterval(sendBroadcast, frequency);

        return server;
    },
    startServer:function(port) {
        var server = net.createServer(_.bind(function (socket) {
            socket.name = socket.remoteAddress + ":" + socket.remotePort;

            this.emit("ClientConnected",socket);
        },this)).listen(port);

        return server;
    }
});

module.exports = This;
