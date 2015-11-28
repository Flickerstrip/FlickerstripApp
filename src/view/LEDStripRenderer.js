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

    $.extend(This.prototype,{
        init:function(stripLength) {
            var canvas = document.createElement("canvas");
            canvas.width = 500;
            canvas.height = 80;

            this.canvas = canvas;
            this.$el = $(this.canvas);

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

            g.clearRect(0,0,this.canvas.width,this.canvas.height);
            var currentFrame = Math.floor((this.pattern.fps*((new Date().getTime() - this.startTime)/1000)) % this.pattern.frames);
        
            var padding = {top: 20, right: 20, bottom: 10, left: 20};
            var usableWidth = this.canvas.width - padding.left - padding.right;
            var separation = usableWidth / this.stripLength;

            //render LED strip at current frame
            var ledHeight = 6;
            //g.fillStyle = "black";
            //g.fillRect(padding.left-1,10-1,this.canvas.width - padding.left - padding.right+1, ledHeight+2);
            for (var i=0; i<this.stripLength; i++) {
                var data = imgctx.getImageData(currentFrame,i%this.rendered.height, 1, 1).data
                var c = new tinycolor({r:data[0],g:data[1],b:data[2]});
                //var c = new tinycolor(this.pattern.render(i,currentFrame));

                var offset = 1;
                g.fillStyle = tinycolor(c.toString()).toHexString();
                g.fillRect(padding.left+i*separation,10,2,ledHeight);

//                g.fillStyle = tinycolor(c.toString()).darken(20).toHexString();
//                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);
//
//                offset --;
//                g.fillStyle = tinycolor(c.toString()).darken(15).toHexString();
//                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);
//
//                offset --;
//                g.fillStyle = tinycolor(c.toString()).darken(10).toHexString();
//                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);
//
//                offset --;
//                g.fillStyle = tinycolor(c.toString()).toHexString();
//                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);

                //g.fillStyle = "#ccc";
                //g.strokeRect(padding.left+i*separation,10,separation/2,separation/2);
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

            var loc = {x:padding.left,y:padding.top,width:usableWidth,height:50};
            g.fillStyle = "#000";
            g.fillRect(loc.x-1,loc.y-1,loc.width+2,loc.height+2);

            var durationPerX = renderDuration / loc.width;
            for (var x=0; x<loc.width; x++) {
                var ctime = durationPerX * x;
                var patternTime = ctime % patternDuration;
                var frame = patternTime * this.pattern.fps;
                g.drawImage(this.rendered, Math.floor(frame), 0, 1, this.rendered.height, loc.x+x, loc.y, 1, loc.height);
            }

            //draw currently frame line
            g.fillStyle = "#fff";
            var framePositionX = loc.x + (currentFrame/this.pattern.frames)*loc.width;
            drawLine(g,framePositionX,loc.y,framePositionX,loc.y+loc.height);
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

            this.rendered = util.renderPattern(this.pattern.data,this.pattern.frames,this.pattern.pixels,this.stripLength);
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
