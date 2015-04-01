define(['tinycolor2'],function(tinycolor) {
    return [
        {
            name:"Solid Color",
            leds: 100,
            frames: 1,
            fps: 30,
            renderer: function(x,t) {
                    return new tinycolor({r:255,g:0,b:0});
                }
        },
        {
            name:"Rainbow Fade",
            leds: 100,
            frames: 360,
            fps: 30,
            renderer: function(x,t) {
                    var c = new tinycolor({h:t%360,s:100,v:100});
                    return c;
                }
        },
        {
            name:"Color Pulse",
            leds: 100,
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
                //console.log("t ",t);
                var color = tinycolor(args.color).toRgb();
                var r = color.r/2.0 + (color.r/2.0)*(t/100);
                var g = color.g/2.0 + (color.g/2.0)*(t/100);
                var b = color.b/2.0 + (color.b/2.0)*(t/100);
                //console.log("b: ",b);
                var c = new tinycolor({r:r,g:g,b:b});
                //var c = new tinycolor({r:args.color.r,g:args.color.g,b:args.color.b});
                return c;
            }
        },
        {
            name:"Rainbow Chase",
            leds: 100,
            frames: 100,
            fps: 30,
            renderer: function(x,t) {
                    var c = new tinycolor({h:360*(((t+x)%100)/100),s:100,v:100});
                    return c;
                }
        }
    ];
});
