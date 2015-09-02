define(['jquery',"view/util.js"],function($,util) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function($el,send,strip) {
            this.send = send;
            this.strip = strip;

            this.$el = $el;
            this.$bar = $("<div class='brightnessBar' />");
            this.$indicator = $("<div class='indicator'><span class='glyphicon glyphicon-triangle-right'></span></div>");
            this.$text = $("<div class='brightness'></div>");

            this.$el.append(this.$bar);
            this.$el.append(this.$indicator);
            this.$el.append(this.$text);

            this.setBrightness(strip.brightness/100);

            $(strip).on("Strip.StatusUpdated",_.bind(function() {
                this.setBrightness(strip.brightness/100);
            },this));

            $(this.$el).click(_.bind(this.barClicked,this));

            this.dragging = false;
            this.$el.on("mousedown",_.bind(function() {
                this.dragging = true;
            },this));
            $(window).on("mouseup",_.bind(function() {
                this.dragging = false;
            },this));
            $(window).on("mousemove",_.bind(function(e) {
                if (this.dragging) {
                    this.barClicked(e);
                    e.preventDefault();
                    e.stopPropagation();
                }
            },this));
        },
        barClicked:function(e) {
            var posY = $(this.$bar).offset().top;
            var value = 1-((e.pageY - posY) / $(this.$bar).height());

            var intval = Math.floor(value*100);
            if (intval != Math.floor(this.brightness*100)) {
                setTimeout(_.bind(function() {
                    this.send("SetBrightness",this.strip.id,intval);
                },this),5);
            }

            this.setBrightness(value);
        },
        setBrightness:function(value) {
            this.brightness = value;
            var percent = Math.floor(100*value);
            this.$indicator.css("top",(100-percent)+"%");
            this.$text.text(percent+"%");
        }
    });

    return This;
});

