var $ = require("jquery");
var _ = require("underscore")._;
var fs = require("fs");
var _c = require("c-struct");

var This = function(view) {
};

$.extend(This,{
    loadTemplate:function(path) {
        var contents = fs.readFileSync(path, 'ascii');
        return _.template(contents);
    },
    doubleClickEditable:function($el,editCallback) {
        $el.dblclick(_.bind(function(e) {
            if ($el.find("input").length) return;
            var $input = $("<input class='seamless'>");
            $input.height($el.height());
            var oldval = $el.text();
            $input.val(oldval);
            $el.empty().append($input);
            $input.focus();
            $input.select();
            $input.blur(_.bind(function() {
                var newval = $input.val();
                $el.empty();
                $el.text(newval);
                editCallback(newval);
            },this));
        },this));

    },
});

module.exports = This;
