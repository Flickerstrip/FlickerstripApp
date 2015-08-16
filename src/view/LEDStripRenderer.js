define(['jquery','tinycolor'],function($,tinycolor) {
    var renderToCanvas = function (width, height, renderFunction) {
        var buffer = document.createElement('canvas');
        buffer.width = width;
        buffer.height = height;
        renderFunction(buffer.getContext('2d'));
        return buffer;
    };

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
            canvas.height = 200;

            this.canvas = canvas;
            this.$el = $(this.canvas);

            this.start = new Date().getTime();
            this.pattern = null;
            this.parameters = null;
            this.stripLength = stripLength;
            this.rendered = null;
            
            var millis = new Date().getTime();
            var self = this;

            this.repaint();
        },
        repaint:function() {
            var g = this.canvas.getContext("2d");
            this.paint(g);
        },
        paint:function(g) {
            this.canvas.ownerDocument.defaultView.requestAnimationFrame(_.bind(this.repaint,this));

            if (!(this.pattern && this.rendered)) return;
            g.clearRect(0,0,this.canvas.width,this.canvas.height);
            var currentFrame = Math.floor((this.pattern.fps*((new Date().getTime() - this.start)/1000)) % this.pattern.frames);
        
            var padding = {top: 35, right: 20, bottom: 10, left: 20};
            var usableWidth = this.canvas.width - padding.left - padding.right;
            var separation = usableWidth / this.stripLength;

            //render LED strip at current frame
            g.fillStyle = "black";
            g.fillRect(padding.left-5,10-separation/2,this.canvas.width - padding.left - padding.right+7, separation*1.5);
            for (var i=0; i<this.stripLength; i++) {
                var c = this.pattern.renderer(i,currentFrame,this.parameters);

                var offset = 2;
                g.fillStyle = tinycolor(c.toString()).darken(20).toHexString();
                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);

                offset --;
                g.fillStyle = tinycolor(c.toString()).darken(15).toHexString();
                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);

                offset --;
                g.fillStyle = tinycolor(c.toString()).darken(10).toHexString();
                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);

                offset --;
                g.fillStyle = tinycolor(c.toString()).toHexString();
                g.fillRect(padding.left+i*separation-offset,10-offset,separation/2+offset*2,separation/2+offset*2);

                //g.fillStyle = "#ccc";
                //g.strokeRect(padding.left+i*separation,10,separation/2,separation/2);
            }

            g.fillStyle = "lightGray";
            g.fillRect(padding.left,padding.top,this.width-padding.left-padding.right,this.height-padding.top-padding.bottom);
            
            g.fillStyle = "#666";
            g.fillRect(padding.left,padding.top,this.pattern.frames,this.stripLength);
            
            var duration = this.pattern.frames/this.pattern.fps;
            var tickLength = 3;
            var labelFrequency = 5;
            g.fillStyle = "black";
            g.textAlign = 'center';
            g.font = "10px Monaco";
            for (var i=0; i<=duration; i++) {
                var x = padding.left + i*this.pattern.fps;
                drawLine(g,x,padding.top-tickLength,x,padding.top);
                if (i % labelFrequency == 0) {
                    g.fillText(i+"s",x,padding.top-tickLength-10);
                }
            }
            g.drawImage(this.rendered, padding.left, padding.top);
            g.fillStyle = "white";
            drawLine(g,padding.left+currentFrame,padding.top,padding.left+currentFrame,padding.top+this.stripLength);
        },
        setPattern:function(pattern) {
            this.pattern = pattern;
            this.updatePatternCache();
        },
        setParameters:function(params) {
            console.log("setting params",params);
            this.parameters = params;
            this.updatePatternCache();
        },
        setPatternAndParameters(pattern,params) {
            console.log("setting pat and pamar",pattern,params);
            this.pattern = pattern;
            this.parameters = params;
            this.updatePatternCache();
        },
        updatePatternCache:function() {
            this.start = new Date().getTime();
            
            this.rendered = renderToCanvas(this.pattern.frames,this.stripLength,_.bind(function(g) {
                for (var x = 0; x<this.pattern.frames; x++) {
                    for (var y = 0; y<this.stripLength; y++) {
                        var i = y % this.pattern.leds;
                        var c = this.pattern.renderer(i,x,this.parameters);
                        g.fillStyle = c.toHexString();
                        g.fillRect(x,y,1,1);
                    }
                }	
            },this));

        },
        getRenderer:function() {
            return this.neopixelRenderer;
        }
    });

    return This;
});
