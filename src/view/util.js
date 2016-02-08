define(['jquery','underscore','tinycolor'],function($,_,tinycolor) {
    var This = function(view) {
    };
    $.extend(This,{
        testFunctions:function() {
            function compareArrays(a,b) {
                if (a.length != b.length) {
                    console.log("lengths unmatched",a.length,b.length);
                    return false;
                }
                for (var i=0; i<a.length; i++) {
                    if (a[i] != b[i]) {
                        console.log("unmatched at "+i);
                        return false;
                    }
                }
                return true;
            }

            function assert(exp,message) {
                console.log((exp?"":"!FAIL ")+"Assert: "+message+" : "+exp);
            }

            function printCanvas(canvas) {
                var data = canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height);
                for(var y=0; y<data.height; y++) {
                    out = "";
                    for(var x=0; x<data.width; x++) {
                        var pixel = This.getPixelFromImageData(data,x,y);
                        out += "["+pixel.join(",")+"] ";
                    }
                    console.log(out);
                }
            }

            var arr3by5 = [
                1,2,3,
                4,5,6,
                7,8,9,

                10,11,12,
                13,14,15,
                16,17,18,

                19,20,21,
                22,23,24,
                25,26,27,

                28,29,30,
                31,32,33,
                34,35,36,

                37,38,39,
                40,41,42,
                43,44,45
            ];

            ///////////////////////////////////////////////////////////////////////////////
            ///////////////////////////////////////////////////////////////////////////////
            ///////////////////////////////////////////////////////////////////////////////

            console.log("Testing getPixelFromArray on original values");
            assert(compareArrays(This.getPixelFromArray(arr3by5,3,5,0,0,3),[1,2,3]),"pixel 0,0 matches");
            assert(compareArrays(This.getPixelFromArray(arr3by5,3,5,1,0,3),[4,5,6]),"pixel 1,0 matches");
            assert(compareArrays(This.getPixelFromArray(arr3by5,3,5,2,0,3),[7,8,9]),"pixel 2,0 matches");

            assert(compareArrays(This.getPixelFromArray(arr3by5,3,5,0,0,3),[1,2,3]),"pixel 0,0 matches");
            assert(compareArrays(This.getPixelFromArray(arr3by5,3,5,0,1,3),[10,11,12]),"pixel 0,1 matches");
            assert(compareArrays(This.getPixelFromArray(arr3by5,3,5,0,2,3),[19,20,21]),"pixel 0,2 matches");

            console.log("Testing rendered pattern (untransposed)");
            var canvas = This.renderPattern(arr3by5,3,5,null,null,false);

            var data = canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height);
            assert(compareArrays(This.getPixelFromImageData(data,0,0),[1,2,3]),"pixel 0,0 matches");
            assert(compareArrays(This.getPixelFromImageData(data,1,0),[4,5,6]),"pixel 1,0 matches");
            assert(compareArrays(This.getPixelFromImageData(data,2,0),[7,8,9]),"pixel 2,0 matches");

            assert(compareArrays(This.getPixelFromImageData(data,0,0),[1,2,3]),"pixel 0,0 matches");
            assert(compareArrays(This.getPixelFromImageData(data,0,1),[10,11,12]),"pixel 0,1 matches");
            assert(compareArrays(This.getPixelFromImageData(data,0,2),[19,20,21]),"pixel 0,2 matches");

            var backtobytes = This.canvasToBytes(canvas);
            assert(compareArrays(backtobytes,arr3by5),"comparing canvasToBytes back to the original array");

            ///////////////////////////////////////////////////////////////////////////////
            ///////////////////////////////////////////////////////////////////////////////
            ///////////////////////////////////////////////////////////////////////////////

            console.log("Testing rendered pattern (transposed)");
            var canvas = This.renderPattern(arr3by5,3,5,null,null,true);

            console.log("Transposed canvas");
            printCanvas(canvas);

            data = canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height);
            assert(compareArrays(This.getPixelFromImageData(data,0,0),[1,2,3]),"xposed pixel 0,0 matches");
            assert(compareArrays(This.getPixelFromImageData(data,0,1),[4,5,6]),"xposed pixel 1,0 matches");
            assert(compareArrays(This.getPixelFromImageData(data,0,2),[7,8,9]),"xposed pixel 2,0 matches");

            assert(compareArrays(This.getPixelFromImageData(data,0,0),[1,2,3]),"xposed pixel 0,0 matches");
            assert(compareArrays(This.getPixelFromImageData(data,1,0),[10,11,12]),"xposed pixel 0,1 matches");
            assert(compareArrays(This.getPixelFromImageData(data,2,0),[19,20,21]),"xposed pixel 0,2 matches");
        },
		filter:function(image,filterFunction) {
			var idata = image.getContext("2d").getImageData(0,0,image.width,image.height);
			var data = idata.data;
			for (var n=0; n<data.length; n+=4) {
				var res = filterFunction([data[n],data[n+1],data[n+2],data[n+3]]);
				for (var i=0; i<4; i++) idata.data[n+i] = res[i];
			}
			var newImage = This.renderToCanvas(image.width,image.height,function(g) {
				g.putImageData(idata,0,0);
			});
			return newImage;
	    },
        renderToCanvas:function (width, height, renderFunction) {
            var buffer = document.createElement('canvas');
            buffer.width = width;
            buffer.height = height;
            renderFunction(buffer.getContext('2d'));
            return buffer;
        },
		pixelToIndex:function(width,height,x,y,bytes) {
            if (x > width) return null;
            if (y > height) return null;
            if (x < 0 || y < 0) return null;

            var i = bytes*(x+y*width);
			return i;
		},
        getPixelFromArray:function(array,width,height,x,y,bytes) {
			var i = This.pixelToIndex(width,height,x,y,bytes);

            var pixel = [];
            for (var n=0; n<bytes;n++) {
                pixel[n] = array[i+n];
            }
            return pixel;
        },
        getPixelFromImageData:function(data,x,y) {
            var pixel = This.getPixelFromArray(data.data,data.width,data.height,x,y,4);
            if (pixel == null) return null;
            return pixel.slice(0,3);
        },
        canvasToBytes:function(canvas,transpose) {
            var ctx=canvas.getContext("2d");
            var data = ctx.getImageData(0,0,canvas.width,canvas.height);
            var out = [];
            if (transpose) {
                for (var x=0; x<data.width; x++) {
                    for (var y=0; y<data.height; y++) {
                        var pixel = This.getPixelFromImageData(data,x,y);
                        out = out.concat(pixel);
                    }
                }
            } else {
                for (var y=0; y<data.height; y++) {
                    for (var x=0; x<data.width; x++) {
                        var pixel = This.getPixelFromImageData(data,x,y);
                        out = out.concat(pixel);
                    }
                }
            }
            return out;
        },
        renderPattern:function(data,dataWidth,dataHeight,canvasWidth,canvasHeight,transpose,repeat) {
            canvasWidth = canvasWidth || dataWidth;
            canvasHeight = canvasHeight || dataHeight;

            if (transpose) {
                var tmp = canvasWidth;
                canvasWidth = canvasHeight;
                canvasHeight = tmp;
            }
            return This.renderToCanvas(canvasWidth,canvasHeight,function(g) {
                for (var x = 0; x<canvasWidth; x++) {
                    for (var y = 0; y<canvasHeight; y++) {
                        var ix = transpose ? y : x;
                        var iy = transpose ? x : y;

                        var pixels = [];
                        if (!repeat && (ix >= dataWidth || iy >= dataHeight)) {
                            pixels = [0,0,0];
                        } else {
                            ix = ix % dataWidth;
                            iy = iy % dataHeight;
                            pixels = This.getPixelFromArray(data,dataWidth,dataHeight,ix,iy,3);
                        }

                        var c = tinycolor({r:pixels[0],g:pixels[1],b:pixels[2]});
                        g.fillStyle = c.toHexString();
                        g.fillRect(x,y,1,1);
                    }
                }	
            });
        },
        invertPixelData:function(data) {
            for (var i=0; i<data.data.length; i+=4) {
                data.data[i] = 255-data.data[i];
                data.data[i+1] = 255-data.data[i+1];
                data.data[i+2] = 255-data.data[i+2];
//                data.data[i] = 255;
//                data.data[i+1] = 255;
//                data.data[i+2] = 255;
            }
            return data;
        },
        evaluatePattern:function(pattern,values) {
            if (!pattern.type || pattern.type == "javascript") {
                try {
                    var evaluatedPattern = eval("("+pattern.body+")");
                } catch (e) {
					throw e;
                    console.log("Error evaluating pattern",pattern.body);
                }

                var args = {};
                if (evaluatedPattern.controls) {
                    _.each(evaluatedPattern.controls,function(item) {
                        args[item.id] = item.default; //TODO arg processing?
                    });
                }
                $.extend(args,values)

                var patternFunction = typeof(evaluatedPattern.pattern) === "function" ? evaluatedPattern.pattern(args) : evaluatedPattern.pattern;

                var patternRenderFunction = patternFunction.render;

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
        getCursorPosition:function(canvas, event,marginLeft,marginTop) {
            var x, y;

            var canoffset = $(canvas).offset();
			var ex,ey;
			try {
				ex = event.clientX || (event.center && event.center.x) || (event.originalEvent.touches && event.originalEvent.touches[0].clientX);
				ey = event.clientY || (event.center && event.center.y) || (event.originalEvent.touches && event.originalEvent.touches[0].clientY);
			} catch(e) {
				return null;
			}
					
            x = ex + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canoffset.left);
            y = ey + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canoffset.top) + 1;

            return [x-marginLeft,y-marginTop];
        },
        openFileDialog:function($el,opts,cb) {
            var win = require('nw.gui').Window.get();
            var $input = $("<input type='file' />").css("display","none");
            _.each(opts,function(value,key) {
                $input.attr(key,value);
            });
            function closed() {
                win.removeListener("focus",closed);
                setTimeout(function() {
                    cb($input.val());
                },100);
            }
            win.on("focus",closed);
            $input.appendTo($el).click();
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

