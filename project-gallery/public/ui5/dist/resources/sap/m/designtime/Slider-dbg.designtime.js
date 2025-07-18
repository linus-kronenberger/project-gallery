/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
// Provides the Design Time Metadata for the sap.m.Slider control
sap.ui.define([],
	function () {
		"use strict";

		return {
			name: {
				singular: "SLIDER_NAME",
				plural: "SLIDER_NAME_PLURAL"
			},
			palette: {
				group: "INPUT",
				icons: {
					svg: "sap/m/designtime/Slider.icon.svg"
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
			aggregations: {
				scale: {
					domRef: ":sap-domref .sapMSliderTickmarks"
				},
				customTooltips: {
					ignore: true
				}
			},
			templates: {
				create: "sap/m/designtime/Slider.create.fragment.xml"
			}
		};
	}, /* bExport= */ true);