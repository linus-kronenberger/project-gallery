/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the default renderer for control sap.m.SliderTooltip
sap.ui.define([],
	function() {
		"use strict";

		/**
		 * SliderTooltip renderer.
		 *
		 * @author SAP SE
		 * @namespace
		 */
		var SliderTooltipBaseRenderer = {
			apiVersion: 2
		};

		SliderTooltipBaseRenderer.CSS_CLASS = "sapMSliderTooltip";

		/**
		 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
		 *
		 * @param {sap.ui.core.RenderManager} oRM The RenderManager that can be used for writing to the renderer output buffer
		 * @param {sap.m.SliderTooltipBase} oControl An object representation of the control that should be rendered
		 */
		SliderTooltipBaseRenderer.render = function (oRM, oControl) {
			oRM.openStart("div", oControl)
				.openEnd();

			this.renderTooltipContent(oRM, oControl);

			oRM.close("div");
		};

		/**
		 * Renders the internal content of the Tooltip.
		 * To be overwritten by subclasses.
		 *
		 * @param {sap.ui.core.RenderManager} oRM The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.m.SliderTooltipBase} oControl An object representation of the control that should be rendered.
		 */
		SliderTooltipBaseRenderer.renderTooltipContent = function (oRM, oControl) {};

		return SliderTooltipBaseRenderer;

	}, /* bExport= */ true);