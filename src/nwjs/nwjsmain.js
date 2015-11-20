var nw = require('nw.gui');
var Manager = require("./controller/manager");
var fs = require("fs");
var ShutdownHandler = require("./controller/ShutdownHandler");
var Configuration = require("./controller/configuration.js");
var path = require("path");
var pjson = require('./package.json');
global.ShutdownHandler = ShutdownHandler;
global.log = console.log;

requirejs.config({
    nodeRequire:require,
    baseUrl: "./view/lib",
    "shim": {
        "jquery.contextMenu"  : ["jquery"],
        "jquery.spectrum"  : ["jquery"]
    },
    paths: {
        "view":"..",
        "tmpl":"../tmpl"
    }
//    packages: [{
//        name: "codemirror",
//        location: "cm",
//        main: "lib/codemirror"
//    }];
});

var win = nw.Window.get();
var nativeMenuBar = new nw.Menu({ type: "menubar" });
try {
    nativeMenuBar.createMacBuiltin("My App");
    win.menu = nativeMenuBar;
} catch (ex) {
    console.log(ex.message);
}

var debugMode = pjson.debug;
if (debugMode) {
    win.moveTo(400,30);
    var dev = win.showDevTools();
    dev.moveTo(0,win.height+40);
    dev.height =  window.screen.availHeight - win.height - 20;
    dev.width =  window.screen.availWidth;
    win.focus();

    window.onkeydown = function(e) {
        if (e.keyCode == 27) nw.App.closeAllWindows();
    };
}

nw.App.setCrashDumpDir("./");

var closedOnce = false;
var closeImmediately = true;
win.on('close',function() {
    if (closedOnce) win.close(true);
    ShutdownHandler.callHandlers();
    if (closeImmediately) win.close(true);
    closedOnce = true;
});

var $$ = require('jquery');
requirejs(['jquery','./view/Gui.js'],function($,Gui) {
    $$(document).ready(function() {
        window.$ = $;
        window.jQuery = $;
        $(document.body).append('<script src="./view/lib/bootstrap.min.js"></script>');

        var gui, manager;

        function guiEmit() {
            var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                if (key.indexOf("_") === 0) return false;
                return value;
            }));

            if (args[0].name == "OpenConsole") {
                var win = nw.Window.get();
                var dev = win.showDevTools();
                dev.moveTo(0,win.height+40);
                dev.height =  window.screen.availHeight - win.height - 20;
                dev.width =  window.screen.availWidth;
                win.focus();
            }

            manager.eventHandler.apply(manager,args);
        }
        function managerEmit() {
            var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                if (key.indexOf("_") === 0) return false;
                return value;
            }));

            gui.eventHandler.apply(gui,args);
        }

        platform = "desktop";
        gui = new Gui(window,guiEmit);
        var config = new Configuration(path.join(".","config.json"),path.join(".","firmwareVersions"),path.join(".","patterns"));
        manager = new Manager(config,managerEmit,platform);
    });
});

