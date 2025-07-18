/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.m.RatingIndicator control
sap.ui.define([],
	function () {
		"use strict";

		return {
			name: {
				singular: "RATINGINDICATOR_NAME",
				plural: "RATINGINDICATOR_NAME_PLURAL"
			},
			palette: {
				group: "INPUT",
				icons: {
					svg: "sap/m/designtime/RatingIndicator.icon.svg"
				}
			},
			actions: {
				remove: {
					changeType: "hideControl"
				},
				reveal: {
					changeType: "unhideControl"
				}
			},
			templates: {
				create: "sap/m/designtime/RatingIndicator.create.fragment.xml"
			}
		};
	});