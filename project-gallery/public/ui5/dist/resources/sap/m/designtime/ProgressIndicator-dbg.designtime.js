/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.m.ProgressIndicator control
sap.ui.define([],
	function () {
		"use strict";

		return {
			palette: {
				group: "DISPLAY",
				icons: {
					svg: "sap/m/designtime/ProgressIndicator.icon.svg"
				}
			},
			templates: {
				create: "sap/m/designtime/ProgressIndicator.create.fragment.xml"
			}
		};
	});