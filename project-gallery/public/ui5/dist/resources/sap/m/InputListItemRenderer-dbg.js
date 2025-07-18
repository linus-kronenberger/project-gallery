/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["sap/ui/core/library", "sap/ui/core/Renderer", "./ListItemBaseRenderer"],
	function(coreLibrary, Renderer, ListItemBaseRenderer) {
	"use strict";


	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;


	/**
	 * InputListItem renderer.
	 * @namespace
	 */
	var InputListItemRenderer = Renderer.extend(ListItemBaseRenderer);
	InputListItemRenderer.apiVersion = 2;

	/**
	 * Renders the HTML for the given control, using the provided
	 * {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} rm
	 *          RenderManager that can be used to render the control's DOM
	 * @param {sap.m.InputListItem} oLI
	 *          The item to be rendered
	 */
	InputListItemRenderer.renderLIAttributes = function(rm, oLI) {
		rm.class("sapMILI");
	};

	InputListItemRenderer.renderLIContent = function(rm, oLI) {
		rm.openStart("div", oLI.getId() + "-contentWrapper").class("sapMILIContentWrapper");
		rm.class("sapMILIContentWrapper" + oLI.getContentSize());
		rm.openEnd();
		this.renderLabel(rm, oLI);
		this.renderInput(rm, oLI);
		rm.close("div");
	};

	InputListItemRenderer.renderLabel = function(rm, oLI) {
		var sLabel = oLI.getLabel();
		if (sLabel) {
			rm.openStart("span", oLI.getId() + "-label");
			rm.class("sapMILILabel");

			var sLabelDir = oLI.getLabelTextDirection();
			if (sLabelDir !== TextDirection.Inherit) {
				rm.attr("dir", sLabelDir.toLowerCase());
			}

			rm.openEnd();
			rm.text(sLabel);
			rm.close("span");
		}
	};

	InputListItemRenderer.renderInput = function(rm, oLI) {
		rm.openStart("div").class("sapMILIDiv").class("sapMILI-CTX").openEnd();
		oLI.getContent().forEach(function(oControl) {
			if (oControl.addAriaLabelledBy) {
				const sInnerLabel = oLI.getId() + "-label";
				if (oControl.getAriaLabelledBy().indexOf(sInnerLabel) === -1) {
					oControl.addAriaLabelledBy(sInnerLabel);
				}
			}
			rm.renderControl(oControl);
		});
		rm.close("div");
	};

	return InputListItemRenderer;

}, /* bExport= */ true);
