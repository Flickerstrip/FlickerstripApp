define(["jquery","tinycolor2","view/util.js","text!tmpl/loginDialog.html"],
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

			this.showLogin();

            this.$el.find(".loginButton").click(_.bind(this.loginClicked,this));
            this.$el.find(".createAccountLink").click(_.bind(this.showCreateAccount,this));
            this.$el.find(".createButton").click(_.bind(this.createUserClicked,this));

            this.$el.find(".hideButton").click(_.bind(function() {
                this.hide()
            },this));
        },
		showCreateAccount:function() {
			this.$el.find(".login").hide();
		    this.$el.find(".error").empty();
			this.$el.find(".create").show();
		},
		showLogin:function() {
		    this.$el.find(".error").empty();
			this.$el.find(".create").hide();
			this.$el.find(".login").show();
		},
        loginClicked:function() {
            var email = this.$el.find(".login #email").val();
            var display = this.$el.find(".login #display").val();
            var password = this.$el.find(".login #password").val();
            this.conduit.request("VerifyUser",email,password,_.bind(function(success,user) {
                if (!success) {
					this.$el.find(".error").text("User/Password not found!");
                } else {
                    this.hide();
                    $(this).trigger("Login",[email,password,user.id]);
                }
            },this));
        },
		createUserClicked:function() {
            var email = this.$el.find(".create #email").val();
            var display = this.$el.find(".create #display").val();
            var password = this.$el.find(".create #password").val();
            var confirmPassword = this.$el.find(".create #confirmPassword").val();
			if (confirmPassword != password) {
				this.$el.find(".error").text("Passwords do not match!");
				return;
			}
			var display = this.$el.find("#display").val();
			this.conduit.request("CreateUser",email,password,display,_.bind(function(success,user) {
				if (success) {
					this.hide();
					$(this).trigger("Login",[email,password,user.id]);
				} else {
					this.$el.find(".error").text("Login/Create failed");
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
