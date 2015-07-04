var $ = require("jquery");
var _ = require("underscore")._;
var Communication = require("./Communication")
var fs = require("fs");
var USBCommunication = require("./USBCommunication");

var This = function(view) {
    this.init(view);
};

$.extend(This.prototype,{
    knownStripsFile:"./known_strips.json",
    stripData:[],
    init:function(view) {
        this.view = view;
        this.comm = new Communication();
        this.usb = new USBCommunication();

        this.view.on("SendData",_.bind(function(e,type,id,data) {
            this.sendData(type,id,data);
        },this));

        this.view.on("SavePattern",_.bind(function(e,id,name,fps,data) {
            this.comm.getClient(id).savePattern(name,fps,data);
        },this));

        this.view.on("SelectPattern",_.bind(function(e,id,index) {
		    this.comm.getClient(id).selectPattern(index);
        },this));
		
		this.view.on("ForgetPattern",_.bind(function(e,id,index) {
			this.comm.getClient(id).forgetPattern(index);
		},this));

        this.loadStrips();

        setInterval(_.bind(this.tick),100);

        $(this.comm).on("StripListUpdated",_.bind(this.updateActiveStrips,this));

        $(this.comm).on("StripConnected",_.bind(this.stripConnected,this));

        this.view.on("StripNameUpdated",_.bind(function(e,id,newname) {
            this.setStripName(id,newname);
        },this));

        this.view.on("PatternActivated",_.bind(function(e,selectedStrips) {
            _.each(selectedStrips,_.bind(function(strip) {
                if (this.comm.getClient(strip.id).status == "ready") {
                    this.stripReady(strip.id);
                }
            },this));
        },this));

        this.view.on("ForgetStrip",_.bind(function(e,id) {
            this.forgetStrip(id);
        },this));
    },
	stripConnected:function(e,id,strip) {
        console.log("@@@@@@@@@@@ strip connected called.. adding handler",strip);
		$(strip).on("PatternMetadata",_.bind(function(e,strip,patterns) {
			this.view.trigger("ReceivedPatternMetadata",[strip,patterns]);
		},this));
	},
    tick:function() {
    },
    loadStrips:function() {
        fs.readFile(this.knownStripsFile, "ascii", _.bind(function(err,contents) {
            if (err) return console.log("Failed to load strip data:",err);
            try {
                this.stripData = JSON.parse(contents);
            } catch (e) {
                return console.log("Failed to parse strip data: ",e,contents);
            }
            this.updateActiveStrips();
        },this));
    },
    updateActiveStrips:function() {
        //console.log("update active strips called");
        var visibleStrips = this.comm.getVisibleStrips();
        _.each(this.stripData,function(strip) {
            strip.visible = _.contains(visibleStrips,strip.id);
            if (strip.visible) {
                visibleStrips.splice(_.indexOf(visibleStrips,strip.id),1);
            }
        });
        _.each(visibleStrips,_.bind(function(stripIdentifier) {
            this.stripData.push({
                id:stripIdentifier,
                visible:true,
                name:"Unknown Strip",
                strip:this.comm.getClient(stripIdentifier)
            });
        },this));

        //get rid of invalid strips TODO: figure out why we get invalid strips in the first place
        this.stripData = _.reject(this.stripData,_.bind(function(strip) {
                return strip == null || !strip.id || strip.id.length == 0;
        },this));

        this.saveStrips();
        //console.log("triggering strips updated");
        this.view.trigger("StripsUpdated",[this.getStrips()]);
    },
    findStrip:function(id) {
        var found = null;
        _.each(this.stripData,function(strip,index) {
            if (found != null) return;
            if (strip.id == id) found = index;
        });
        return found;
    },
    getStrips:function() {
        return this.stripData;
    },
    setStripName:function(id,name) {
        var index = this.findStrip(id);
        this.stripData[index].name = name;
        this.saveStrips();
    },
    forgetStrip:function(id) {
        var index = this.findStrip(id);
        this.stripData.splice(index,1);
        this.saveStrips()
        this.view.trigger("StripsUpdated",[this.getStrips()]);
    },
    saveStrips:function() {
        fs.writeFile(this.knownStripsFile,JSON.stringify(this.stripData),function(err) {
            if (err) console.err("Failed to write strip data",err);
        });
    }
});

module.exports = This;
