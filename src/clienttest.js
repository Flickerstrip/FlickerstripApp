var dgram = require("dgram");
var net = require('net');

var server = dgram.createSocket('udp4');

var identifier = process.argv.length >= 3 ? process.argv[2] : "defaultidentifier";

server.on('message', function (message,info) {
    console.log('received a message: ' + message);
    console.log("type",typeof message);
    var matches = String(message).match(/PORT:([0-9]+)/);
    var tcpport = matches[1];
    var host = info.address;
    console.log("got port: ",tcpport);

    server.close();

    var client = new net.Socket();
    client.connect(tcpport, host, function() {
        console.log('Connected via tcp');
        client.write("id:"+identifier);
    });
     
    client.on('data', function(data) {
        console.log('Received: ' + data);
    });
     
    client.on('close', function() {
        console.log('Connection closed');
    });
});

var port = 2836;
server.bind(port);
