var nw = require('nw.gui');
var Manager = require("./controller/manager");
var fs = require("fs");
var ShutdownHandler = require("./controller/ShutdownHandler");
var Configuration = require("./controller/configuration.js");
var path = require("path");
var pjson = require('./package.json');
var os = require("os");
var child_process = require("child_process");

global.ShutdownHandler = ShutdownHandler;
global.log = console.log;
platform = "desktop";
global.platform = platform;

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
});

var win = nw.Window.get();
win.title = "Flickerstrip - v"+pjson.version;
var nativeMenuBar = new nw.Menu({ type: "menubar" });
try {
    nativeMenuBar.createMacBuiltin("My App");
    win.menu = nativeMenuBar;
} catch (ex) {
    console.log(ex.message);
}

if (pjson.showDebugger) {
    win.moveTo(400,30);
    var dev = win.showDevTools();
    dev.moveTo(0,win.height+40);
    dev.height =  window.screen.availHeight - win.height - 20;
    dev.width =  window.screen.availWidth;
    win.focus();
}

if (pjson.closeOnEsc) {
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

function handleSpecialCommands(command) {
    if (command.name == "OpenConsole") {
        var dev = win.showDevTools();
        dev.moveTo(0,win.height+40);
        dev.height =  window.screen.availHeight - win.height - 20;
        dev.width =  window.screen.availWidth;
        win.focus();
    }

    if (command.name == "OpenLink") {
        nw.Shell.openExternal( command.args[0] );
    }

    if (command.name == "Restart") {
        var child;
        if (process.platform == "darwin")  {
            child = child_process.spawn("open", ["-n", "-a", process.execPath.match(/^([^\0]+?\.app)\//)[1]], {detached:true});
        } else {
            child = child_process.spawn(process.execPath, [], {detached: true});
        }
        child.unref();
        nw.App.quit();
    }

    if (command.name == "Update") {
        var updatePath = command.args[0];
        var child;
        if (os.platform() == "win32") {
            processPath = path.join(process.cwd(),"updater.bat");
        } else {
            processPath = path.join(process.cwd(),"updater.sh");
        }
        child = child_process.spawn(processPath,[updatePath], {detached:true,cwd:process.cwd(),stdio:'ignore'});
        child.unref();
        nw.App.quit();
    }
}

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

            handleSpecialCommands(args[0]);

            manager.eventHandler.apply(manager,args);
        }
        function managerEmit() {
            var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                if (key.indexOf("_") === 0) return false;
                return value;
            }));

            handleSpecialCommands(args[0]);

            gui.eventHandler.apply(gui,args);
        }

        gui = new Gui(window,guiEmit);
        var config = new Configuration(path.join(".","config.json"),path.join(".","firmwareVersions"),path.join(".","patterns"));
        manager = new Manager(config,managerEmit,platform);
    });
});

