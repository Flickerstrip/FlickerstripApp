var Manager = require("./controller/manager.js");
var Configuration = require("./controller/configuration.js");
var path = require("path");

console.log = function() {
    Mobile('Log').callNative(Array.prototype.join.call(arguments," "));
}

var exposeFunctions = ["RedirectToSettings"];
for (var i=0; i<exposeFunctions.length; i++) {
    var fname = exposeFunctions[i];
    Mobile("gui_"+fname).registerSync(function(args) {
        Mobile(fname).callNative(args);
    });
}

Mobile("guiLog").registerAsync(function(json) {
    var args = JSON.parse(json);
    Mobile('Log').callNative(args.join(" "));
});

var manager;
Mobile("guiReady").registerAsync(function(json) {
    //require('os').tmpdir()
    var config = new Configuration(path.join(process.userPath,"config.json"),path.join(process.userPath,"firmwareVersions"),path.join(process.userPath,"patterns"));
    try {
        manager = new Manager(config,function() {
            var args = JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                if (key.indexOf("_") === 0) return false;
                return value;
            });
            Mobile("managerEventReceived").call(args);
        });
    } catch (e) {
        console.log("manager failed to instantiate");
        console.log(e.message);
        console.log(JSON.stringify(e));
    }
});

Mobile("guiEventReceived").registerSync(function(json) {
    var args = JSON.parse(json)
    manager.eventHandler.apply(manager,args);
});

