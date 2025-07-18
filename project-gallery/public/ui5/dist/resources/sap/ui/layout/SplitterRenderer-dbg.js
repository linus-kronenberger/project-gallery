/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/ui/core/AnimationMode",
	"sap/ui/core/ControlBehavior",
	"sap/ui/core/Lib",
	"sap/ui/core/library",
	"sap/ui/core/IconPool" // side effect: required when calling RenderManager#icon
], function(
	AnimationMode,
	ControlBehavior,
	Library,
	coreLibrary
) {
	"use strict";

	// shortcut for sap.ui.core.Orientation
	var Orientation = coreLibrary.Orientation;

	var oResourceBundle = Library.getResourceBundleFor("sap.ui.layout");

	/**
	 * Splitter renderer.
	 * @namespace
	 */
	var SplitterRenderer = {
		apiVersion: 2
	};

	/**
	 * Renders the main HTML element for the Splitter control and everything else is rendered in a
	 * hidden area inside the splitter. The content of that hidden area is shown after rendering to
	 * avoid flickering.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.layout.Splitter} oSplitter An instance of Splitter, which will be rendered
	 */
	SplitterRenderer.render = function(oRm, oSplitter) {
		var bHorizontal = oSplitter.getOrientation() === Orientation.Horizontal,
			sOrientationClass = bHorizontal ? "sapUiLoSplitterH" : "sapUiLoSplitterV";

		// Make sure we have the main element available before rendering the children so we can use
		// the element width to calculate before rendering the children.
		oRm.openStart("div", oSplitter)
			.class("sapUiLoSplitter")
			.class(sOrientationClass);

		/**
		 * Do not animate via CSS when liveResize is enabled
		 * @deprecated As of version 1.21.
		 */
		if (!oSplitter._liveResize && ControlBehavior.getAnimationMode() !== AnimationMode.none && ControlBehavior.getAnimationMode() !== AnimationMode.minimal) {
			oRm.class("sapUiLoSplitterAnimated");
		}

		oRm.style("width", oSplitter.getWidth())
			.style("height", oSplitter.getHeight())
			.openEnd();

		this.renderContentAreas(oRm, oSplitter);

		oRm.close("div");
	};

	/**
	 * Renders the content areas.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.layout.Splitter} oSplitter An instance of Splitter, which will be rendered
	 */
	SplitterRenderer.renderContentAreas = function(oRm, oSplitter) {
		var sId = oSplitter.getId(),
			bHorizontal = oSplitter.getOrientation() === Orientation.Horizontal,
			sSizeType = bHorizontal ? "width" : "height",
			aContentAreas = oSplitter._getContentAreas(),
			iLen = aContentAreas.length,
			aCalculatedSizes = oSplitter._calculatedSizes;

		aContentAreas.forEach(function (oContentArea, i) {
			var oLayoutData = oContentArea.getLayoutData(),
				sSize = "0";

			if (aCalculatedSizes[i]) {
				// Use precalculated size if available
				sSize = aCalculatedSizes[i] + "px";
			} else if (oLayoutData) {
				sSize = oLayoutData.getSize();
			}

			oRm.openStart("section", sId + "-content-" + i)
				.style(sSizeType, sSize)
				.class("sapUiLoSplitterContent")
				.openEnd();

			oRm.renderControl(oContentArea);

			oRm.close("section");

			if (i < iLen - 1) {
				SplitterRenderer.renderBar(oRm, bHorizontal, oSplitter.getId() + "-splitbar-" + i, "sapUiLoSplitterBar");
			}
		});

		// render overlay and overlay bar
		oRm.openStart("div", sId + "-overlay")
			.class("sapUiLoSplitterOverlay")
			.openEnd();

		SplitterRenderer.renderBar(oRm, bHorizontal,  sId + "-overlayBar", "sapUiLoSplitterOverlayBar");

		oRm.close("div");
	};

	/**
	 * Renders a single bar.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {boolean} bHorizontal An instance of Splitter, which will be rendered
	 * @param {string} sBarId The ID of the bar
	 * @param {string} sClass The CSS class of the bar
	 */
	SplitterRenderer.renderBar = function (oRm, bHorizontal, sBarId, sClass) {
		oRm.openStart("div", sBarId)
			.attr("role", "separator")
			.attr("title", oResourceBundle.getText("SPLITTER_MOVE"))
			.attr("aria-orientation", (bHorizontal ? "vertical" : "horizontal"))
			.attr("tabindex", 0)
			.class(sClass)
			.openEnd();

		SplitterRenderer.renderBarGripAndDecorations(oRm, bHorizontal);

		oRm.close("div");
	};

	/**
	 * Renders the grip and the decorations for a bar.
	 *
	 * @param {sap.ui.core.RenderManager} oRm RenderManager that can is used for writing to the render output buffer
	 * @param {boolean} bHorizontal Whether the orientation of the Splitter is horizontal
	 */
	SplitterRenderer.renderBarGripAndDecorations = function(oRm, bHorizontal) {
		var sIcon = bHorizontal ? "sap-icon://vertical-grip" : "sap-icon://horizontal-grip";

		oRm.openStart("div")
			.class("sapUiLoSplitterBarDecorationBefore")
			.openEnd()
			.close("div");

		oRm.openStart("div")
			.class("sapUiLoSplitterBarGrip")
			.openEnd()
				.icon(sIcon, ["sapUiLoSplitterBarGripIcon"])
			.close("div");

		oRm.openStart("div")
			.class("sapUiLoSplitterBarDecorationAfter")
			.openEnd()
			.close("div");
	};

	return SplitterRenderer;

}, /* bExport= */ true);
