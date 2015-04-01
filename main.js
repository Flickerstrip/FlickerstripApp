var $ = require("jquery");
var nw = require('nw.gui');
var requirejs = require("requirejs");
var Manager = require("./manager");
requirejs.config({nodeRequire:require});

var win = nw.Window.get();
win.moveTo(0,30);
win.showDevTools().moveTo(win.width,30);
win.focus();

requirejs(['Gui.js'],function(Gui) {
    onload = function() {
        var gui = new GUI(window);
        var manager = new Manager();

        $(manager).on("StripDataReady",function() {
            gui.setStrips(manager.getStrips());
        });

        $(gui).on("StripNameUpdated",function(e,id,newname) {
            manager.setStripName(id,newname);
        });
    }

});

window.onkeydown = function(e) {
    if (e.keyCode == 27) nw.App.quit();
};

