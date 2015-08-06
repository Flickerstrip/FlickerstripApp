function jxcore_ready() {
    var gui = null;

    jxcore("managerEventReceived").register(function(json) {
        var args = JSON.parse(json);
        gui.eventHandler.apply(gui,args);
    });

    requirejs.config({
        baseUrl: "./view/lib",
        "shim": {
            "jquery.contextMenu"  : ["jquery"]
        },
        paths: {
            "view":"..",
            "tmpl":"../tmpl",
        },
        config: {
            text: {
                env: 'xhr'
            }
        }
    });

    function guiReady() {
        jxcore("guiReady").call();
    }

    var isGuiReady = false;

    requirejs(['jquery','view/Gui.js'],function($,Gui) {
        console.log = log;
        gui = new Gui(window,function() {
            var args = JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                if (key && key.indexOf && key.indexOf("_") === 0) return false;
                return value;
            });
            jxcore("guiEventReceived").call(args);
        });
        var $debug = $("<div id='txt'></div>");
        $debug.css({
            "position":"fixed",
            "width":"100%",
            "bottom":"0px",
            "background-color":"rgba(0,0,0,.7)",
            "color":"white",
            "opacity":".7",
        });
        $(document.body).append($debug);

        guiReady();
    });
}

