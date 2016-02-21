var dgram = require('dgram');
var client = dgram.createSocket("udp4");

client.bind();
client.on("listening", function () {
    client.setBroadcast(true);
    //var message = new Buffer("{'command':'next'}");
    var message = new Buffer(process.argv[2]);
    console.log("sending.. ",message);

    client.send(message, 0, message.length, 2836, "255.255.255.255",function(err, bytes) {
        client.close();
    });
});

