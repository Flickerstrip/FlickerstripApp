var nw = require('nw.gui');
var Manager = require("./manager");
var fs = require("fs");
var ShutdownHandler = require("./ShutdownHandler");
global.ShutdownHandler = ShutdownHandler;

requirejs.config({
    nodeRequire:require,
    baseUrl: "lib",
    "shim": {
        "jquery.contextMenu"  : ["jquery"]
    }
});

var win = nw.Window.get();
win.moveTo(0,30);
var dev = win.showDevTools();
dev.moveTo(0,win.height+40);
dev.height =  window.screen.availHeight - win.height - 20;
dev.width =  window.screen.availWidth;
win.focus();
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
        var gui = new Gui(window);
        var manager = new Manager(gui);
    });
});

window.onkeydown = function(e) {
    if (e.keyCode == 27) nw.App.closeAllWindows();
};

