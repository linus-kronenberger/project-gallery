sap.ui.define([
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/m/BusyDialog"
], (Button, MessageToast, BusyDialog) => {
	"use strict";

	new Button({
		text: "Install",
		press: openBusyDialog,
	}).placeAt("content");
	
	function openBusyDialog() {
		console.log("Installation Button pressed")
		const busyDialog = new BusyDialog({
			text : "Installing Application.."
		}).open();
		
		setTimeout(() => {busyDialog.close();}, 1000);

	}

});