/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["./library", 'sap/ui/core/Renderer', './ToolbarRenderer', "sap/m/BarInPageEnabler"],
	function(library, Renderer, ToolbarRenderer, BarInPageEnabler) {
		"use strict";

		// shortcut for sap.m.OverflowToolbarPriority
		var OverflowToolbarPriority = library.OverflowToolbarPriority;


		/**
		 * OverflowToolbar renderer.
		 * @namespace
		 */
		var OverflowToolbarRenderer = Renderer.extend(ToolbarRenderer);

		OverflowToolbarRenderer.apiVersion = 2;

		OverflowToolbarRenderer.renderBarContent = function(rm, oToolbar) {

			var bHasAlwaysOverflowVisibleContent  = false,
				oFirstVisibleControl = null,
				bHasAnyVisibleContent;

			if (oToolbar.getActive()) {
				rm.renderControl(oToolbar._getActiveButton());
			}
			oToolbar._getVisibleContent().forEach(function(oControl) {
				BarInPageEnabler.addChildClassTo(oControl, oToolbar);

				if (oToolbar._getControlPriority(oControl) !== OverflowToolbarPriority.AlwaysOverflow ) {
					if (!oFirstVisibleControl && oControl.getVisible()) {
						oControl.addStyleClass("sapMBarChildFirstChild");
						oFirstVisibleControl = oControl;
					} else {
						oControl.removeStyleClass("sapMBarChildFirstChild");
					}
					rm.renderControl(oControl);
				} else {
					bHasAlwaysOverflowVisibleContent = bHasAlwaysOverflowVisibleContent || oControl.getVisible();
				}
			});

			if (bHasAlwaysOverflowVisibleContent || oToolbar._getOverflowButtonNeeded()) {
				OverflowToolbarRenderer.renderOverflowButton(rm, oToolbar);
			}

			bHasAnyVisibleContent = oToolbar.getContent().some(function (oControl) {
				return oControl.getVisible();
			});
			if (bHasAnyVisibleContent) {
				OverflowToolbarRenderer.renderOverflowButtonClone(rm, oToolbar);
			}
		};

		OverflowToolbarRenderer.renderOverflowButton = function(rm, oToolbar) {
			var oOverflowButton = oToolbar._getOverflowButton();
			BarInPageEnabler.addChildClassTo(oOverflowButton, oToolbar);
			rm.renderControl(oOverflowButton);
		};

		OverflowToolbarRenderer.renderOverflowButtonClone = function(rm, oToolbar) {
			var oOverflowButtonClone = oToolbar._getOverflowButtonClone();
			BarInPageEnabler.addChildClassTo(oOverflowButtonClone, oToolbar);
			rm.renderControl(oOverflowButtonClone);
		};

		return OverflowToolbarRenderer;

	}, /* bExport= */ true);
