define(['jquery','underscore'],function($,_) {
    var This = function(view) {
    };
    $.extend(This,{
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

    return This;
});

