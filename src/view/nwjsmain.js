var nw = require('nw.gui');
var Manager = require("../controller/manager");
var fs = require("fs");
var ShutdownHandler = require("../controller/ShutdownHandler");
global.ShutdownHandler = ShutdownHandler;

requirejs.config({
    nodeRequire:require,
    baseUrl: "./lib",
    "shim": {
        "jquery.contextMenu"  : ["jquery"]
    }
});

var win = nw.Window.get();

var debugMode = true;
if (debugMode) {
    win.moveTo(400,30);
    var dev = win.showDevTools();
    dev.moveTo(0,win.height+40);
    dev.height =  window.screen.availHeight - win.height - 20;
    dev.width =  window.screen.availWidth;
    win.focus();
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

requirejs(['jquery','Gui.js'],function($,Gui) {
    $$(document).ready(function() {
        window.$ = $;
        window.jQuery = $;
        $(document.body).append('<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script>');
        
        var gui = new Gui(window);
        var manager = new Manager(gui);
    });
});

window.onkeydown = function(e) {
    if (e.keyCode == 27) nw.App.closeAllWindows();
};
