({ define: typeof define === "function" ? define : function(A,F) { module.exports = F.apply(null, A.map(require)) } }). //magic to make module work everywhere
define([ "underscore","tinycolor2","base64-js" ],
    function (_,tinycolor,b64) {
        var defaultPalette = [
            [0,0,0],
            [255,255,255],
            [255,0,0],
            [255,255,0],
            [0,255,0],
            [0,255,255],
            [0,0,255]
        ];

        function resizePalette(original,paletteSize) {
            var palette = $.extend([],original);
            while(palette.length < paletteSize) palette.push([255,255,255]);
            while(palette.length > paletteSize) palette.pop();
            return palette;
        }

        var This = function() {
            this.init.apply(this,arguments);
        }
        
        _.extend(This.prototype,{
            name:"",
            fps: 0,
            pixels: 0,
            frames: 0,

            pixelData: null,
            code: null,
            palette: null,
            _args: null,
            _controls: null,

            init: function() {
                this.name = "New Lightwork";
                this.palette = defaultPalette;
            },

            setDimensions(pixels,frames) {
                this.pixels = pixels;
                this.frames = frames;

                //Warning, this makes pixelData invalid until you set it
            },

            setPixelData:function(data) {
                this.pixelData = data;
            },

            renderJavascriptPattern:function(args) {
                if (!this.code) return;

                try {
                    var evaluatedPattern = eval("("+this.code+")");
                } catch (e) {
                    console.log("Error evaluating pattern",this.code);
					throw e;
                }

                var computedArguments = {};
                if (evaluatedPattern.controls) {
                    _.each(evaluatedPattern.controls,function(item) {
                        computedArguments[item.id] = item.default; //TODO arg processing?
                    });
                }
                _.extend(computedArguments,args)

                var patternFunction = typeof(evaluatedPattern.pattern) === "function" ? evaluatedPattern.pattern(computedArguments) : evaluatedPattern.pattern;
                var patternRenderFunction = patternFunction.render;

                //Update the metrics only if they're set programmatically
                this.fps = patternFunction.fps || this.fps;
                this.pixels = patternFunction.pixels || this.pixels;
                this.frames = patternFunction.frames || this.frames;

                this.pixelData = [];
                for (var t=0;t<this.frames; t++) {
                    for (var x=0;x<this.pixels; x++) {
                        var result = patternRenderFunction.apply(evaluatedPattern,[x,t]);
                        var c = new tinycolor(result).toRgb();
                        this.pixelData.push(c.r,c.g,c.b);
                    }
                }

                this._args = args;
                this._controls = evaluatedPattern.controls;
            },
            clone:function() {
                return _.extend(new This(),this);
            },
            serializeToJSON:function() {
                return JSON.stringify(this,function(key,value) {
                    if (key.startsWith("_")) return undefined;
                    if (key == "pixelData" && value) return b64.fromByteArray(value);
                    return value;
                });
            },
            deserializeFromJSON:function(json) {
                var o = JSON.parse(json);
                o.pixelData = b64.toByteArray(o.pixelData);
                _.extend(this,o);
            },
                                /*
            db:function() {
                var avg = 0;
                for (var i = 0; i < this.pixelData.length; i++) {
                    avg += this.pixelData[i];
                }
                avg = avg / this.pixelData.length;

                console.log("PAT: ",_.first(this.pixelData,5),avg);
            }
            */
        });

        This.DEFAULT_PATTERN = new This();
        _.extend(This.DEFAULT_PATTERN,{pixels:7,fps:3,frames:7,pixelData:[0,0,0,0,0,0,0,0,0,251,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,251,255,0,255,170,0,251,255,0,0,0,0,0,0,0,0,0,0,251,255,0,255,170,0,255,0,0,255,170,0,251,255,0,0,0,0,251,255,0,255,170,0,255,0,0,255,255,255,255,0,0,255,170,0,251,255,0,0,0,0,251,255,0,255,170,0,255,0,0,255,170,0,251,255,0,0,0,0,0,0,0,0,0,0,251,255,0,255,170,0,251,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,251,255,0,0,0,0,0,0,0,0,0,0]});

        return This;
    }
);


