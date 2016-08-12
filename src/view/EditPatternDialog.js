define(["jquery","tinycolor2","ace/ace","view/util.js","view/LEDStripRenderer.js","view/CanvasPixelEditor.js","shared/Pattern.js","text!tmpl/editPatternDialog.html","text!tmpl/editPatternDialogMobile.html"],
function($,tinycolor,ace,util,LEDStripRenderer,CanvasPixelEditor,Pattern,desktop_template,mobile_template) {
    var This = function() {
        this.init.apply(this,arguments);
    }
    
    function createCanvas(width,height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        var g=canvas.getContext("2d");
        g.fillStyle = "#000";
        g.fillRect(0,0,width,height);

        return canvas;
    }

    $.extend(This.prototype, {
        init:function(conduit,gui,pattern) {
            this.conduit = conduit;
            this.gui = gui;
			this.widgets = [];
            this.$el = $("<div class='editPatternDialog'/>");

            this.$el.append(platform == "desktop" ? desktop_template : mobile_template);
            this.$el = this.$el.children();

            if (platform == "mobile" && !isTablet) this.$el.find(".patternControls>.right").hide();

            util.bindClickEvent(this.$el.find(".hideButton"),_.bind(function() {
                var areYouSure = confirm("Are you sure you want to discard this pattern?");
                if (areYouSure === true) this.hide()
            },this));

            if (!pattern) pattern = Pattern.DEFAULT_PATTERN;
            this.pattern = pattern.clone();

            this.$preview = this.$el.find(".patternPreview");
            this.stripRenderer = new LEDStripRenderer(150);
            this.$preview.empty().append(this.stripRenderer.$el);
            setTimeout(_.bind(function() {
                this.stripRenderer.resizeToParent();
            },this),5);

            $(window).on("resize",_.bind(function() {
                this.stripRenderer.resizeToParent();
                this.editor.resizeToParent();
            },this));

            this.$el.find(".titletext").text(this.pattern.name);
            util.bindClickEvent(this.$el.find(".titletext"),_.bind(function() {
                var name = prompt("Pattern name",this.pattern.name);
                if (name == null) return;
                this.pattern.name = name;
                this.$el.find(".titletext").text(this.pattern.name);
            },this));

            util.bindClickEvent(this.$el.find(".previewPatternButton"),_.bind(function() {
                this.pattern.renderJavascriptPattern(null);
                this.conduit.emit("LoadPattern",this.gui.selectedStrips[0].id,this.pattern,true);
            },this));


            this.$el.find(".patternControls").addClass("hide");
            util.bindClickEvent(this.$el.find(".saveButton"),_.bind(this.savePatternClicked,this));

            this.$el.find(".openConsole").click(_.bind(function() {
                this.conduit.emit("OpenConsole");
            },this));

            console.log("hiding console..");
            //for now, we ignore javascript.. we'll reimplement it later
            this.$el.find(".openConsole").hide();
            this.$el.find(".patternControls").removeClass("hide");

            util.bindClickEvent(this.$el.find(".loadImage"),_.bind(function() {
                util.openFileDialog(this.$el,{
                    accepts:"*.png,*.gif,*.jpg,*.jpeg"
                },_.bind(function(path) {
                    if (!path) return;
                    this.conduit.request("OpenImage",path,_.bind(function(width,height,pixels) {
                        var transpose = false;
                        this.canvas = util.renderPattern(pixels,width,height,null,null,transpose);
                        this.editor.setImage(this.canvas);
                        this.editor.setFps(this.pattern.fps);

                        this.pattern.frames = transpose ? width : height;
                        this.pattern.pixels = transpose ? height : width;

                        this.updateEditor();
                        this.updatePattern();
                    },this));
                },this));
                        
            },this));
            util.bindClickEvent(this.$el.find(".saveImage"),_.bind(function() {
                util.openFileDialog(this.$el,{
                    nwsaveas:"pattern.png"
                },_.bind(function(path) {
                    var dataUrl = this.canvas.toDataURL();
                    this.conduit.emit("SaveImage",dataUrl,path);
                },this));
            },this));

            this.editor = new CanvasPixelEditor(null,this.pattern.palette);
            $(this.editor).on("PaletteUpdated",_.bind(function(e,palette) {
                this.pattern.palette = palette;
            },this));
            

            $(this.canvas).css("border","1px solid black");

            this.canvas = util.renderPattern(this.pattern.pixelData,this.pattern.pixels,this.pattern.frames,null,null,false,false);
            this.editor.setImage(this.canvas);

            this.$el.find(".metricsPanel input").click(function() {
                $(this).select();
            });

            this.$el.find(".metricsPanel input").change(_.bind(function() {
                this.pattern.fps = parseInt(this.$fps.val()); //TODO upgeade to float
                this.pattern.frames = parseInt(this.$frames.val())
                this.pattern.pixels = parseInt(this.$pixels.val());
                if (!this.pattern.fps || this.pattern.fps < 1) this.pattern.fps = 1;
                if (!this.pattern.frames || this.pattern.frames < 1) this.pattern.frames = 1;
                if (!this.pattern.pixels || this.pattern.pixels < 1) this.pattern.pixels = 1;

                this.updateEditor();
                this.updatePattern();
            },this));

            $(this.editor).on("change",_.bind(function(e) {
                this.doUpdateDelay();
            },this));

            this.$el.find(".controls").replaceWith(this.editor.$controls);
            this.$el.find(".editorcontainer").append(this.editor.$el);
            setTimeout(_.bind(function() {
                this.editor.resizeToParent();
            },this),5);

            this.$fps = this.$el.find(".metricsPanel .fps");
            this.$frames = this.$el.find(".metricsPanel .frames");
            this.$pixels = this.$el.find(".metricsPanel .pixels");
            this.updateEditor();

            this.pattern.body = util.canvasToBytes(this.canvas);
            this.updateRendered();
        },
        togglePreviewButton:function(enabled) {
            this.$el.find(".previewPatternButton").toggleClass("disabled",!enabled);
        },
        updateEditor:function() {
            this.$frames.val(this.pattern.frames);
            this.$pixels.val(this.pattern.pixels);
            this.$fps.val(this.pattern.fps);
            this.editor.setFps(this.pattern.fps);
            this.editor.setCanvasSize(this.pattern.pixels,this.pattern.frames);

            if (platform == "mobile") {
                this.$el.find(".metricsDisclosure .frames").text(this.pattern.frames);
                this.$el.find(".metricsDisclosure .pixels").text(this.pattern.pixels);
                this.$el.find(".metricsDisclosure .fps").text(this.pattern.fps);
            }
        },
        savePatternClicked:function() {
            this.updatePattern();
            $(this).trigger("Save",this.pattern);
        },
        updatePattern:function() {
            /*
            if (this.pattern.type == "javascript") {
                this.pattern.body = this.editor.getValue();
            } else if (this.pattern.type == "bitmap") {
            }
            */

            this.pattern.pixelData = util.canvasToBytes(this.canvas,false);
            this.updateRendered();
        },
        updateRendered:function() {
            this.stripRenderer.setPattern(this.pattern);
        },
        doUpdateDelay:function() {
            if (this.updateDelay) clearTimeout(this.updateDelay);
            this.updateDelay = setTimeout(_.bind(this.updatePattern,this),500);
        },
        show:function() {
            if (platform == "mobile") {
                var $mainContainer = $(document.body).find(".mainContainer");
                $mainContainer.append(this.$el);
            } else {
                $(document.body).append(this.$el);
                this.$el.modal('show');

                /*
                if (this.pattern.type == "javascript") {
                    this.editor = ace.edit(this.$el.find(".editorcontainer").get(0));
                    this.editor.setValue(this.pattern.code || this.gui.clientData.defaultAdvanced);
                    this.editor.setTheme("ace/theme/monokai");
                    this.editor.getSession().setMode("ace/mode/javascript");
                    this.editor.getSession().on('change',_.bind(this.doUpdateDelay,this));
                    this.editor.gotoLine(0);
                }
                */
            }
            
            setTimeout(function() {
                $(document.body).addClass("loadPatternShowing");
            },5);
            return this;
        },

        destroy:function() {
            if (this.stripRenderer) this.stripRenderer.destroy();
        },

        hide:function() {
            if (platform == "desktop") {
                this.$el.modal('hide');
                this.$el.remove();
            } else if (platform == "mobile") {
                setInterval(_.bind(function() { //delay until the animation finishes
                    this.$el.remove();
                },this),500);
            }
            this.destroy();
        }
    });

    return This;
});
