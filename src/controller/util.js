var $ = require("jquery");
var _ = require("underscore")._;
var fs = require("fs");

var This = function(view) {
};

$.extend(This,{
    loadTemplate:function(path) {
        var contents = fs.readFileSync(path, 'ascii');
        return _.template(contents);
    },
});

module.exports = This;
