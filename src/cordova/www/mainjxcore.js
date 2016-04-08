//JXCORE FRONTEND CODE (jxcore_ready loaded from index.html)

var defaultLogger = console.log;
var debugMessagingSystem = false;
    var debugInitialization = false;

function backendLog() {
    jxcore("backendLog_fromFrontend").call(JSON.stringify(Array.prototype.slice.call(arguments)));
}

function frontendLog() {
    var source = null;
    try {
        var e = new Error();
        var stack = e.stack.toString().split(/\r\n|\n/);
        var stackLine = stack[1];

        source = stackLine.substring(stackLine.lastIndexOf("/")+1);
    } catch (e) { }

    defaultLogger.apply(console,[source].concat(Array.prototype.slice.call(arguments)));
}

function handleSpecialCommands(command) {
    if (command.name == "OpenLink") {
        cordova.InAppBrowser.open(command.args[0], '_system');
    }
}

var gui = null;

function init() {
    requirejs(['jquery','view/Gui.js'],function($,Gui) {
        platform = "mobile";

        isTablet = $(window).width() > 500;
        console.log("istablet:",isTablet);

        try {
            gui = new Gui(window,function() {
                if (debugMessagingSystem) console.log("[GUI EMIT]",arguments);

                handleSpecialCommands(arguments[0]);

                var serializedArguments = JSON.stringify(Array.prototype.slice.call(arguments),function(key,value) {
                    if (key && key.indexOf && key.indexOf("_") === 0) return false;
                    return value;
                });
                jxcore("guiEventReceived").call(serializedArguments);
            });

            jxcore("guiReady").call();
        } catch (e) {
            console.log(e.message);
            console.log(JSON.stringify(e));
        }
    });
}

//Called by index.html
function jxcore_ready() {
    //console.log = frontendLog;

    jxcore("managerEventReceived").register(function(json) {
        var args = JSON.parse(json);
        gui.eventHandler.apply(gui,args);
    });

    jxcore("frontendLog_fromBackend").register(function(json) {
        var args = JSON.parse(json);
        frontendLog.apply(this,args);
    });

    requirejs.config({
        baseUrl: "./view/lib",
        "shim": {
            "jquery.contextMenu"  : ["jquery"],
            "jquery.spectrum"  : ["jquery"]
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

    window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
        console.log("Error occured: " + errorMsg+ " "+url+":"+lineNumber)
        return false;
    }

    if (!debugInitialization) {
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

