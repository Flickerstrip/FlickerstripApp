var dgram = require("dgram");

var server = dgram.createSocket('udp4');

server.on('message', function (message) {
    console.log('received a message: ' + message);
});

var port = 2836;
server.bind(port);
