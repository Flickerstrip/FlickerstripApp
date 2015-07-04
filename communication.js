var $ = require("jquery");
var _ = require("underscore")._;
var util = require("util");
var dgram = require('dgram'); 
var net = require('net');
var StripWrapper = require("./StripWrapper.js");

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

			console.log("client socket received");
			var strip = new StripWrapper(socket);
			
			$(strip).on("Connect",_.bind(this.clientConnected,this));
			$(strip).on("Disconnect",_.bind(this.clientDisconnected,this));
        },this)).listen(port);

        return server;
    },
	clientConnected:function(e,strip) {
		var id = strip.getId();
		console.log("client connection established",id);
		this.clients.push(strip);
	    $(this).trigger("StripListUpdated");
        $(this).trigger("StripConnected",[id,strip]);
	},
	clientDisconnected:function(strip) {
		this.clients.splice(this.clients.indexOf(socket), 1);
		$(this).trigger("StripListUpdated");
	},
    getClient:function(id) {
        var client = null;
        _.each(this.clients,function(c) {
            if (c.getId() == id) client = c;
        });
        return client;
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
