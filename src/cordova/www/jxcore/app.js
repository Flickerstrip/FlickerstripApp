var Manager = require("./controller/manager.js");

GLOBAL.log = function() {
    Mobile('Log').callNative(Array.prototype.join.call(arguments," "));
}

GLOBAL.log("foo bar baz");

var manager;
Mobile("guiReady").registerAsync(function(json) {
    manager = new Manager(function() {
        var args = JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
            if (key.indexOf("_") === 0) return false;
            return value;
        });
        Mobile("managerEventReceived").call(args);
    });
});

Mobile("guiEventReceived").registerSync(function(json) {
    var args = JSON.parse(json)
    manager.eventHandler.apply(manager,args);
});

