var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore")._;
var util = require("util");
var fs = require("fs");

var This = function() {
};

util.inherit(This,EventEmitter);
extend(This.prototype,{
    shutdownHandlers:[],
    addHandler:function(cb) {
        this.shutdownHandlers.push(cb);
    },
    removeHandler:function(cb) {
        this.shutdownHandlers.splice(this.shutdownHandlers.indexOf(cb), 1);
    },
    callHandlers:function() {
        var outputBuffer = "";
        /*console.log = function() {
            _.each(arguments,function(arg) {
                outputBuffer += util.format(arg) + " ";
            });
            outputBuffer += '\n';
        }*/
        _.each(this.shutdownHandlers,_.bind(function(cb) {
            try {
                cb();
            } catch (err) {
                console.log("exception while closing"+err);
            }
        },this));

        fs.writeFile("./shutdownlog.txt",outputBuffer,function(err) {
        });
    }
});

module.exports = new This();

