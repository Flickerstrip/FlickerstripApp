var nw = require('nw.gui');
var Manager = require("./manager");

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

var $$ = require('jquery');

requirejs(['jquery','Gui.js'],function($,Gui) {
    $$(document).ready(function() {
        var gui = new Gui(window);
        var manager = new Manager();

        //use the node instance of jquery to work with manager..
        $$(manager).on("StripDataReady",function() {
            gui.setStrips(manager.getStrips());
        });

        //use the UI version of jquery to work with gui
        $(gui).on("StripNameUpdated",function(e,id,newname) {
            manager.setStripName(id,newname);
        });

        $(gui).on("ForgetStrip",function(e,id) {
            manager.forgetStrip(id);
        });
    });
});

window.onkeydown = function(e) {
    if (e.keyCode == 27) nw.App.quit();
};

