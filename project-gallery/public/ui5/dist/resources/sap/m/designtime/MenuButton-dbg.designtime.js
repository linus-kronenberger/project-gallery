/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.m.MenuButton control
sap.ui.define([],
	function () {
		"use strict";

		return {
			palette: {
				group: "ACTION",
				icons: {
					svg: "sap/m/designtime/MenuButton.icon.svg"
				}
			},
			aggregations: {
				menu: {
					ignore: true
				}
			},
			actions: {
				remove: {
					changeType: "hideControl"
				},
				reveal: {
					changeType: "unhideControl"
				},
				split: {
					changeType: "splitMenuButton",
					changeOnRelevantContainer : true,
					getControlsCount : function(oMenuButton) {
						return oMenuButton.getMenu().getItems().length;
					}
				},
				rename: {
					changeType: "rename",
					domRef: function (oControl) {
						return oControl.$().find('.sapMBtn > .sapMBtnInner > .sapMBtnContent')[0];
					}
				}
			},
			templates: {
				create: "sap/m/designtime/MenuButton.create.fragment.xml"
			}
		};
	});