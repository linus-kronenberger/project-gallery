/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([], function () {
	"use strict";

	/**
	 * Illustration renderer.
	 * @namespace
	 */
	var IllustrationRenderer = {
		apiVersion: 2
	};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the Render-Output-Buffer
	 * @param {sap.m.Illustration} oIllustration An object representation of the control that should be rendered
	 */
	IllustrationRenderer.render = function (oRm, oIllustration) {
		var sSymbolId = oIllustration._sSymbolId,
			bDecorative = oIllustration.getDecorative();

		oRm.openStart("svg", oIllustration);
		oRm.class("sapMIllustration");
		oRm.accessibilityState(oIllustration);

		if (bDecorative) {
			oRm.attr("role", "presentation");
			oRm.attr("aria-hidden", "true");
		}

		oRm.openEnd();

		oRm.openStart("use");
		oRm.attr('href', "#" + sSymbolId);
		oRm.attr('width', "100%");
		oRm.attr('height', "100%");
		oRm.openEnd();
		oRm.close("use");

		oRm.close("svg");
	};

	return IllustrationRenderer;

}, /* bExport= */ true);
