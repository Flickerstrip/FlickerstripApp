var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("./util.js");
var Wireless = require("wireless");

var This = function() {
    this.init.apply(this,arguments);
}

util.inherits(This,EventEmitter);
extend(This.prototype, {
    init:function() {
        console.log("initting");
        var wireless = new Wireless({
            iface: 'wlan0',
            updateFrequency: 10, // Optional, seconds to scan for networks
            connectionSpyFrequency: 2, // Optional, seconds to scan if connected
            vanishThreshold: 2 // Optional, how many scans before network considered gone
        });
        console.log(wireless);

        wireless.on("error",function(err) {
            console.log("error",err);
        });

        wireless.enable(function(err) {
            wireless.start();
            wireless.on("appear",function(data) {
                console.log(data);
            });
        });

    },
});

module.exports = This;
