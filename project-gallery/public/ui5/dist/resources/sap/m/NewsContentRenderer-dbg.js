/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["sap/m/TileContent"],
	function(TileContent) {
	"use strict";

	/**
	 * NewsContent renderer.
	 * @namespace
	 */
	var NewsContentRenderer = {
		apiVersion: 2
	};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm the RenderManager that can be used for writing to the Render-Output-Buffer
	 * @param {sap.m.GenericTile} oControl the control to be rendered
	 */
	NewsContentRenderer.render = function(oRm, oControl) {
		var sTooltip = oControl.getTooltip_AsString();
		var bIsSubheaderPresent = oControl.getSubheader();
		if (typeof sTooltip !== "string") {
			sTooltip = "";
		}

		oRm.openStart("div", oControl);
		oRm.attr("role", "presentation");
		oRm.attr("aria-label", sTooltip);

		oRm.class("sapMNwC");
		if (oControl.hasListeners("press")) {
			oRm.class("sapMPointer");
			oRm.attr("tabindex", "0");
		}
		oRm.openEnd();

			// render tile content priority, if present
			var oTileContent = oControl.getParent();
			var oContentPriorityBadge = oTileContent instanceof TileContent && oTileContent._getPriorityBadge();

			if (oContentPriorityBadge) {
				oRm.renderControl(oContentPriorityBadge);
			}

			oRm.openStart("div", oControl.getId() + "-title");
			oRm.class("sapMNwCCTxt");
			if (!bIsSubheaderPresent) {
				oRm.class("sapMNwCExtend");
			}
			oRm.openEnd();
			oRm.renderControl(oControl._oContentText);
			oRm.close("div");

			oRm.openStart("div", oControl.getId() + "-subheader");
			oRm.class("sapMNwCSbh");
			oRm.class("sapMNwCExtend");
			oRm.openEnd();
			oRm.renderControl(oControl._oSubHeaderText);
			oRm.close("div");
		oRm.close("div");
	};

	return NewsContentRenderer;
}, /* bExport= */true);
