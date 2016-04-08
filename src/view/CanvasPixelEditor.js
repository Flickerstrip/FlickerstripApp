define(['jquery','tinycolor',"view/util.js", 'text!tmpl/canvasPixelEditor.html','hammer','jquery.spectrum'],function($,tinycolor,util,template,Hammer) {
    function plotLine(g,x0, y0, x1, y1) {
       var dx =  Math.abs(x1-x0), sx = x0<x1 ? 1 : -1;
       var dy = -Math.abs(y1-y0), sy = y0<y1 ? 1 : -1;
       var err = dx+dy, e2;                                   /* error value e_xy */

       for (;;){                                                          /* loop */
          g.fillRect(x0,y0,1,1);
          if (x0 == x1 && y0 == y1) break;
          e2 = 2*err;
          if (e2 >= dy) { err += dy; x0 += sx; }                        /* x step */
          if (e2 <= dx) { err += dx; y0 += sy; }                        /* y step */
       }
    }

    function distance(x0,y0,x1,y1) {
        return Math.sqrt(Math.pow(x1-x0,2) + Math.pow(y1-y0,2));
    }

    var This = function() {
        this.init.apply(this,arguments);
    }

    function isBlackOrWhite(color) {
        return tinycolor.equals(color,tinycolor("black")) || tinycolor.equals(color,tinycolor("white"));
    }

    var nudgeBrightenAmount = 10;
    var nudgeSpinAmount = 10;

    $.extend(This.prototype,{
        init:function(image,palette) {
			window.cpe = this;
            this.image = image;
            this.palette = palette;
            this.$el = $(template);
            this.lastNonblackwhiteColor = null;
            this.$controls = this.$el.find(".controls");

            if (platform == "mobile" && !isTablet) {
                var $metricsDisclosure = $("<div class='metricsDisclosure'><label>P<span class='pixels'></span></label><label>T<span class='frames'></span></label><label>F<span class='fps'></span></label>");
                util.bindClickEvent($metricsDisclosure.appendTo(this.$controls),_.bind(function() {
                    this.$el.closest(".editPatternDialog").find(".patternControls>.right").toggle();
                },this));
            }

            this.displayMargins = {left:40,top:20,right:10,bottom:10}
            if (platform == "mobile") {
                this.displayMargins = {left:0,top:0,right:0,bottom:0}
            }

            var colorOpts = {
                showInput: true,
                showInitial: true,
                preferredFormat: "rgb",
                showPalette: true,
                palette: [ ],
                localStorageKey: "spectrum.storage",
				clickoutFiresChange: true,
                maxSelectionSize: 8,
                change: _.bind(this.colorChanged,this),
				show:_.bind(function(e) {
					var $el = $(e.target);
					$("<div class='block'></div>").on("click touchstart",_.bind(function() {
						$el.spectrum("hide");
					},this)).appendTo(this.$el);
				},this),
				hide:_.bind(function() {
					this.$el.find(".block").remove();
				},this)
            };

            this.$controls.find(".fg").val("#fff").spectrum(colorOpts);
            if (platform != "mobile") this.$controls.find(".bg").val("#000").spectrum(colorOpts);

            setTimeout(_.bind(function() {
                this.colorChanged();
                this.updatePalette();
            },this),5);


            this.offset = {x:0,y:0};
			this.zoomFactor = 20;
			this.zoomBounds = {min:5,max:60};

			this.destroyed = false;

            this.drawingArea = this.$el.find(".drawingArea").get(0);

            var useTouchEvents = platform == "mobile";

            if (useTouchEvents) {
                this.attachTouchListeners();
            } else {
                this.attachMouseAndKeyboardListeners();
            }

            /*
			$(this.drawingArea).on(platform == "desktop" ? "click mouseup mousedown mousemove" : "touchstart touchend touchmove",_.bind(function(e) {
				if (e.originalEvent.touches && e.originalEvent.touches.length > 1) return;

				if (e.type == "mouseup" || e.type == "touchend") {
					this.down = false;
					this.previousMousePosition = null;
					return;
				} 

                function doDrawing() {
                    this.previousMousePosition = pos;
                }

                if (platform == "mobile") {
                    this.touchDelay = setTimeout(_.bind(doDrawing,this),50);
                } else {
                    doDrawing.call(this);
                }
			},this));
            */



			this.requestFrame();
            this.repaint();
        },
		doZoom:function(delta,x,y) {
			var cBefore = this.translateCanvasToImage(x,y,true);

			var zoomSpeed = 1.003;
			var amount = Math.pow(zoomSpeed,delta);

			this.zoomFactor = this.zoomFactor * amount;
			this.zoomFactor = Math.max(this.zoomFactor,this.zoomBounds.min);
			this.zoomFactor = Math.min(this.zoomFactor,this.zoomBounds.max);

			var cAfter = this.translateCanvasToImage(x,y,true);
			var perPixelX = this.zoomFactor;
			var perPixelY = this.zoomFactor;
			this.offset.x += (cAfter[0] - cBefore[0])*perPixelX;
			this.offset.y += (cAfter[1] - cBefore[1])*perPixelY;

			this.requestFrame();
		},
        generateColorPanel:function(c,index) {
            var $panel = $("<div class='color'></div>").css("background-color",c.toHexString());
            var handler = _.bind(function(e) {
                if (index != null && (e.type == "press" || e.button == 2)) {
                    if (e.shiftKey) {
                        c = this.bg;
                    } else {
                        c = this.fg;
                    }
                    var rgb = c.toRgb();
                    this.palette[index] = [rgb.r,rgb.g,rgb.b];
                    this.updatePalette();
                    $(this).trigger("PaletteUpdated",[this.palette]);
                } else {
                    if (e.shiftKey) {
                        this.bg = c;
                        this.updateColorUI();
                    } else {
                        this.fg = c;
                        this.updateColorUI();
                    }
                }
                e.preventDefault();
                return false;
            },this);
            if (platform == "desktop") $panel.on("click contextmenu",handler);
            if (platform == "mobile") new Hammer($panel.get(0)).on("tap press",handler);

            return $panel;
        },
        updatePalette:function() {
            var palette = this.palette;
            var $special = null;
            var $firstRow = $("<div class='paletteRow'></div>");
            var $secondRow = $("<div class='paletteRow'></div>");

            if (isTablet) {
                $special = $("<div class='specialPalette paletteRow'></div>");

                var colors = [
                    this.fg.clone().spin(nudgeSpinAmount),
                    this.fg.clone().spin(-nudgeSpinAmount),
                    this.fg.clone().lighten(nudgeBrightenAmount),
                    this.fg.clone().darken(nudgeBrightenAmount)
                ];

                _.each(colors,_.bind(function(c) {
                    if (isBlackOrWhite(c)) c = this.fg;
                    $special.append(this.generateColorPanel(c));
                },this));
            }

            _.each(palette,_.bind(function(color,index) {
                var c = tinycolor({r:color[0],g:color[1],b:color[2]});
                var $panel = this.generateColorPanel(c,index);
                $panel.appendTo(index < palette.length/2 ? $firstRow : $secondRow);
            },this));

            var $palette = this.$controls.find(".palette").empty();

            if ($special) $palette.append($special);
            $palette.append($firstRow,$secondRow);

            if (platform == "mobile" && !isTablet) {
                setTimeout(_.bind(function() {
                    var nPerRow = palette.length/2;
                    var paddingSpaceRequired = nPerRow*3+5; //1 px per border and 1px spacing
                    var w = (this.$controls.width() - paddingSpaceRequired)/8;
                    this.$controls.find(".sp-preview").width(Math.floor(w*2)+"px").height(Math.floor(w*2)+"px");
                    this.$controls.find(".color").width(Math.floor(w)+"px").height(Math.floor(w)+"px");
                    this.$controls.find(".metricsDisclosure").width(Math.floor(w)+"px");
                },this),5);
            }
        },
        setImage:function(image) {
            this.image = image;
			this.requestFrame();
        },
        updateColorUI:function() {
            if (!isBlackOrWhite(this.fg)) {
                this.lastNonblackwhiteColor = this.fg;
            }

            this.$controls.find(".fg").spectrum("set", this.fg.toHexString());
            this.$controls.find(".bg").spectrum("set", this.bg.toHexString());

            this.updatePalette();
        },
        colorChanged:function() {
            this.fg = tinycolor(this.$controls.find(".fg").val());
            this.bg = tinycolor(this.$controls.find(".bg").val());

            if (!isBlackOrWhite(this.fg)) {
                this.lastNonblackwhiteColor = this.fg;
            }

            this.updatePalette();
        },
        translateCanvasToImage:function(x,y,ignoreBounds) {
            var perPixelX = this.zoomFactor;
            var perPixelY = this.zoomFactor;
            var ix = (x - this.offset.x) / perPixelX;
            var iy = (y - this.offset.y) / perPixelY;
            if (ignoreBounds) return [ix,iy];
            if (ix < 0) return null;
            if (iy < 0) return null;
            if (ix > this.image.width) return null;
            if (iy > this.image.height) return null;
            return [ix,iy];
        },
        setFps:function(fps) {
            this.fps = fps;
        },
        setCanvasSize:function(width,height) {
            if (!this.image) return;
            var ctx = this.image.getContext("2d");
            var data = ctx.getImageData(0,0,this.image.width,this.image.height);
            this.image.width = width;
            this.image.height = height;
            ctx.fillStyle = "#000";
            ctx.fillRect(0,0,width,height);
            ctx.putImageData(data,0,0);
			this.requestFrame();
        },
        resizeToParent:function() {
            this.drawingArea.width = this.$el.parent().width();
            this.drawingArea.height = this.$el.height();
			this.requestFrame();
            this.repaint();
        },
        requestFrame:function() {
			this.$el.get(0).ownerDocument.defaultView.requestAnimationFrame(_.bind(this.repaint,this));
		},
        repaint:function() {
            var g = this.drawingArea.getContext("2d");
            this.paint(g,this.drawingArea.width,this.drawingArea.height);
        },
        drawImageWithinBounds:function(g,displayBox,image,offsetX,offsetY,perPixelX,perPixelY) {
            var image_left = Math.max(0,-Math.floor(offsetX/perPixelX)-1);
            var image_top = Math.max(0,-Math.floor(offsetY/perPixelY)-1);
            var image_right = Math.min(image.width,image_left+1+(Math.min(displayBox.width,displayBox.width-offsetX)/perPixelX));
            var image_bottom = Math.min(image.height,image_top+1+(Math.min(displayBox.height,displayBox.height-offsetY)/perPixelY));


            var view_left = image_left*perPixelX+offsetX;
            var view_top = image_top*perPixelY+offsetY;
            var view_right = Math.min(displayBox.width,offsetX + this.image.width * perPixelX);
            var view_bottom = Math.min(displayBox.height,offsetY + this.image.height * perPixelY);

			g.mozImageSmoothingEnabled = false;
			g.webkitImageSmoothingEnabled = false;
			g.msImageSmoothingEnabled = false;
			g.imageSmoothingEnabled = false;

			if(image_right-image_left == 0 || image_bottom - image_top == 0) return;
            g.drawImage(
                image,
                image_left, //image X
                image_top,  //image Y
                image_right-image_left, //image W
                image_bottom-image_top, //image H
                displayBox.x+view_left, //target X
                displayBox.y+view_top,  //target Y
                perPixelX*(image_right-image_left), //target W
                perPixelY*(image_bottom-image_top)  //target H
            );
        },
        paint:function(g,width,height) {
            if (!this.image) return;

            g.clearRect(0,0,width,height);

            var start = new Date().getTime();
            var perPixelX = this.zoomFactor;
            var perPixelY = this.zoomFactor;
            //var data = this.image.getContext("2d").getImageData(0,0,this.image.width,this.image.height);

            var displayBox = {x:this.displayMargins.left,y:this.displayMargins.top,width:width-this.displayMargins.left-this.displayMargins.right,height:height-this.displayMargins.top-this.displayMargins.bottom};

            this.drawImageWithinBounds(g,displayBox,this.image,this.offset.x,this.offset.y,perPixelX,perPixelY);

            var ghost = util.filter(this.image,function(data) {
                data[3] *= .5;
                return data;
            });
            //Draw ghosts
            this.drawImageWithinBounds(g,displayBox,ghost,this.offset.x+perPixelX*this.image.width,this.offset.y,perPixelX,perPixelY); //right ghost
            this.drawImageWithinBounds(g,displayBox,ghost,this.offset.x,this.offset.y+perPixelY*this.image.height,perPixelX,perPixelY); //bottom ghost
            this.drawImageWithinBounds(g,displayBox,ghost,this.offset.x-perPixelX*this.image.width,this.offset.y,perPixelX,perPixelY); //left ghost
            this.drawImageWithinBounds(g,displayBox,ghost,this.offset.x,this.offset.y-perPixelY*this.image.height,perPixelX,perPixelY); //top ghost

            //Draw the image at the correct scale at the origin (debugging)
            //g.drawImage(this.image,image_left,image_top,image_right-image_left,image_bottom-image_top,0,0,(image_right-image_left)*perPixelX,(image_bottom-image_top)*perPixelY);

            //Draw the view rectangle only
            //g.fillStyle = "#f00";
            //g.fillRect(view_left,view_top,view_right-view_left,view_bottom-view_top);

            if (platform == "desktop") {
                //clear out gutters
                g.clearRect(0,0,width,displayBox.y); //top
                g.clearRect(0,0,displayBox.x,height); //left
                g.clearRect(displayBox.x+displayBox.width,0,width,height); //right
                g.clearRect(0,displayBox.y+displayBox.height,width,height); //bottom

                g.strokeStyle = "#666";
                g.beginPath();
                g.moveTo(displayBox.x,displayBox.y);
                g.lineTo(displayBox.x+displayBox.width,displayBox.y);
                g.lineTo(displayBox.x+displayBox.width,displayBox.y+displayBox.height);
                g.lineTo(displayBox.x,displayBox.y+displayBox.height);
                g.lineTo(displayBox.x,displayBox.y);
                g.stroke();

                //draw numbers
                var xInterval = 1;
                var yInterval = 1;
                g.fillStyle = "black";
                g.textAlign = 'center';
                g.font = "10px Monaco";
                var nudgeX = -9;
                var nudgeY = -6;
                for (var x=1; x<=this.image.width;x+=xInterval) {
                    g.fillText(x,displayBox.x+this.offset.x+x*perPixelX+nudgeX,12);
                }
                g.textAlign = 'right';
                for (var y=1; y<=this.image.height;y+=yInterval) {
                    var text = Math.round(100*y/this.fps)/100+"s";
                    g.fillText(text,35,displayBox.y+this.offset.y+y*perPixelY+nudgeY);
                }
            }

            /*
            if (this.tapList) {
                for (var i=0; i<this.tapList.length; i++) {
                    var pos = this.tapList[i];
                    g.fillRect(displayBox.x+pos[0],displayBox.y+pos[1],2,2);
                }
            }
            */
        },
		destroy:function() {
			this.destroyed = true;
		},
        doLineDrawing:function(a,b,useBgColor) {
            var ipos = this.translateCanvasToImage(a[0],a[1]);
            var i2pos = this.translateCanvasToImage(b[0],b[1]);
            if (ipos != null && i2pos != null) {
                var g = this.image.getContext("2d");
                g.fillStyle = useBgColor ? this.bg.toHexString() : this.fg.toHexString();
                plotLine(g,Math.floor(ipos[0]),Math.floor(ipos[1]),Math.floor(i2pos[0]),Math.floor(i2pos[1]));
                $(this).trigger("change");
                this.requestFrame();
            }
        },
        attachMouseAndKeyboardListeners:function() {
            ////////////////// MOUSE AND KEYBOARD CODE ///////////////////////////
            $(this.drawingArea).on("mousedown",_.bind(function(e) {
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);
                this.previousMousePosition = null; //when we click down, we create a break in the previousMousePosition chain

                this.down = {
                    button:e.button,
                    startX:pos[0],
                    startY:pos[1],
                    dragStart:new Date().getTime(),
                    params:{
                        offset:this.offset
                    }
                }
            },this));

            $(this.drawingArea).on("mouseup",_.bind(function(e) {
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);
                var image_pos = this.translateCanvasToImage(pos[0],pos[1]);

                var isShortDown = this.down && ((new Date().getTime() - this.down.dragStart < 300) && distance(this.down.startX,this.down.startY,pos[0],pos[1]) < 1);

                if (isShortDown) {
                    if (this.down.button == 2) { //grab color under mouse
                        var pixel = this.image.getContext("2d").getImageData(image_pos[0],image_pos[1], 1, 1).data;
                        if (e.shiftKey) {
                            this.bg = new tinycolor({r:pixel[0],g:pixel[1],b:pixel[2]});
                        } else {
                            this.fg = new tinycolor({r:pixel[0],g:pixel[1],b:pixel[2]});
                        }
                        this.updateColorUI();
                    } else {
                        this.doLineDrawing(pos,pos,e.shiftKey);
                    }
                }

                this.down = false;
            },this));

            $(this.drawingArea).on("mousemove",_.bind(function(e) {
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);

                //var keys = [e.altKey,e.ctrlKey,e.shiftKey,e.metaKey];
                if (this.down) {
                    if (this.down.button == 2) { //pan drag
                        if (!this.down.startX || !this.down.startY) return;
                        var dx = pos[0]-this.down.startX;
                        var dy = pos[1]-this.down.startY;
                        this.offset = {x:this.down.params.offset.x+dx,y:this.down.params.offset.y+dy};
                        this.requestFrame();
                    } else if (this.previousMousePosition != null) { //draw drag
                        this.doLineDrawing(pos,this.previousMousePosition,e.shiftKey);
                    }
                }

                this.previousMousePosition = pos;
            },this));

            $(this.drawingArea).on("mousewheel",_.bind(function(e) {
                var delta = e.originalEvent.detail || e.originalEvent.wheelDelta;
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);

                this.doZoom(delta,pos[0],pos[1]);
            },this));

            $(document).on("keyup",_.bind(function(e) {
                var code = e.keyCode;

                var lastColor = this.fg;
                if (code == 38) { //UP
                    this.fg = this.fg.clone().lighten(nudgeBrightenAmount);
                    if (isBlackOrWhite(this.fg)) this.fg = lastColor;
                    this.updateColorUI();
                } else if (code == 40) { //DOWN
                    this.fg = this.fg.clone().darken(nudgeBrightenAmount);
                    if (isBlackOrWhite(this.fg)) this.fg = lastColor;
                    this.updateColorUI();
                } else if (code == 37) { //LEFT
                    this.fg = this.fg.clone().spin(nudgeSpinAmount);
                    if (isBlackOrWhite(this.fg)) this.fg = lastColor;
                    this.updateColorUI();
                } else if (code == 39) { //RIGHT
                    this.fg = this.fg.clone().spin(-nudgeSpinAmount);
                    if (isBlackOrWhite(this.fg)) this.fg = lastColor;
                    this.updateColorUI();
                }
            },this));
            ////////////////// MOUSE AND KEYBOARD CODE ///////////////////////////
        },
        attachTouchListeners:function() {
			this.pinch = null;
			var hammer = new Hammer(this.drawingArea);
            hammer.on("tap",_.bind(function(e) {
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);

                /*
                var ipos = this.translateCanvasToImage(pos[0],pos[1],true);
                console.log("pos",pos,ipos);
                if (!this.tapList) this.tapList = [];
                this.tapList.push(pos);
                */


                this.doLineDrawing(pos,pos,false);
            },this));

            hammer.on("panstart",_.bind(function(e) {
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);

                this.previousMousePosition = pos;
            },this));

            hammer.on("panmove",_.bind(function(e) {
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);

                this.doLineDrawing(pos,this.previousMousePosition,false);

                this.previousMousePosition = pos;
            },this));

            hammer.on("panend",_.bind(function(e) {
                this.previousMousePosition = null;
            },this));

            hammer.on("pinchstart",_.bind(function(e) {
                if (this.touchDelay) clearTimeout(this.touchDelay);
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);
                var ipos = this.translateCanvasToImage(pos[0],pos[1],true);
                this.pinch = {
                    center: {x:ipos[0],y:ipos[1]},
                    initialOffset: {x:this.offset.x,y:this.offset.y},
                    initialZoomFactor:this.zoomFactor
                };
            },this));

            hammer.on("pinch",_.bind(function(e) {
                var pos = util.getCursorPosition(this.drawingArea,e,this.displayMargins.left,this.displayMargins.top);
                if (!this.pinch) return;

                this.zoomFactor = this.pinch.initialZoomFactor * e.scale;

                this.offset = this.pinch.initialOffset;
                var cAfter = this.translateCanvasToImage(pos[0],pos[1],true);
                this.offset = {
                    x:this.pinch.initialOffset.x + (cAfter[0] - this.pinch.center.x) * this.zoomFactor,
                    y:this.pinch.initialOffset.y + (cAfter[1] - this.pinch.center.y) * this.zoomFactor
                };

                this.requestFrame();
            },this));

            hammer.on("pinchend",_.bind(function(e) {
                this.pinch = null;
            },this));

            hammer.get('pinch').set({ enable: true });
            hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
        }
    });

    return This;
});
