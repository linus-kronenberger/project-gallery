/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(['sap/ui/core/Renderer', './InputBaseRenderer'], function(Renderer, InputBaseRenderer) {
	"use strict";

	/**
	 * DateTimeFieldRenderer renderer.
	 * @namespace
	 */
	var DateTimeFieldRenderer = Renderer.extend(InputBaseRenderer);
	DateTimeFieldRenderer.apiVersion = 2;

	/**
	 * Returns aria accessibility role for the control.
	 * Hook for the subclasses.
	 *
	 * @protected
	 * @override
	 * @param {sap.m.DateTimeField} oControl an object representation of the control
	 * @returns {string}
	 */
	DateTimeFieldRenderer.getAriaRole = function (oControl) {
		return "";
	};

	return DateTimeFieldRenderer;

}, /* bExport= */ true);
