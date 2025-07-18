/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides default renderer for control sap.ui.unified.SplitContainer
sap.ui.define(["sap/ui/core/ControlBehavior", "sap/ui/core/library", "sap/ui/core/Configuration"],
	function(ControlBehavior, coreLibrary, Configuration) {
	"use strict";


	// shortcut for sap.ui.core.Orientation
	var Orientation = coreLibrary.Orientation;


	/**
	 * SplitContainer renderer.
	 * @namespace
	 * @deprecated As of version 1.44.0, the concept has been discarded.
	 */
	var SplitContainerRenderer = {};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 * @param {sap.ui.core.RenderManager} rm the RenderManager that can be used for writing to the Render-Output-Buffer
	 * @param {sap.ui.unified.SplitContainer} oControl an object representation of the control that should be rendered
	 */
	SplitContainerRenderer.render = function(rm, oControl){
		var sId = oControl.getId();

		var bVertical = oControl.getOrientation() == Orientation.Vertical;

		rm.write("<div");
		rm.writeControlData(oControl);
		rm.addClass("sapUiUfdSpltCont");
		rm.addClass("sapUiUfdSpltCont" + (bVertical ? "V" : "H"));
		if (ControlBehavior.getAnimationMode() !== Configuration.AnimationMode.none) {
			rm.addClass("sapUiUfdSpltContAnim");
		}

		if (!oControl.getShowSecondaryContent()) {
			rm.addClass("sapUiUfdSpltContPaneHidden");
		}
		rm.writeClasses();
		rm.write(">");

		var sCanvasId = sId + "-canvas";

		rm.write("<section id='", sCanvasId, "' class='sapUiUfdSpltContCanvas'>");
		this.renderContent(rm, sCanvasId, oControl.getContent(), oControl._bRootContent);
		rm.write("</section>");

		var sSidePaneId = sId + "-pane";

		var sWidth = oControl.getShowSecondaryContent() ? oControl.getSecondaryContentSize() : "0";
		rm.write("<aside id='", sSidePaneId);
		rm.write("'");
		rm.addStyle("width", sWidth);
		rm.writeStyles();

		rm.addClass("sapUiUfdSpltContPane");
		if (!oControl.getShowSecondaryContent()) {
			rm.addClass("sapUiUfdSplitContSecondClosed");
		}
		rm.writeClasses();
		rm.write(">");
		this.renderContent(rm, sSidePaneId, oControl.getSecondaryContent(), oControl._bRootContent);
		rm.write("</aside>");

		rm.write("</div>");
	};

	SplitContainerRenderer.renderContent = function (rm, sId, aContent, bRootContent) {
		rm.write("<div id='", sId, "cntnt' class='sapUiUfdSpltContCntnt'");
		if (bRootContent) {
			rm.writeAttribute("data-sap-ui-root-content", "true"); // see e.g. sap.m.App#onAfterRendering
		}
		rm.write(">");
		for (var i = 0; i < aContent.length; i++) {
			rm.renderControl(aContent[i]);
		}
		rm.write("</div>");
	};


	return SplitContainerRenderer;

}, /* bExport= */ true);
