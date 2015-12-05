define(['jquery','tinycolor',"view/util.js"],function($,tinycolor,util) {

    var drawLine = function(g,x,y,xx,yy) {
        g.beginPath();
        g.moveTo(x,y);
        g.lineTo(xx,yy);
        g.stroke();
    }

    var This = function() {
        this.init.apply(this,arguments);
    }

    var padding = {top: 10, right: 2, bottom: 10, left: 2};
    var ledHeight = 12;

    $.extend(This.prototype,{
        init:function(stripLength) {
            var canvas = document.createElement("canvas");
            canvas.width = 500;
            canvas.height = 80;

            this.canvas = canvas;
            this.$el = $(this.canvas);

            this.$el.on("mousemove",_.bind(function(e) {
                var pos = util.getCursorPosition(this.canvas,e);

                if (pos[1] < padding.top+ledHeight) {
                    this.$el.attr("title","This is the animated pattern as it appears on the LED strip");
                } else {
                    this.$el.attr("title","This shows all frames of the pattern at once");
                }

            },this));

            this.startTime = new Date().getTime();
            this.pattern = null;
            this.stripLength = stripLength;
            this.rendered = null;
			this.running = true;
            
            var millis = new Date().getTime();
            var self = this;

            this.repaint();
        },
        resizeToParent:function() {
            this.canvas.width = this.$el.parent().width();
            this.repaint();
        },
        repaint:function() {
            var g = this.canvas.getContext("2d");
            this.paint(g);
        },
        stop:function() {
            this.running = false;
        },
        start:function() {
            this.running = true;
        },
        paint:function(g) {
            if (this.running) this.canvas.ownerDocument.defaultView.requestAnimationFrame(_.bind(this.repaint,this));

            if (!(this.pattern && this.rendered)) return;

            var imgctx = this.rendered.getContext("2d");
            var imageData = imgctx.getImageData(0,0,this.rendered.width,this.rendered.height);

            g.clearRect(0,0,this.canvas.width,this.canvas.height);
            var currentFrame = Math.floor((this.pattern.fps*((new Date().getTime() - this.startTime)/1000)) % this.pattern.frames);

            var usableWidth = this.canvas.width - padding.left - padding.right;
            var separation = usableWidth / this.stripLength;

            g.fillStyle = "#000";
            g.fillRect(padding.left-1,padding.top-1,this.canvas.width-padding.right,ledHeight+2);

            //render LED strip at current frame
            for (var i=0; i<this.stripLength; i++) {
                var pixel = util.getPixelFromImageData(imageData,i,currentFrame);
                var c = new tinycolor({r:pixel[0],g:pixel[1],b:pixel[2]});

                g.fillStyle = tinycolor(c.toString()).toHexString();
                g.fillRect(padding.left+i*separation,padding.top,separation,ledHeight);
            }

            //draw the numbers
            /*
            var tickLength = 3;
            var labelFrequency = 5;
            g.fillStyle = "black";
            g.textAlign = 'center';
            g.font = "10px Monaco"; for (var i=0; i<=duration; i++) {
                var x = padding.left + i*this.pattern.fps;
                drawLine(g,x,padding.top-tickLength,x,padding.top);
                if (i % labelFrequency == 0) {
                    g.fillText(i+"s",x,padding.top-tickLength-10);
                }
            }
            */

            //Draw the full color square
            var patternDuration = this.pattern.frames/this.pattern.fps;
            var renderDuration = patternDuration;

            var loc = {x:padding.left,y:padding.top+ledHeight+5,width:usableWidth,height:50};
            g.fillStyle = "#000";
            g.fillRect(loc.x-1,loc.y-1,loc.width+2,loc.height+2);

            var durationPerPixel = renderDuration / loc.height;

            //g.drawImage(this.rendered, 0, 0, this.rendered.width, this.rendered.height,loc.x,loc.y,loc.width,loc.height);
            g.imageSmoothingEnabled = false;
            for (var t=0; t<loc.height; t++) {
                var ctime = durationPerPixel * t;
                var patternTime = ctime % patternDuration;
                var frame = patternTime * this.pattern.fps;
                g.drawImage(this.rendered, 0, Math.floor(frame), this.rendered.width, 1, loc.x, loc.y+t, loc.width, 1);
            }
            g.imageSmoothingEnabled = true;

            //draw currently frame line
            g.fillStyle = "#fff";
            var framePositionY = loc.y + (currentFrame/this.pattern.frames)*loc.height;
            drawLine(g,loc.x,framePositionY,loc.x+loc.width,framePositionY);
        },
        setPattern:function(pattern) {
            this.pattern = pattern;
            this.updatePatternCache();
        },
        updatePatternCache:function() {
            var rendered = {};
            if (this.pattern == null) {
                this.rendered = util.renderToCanvas(1,1,_.bind(function(g) {
                    g.fillStyle = "#000";
                    g.fillRect(0,0,1,1);
                },this))
                return;
            }

            //                                 data              width               height              cWidth           chght xpo,rpt
            this.rendered = util.renderPattern(this.pattern.data,this.pattern.pixels,this.pattern.frames,this.stripLength,null,false,true);
        },
        getRenderer:function() {
            return this.neopixelRenderer;
        },
		destroy:function() {
			this.running = false;
		},
    });

    return This;
});
