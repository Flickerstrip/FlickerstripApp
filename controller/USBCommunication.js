var $ = require("jquery");
var _ = require("underscore")._;
var fs = require("fs");
var util = require("util");
var PythonShell = require("python-shell");

function debug(out) {
    if (results) $("body",window.document).empty().append($("<pre />").text(out));
}

var This = function() {
    this.init();
};

var retryIntervals = [500,2000,10000];
var listRefresh = 3000;
var staleCheckInterval = 2000;
$.extend(This.prototype,{
    ports:{},
    lastListRefresh:-1,
    init:function() {
        console.log("usb disabled");
        return;
        console.log("usb comm init");
        this.update();
        setInterval(_.bind(this.update,this),staleCheckInterval);
    },
    update:function() {
        var currentTime = new Date().getTime();
        if (this.lastListRefresh == -1 || this.lastListRefresh - currentTime > listRefresh) {
            this.refreshPortList();
        }
        this.checkStalePorts();
    },
    refreshPortList:function() {
        PythonShell.run("serialutil.py",{scriptPath:"./", args:["listports"]},_.bind(function (err,results) {
            if (err) {
                console.log("failed to refresh port list...");
                throw err;
            }

            if (results == null) {
                throw "port list returned null!";
            }
            
            _.each(this.ports,_.bind(function(port,name) {
                if (!_.contains(results,name)) {
                    delete this.ports[name];
                    results.splice(results.indexOf(name), 1);
                } else {
                    results.splice(results.indexOf(name), 1);
                }
            },this));

            _.each(results,_.bind(function(name) {
                console.log("adding port",name);
                this.ports[name] = {
                    name:name,
                    lastQueried:-1,
                    queryCount:0,
                    conn:null,
                }
            },this));

        },this));
    },
    checkStalePorts:function() {
        var stalePorts = [];
        _.each(this.ports,_.bind(function(port,name) {
            var currentTime = new Date().getTime();
            var staleThreshold = retryIntervals[port.queryCount > retryIntervals.length ? (retryIntervals.length - 1) : port.queryCount]
            if (port.conn == null && (port.lastQueried == -1 || currentTime - port.lastQueried > staleThreshold)) {
                stalePorts.push(name);
                port.queryCount++;
                port.lastQueried = currentTime;
            }
        },this));

        if (stalePorts.length == 0) {
            return;
        }

        console.log("Checking stale ports:",stalePorts);

        stalePorts.unshift("checkports");
        PythonShell.run("serialutil.py",{scriptPath:"./", args:stalePorts},_.bind(function (err,results) {
            if (err) {
                console.log("failed to check ports");
                throw err;
            }

            _.each(results,_.bind(function(port) {
                this.getMacAddress(port);
            },this))
        },this));
    },

    getMacAddress:function(port) {
        console.log("Getting mac",port);
        PythonShell.run("serialutil.py",{scriptPath:"./", args:["getmac",port]},_.bind(function (err,results) {
            if (err || !results) {
                console.log(err,results,"failed to get mac");
                if (err) throw err;
            }

            if (results) {
                console.log("got mac address",results[0]);
                this.ports[port].id = results[0];

                this.connectToPort(port);
            } else {
                this.getMacAddress(port);
            }

        },this));
    },

    connectToPort:function(port) {
        console.log("Connecting to port:",port);
        args = ["-q",port,"115200"]; //,"--exit-char=0"];
        var conn = new PythonShell("serialutil.py",{mode:"binary",scriptPath:"./",args:['openport',port]});

        var shutdownHandler = function() {
            conn.childProcess.kill('SIGKILL');
        }

        conn.childProcess.stdout.on("data",function(data) {
            console.log("data:",data);
        });
        
        conn.on("error",_.bind(function(message) {
            console.log("error: ",message);
        },this))

        conn.end(_.bind(function(err) {
            if (err) console.log("err",err);
            console.log("shell ended..",port);
            ShutdownHandler.removeHandler(shutdownHandler);
            delete this.ports[port];
        },this));
        this.ports[port].conn = conn;
        this.ports[port].shutdownHandler = shutdownHandler;
        global.ShutdownHandler.addHandler(shutdownHandler);
    }
});

module.exports = This;
