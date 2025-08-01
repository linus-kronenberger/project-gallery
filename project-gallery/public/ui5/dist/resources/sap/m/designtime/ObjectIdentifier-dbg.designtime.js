/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.m.ObjectIdentifier control.
sap.ui.define([
	'sap/m/library',
	"sap/base/Log"
], function(MLibrary, Log) {
	"use strict";
	var oWrapper;

	return {
		palette: {
			group: "DISPLAY",
			icons: {
				svg: "sap/m/designtime/ObjectIdentifier.icon.svg"
			}
		},
		// There is a dependency to 'sap.ui.comp' library because the so called 'settings' handler is implemented for SmartLink. So we register
		// the 'settings' handler in 'sap.ui.comp' library which basically do the same stuff as for SmartLink. The registration mechanism has been
		// chosen in order to be on the save site if 'sap.ui.comp' library is not used at all (e.g. OpenUI5).
		registerSettingsHandler: function(oWrapper_) {
			oWrapper = oWrapper_;
		},
		getStableElements: function(oObjectIdentifier) {
			return oWrapper ? oWrapper.getStableElements(oObjectIdentifier) : null;
		},
		actions: {
			settings: function(oObjectIdentifier) {
				// Checking for the model which is set inside the sap.ui.comp.providers.ControlProvider in case the title link has SmartLink functionality
				if (oObjectIdentifier.getModel("$sapuicompcontrolprovider_distinctSO")) {
					if (!oWrapper) {
						return;
					}
					return {
						handler: function(oObjectIdentifier, fGetUnsavedChanges) {
							return oWrapper.execute(oObjectIdentifier, fGetUnsavedChanges);
						}
					};
				}
				return null;
			}
		},
		templates: {
			create: "sap/m/designtime/ObjectIdentifier.create.fragment.xml"
		}
	};
});