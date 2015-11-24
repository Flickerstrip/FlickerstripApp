var sandbox = require("sandbox");
var JSHINT = require("jshint").JSHINT;

define(["jquery","tinycolor","cm/lib/codemirror","ace/ace","view/util.js","view/SelectList.js","view/patterns.js","view/LEDStripRenderer.js","view/ControlsView.js","text!tmpl/editPatternDialog.html","cm/mode/javascript/javascript","cm/addon/lint/javascript-lint"],
function($,tinycolor,CodeMirror,ace,util,SelectList,patterns,LEDStripRenderer,ControlsView,desktop_template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    
    var defaultBody = '({\n\tcontrols:[\n\t\t{name: "Repetitions",id:"num",type:"numeric",default:"3"}\n\t],\n\tpattern:function(args) {\n\t\tthis.pixels=150;\n\t\tthis.frames=360;\n\t\tthis.fps=30;\n\t\tthis.render=function(x,t) {\n\t\t\tvar v = 360* ((x+t) % (this.pixels/parseInt(args.num)))/(this.pixels/parseInt(args.num))\n\t\t\treturn {h:v,s:100,v:100};\n\t\t}\n\t\treturn this;\n\t}\n})\n';

    $.extend(This.prototype, {
        init:function(conduit,gui,pattern) {
            this.conduit = conduit;
            this.pattern = $.extend({},pattern);
            this.gui = gui;
			this.widgets = [];
            this.$el = $("<div class='editPatternDialog'/>");

            this.$el.append(desktop_template);
            this.$el = this.$el.children();

            this.$el.find(".hideButton").click(_.bind(function() {
                this.hide()
            },this));

            if (!this.pattern.body) this.pattern.body = defaultBody;
            if (!this.pattern.name) this.pattern.name = "New Pattern";

            this.$preview = this.$el.find(".patternPreview");
            this.stripRenderer = new LEDStripRenderer(150);
            this.$preview.empty().append(this.stripRenderer.$el);
            setTimeout(_.bind(function() {
                this.stripRenderer.resizeToParent();
            },this),5);

            this.updateRendered();
            this.$el.find(".titletext").text(this.pattern.name);
            this.$el.find(".titletext").click(_.bind(function() {
                var name = prompt("Pattern name",this.pattern.name);
                if (name == null) return;
                this.pattern.name = name;
                this.$el.find(".titletext").text(this.pattern.name);
            },this));

            this.$el.find(".saveButton").click(_.bind(function() {
                this.pattern.body = this.editor.getValue();
                $(this).trigger("Save",this.pattern);
            },this));

			this.$el.find(".openConsole").click(_.bind(function() {
				this.conduit.emit("OpenConsole");
			},this));
        },
        getPattern:function(patternSpec) { //TODO dedupe me
            var args = {};
            if (patternSpec.controls) {
                _.each(patternSpec.controls,function(control) {
                    args[control.id] = control.default;
                });
            }
            if (typeof(patternSpec.pattern) === "function") return patternSpec.pattern(args);
            return patternSpec.pattern;
        },
        updateRendered:function() {
		    try {
				var patternSpec = eval(this.pattern.body);
				var renderablePattern = this.getPattern(patternSpec);
				this.stripRenderer.setPattern(renderablePattern);
			} catch (e) {
				console.log("JAVASCRIPT ERROR!",e);
			}
        },
        codeUpdated:function() {
            if (this.updateDelay) clearTimeout(this.updateDelay);
            this.updateDelay = setTimeout(_.bind(function() {
                this.pattern.body = this.editor.getValue();
                this.updateRendered();
            },this),500);
        },
        show:function() {
            if (platform == "mobile") {
                var $mainContainer = $(document.body).find(".mainContainer");
                $mainContainer.append(this.$el);
            } else {
                $(document.body).append(this.$el);
                this.$el.modal('show');

				this.editor = ace.edit(this.$el.find(".editorcontainer").get(0));
				this.editor.setValue(this.pattern.body);
				this.editor.setTheme("ace/theme/monokai");
				this.editor.getSession().setMode("ace/mode/javascript");
				this.editor.getSession().on('change',_.bind(this.codeUpdated,this));
				this.editor.gotoLine(0);
            }
            
            setTimeout(function() {
                $(document.body).addClass("loadPatternShowing");
            },5);
            return this;
        },

        hide:function() {
            var $body = $(document.body);
                this.$el.modal('hide');
                this.$el.remove();
            return this;
        }
    });

    return This;
});
