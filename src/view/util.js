define(['jquery','underscore','tinycolor'],function($,_,tinycolor) {
    var This = function(view) {
    };
    $.extend(This,{
        renderToCanvas:function (width, height, renderFunction) {
            var buffer = document.createElement('canvas');
            buffer.width = width;
            buffer.height = height;
            renderFunction(buffer.getContext('2d'));
            return buffer;
        },
        canvasToBytes:function(canvas) {
            var ctx=canvas.getContext("2d");
            var data = ctx.getImageData(0,0,canvas.width,canvas.height);
            var out = [];
            for (var n=0; n<data.height; n++) {
                for (var t=0; t<data.width; t++) {
                    var i = n*4+t*data.width*4;
                    out.push(data.data[i]);
                    out.push(data.data[i+1]);
                    out.push(data.data[i+2]);
                }
            }
            return out;
        },
        renderPattern:function(data,frames,patternWidth,canvasWidth) {
            return This.renderToCanvas(frames,canvasWidth,function(g) {
                for (var t = 0; t<frames; t++) {
                    for (var n = 0; n<canvasWidth; n++) {
                        var i = t*3*patternWidth + (n%patternWidth)*3;

                        var red = data[i];
                        var green = data[i+1];
                        var blue = data[i+2];

                        var c = tinycolor({r:red,g:green,b:blue});
                        g.fillStyle = c.toHexString();
                        g.fillRect(t,n,1,1);
                    }
                }	
            });
        },
        evaluatePattern:function(pattern,values) {
            if (pattern.type == "javascript") {
                var evaluatedPattern = eval("("+pattern.body+")");
                //console.log("evaluatedPattern",evaluatedPattern);

                var args = {};
                if (evaluatedPattern.controls) {
                    _.each(evaluatedPattern.controls,function(item) {
                        args[item.id] = item.default; //TODO arg processing?
                    });
                }
                $.extend(args,values)

                var patternFunction = typeof(evaluatedPattern.pattern) === "function" ? evaluatedPattern.pattern(args) : evaluatedPattern.pattern;
                //console.log("patternFunction",patternFunction);

                var patternRenderFunction = patternFunction.render;
                //console.log("patternRenderFunction",patternRenderFunction);

                var fps = patternFunction.fps || pattern.fps;
                var pixels = patternFunction.pixels || pattern.pixels;
                var frames = patternFunction.frames || pattern.frames;

                var pixelData = [];
                for (var t=0;t<frames; t++) {
                    for (var x=0;x<pixels; x++) {
                        var result = patternRenderFunction.apply(evaluatedPattern,[x,t]);
                        var c = new tinycolor(result).toRgb();
                        pixelData.push(c.r,c.g,c.b);
                    }
                }

                pattern.rendered = {
                    fps:fps,
                    frames:frames,
                    pixels:pixels,
                    args:args,
                    controls:evaluatedPattern.controls,
                    data:pixelData,
                }
            } else if (pattern.type == "bitmap") {
                pattern.rendered = {
                    fps:pattern.fps,
                    frames:pattern.frames,
                    pixels:pattern.pixels,
                    data:pattern.body,
                }
            }
            return pattern;
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
                $input.keypress(function(e) {
                    if (e.keyCode == 13) $(this).blur();
                });
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

