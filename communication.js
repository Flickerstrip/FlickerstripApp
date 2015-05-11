var $ = require("jquery");
var _ = require("underscore")._;
var util = require("util");
var dgram = require('dgram'); 
var net = require('net');

var This = function() {
    this.init();
};

$.extend(This.prototype,{
    clients:[],
    init:function() {
        var tcpport = 3836;
        var message = "Announcement.. PORT:"+tcpport+"\r\n";
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

            this.clients.push(socket);

            var buffer = "";
            socket.on('data', _.bind(function(data) {
                data = String(data).replace("\r","");
                if (data.length == 0) return;
                buffer += data;
                var index = buffer.indexOf("\n");
                if (index != -1) {
                    var line = buffer.substring(0,index);
                    this.receivedClientData(socket,line);
                    buffer = buffer.substring(index+1);
                }
            },this));
            socket.on('end',_.bind(function () {
                console.log("client disconnected");
                this.clients.splice(this.clients.indexOf(socket), 1);
                $(this).trigger("StripListUpdated");
            },this));

            socket.on('error',_.bind(function(error) {
                if (error.code == "ECONNRESET") {
                    console.log("Connection reset by peer: ",socket.id);
                    this.clients.splice(this.clients.indexOf(socket), 1);
                    $(this).trigger("StripListUpdated");
                } else {
                    console.log("uncaught error: ",error);
                }
            },this));
        },this)).listen(port);

        return server;
    },
    getClient:function(id) {
        var client = null;
        _.each(this.clients,function(c) {
            if (c.id == id) client = c;
        });
        return client;
    },
    receivedClientData:function(socket,data) {
        var match = String(data).match(/id:(.*)/);
        if (match) {
            var id = match[1].trim();
            socket.id = id;
            $(this).trigger("StripListUpdated");
            $(this).trigger("StripConnected",[id]);
        }
        match = String(data).match(/ready/);
        if (match ) {
            console.log("got ready ack");
            socket.ready = true;
            $(this).trigger("Ready",[socket.id]);
        }
    },
    getVisibleStrips:function() {
        var ids = [];
        _.each(this.clients,function(client) {
            ids.push(client.id);
        });
        ids = _.uniq(ids);
        return ids;
    }
});

module.exports = This;
