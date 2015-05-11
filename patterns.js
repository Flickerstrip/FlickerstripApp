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
        if (g > 255) g = 0;

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
        if (b > 255) b = 0;
        
        return {r:r,g:g,b:b};
    }
    return [
        {
            name:"Temperature Based",
            leds: 150,
            frames: 1,
            fps: 30,
            controls: [
                {
                    name: "Temperature",
                    id: "temp",
                    type: "text",
                    default: "6500"
                }
            ],
            renderer: function(x,t,args) {
                    return new tinycolor(temperature(args.temp));
                }
        },
        {
            name:"Temperature Scale",
            leds: 150,
            frames: 300,
            fps: 30,
            renderer: function(x,t,args) {
                    var low = 1500;
                    var high = 15000;
                    var delta = (high-low)/300;
                    var k = low + t*delta;
                    return new tinycolor(temperature(k));
                }
        },
        {
            name:"Solid Color",
            leds: 150,
            frames: 1,
            fps: 30,
            controls: [
                {
                    name: "Color",
                    id: "color",
                    type: "color",
                    default: "#00f"
                }
            ],
            renderer: function(x,t,args) {
                    var color = tinycolor(args.color).toRgb();
                    return new tinycolor({r:color.r,g:color.g,b:color.b});
                }
        },
        {
            name:"Rainbow Fade",
            leds: 150,
            frames: 360,
            fps: 30,
            renderer: function(x,t) {
                    var c = new tinycolor({h:t%360,s:100,v:100});
                    return c;
                }
        },
        {
            name:"Color Pulse",
            leds: 150,
            frames: 200,
            fps: 30,
            controls: [
                {
                    name: "Color",
                    id: "color",
                    type: "color",
                    default: "#00f"
                }
            ],
            renderer: function(x,t,args) {
                t = t > 100 ? (100-(t-100)) : t;
                var color = tinycolor(args.color).toRgb();
                var r = color.r/2.0 + (color.r/2.0)*(t/100);
                var g = color.g/2.0 + (color.g/2.0)*(t/100);
                var b = color.b/2.0 + (color.b/2.0)*(t/100);
                var c = new tinycolor({r:r,g:g,b:b});
                //var c = new tinycolor({r:args.color.r,g:args.color.g,b:args.color.b});
                return c;
            }
        },
        {
            name:"Rainbow Chase",
            leds: 150,
            frames: 150,
            fps: 30,
            renderer: function(x,t) {
                    var c = new tinycolor({h:360*(((t+x)%150)/150),s:100,v:100});
                    return c;
                }
        }
    ];
});
