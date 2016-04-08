define(['jquery','underscore','view/util.js','tinycolor','view/ProgressDialog.js','view/ControlsView.js','view/LEDStripRenderer.js', 'view/SelectList.js',"view/GroupDetailsPanel.js","view/EditPatternDialog.js","view/NotificationManager.js","view/TopBar.js","shared/util.js","text!tmpl/stripList.html","hammer",'jquery.contextMenu'],
function($,_, gutil, tinycolor, ProgressDialog, ControlsView, LEDStripRenderer, SelectList, GroupDetailsPanel,EditPatternDialog,NotificationManager,TopBar,util,template,Hammer) {
    var This = function(window,send) {
        this.window = window;
        var document = window.document;
        this.document = window.document;
        $(document).ready(_.bind(function() {
            this.init(document,send);
        },this));
    }
    function getSelectedArray($el) {
        var selected = [];
        $el.find(":selected").each(function() {
            selected.push($(this).val());
        });
        return selected;
    }

    function setVersionClass($el,firmware,latest) {
        if (!firmware || !latest) return;
        var fn = util.symanticToNumeric(firmware);
        var ln = util.symanticToNumeric(latest);

        $el.removeClass("uptodate");
        $el.removeClass("outofdate");
        $el.removeClass("devversion");

        if (fn == ln) $el.addClass("uptodate");

        if (fn < ln) $el.addClass("outofdate");
        if (fn > ln) $el.addClass("devversion");
    }

    $.extend(This.prototype,{
        canvas:null,
        stripListComponent:null,
        stripRenderer:null,
        activePattern:null,
        progress:null,
        init:function(document,send) {
            this.$el = $(document.body);
            this.$el.addClass("theme1");
            this.conduit = util.createConduit(send);

            if (isTablet) this.$el.addClass("tablet");

            $(document).on('show.bs.modal', function (e) {
                setTimeout(function() {
                    var visibleModals = $(document.body).find('.modal:visible').length;
                    var zIndex = 1040 + (10 * visibleModals);
                    var $el = $(e.target);
                    $el.css('z-index', zIndex);
                    $el.children().css("z-index",zIndex+1);
                    $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
                }, 5);
            });

            $(this).on("StripAdded",_.bind(this.stripAdded,this));
            $(this).on("StripRemoved",_.bind(this.stripRemoved,this));
            $(this).on("LatestReleaseUpdated",_.bind(this.releaseUpdated,this));
            $(this).on("PatternsLoaded",_.bind(function(e,patterns) {
                this.userPatterns = patterns;
            },this));
            $(this).on("BasicPatternsLoaded",_.bind(function(e,patterns) {
                this.basicPatterns = patterns;
            },this));

            $(this).on("UpdateAvailable",_.bind(this.updateAvailable,this));

            $(this).on("ClientDataUpdated",_.bind(function(e,data) {
                this.clientData = data;
            },this));

            $(this).on("ShowProgress",_.bind(function(e,text,waiting) {
                if (!this.progress) {
                    this.progress = new ProgressDialog(text,waiting).show();
                } else {
                    this.progress.update(0);
                    this.progress.set(text,waiting);
                }
            },this));

            $(this).on("UpdateProgress",_.bind(function(e,percent) {
                if (!this.progress) return;
                this.progress.update(percent);
            },this));

            $(this).on("HideProgress",_.bind(function(e) {
                if (!this.progress) return;
                this.progress.hide();
                this.progress = null;
            },this));

            this.render();
            NotificationManager.setWindow(window);

            /*this.$el.append($("<button>Clickme</button>").click(_.bind(function() {
                //this.conduit.emit("Restart");
            },this)));
            */

			//this.tempDialog = new EditPatternDialog(this.conduit,this,{"type":"bitmap"}).show();

            this.groupDetails = new GroupDetailsPanel(this.conduit,[],this,false);
            this.$el.find(".groupDetails").replaceWith(this.groupDetails.$el);

            this.$el.find(".configureNewStrip").on("click",_.bind(function() {
                var $div = $("<div />");
                $div.css({
                    "position":"absolute",
                    "width":"500px",
                    "height":"500px",
                    "top":"100px",
                    "left":"100px"
                });
                $(document.body).append($div);
                var i = 0;
                var a = setInterval(function() {
                    if (i % 2 == 0) {
                        $div.css({"background-color":"white"});
                    } else {
                        $div.css({"background-color":"black"});
                    }
                    i++;
                    if (i > 100) {
                        $div.remove();
                        clearInterval(a);
                    }
                },100);
                //jxcore("gui_RedirectToSettings").call();
            },this));
        },
        setSelectedGroup:function(groupName) {
            var self = this;
            var selectedIds = _.pluck(this.selectedStrips,"id");
            this.$el.find(".listElement").each(function() {
                var strip = $(this).data("object");
                if (_.contains(selectedIds,strip.id)) {
                    $(this).data("group",groupName);
                    self.conduit.emit("SetGroup",strip.id,groupName);
                }
            });
            this.selectList.refreshGroupings();
        },
        updateAvailable:function(e,version) {
            var buttons = [$("<button class='btn btn-primary' data-dismiss='alert'>Update</button></div>"),$("<button class='btn btn-default' data-dismiss='alert'>Hide</button></div>")]
            gutil.bindClickEvent(buttons[0],_.bind(function() {
                this.conduit.emit("InstallUpdate",version);
            },this));
            if (platform == "mobile") buttons.shift();
            NotificationManager.notify("info","Version <strong>"+version+"</strong> is available.",20000,buttons);
        },
        releaseUpdated:function(e,release) {
            this.latestRelease = release;
            this.selectList.refresh();
        },
        eventHandler:function(emitObject) {
            var preprocessors = {
                "Strip.StatusUpdated":function(strip,stripStatus) {
                    $.extend(strip,stripStatus);
                },
            };
            if (emitObject.target) {
                var strip = this.findStripId(emitObject.target);
                if (preprocessors[emitObject.name]) {
                    preprocessors[emitObject.name].apply(this,[strip].concat(emitObject.args));
                }
                $(strip).trigger(emitObject.name,Array.prototype.slice.call(arguments, 2));
            } else if (emitObject.response) {
                this.conduit.handleResponse(emitObject.response,emitObject.args);
            } else {
                $(this).trigger(emitObject.name,emitObject.args);
            }
        },
        findStripId:function(id) {
            var found = null;
            this.selectList.each(function(strip) {
                if (strip.id == id) found = strip;
           });
            return found;
        },
        stripAdded:function(e,strip) {
            this.selectList.addElement(strip,strip.group);
            var self = this;
            this.updatePanelDisabler();
            $(strip).on("Strip.StatusUpdated",_.bind(function() {
                self.selectList.updateElement(strip);
            },this));
        },
        stripRemoved:function(e,id) {
            this.selectList.$el.find(".listElement").each(function() {
                if ($(this).data("object").id == id) {
                    $(this).remove();
                }
            });
            this.updatePanelDisabler();
        },
        updatePanelDisabler:function() {
            if (this.selectList.$el.find(".listElement").length == 0) {
                var $el = $("<div class='paneldisabled'>No Flickerstrips found, you can <a class='createDummyStrip' href='#'>create a test strip</a></div>");
                gutil.bindClickEvent($el.find(".createDummyStrip"),_.bind(function(e) {
                    this.conduit.emit("CreateDummy");
                    e.preventDefault();
                },this));
                this.$el.find("#strip-list").append($el);
                this.selectList.$el.hide();
            } else {
                this.$el.find("#strip-list").find(".paneldisabled").remove();
                this.selectList.$el.show();
            }
        },
        groupSelected:function(group) {
            var strips = [];
            this.selectList.$el.find(".listElement").each(function() {
                if ($(this).data("group") == group) strips.push($(this).data("object"));
            });

            this.groupDetails = new GroupDetailsPanel(this.conduit,strips,this,group);

            $(this.groupDetails).on("GroupDetailsDismissed",_.bind(function() {
                this.selectList.deselect();
                this.$el.removeClass("groupDetailsShowing");
            },this));

            this.$el.find(".groupDetails").replaceWith(this.groupDetails.$el);
        },
        stripSelected:function(e,selectedStrips,selectedIndexes,group) {
            if (group) {
                this.groupSelected(group); //TODO fix me
                return;
            }
            this.selectedStrips = selectedStrips;
            if (selectedStrips.length == 1) {
                this.multipleSelected = false;
                this.selectSingleStrip(selectedStrips[0]);
            } else if (selectedStrips.length > 1) {
                this.multipleSelected = true;
                this.selectMultipleStrips(selectedStrips);
            }

            if (selectedStrips.length >= 1) {
                setTimeout(_.bind(function() {
                    this.$el.addClass("groupDetailsShowing");
                },this),5);
            }
        },
        selectSingleStrip:function(strip) {
            this.groupDetails = new GroupDetailsPanel(this.conduit,[strip],this);
            $(this.groupDetails).on("GroupDetailsDismissed",_.bind(function() {
                this.selectList.deselect();
                this.$el.removeClass("groupDetailsShowing");
            },this));

            this.$el.find(".groupDetails").replaceWith(this.groupDetails.$el);
        },
        selectMultipleStrips:function(strips){
            this.groupDetails = new GroupDetailsPanel(this.conduit,strips,this);
            $(this.groupDetails).on("GroupDetailsDismissed",_.bind(function() {
                this.selectList.deselect();
                this.$el.removeClass("groupDetailsShowing");
            },this));

            this.$el.find(".groupDetails").replaceWith(this.groupDetails.$el);
        },
        render:function() {
            this.$el.empty();
            this.$el.append(template);

            this.activePattern = null; //todo: select correct pattern
            var $stripList = this.$el.find("#strip-list");
            var selectList = new SelectList([],this.stripElementRenderer,this,null,this.stripElementGroupRenderer);
            this.selectList = selectList;
            $stripList.append(selectList.$el);
            this.updatePanelDisabler();

            gutil.bindClickEvent(this.$el.find(".reportIssue"),_.bind(function() {
                this.conduit.emit("OpenLink","https://github.com/Flickerstrip/FlickerstripApp/issues");
            },this));

            var self = this;
            $.contextMenu( 'destroy' );
            $.contextMenu({
                selector: ".listElement",
                    items: {
                        forgetStrip: {name: "Forget Strip", callback:function(key, opt){
                            var obj = $(this).data("object");
                            self.conduit.emit("ForgetStrip",[obj.id]);
                            self.selectList.refreshGroupings();
                        }},
                    }
            });

            this.topBar = new TopBar(this.conduit,this);
            this.$el.find(".topbar").append(this.topBar.$el);

            $.contextMenu({
                selector: ".groupHeader[data-name!='Ungrouped']",
                    items: {
                        deleteGroup: {name: "Delete group", callback:function(key, opt){
                            var group = $(this).data("name");
                            self.$el.find(".listElement").each(function() {
                                if ($(this).data("group") == group) {
                                    if ($(this).data("object").visible) {
                                        $(this).data("group","");
                                        self.conduit.emit("SetGroup",$(this).data("object").id,"");
                                    }
                                }
                            });
                            self.selectList.refreshGroupings();
                        }},
                    }
            });

            $(selectList).on("change",_.bind(this.stripSelected,this));

            gutil.bindClickEvent(this.$el.find(".changeMode"),_.bind(function() {
                this.conduit.emit("Restart");
            },this));
        },
        stripElementGroupRenderer:function(header) {
            return $("<li class='list-group-item groupHeader' data-name='"+header+"'>"+header+"</li>");
        },
        stripElementRenderer:function(strip,$el) {
            var name = strip.name;
            if (!name) name = "Unknown Strip";

            if ($el) {
                $el.find(".name").text(name);
                $el.find(".version").text(strip.firmware);
                var $ver = $el.find(".version");
                setVersionClass($ver,strip.firmware,this.latestRelease);
                var statusClass = strip.visible ? "connected" : "error";
                $el.find(".statusIndicator").removeClass("connected").removeClass("error").addClass(statusClass);
                $el.toggleClass("disconnected",!strip.visible);
            } else {
                $el = $("<li class='list-group-item listElement hasAsideButton' />");
                var statusClass = strip.visible ? "connected" : "error";
                $el.append($("<span class='statusIndicator'></span>").addClass(statusClass));
                $el.toggleClass("disconnected",!strip.visible);
                $el.append($("<span class='name'></span>").text(name));
                //$el.append($("<span class='version'></span>").text(strip.firmware));
                var $ver = $el.find(".version");
                setVersionClass($ver,strip.firmware,this.latestRelease);
                $(strip).on("LatestReleaseUpdated",_.bind(function() {
                    setVersionClass($ver,strip.firmware,this.latestRelease);
                },this));

                var $onoff = $("<button class='btn btn-default powerButton asideButton'><span class='glyphicon glyphicon-off'></span></button>");
                $onoff.toggleClass("on",strip.power == 1);
                $(strip).on("Strip.StatusUpdated",function() {
                    $onoff.toggleClass("on",strip.power == 1);
                });

                gutil.bindClickEvent($onoff,_.bind(function(e) {
                    if ($onoff.hasClass("on")) {
                        this.conduit.emit("ToggleStrip",strip.id,0);
                        $onoff.toggleClass("on",false);
                    } else {
                        this.conduit.emit("ToggleStrip",strip.id,1);
                        $onoff.toggleClass("on",true);
                    }
                    e.stopPropagation ? e.stopPropagation() : e.srcEvent.stopPropagation();
                    return false;
                },this));

                if (platform == "mobile") {
                    var $forgetStrip = $("<button class='mobileSlideButton forgetStrip btn btn-danger'>Forget</span></button>");
                    new Hammer($el.get(0)).on("panright",_.bind(function() {
                        if ($el.hasClass("showSlideButton")) {
                            $el.removeClass("showSlideButton");
                        } else {
                            this.$el.find(".listElement").removeClass("showSlideButton");
                            $el.addClass("showSlideButton");
                        }
                    },this)).on("panleft",_.bind(function() {
                        $el.removeClass("showSlideButton");
                    },this));
                    $el.append($forgetStrip);

                    gutil.bindClickEvent($forgetStrip,_.bind(function(e) {
                        var obj = $(e.target).closest(".listElement").data("object");
                        this.conduit.emit("ForgetStrip",[obj.id]);
                        this.selectList.refreshGroupings();
                        this.updatePanelDisabler();

                        e.preventDefault();
                        e.stopPropagation ? e.stopPropagation() : e.srcEvent.stopPropagation();
                    },this));
                }

                $el.append($onoff);
            }
            return $el;
        },
        setStrips:function(stripData) {
            this.stripData = stripData;
            this.showStripList();
        }
    });


    return This;
});
