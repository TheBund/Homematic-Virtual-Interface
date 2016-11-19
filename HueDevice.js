	"use strict";


	var Channel = require("./Channel.js").Channel;
	var Device = require("./Device.js").Device;
	var debug = require('debug')('HomeMaticHueBridge.HueDevice');


	var HueDevice = function(hmbridge, hueApi ,light,serialprefix) {

		debug("Setup new HUE Bridge Device");

		var that = this;
		this.api =  hueApi;
		this.bridge = hmbridge;
		this.lightId = light["id"];
		this.isGroup = (light["uniqueid"] == undefined);
		this.transitiontime = 4; // Default Hue
		this.onTime = 0;
		this.lastLevel = 0;
		this.hmDevice = new Device("HM-LC-RGBW-WM", serialprefix  + this.lightId );
		this.hmDevice.firmware = light["swversion"];
		this.bridge.addDevice(this.hmDevice);

		this.hmDevice.on('device_channel_value_change', function(parameter){
			
			debug("Value was changed " + JSON.stringify(parameter) );
			var newValue = parameter.newValue;
			
			var channel = that.hmDevice.getChannel(parameter.channel);

			if (parameter.name == "INSTALL_TEST") {

			if (channel != undefined) {
	      	  channel.startUpdating("INSTALL_TEST");
	      	}

	      that.api.setLightState(that.lightId,{"alert":"lselect"}, function(err, result) {
		     if (channel != undefined) {
	        channel.updateValue("INSTALL_TEST",false);
	        channel.endUpdating("INSTALL_TEST");
	      }
	      });

	      }


	      if (parameter.name == "LEVEL") {
	       that.setLevel(newValue);
		   if ((that.onTime > 0) && (newValue>0)) {
		    setTimeout(function() {that.setLevel(0);}, that.onTime * 1000);
	       }
	       // reset the transition and on time 
	       that.transitiontime = 4;
	       that.onTime = 0;
	       if (newValue > 0) {
		       that.lastLevel = newValue;
	       }
	     }


		 if (parameter.name == "OLD_LEVEL") {
	       if (newValue==true) {
		      if (that.lastLevel == 0) {
			      that.lastLevel = 1;
		      }
		      that.setLevel(that.lastLevel); 
	       
	       }
	       
	     }



	    if ((parameter.name == "RAMP_TIME") && (channel.index == "1")) {
		  that.transitiontime = newValue*10;
		}

	    if ((parameter.name == "ON_TIME") && (channel.index == "1")) {
		  that.onTime = newValue;
		}


	     if (parameter.name == "COLOR") {
		  that.setColor(newValue);
	     }


	    });

	     this.updateTimer = setTimeout(function() {
		 	that.refreshDevice();
		 }, 1000);

	}

	HueDevice.prototype.setColor = function(newColor) {
		var that = this;
		var newState = {};
	    if (newColor == 200) {
	      // SpeZiale
		  	newState["rgb"] = {r:255,g:255,b:255};

	    } else {
	        newState["hue"] = (newColor/199)*65535;
	    }

		debug("Hue Value set to " + JSON.stringify(newState) );
	    var co_channel = that.hmDevice.getChannelWithTypeAndIndex("RGBW_COLOR","2");

		if (co_channel != undefined) {
	        co_channel.startUpdating("COLOR");
		}



		if (that.isGroup == true) {

	    that.api.setGroupLightState(that.lightId,newState, function(err, result) {
	      if (co_channel != undefined) {
	        co_channel.endUpdating("COLOR");
	      }
	    });
			
		} else {
	    that.api.setLightState(that.lightId,newState, function(err, result) {
	      if (co_channel != undefined) {
	        co_channel.endUpdating("COLOR");
	      }
	    });
		}

	}


	HueDevice.prototype.setLevel = function(newLevel) {
	    var that = this;
	    var di_channel = that.hmDevice.getChannelWithTypeAndIndex("DIMMER","1");
		di_channel.startUpdating("LEVEL");
		di_channel.updateValue("LEVEL",newLevel);
		var newState = {"transitiontime":that.transitiontime};
	      if (newLevel > 0) {
	        newState["on"] = true;
	        newState["bri"] = (newLevel/1)*255;

	      } else {
	        newState["on"] = false;
	        newState["bri"] = 0;
	    }
		debug(JSON.stringify(newState));
		
		
		if (that.isGroup == true) {

	    that.api.setGroupLightState(that.lightId,newState, function(err, result) {
	     if (di_channel != undefined) {
	        di_channel.endUpdating("LEVEL");
	      }
	    });

		} else {

		that.api.setLightState(that.lightId,newState, function(err, result) {
	      if (di_channel != undefined) {
	        di_channel.endUpdating("LEVEL");
	      }
	    });
	    }
	}

	HueDevice.prototype.refreshDevice = function(device) {
	  var that = this;
	  
	  if (that.isGroup == true) {
	  
	  this.api.getGroup(this.lightId, function(err, result) {
	    var state = result["action"]["on"];
	    var bri = result["action"]["bri"];
	    var hue = result["action"]["hue"];

	    var di_channel = that.hmDevice.getChannelWithTypeAndIndex("DIMMER","1");
	    var co_channel = that.hmDevice.getChannelWithTypeAndIndex("RGBW_COLOR","2");

	    if ((di_channel!=undefined) && (co_channel!=undefined)) {

	    if (state==true) {
	        di_channel.updateValue("LEVEL",(bri/254),true);
	        co_channel.updateValue("COLOR",Math.round((hue/65535)*199),true);
	    	} else {
	        di_channel.updateValue("LEVEL",0,true);
	    	}
	    }

	  });

	}
	  else {
		  

	  this.api.lightStatus(this.lightId, function(err, result) {
	    var state = result["state"]["on"];
	    var bri = result["state"]["bri"];
	    var hue = result["state"]["hue"];

	    var di_channel = that.hmDevice.getChannelWithTypeAndIndex("DIMMER","1");
	    var co_channel = that.hmDevice.getChannelWithTypeAndIndex("RGBW_COLOR","2");

	    if ((di_channel!=undefined) && (co_channel!=undefined)) {

	    if (state==true) {
	        di_channel.updateValue("LEVEL",(bri/254),true);
	        co_channel.updateValue("COLOR",Math.round((hue/65535)*199),true);
	    	} else {
	        di_channel.updateValue("LEVEL",0,true);
	    	}
	    }

	  });
	}

	 this.updateTimer = setTimeout(function() {
		 	that.refreshDevice();
		 }, 60000);
	}

	module.exports = {
	  HueDevice : HueDevice
	}