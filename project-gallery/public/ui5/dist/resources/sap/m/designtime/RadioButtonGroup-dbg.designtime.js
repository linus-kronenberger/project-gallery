/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.m.RadioButton control
sap.ui.define([],
	function () {
		"use strict";

		return {
			name: {
				singular: "RADIO_BUTTON_GROUP_NAME",
				plural: "RADIO_BUTTON_GROUP_NAME_PLURAL"
			},
			palette: {
				group: "INPUT",
				icons: {
					svg: "sap/m/designtime/RadioButtonGroup.icon.svg"
				}
			},
			templates: {
				create: "sap/m/designtime/RadioButtonGroup.create.fragment.xml"
			}
		};
	});