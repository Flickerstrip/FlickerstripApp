define(['jquery',"view/util.js"],function($,util) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function($el,brightness) {
            this.brightness = brightness || 0;
            this.$el = $el;
            this.$bar = $("<div class='brightnessBar' />");
            this.$indicator = $("<div class='indicator'><span class='glyphicon glyphicon-triangle-right'></span></div>");
            this.$text = $("<div class='brightness'></div>");

            this.$el.append(this.$bar);
            this.$el.append(this.$indicator);
            this.$el.append(this.$text);

            $(this.$el).click(_.bind(this.barClicked,this));

            this.dragging = false;
            this.$el.on("mousedown touchstart",_.bind(function() {
                this.dragging = true;
            },this));
            $(window).on("mouseup toucheend",_.bind(function() {
                this.dragging = false;
            },this));
            $(window).on("mousemove touchmove",_.bind(function(e) {
                if (this.dragging) {
                    this.barClicked(e);
                    e.preventDefault();
                    e.stopPropagation();
                }
            },this));
        },
        barClicked:function(e) {
            var posY = $(this.$bar).offset().top;
            var value = Math.floor(100*(1-((e.pageY - posY) / $(this.$bar).height())));
            console.log(value);

            var changed = this.setBrightness(value);
            if (changed) {
                setTimeout(_.bind(function() {
                    $(this).trigger("change",this.brightness);
                },this),5);
            }

            this.setBrightness(value);
        },
        setBrightness:function(percent) {
            var changed = percent != this.brightness;
            this.brightness = percent;
            this.$indicator.css("top",(100-percent)+"%");
            this.$text.text(percent+"%");
            return changed;
        }
    });

    return This;
});

