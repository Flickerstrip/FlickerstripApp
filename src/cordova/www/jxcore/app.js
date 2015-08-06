var Manager = require("./controller/manager.js");

console.log = function() {
    Mobile('Log').callNative(Array.prototype.join.call(arguments," "));
}

Mobile("guiLog").registerAsync(function(json) {
    var args = JSON.parse(json);
    //var args = Array.prototype.slice.call(arguments); //convert arguments to array
    //args.pop(); //pop the callback off the arguments list
    Mobile('Log').callNative(args.join(" "));
});

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

