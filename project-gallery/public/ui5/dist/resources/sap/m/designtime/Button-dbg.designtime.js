/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.m.Button control
sap.ui.define([],
	function () {
		"use strict";

		return {
			palette: {
				group: "ACTION",
				icons: {
					svg: "sap/m/designtime/Button.icon.svg"
				}
			},
			actions: {
				combine: {
					changeType: "combineButtons",
					changeOnRelevantContainer : true,
					isEnabled : true
				},
				remove: {
					changeType: "hideControl"
				},
				rename: {
					changeType: "rename",
					domRef: function (oControl) {
						return oControl.$().find(".sapMBtnContent, .sapMSegBBtnInner")[0];
					}
				},
				reveal: {
					changeType: "unhideControl"
				}
			},
			templates: {
				create: "sap/m/designtime/Button.create.fragment.xml"
			}
		};
	});