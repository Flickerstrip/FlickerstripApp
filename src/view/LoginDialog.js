var sandbox = require("sandbox");

define(["jquery","tinycolor","view/util.js","text!tmpl/loginDialog.html"],
function($,tinycolor,util,desktop_template) {
    var This = function() {
        this.init.apply(this,arguments);
    }

    $.extend(This.prototype, {
        init:function(conduit,gui) {
            this.conduit = conduit;
            this.gui = gui;
            this.$el = $("<div class='loginDialog modal'/>");

            this.$el.append(desktop_template);
            this.$el = this.$el.children();

            this.$email = this.$el.find("#email");
            this.$password = this.$el.find("#password");

            this.$el.find(".loginCreate").click(_.bind(this.loginClicked,this));

            this.$el.find(".hideButton").click(_.bind(function() {
                this.hide()
            },this));
        },
        loginClicked:function() {
            var email = this.$email.val();
            var password = this.$password.val();
            this.conduit.request("VerifyUser",email,password,_.bind(function(success,user) {
                if (!success) {
                    this.$el.addClass("displayPrompt");
                    this.$el.find(".createAccount").one("click",_.bind(function() {
                        var display = this.$el.find("#display").val();
                        this.conduit.request("CreateUser",email,password,display,_.bind(function(success,user) {
                            if (success) {
                                this.hide();
                                $(this).trigger("Login",[email,password,user.id]);
                            } else {
                                this.$el.find(".error").text("Login/Create failed");
                            }
                        },this));
                    },this));
                } else {
                    this.hide();
                    $(this).trigger("Login",[email,password,user.id]);
                }
            },this));
        },
        show:function() {
            if (platform == "mobile") {
                var $mainContainer = $(document.body).find(".mainContainer");
                $mainContainer.append(this.$el);
            } else {
                $(document.body).append(this.$el);
                this.$el.modal('show');
            }
            
            setTimeout(function() {
                $(document.body).addClass("loadPatternShowing");
            },5);
            return this;
        },

        hide:function() {
            var $body = $(document.body);
            $(document.body).removeClass("loadPatternShowing");
            $(document.body).removeClass("configurePatternShowing");
            this.$el.find(".hideButton").unbind("click");

            if (platform == "desktop") {
                this.$el.modal('hide');
                this.$el.remove();
            } else if (platform == "mobile") {
                setInterval(_.bind(function() { //delay until the animation finishes
                    this.$el.remove();
                },this),500);
            }

            return this;
        }
    });

    return This;
});
