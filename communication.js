var $ = require("jquery");
var _ = require("underscore")._;
var util = require("util");
var fs = require("fs");
var dgram = require('dgram'); 
var net = require('net');

var This = function() {
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

        var sendBroadcast = function() {
            server.send(message, 0, message.length, dport, ip);
        }

        sendBroadcast();
        setInterval(sendBroadcast, frequency);

        return server;
    },
    startServer:function(port) {
        var server = net.createServer(_.bind(function (socket) {
            socket.name = socket.remoteAddress + ":" + socket.remotePort;
            
            this.clients.push(socket);

            socket.on('data', _.bind(this.receivedClientData,this,socket));
            socket.on('end',_.bind(function () {
                this.clients.splice(this.clients.indexOf(socket), 1);
                $(this).trigger("StripListUpdated");
            },this));
        },this)).listen(port);

        return server;
    },
    receivedClientData:function(socket,data) {
        var match = String(data).match(/id:(.*)/);
        if (match) {
            var id = match[1].trim();
            socket.id = id;
            $(this).trigger("StripListUpdated");
        }
    },
    getVisibleStrips:function() {
        var ids = [];
        _.each(this.clients,function(client) {
            ids.push(client.id);
        });
        return ids;
    }
});

module.exports = This;
