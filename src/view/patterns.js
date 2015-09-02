define(['tinycolor'],function(tinycolor) {
    function temperature(k) {
        k = k / 100;

        //red
        if (k <= 66) {
            r = 255;
        } else {
            r = k - 60;
            r = 329.698727446 * (Math.pow(r,-0.1332047592));
        }
        if (r < 0) r = 0;
        if (r > 255) r = 255;

        //green
        if (k <= 66) {
            g = k;
            g = 99.4708025861 * Math.log(g) - 161.1195681661;
        } else {
            g = k - 60;
            g = 288.1221695283 * (Math.pow(g,-0.0755148492));
        }
        if (g < 0) g = 0;
        if (g > 255) g = 255;

        //blue
        if (k >= 66) {
            b = 255;
        } else {
            if (k <= 19) {
                b = 0;
            } else {
                b = k - 10;
                b = 138.5177312231 * Math.log(b) - 305.0447927307;
            }
        }
        if (b < 0) b = 0;
        if (b > 255) b = 255;
        
        return {r:r,g:g,b:b};
    }
    return [
        {
            name:"Temperature Based",
            controls: [
                {
                    name: "Temperature",
                    id: "temp",
                    type: "text",
                    default: "6500"
                }
            ],
            pattern: function(args) {
                return {
                    leds: 1,
                    frames: 1,
                    fps: 30,
                    renderer: function(x,t) {
                        return new tinycolor(temperature(args.temp));
                    }
                }
            }
        },
        {
            name:"Temperature Scale",
            pattern: {
                leds: 1,
                frames: 300,
                fps: 30,
                renderer: function(x,t) {
                    var low = 1500;
                    var high = 15000;
                    var delta = (high-low)/300;
                    var k = low + t*delta;
                    return new tinycolor(temperature(k));
                }
            }
        },
        {
            name:"Color Blink",
            controls: [
                {
                    name: "Color1",
                    id: "color1",
                    type: "color",
                    default: "#f00"
                },
                {
                    name: "Color2",
                    id: "color2",
                    type: "color",
                    default: "#0f0"
                }
            ],
            pattern:function(args) {
                return {
                    leds: 1,
                    frames: 2,
                    fps: 1,
                    renderer: function(x,t) {
                        var color;
                        if (t == 0) {
                            color = tinycolor(args.color1).toRgb();
                        } else {
                            color = tinycolor(args.color2).toRgb();
                        }
                        return new tinycolor({r:color.r,g:color.g,b:color.b});
                    }
                }
            }
        },
        {
            name:"Solid Color",
            controls: [
                {
                    name: "Color",
                    id: "color",
                    type: "color",
                    default: "#00f"
                }
            ],
            pattern:function(args) {
                return {
                    leds: 1,
                    frames: 1,
                    fps: 30,
                    renderer: function(x,t) {
                        var color = tinycolor(args.color).toRgb();
                        return new tinycolor({r:color.r,g:color.g,b:color.b});
                    }
                }
            }
        },
        {
            name:"Rainbow Fade",
            pattern: {
                leds: 1,
                frames: 360,
                fps: 30,
                renderer: function(x,t) {
                    var c = new tinycolor({h:t%360,s:100,v:100});
                    return c;
                }
            }
        },
        {
            name:"Color Pulse",
            controls: [
                {
                    name: "Color",
                    id: "color",
                    type: "color",
                    default: "#00f"
                }
            ],
            pattern:function(args) {
                return {
                    leds: 1,
                    frames: 200,
                    fps: 30,
                    renderer: function(x,t) {
                        t = t > 100 ? (100-(t-100)) : t;
                        var color = tinycolor(args.color).toRgb();
                        var r = color.r/2.0 + (color.r/2.0)*(t/100);
                        var g = color.g/2.0 + (color.g/2.0)*(t/100);
                        var b = color.b/2.0 + (color.b/2.0)*(t/100);
                        var c = new tinycolor({r:r,g:g,b:b});
                        return c;
                    }
                }
            }
        },
        {
            name:"Rainbow Chase",
            pattern: {
                leds: 150,
                frames: 150,
                fps: 30,
                renderer: function(x,t) {
                    var c = new tinycolor({h:360*(((t+x)%150)/150),s:100,v:100});
                    return c;
                }
            }
        },
        {
            name:"Rainbow Solid",
            controls: [
                {
                    name: "Start Index",
                    id: "start",
                    type: "number",
                    default: "0"
                },
                {
                    name: "End Index",
                    id: "end",
                    type: "number",
                    default: "150"
                }
            ],
            pattern:function(args) {
                return {
                    leds: 150,
                    frames: 1,
                    fps: 1,
                    renderer: function(x,t) {
                        var size = args.end - args.start;
                        if (x < args.start || x > args.end) return new tinycolor(0,0,0);
                        var index = x - args.start;
                        var hue = 360*((index%size)/size);
                        var c = new tinycolor({h:hue,s:100,v:100});
                        return c;
                    }
                }
            }
        },
        {
            name:"Custom",
            controls: [
                {
                    name: "Pattern",
                    id: "f",
                    type: "text",
                    style: "height: 200px;",
                    default: "{\n\tleds: 150,\n\tframes: 1,\n\tfps: 1,\n\trenderer: function(x,t) {\n\t\tvar c = new tinycolor({r:255,g:0,b:0});\n\t\treturn c;\n\t}\n}"
                }
            ],
            pattern: function(args) {
                return eval("("+args.f+")");
            }
        }
    ];
});
