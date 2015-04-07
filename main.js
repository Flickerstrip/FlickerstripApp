var nw = require('nw.gui');
var requirejs = require("requirejs");
var Manager = require("./manager");
var $ = require("jquery");
requirejs.config({
    nodeRequire:require,
    "shim": {
        //"jquery.contextMenu"  : ["jquery"]
    }
});

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
            gui.setStrips(manager.getStrips());
        });

        $(gui).on("StripNameUpdated",function(e,id,newname) {
            manager.setStripName(id,newname);
        });
    });
});

window.onkeydown = function(e) {
    if (e.keyCode == 27) nw.App.quit();
};

