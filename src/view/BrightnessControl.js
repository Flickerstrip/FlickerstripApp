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

            $(this.$bar).click(_.bind(this.barClicked,this));
        },
        barClicked:function(e) {
            var posY = $(this.$bar).offset().top;
            var value = 1-((e.pageY - posY) / $(this.$bar).height());
            this.setBrightness(value);

            this.send("SetBrightness",this.strip.id,Math.floor(value*100));
        },
        setBrightness(value) {
            this.brightness = value;
            var percent = Math.floor(100*(1-value));
            this.$indicator.css("top",percent+"%");
            this.$text.text(percent);
        }
    });

    return This;
});

