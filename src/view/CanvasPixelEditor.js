define(['jquery','tinycolor','text!tmpl/canvasPixelEditor.html','jquery.spectrum'],function($,tinycolor,template) {
    function getCursorPosition(canvas, event) {
        var x, y;

        canoffset = $(canvas).offset();
        x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canoffset.left);
        y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canoffset.top) + 1;

        return [x,y];
    }

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

    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype,{
        init:function(image) {
            this.image = image;
            this.$el = $(template);

            this.$el.find(".color").val("#fff").spectrum({
                change: _.bind(this.colorChanged,this)
            });
            setTimeout(_.bind(this.colorChanged,this),5);

            this.offset = {x:0,y:0};

			this.destroyed = false;

            this.drawingArea = this.$el.find(".drawingArea").get(0);
            $(this.drawingArea).on("click mouseup mousedown mousemove",_.bind(function(e) {
                var pos = getCursorPosition(this.drawingArea,e);
                if (e.type == "mousedown") {
                    this.down = {
                        button:e.button,
                        startX:pos[0],
                        startY:pos[1],
                        params:{
                            offset:this.offset
                        }
                    }
                }
                if (e.type == "mouseup") this.down = false;

                if (this.down) {
                    if (this.down.button == 2) {
                        var dx = pos[0]-this.down.startX;
                        var dy = pos[1]-this.down.startY;
                        this.updated = true;
                        this.offset = {x:this.down.params.offset.x+dx,y:this.down.params.offset.y+dy};
                    } else {
                        var ipos = this.translateCanvasToImage(pos[0],pos[1]);
                        var i2pos = this.translateCanvasToImage(this.previousMousePosition[0],this.previousMousePosition[1]);
                        if (ipos != null && i2pos != null) {
                            var g = this.image.getContext("2d");
                            g.fillStyle = this.color.toHexString();
                            plotLine(g,Math.floor(ipos[0]),Math.floor(ipos[1]),Math.floor(i2pos[0]),Math.floor(i2pos[1]));
                            $(this).trigger("change");
                            this.updated = true;
                        }
                    }
                }
                this.previousMousePosition = pos;
            },this));

            this.zoomScale = [.25,.5,1,2,3,5,10,20];
            this.zoomIndex = this.zoomScale.length-1;
            var delay = null;
            $(this.drawingArea).on("mousewheel",_.bind(function(e) {
                if (delay && new Date().getTime()-delay < 150) return;
                delay = new Date().getTime();
                var pos = getCursorPosition(this.drawingArea,e);
                var delta = (e.originalEvent.detail<0 || e.originalEvent.wheelDelta>0) ? 1 : -1;

                var cBefore = this.translateCanvasToImage(pos[0],pos[1],true);

                this.zoomIndex += delta;
                if (this.zoomIndex < 0) this.zoomIndex = 0;
                if (this.zoomIndex >= this.zoomScale.length) this.zoomIndex = this.zoomScale.length-1;

                var cAfter = this.translateCanvasToImage(pos[0],pos[1],true);
                var perPixelX = this.zoomScale[this.zoomIndex];
                var perPixelY = this.zoomScale[this.zoomIndex];
                this.offset.x += (cAfter[0] - cBefore[0])*perPixelX;
                this.offset.y += (cAfter[1] - cBefore[1])*perPixelY;

                this.updated = true;
            },this));
            
            this.updated = true;
            this.repaint();
        },
        setImage:function(image) {
            this.image = image;
            this.updated = true;
        },
        colorChanged:function() {
            this.color = tinycolor(this.$el.find(".color").val());
        },
        translateCanvasToImage:function(x,y,ignoreBounds) {
            var perPixelX = this.zoomScale[this.zoomIndex];
            var perPixelY = this.zoomScale[this.zoomIndex];
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
            var ctx = this.image.getContext("2d");
            var data = ctx.getImageData(0,0,this.image.width,this.image.height);
            this.image.width = width;
            this.image.height = height;
            ctx.fillStyle = "#000";
            ctx.fillRect(0,0,width,height);
            ctx.putImageData(data,0,0);
            this.updated = true;
        },
        resizeToParent:function() {
            this.drawingArea.width = this.$el.parent().width();
            this.updated = true;
            this.repaint();
        },
        repaint:function() {
            var g = this.drawingArea.getContext("2d");
            this.paint(g,this.drawingArea.width,this.drawingArea.height);
        },
        paint:function(g,width,height) {
            if (!this.destroyed) this.$el.get(0).ownerDocument.defaultView.requestAnimationFrame(_.bind(this.repaint,this));

            if (!this.updated) return;
            this.updated = false;

            g.clearRect(0,0,width,height);

            var start = new Date().getTime();
            var perPixelX = this.zoomScale[this.zoomIndex];
            var perPixelY = this.zoomScale[this.zoomIndex];
            var data = this.image.getContext("2d").getImageData(0,0,this.image.width,this.image.height);

            var view_left = Math.max(0,this.offset.x);
            var view_top = Math.max(0,this.offset.y);
            var view_right = Math.min(width,this.offset.x + this.image.width * perPixelX);
            var view_bottom = Math.min(height,this.offset.y + this.image.height * perPixelY);

            var image_left = Math.max(0,-Math.floor(this.offset.x/perPixelX));
            var image_top = Math.max(0,-Math.floor(this.offset.y/perPixelY));
            var image_right = Math.min(this.image.width,image_left+(view_right-view_left)/perPixelX);
            var image_bottom = Math.min(this.image.height,image_top+(view_bottom-view_top)/perPixelY);

            g.imageSmoothingEnabled = false;
            g.drawImage(this.image,image_left,image_top,image_right-image_left,image_bottom-image_top,view_left,view_top,view_right-view_left,view_bottom-view_top);
        },
		destroy:function() {
			this.destroyed = true;
		},
    });

    return This;
});
