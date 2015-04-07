var $ = require("jquery");
var _ = require("underscore")._;
var util = require("util");
var fs = require("fs");
var dgram = require('dgram'); 
var net = require('net');

var This = function() {
    console.log("initting comms");
    this.init();
};

$.extend(This.prototype,{
    clients:[],
    init:function() {
        var tcpport = 3836;
        var message = "Announcement.. PORT:"+tcpport;
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

        setInterval(function() {
            server.send(message, 0, message.length, dport, ip);
            console.log("Sent " + message + " to the wire...");
        }, frequency);

        return server;
    },
    startServer:function(port) {
        var server = net.createServer(_.bind(function (socket) {
            socket.name = socket.remoteAddress + ":" + socket.remotePort;
            
            this.clients.push(socket);

            console.log("client connected",socket.name);

            socket.on('data', this.receivedClientData);
            socket.on('end',_.bind(function () {
                console.log("client disconnected",socket.name);
                this.clients.splice(this.clients.indexOf(socket), 1);
            },this));
        },this)).listen(port);

        return server;
    },
    receivedClientData:function(data) {
        console.log("recevived client data: ",String(data));
    },
    getVisibleStrips:function() {
		return [
			"strip123",
			"strip335"
		];
    }
});

module.exports = This;
