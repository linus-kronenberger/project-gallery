/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['./InputRenderer', "sap/ui/core/Lib", 'sap/ui/core/Renderer'],
	function(InputRenderer, Library, Renderer) {
	"use strict";


	/**
	 * MultiInput renderer.
	 * @namespace
	 */
	var MultiInputRenderer = Renderer.extend(InputRenderer);
	MultiInputRenderer.apiVersion = 2;

	MultiInputRenderer.prependInnerContent = function (oRm, oControl) {
		oRm.renderControl(oControl.getAggregation("tokenizer"));
	};

	MultiInputRenderer.addOuterClasses = function(oRm, oControl) {
		InputRenderer.addOuterClasses.apply(this, arguments);

		oRm.class("sapMMultiInput");

		if (oControl.getTokens().length > 0) {
			oRm.class("sapMMultiInputHasTokens");
		}
	};

	MultiInputRenderer.getAriaDescribedBy = function(oControl) {
		// input method should be overwritten in order to add the tokens information
		var sAriaDescribedBy = InputRenderer.getAriaDescribedBy.apply(this, arguments),
			oInvisibleTextId = oControl.getAggregation("tokenizer") &&
				oControl.getAggregation("tokenizer").getTokensInfoId();

		if (sAriaDescribedBy) {
			sAriaDescribedBy = sAriaDescribedBy + " " + oInvisibleTextId;
		} else {
			sAriaDescribedBy = oInvisibleTextId ;
		}

		return sAriaDescribedBy;
	};

	MultiInputRenderer.getAccessibilityState = function (oControl) {
		var mAccessibilityState = InputRenderer.getAccessibilityState.apply(this, arguments),
			oResourceBundle = Library.getResourceBundleFor("sap.m");

		mAccessibilityState.roledescription = oResourceBundle.getText("MULTIINPUT_ARIA_ROLE_DESCRIPTION");

		return mAccessibilityState;
	};

	return MultiInputRenderer;

}, /* bExport= */ true);
