'use strict';

var GenericAlexaHomematicService = require('./GenericService.js').GenericAlexaHomematicService;
var util = require("util");


function AlexaHomematicHMIPDimmerService(homematicDevice,log,hmlayer,name) {
    AlexaHomematicHMIPDimmerService.super_.apply(this,arguments);
	this.ccuInterface = "HmIP-RF";
}

util.inherits(AlexaHomematicHMIPDimmerService, GenericAlexaHomematicService);



AlexaHomematicHMIPDimmerService.prototype.getType = function() {
	return "Dimmer";
}


AlexaHomematicHMIPDimmerService.prototype.getActions = function() {
	return ["turnOn","turnOff","setPercentage","incrementPercentage","decrementPercentage"];
}



AlexaHomematicHMIPDimmerService.prototype.handleEvent = function(event,callback) {
	
	
	console.log("Event %s",JSON.stringify(event));
	var that = this;
	var rmp = 0;
	if (this.server) { 
	  var configuration = this.server.configuration;
	  if (configuration) {
		  rmp = configuration.getValueForPluginWithDefault(this.name,"ramp_time",0);
	  }
	}

	switch (event.header.name) {

		case "TurnOnRequest" : {
			// Check if we have a Ramp
			if (rmp > 0) {
				this.setState(this.homematicDevice,"RAMP_TIME",rmp);
			}			
			this.setState(this.homematicDevice,"LEVEL",{"explicitDouble":1});
			callback("Alexa.ConnectedHome.Control","TurnOnConfirmation");
		}
		break;


		case "TurnOffRequest" : {
			if (rmp > 0) {
				this.setState(this.homematicDevice,"RAMP_TIME",rmp);
			}			
			this.setState(this.homematicDevice,"LEVEL",{"explicitDouble":0});
			callback("Alexa.ConnectedHome.Control","TurnOffConfirmation");
		}
		break;
		
		case "SetPercentageRequest": {
			var newValue = event.payload.percentageState.value;
			this.setState(this.homematicDevice,"LEVEL",{"explicitDouble":newValue/100});
			callback("Alexa.ConnectedHome.Control","SetPercentageConfirmation");
		}
		break;

		case "IncrementPercentageRequest": {
			var newValue = event.payload.deltaPercentage.value;
			this.getState(this.homematicDevice,"LEVEL",function (error,level){
				var newLevel = (level * 100) + newValue;
				if (rmp > 0) {	that.setState(that.homematicDevice,"RAMP_TIME",rmp);}			
				that.setState(that.homematicDevice,"LEVEL",{"explicitDouble":newLevel/100});
				callback("Alexa.ConnectedHome.Control","IncrementPercentageConfirmation");
				
			});
		}
		break;
		
		case "DecrementPercentageRequest": {
			var newValue = event.payload.deltaPercentage.value;
			this.getState(this.homematicDevice,"LEVEL",function (error,level){
				var newLevel = (level * 100) - newValue;
				if (rmp > 0) {	that.setState(that.homematicDevice,"RAMP_TIME",rmp);}			
				that.setState(that.homematicDevice,"LEVEL",{"explicitDouble":newLevel/100});
				callback("Alexa.ConnectedHome.Control","DecrementPercentageConfirmation");
			});
		}
		break;
		
		
		
		default:{
			callback("Alexa.ConnectedHome.Control","NoSuchTargetError");
		}
		break;
		
}


}

module.exports = AlexaHomematicHMIPDimmerService; 