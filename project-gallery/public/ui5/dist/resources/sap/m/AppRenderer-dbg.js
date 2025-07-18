/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(['./NavContainerRenderer', 'sap/ui/core/Renderer', 'sap/m/library'],
	function(NavContainerRenderer, Renderer, library) {
	"use strict";


	// shortcut for sap.m.BackgroundHelper
	var BackgroundHelper = library.BackgroundHelper;


	/**
	 * App renderer.
	 * @namespace
	 */
	var AppRenderer = Renderer.extend(NavContainerRenderer);

	AppRenderer.apiVersion = 2;

	AppRenderer.renderAttributes = function(rm, oControl) {
		BackgroundHelper.addBackgroundColorStyles(rm, oControl.getBackgroundColor(), oControl.getBackgroundImage());
	};

	AppRenderer.renderBeforeContent = function(rm, oControl) {
		BackgroundHelper.renderBackgroundImageTag(rm, oControl, "sapMAppBG",  oControl.getBackgroundImage(), oControl.getBackgroundRepeat(), oControl.getBackgroundOpacity());
	};


	return AppRenderer;

}, /* bExport= */ true);
