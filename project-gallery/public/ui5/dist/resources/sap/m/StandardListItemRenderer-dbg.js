/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["sap/ui/core/Lib", "sap/ui/core/library", "sap/ui/core/Renderer", "sap/ui/core/IconPool", "./library", "./ListItemBaseRenderer"],
	function(Library, coreLibrary, Renderer, IconPool, library, ListItemBaseRenderer ) {
	"use strict";


	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;


	/**
	 * StandardListItem renderer.
	 * @namespace
	 */
	var StandardListItemRenderer = Renderer.extend(ListItemBaseRenderer);
	StandardListItemRenderer.apiVersion = 2;

	/**
	 * Renders the HTML for the given control, using the provided
	 * {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 */
	StandardListItemRenderer.renderLIAttributes = function(rm, oLI) {
		var sIconURI = oLI.getIcon(),
			sTitle = oLI.getTitle();

		rm.class("sapMSLI");

		if (sIconURI && !IconPool.isIconURI(sIconURI)) {
			rm.class("sapMSLIThumbnail");
		}

		if (!oLI.getIconInset()) {
			rm.class("sapMSLINoIconInset");
		}

		if (sTitle && oLI.getDescription()) {
			rm.class("sapMSLIWithDescription");
		}

		if (sTitle && !oLI.getAdaptTitleSize()) {
			rm.class("sapMSLINoTitleAdapt");
		}

		if (sTitle && oLI.getWrapping()) {
			rm.class("sapMSLIWrapping");
		}
	};

	/**
	 * Renders the list item content element.
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 * @protected
	 */
	StandardListItemRenderer.renderLIContent = function(rm, oLI) {
		var sInfo = oLI.getInfo(),
			sTitle = oLI.getTitle(),
			sDescription = oLI.getDescription(),
			bAdaptTitleSize = oLI.getAdaptTitleSize(),
			bShouldRenderInfoWithoutTitle = !sTitle && sInfo;

		// render image or avatar control
		if (oLI.getAvatar()) {
			rm.renderControl(oLI._getAvatar());
		} else if (oLI.getIcon()) {
			rm.renderControl(oLI._getImage());
		}

		rm.openStart("div").class("sapMSLIDiv");

		// if bShouldRenderInfoWithoutTitle=ture then adapt the style class according to have flex-direction: row
		if ((!sDescription && bAdaptTitleSize && sInfo) || bShouldRenderInfoWithoutTitle) {
			rm.class("sapMSLIInfoMiddle");
		}

		rm.openEnd();

		this.renderTitleWrapper(rm, oLI);

		if (sTitle && sDescription) {
			this.renderDescription(rm, oLI);
		}

		if (bShouldRenderInfoWithoutTitle && !oLI.getWrapping()) {
			this.renderInfo(rm, oLI);
		}

		rm.close("div");
	};

	/**
	 * Renders the title wrapper.
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 * @protected
	 */
	StandardListItemRenderer.renderTitleWrapper = function(rm, oLI) {
		var sTextDir = oLI.getTitleTextDirection(),
			sTitle = oLI.getTitle(),
			sDescription = oLI.getDescription(),
			sInfo = oLI.getInfo(),
			bWrapping = oLI.getWrapping(),
			bShouldRenderInfoWithoutTitle = !sTitle && sInfo;

		rm.openStart("div");

		if (!bShouldRenderInfoWithoutTitle && sDescription) {
			rm.class("sapMSLITitle");
		} else {
			rm.class("sapMSLITitleOnly");
		}

		if (sTextDir !== TextDirection.Inherit) {
			rm.attr("dir", sTextDir.toLowerCase());
		}

		rm.openEnd();

		if (bWrapping) {
			this.renderWrapping(rm, oLI, "title");
			if (sInfo && !sDescription) {
				this.renderInfo(rm, oLI);
			}
		} else {
			this.renderTitle(rm, oLI);
		}

		rm.close("div");

		if (sInfo && !sDescription && !bWrapping && !bShouldRenderInfoWithoutTitle) {
			this.renderInfo(rm, oLI);
		}
	};

	/**
	 * Renders the title text.
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 * @protected
	 */
	StandardListItemRenderer.renderTitle = function(rm, oLI) {
		rm.text(oLI.getTitle());
	};

	/**
	 * Renders the description text.
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 * @protected
	 */
	StandardListItemRenderer.renderDescription = function (rm, oLI) {
		var bWrapping = oLI.getWrapping(),
			sDescription = oLI.getDescription(),
			sInfo = oLI.getInfo();

		rm.openStart("div").class("sapMSLIDescription");

		if (sInfo) {
			rm.class("sapMSLIDescriptionAndInfo");
		}

		rm.openEnd();

		// render info text within the description div to apply the relevant flex layout
		if (sInfo) {
			rm.openStart("div").class("sapMSLIDescriptionText").openEnd();

			if (bWrapping) {
				this.renderWrapping(rm, oLI, "description");
				this.renderInfo(rm, oLI);
			} else {
				rm.text(sDescription);
			}

			rm.close("div");

			if (!bWrapping) {
				this.renderInfo(rm, oLI);
			}
		} else if (bWrapping) {
			this.renderWrapping(rm, oLI, "description");
		} else {
			rm.text(sDescription);
		}

		rm.close("div");
	};

	/**
	 * Renders the info text.
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 * @protected
	 */
	StandardListItemRenderer.renderInfo = function (rm, oLI) {
		var sInfoDir = oLI.getInfoTextDirection(),
			bInfoStateInverted = oLI.getInfoStateInverted();

		rm.openStart("div", oLI.getId() + "-info");
		if (sInfoDir !== TextDirection.Inherit) {
			rm.attr("dir", sInfoDir.toLowerCase());
		}
		rm.class("sapMSLIInfo");
		rm.class("sapMSLIInfo" + oLI.getInfoState());

		if (bInfoStateInverted) {
			rm.class("sapMSLIInfoStateInverted");
		}

		var fWidth = oLI._measureInfoTextWidth();

		rm.style("min-width", oLI._getInfoTextMinWidth(fWidth));

		rm.openEnd();
		if (oLI.getWrapping() && !bInfoStateInverted) {
			this.renderWrapping(rm, oLI, "info");
		} else {
			rm.text(oLI.getInfo());
		}
		rm.close("div");
	};

	/**
	 * Renders the expand/collapse text.
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 * @param {string} sWrapArea Defines the wrapping text area
	 * @protected
	 */
	StandardListItemRenderer.renderExpandCollapse = function (rm, oLI, sWrapArea) {
		var sId = oLI.getId(),
			bTitle = sWrapArea == "title" ? true : false,
			bTextExpanded = bTitle ? oLI._bTitleTextExpanded : oLI._bDescriptionTextExpanded,
			oRb = Library.getResourceBundleFor("sap.m");

		rm.openStart("span", sId + "-" + sWrapArea + "ThreeDots").openEnd();
		rm.text(bTextExpanded ? " " : " ... ");
		rm.close("span");

		rm.openStart("span", bTitle ? sId + "-titleButton" : sId + "-descriptionButton").class("sapMSLIExpandCollapse");
		rm.attr("tabindex", "0").attr("role", "button").attr("aria-live", "polite");
		rm.openEnd();
		rm.text(oRb.getText(bTextExpanded ? "EXPANDABLE_TEXT_SHOW_LESS" : "EXPANDABLE_TEXT_SHOW_MORE"));
		rm.close("span");
	};

	/**
	 * Renders the wrapping behavior of the text.
	 * @param {sap.ui.core.RenderManager} rm The <code>RenderManager</code> that can be used for writing to the render output buffer
	 * @param {sap.m.StandardListItem} oLI An object representation of the control that is rendered
	 * @param {string} sWrapArea Defines the wrapping text area
	 * @protected
	 */
	StandardListItemRenderer.renderWrapping = function(rm, oLI, sWrapArea) {
		var sId = oLI.getId(),
			iMaxCharacters = oLI._getWrapCharLimit(),
			sText, bTextExpanded;

		if (sWrapArea === "title") {
			sText = oLI.getTitle();
			bTextExpanded = oLI._bTitleTextExpanded;
		} else if (sWrapArea === "description") {
			sText = oLI.getDescription();
			bTextExpanded = oLI._bDescriptionTextExpanded;
		} else {
			sText = oLI.getInfo();
		}

		rm.openStart("span", sId + "-" + sWrapArea + "Text").attr("aria-live", "polite").openEnd();

		if (!bTextExpanded && sWrapArea !== "info") {
			var sCollapsedText = oLI._getCollapsedText(sText);
			rm.text(sCollapsedText);
		} else if (sWrapArea == "title") {
			this.renderTitle(rm, oLI);
		} else {
			rm.text(sText);
		}

		rm.close("span");

		if (sText.length > iMaxCharacters && sWrapArea !== "info") {
			this.renderExpandCollapse(rm, oLI, sWrapArea);
		}
	};

	return StandardListItemRenderer;

}, /* bExport= */ true);
