var $ = require("jquery");
var nw = require('nw.gui');
var requirejs = require("requirejs");
var Manager = require("./manager");
requirejs.config({nodeRequire:require});

var win = nw.Window.get();
win.moveTo(0,30);
var dev = win.showDevTools();
dev.moveTo(0,win.height+40);
dev.height =  window.screen.availHeight - win.height - 20;
dev.width =  window.screen.availWidth;
win.focus();

requirejs(['Gui.js'],function(Gui) {
    $(document).ready(function() {
        var gui = new Gui(window);
        var manager = new Manager();

        $(manager).on("StripDataReady",function() {
            console.log("strip data ready");
            gui.setStrips(manager.getStrips());
        });

        $(gui).on("StripNameUpdated",function(e,id,newname) {
            console.log("strip name update");
            manager.setStripName(id,newname);
        });
    });
});

window.onkeydown = function(e) {
    if (e.keyCode == 27) nw.App.quit();
};

