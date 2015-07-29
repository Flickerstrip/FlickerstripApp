var extend = require("extend");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore")._;
var fs = require("fs");

var This = function(view) {
};

util.inherit(This,EventEmitter);
extend(This,{
    loadTemplate:function(path) {
        var contents = fs.readFileSync(path, 'ascii');
        return _.template(contents);
    },
});

module.exports = This;
