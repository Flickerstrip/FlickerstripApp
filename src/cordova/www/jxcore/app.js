var Manager = require("./controller/manager.js");
var Configuration = require("./controller/configuration.js");
var path = require("path");

var debugMessagingSystem = false;

var config = new Configuration(
    path.join(process.userPath,"config.json"),
    path.join(process.userPath,"firmwareVersions"),
    path.join(process.userPath,"patterns"),
    path.join(__dirname,"patterns")
);

function isPrimitive(arg) {
  var type = typeof arg;
  return arg == null || (type != "object" && type != "function");
}

backendLog = function() {
    var out = "";
    for (var i=0; i<arguments.length; i++) {
        if (i != 0) out += " ";
        if (isPrimitive(arguments[i])) {
            out += arguments[i];
        } else {
            out += JSON.stringify(arguments[i]);
        }
    }
    Mobile('Log').callNative(out);
}

frontendLog = function() {
    var json = JSON.stringify(Array.prototype.slice.call(arguments));
    Mobile('frontendLog_fromBackend').call(json);
}

Mobile("backendLog_fromFrontend").registerAsync(function(json) {
    var args = JSON.parse(json);
    backendLog.apply(this,args);
});

//Systematically expose native functions to the gui
var exposeFunctions = ["RedirectToSettings"];
for (var i=0; i<exposeFunctions.length; i++) {
    var fname = exposeFunctions[i];
    Mobile("gui_"+fname).registerSync(function(args) {
        Mobile(fname).callNative(args);
    });
}


var manager;

Mobile("guiReady").registerAsync(function(json) {
    console.log = backendLog;
    platform = "mobile";

    try {
        manager = new Manager(config,function() {
            var args = JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                if (key.indexOf("_") === 0) return false;
                return value;
            });

			if (debugMessagingSystem) console.log("[MANAGER EMIT]",arguments);

            Mobile("managerEventReceived").call(args);
        },"mobile");
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

