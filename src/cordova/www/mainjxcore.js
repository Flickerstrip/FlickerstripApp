function jxcore_ready() {
    var gui = null;

    jxcore("managerEventReceived").register(function(json) {
        var args = JSON.parse(json);
        gui.eventHandler.apply(gui,args);
    });

    requirejs.config({
        baseUrl: "./view/lib",
        "shim": {
            "jquery.contextMenu"  : ["jquery"],
            "jquery.touchwipe.min"  : ["jquery"]
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

    function log() {
        jxcore("guiLog").call(JSON.stringify(Array.prototype.slice.call(arguments)));
    }

    window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
        log("Error occured: " + errorMsg+ " "+url+":"+lineNumber)
        return false;
    }

    function init() {
        requirejs(['jquery','view/Gui.js'],function($,Gui) {
            console.log = log;
            platform = "mobile";

            $(document).on("touchmove", function(evt) { evt.preventDefault() });
            $(document).on("touchmove", ".scrollable", function(evt) { evt.stopPropagation() });

            try {
                gui = new Gui(window,function() {
                    var args = JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                        if (key && key.indexOf && key.indexOf("_") === 0) return false;
                        return value;
                    });
                    jxcore("guiEventReceived").call(args);
                });
            } catch (e) {
                log(e.message);
                log(JSON.stringify(e));
            }
            guiReady();
        });
    }

    var instant = true; //set this to true to debug initialization
    if (instant) {
        init();
    } else {
        var a = document.createElement("a");
        a.innerText = "Initialize";
        document.body.appendChild(a);
        a.onclick = function() {
            init();
            return false;
        }
    }
}

