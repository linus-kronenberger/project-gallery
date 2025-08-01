/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/ui/core/Lib",
	'sap/ui/core/library',
	'sap/m/library'
],
function(Library, coreLibrary, library) {
	"use strict";


	// shortcut for sap.m.BackgroundHelper
	var BackgroundHelper = library.BackgroundHelper;

	// shortcut for sap.ui.core.TitleLevel
	var TitleLevel = coreLibrary.TitleLevel;


	/**
	 * Shell renderer.
	 * @namespace
	 */
	var ShellRenderer = {
		apiVersion: 2
	};


	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} rm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.m.Shell} oControl An object representation of the control that should be rendered
	 */
	ShellRenderer.render = function(rm, oControl) {
		var sTitleLevel = (oControl.getTitleLevel() === TitleLevel.Auto) ? TitleLevel.H1 : oControl.getTitleLevel();
		sTitleLevel = sTitleLevel.toLowerCase();

		rm.openStart("div", oControl);
		rm.class("sapMShell");

		if (oControl.getAppWidthLimited()) {
			rm.class("sapMShellAppWidthLimited");
		}

		BackgroundHelper.addBackgroundColorStyles(rm, oControl.getBackgroundColor(),  oControl.getBackgroundImage(), "sapMShellGlobalOuterBackground");

		var sTooltip = oControl.getTooltip_AsString();
		if (sTooltip) {
			rm.attr("title", sTooltip);
		}

		rm.openEnd();

		/* The background in "SAP_Belize_Deep" must be dark. The contrast class is set to the element wihout any children to avoid unnecessary propagation. */
		BackgroundHelper.renderBackgroundImageTag(rm, oControl, ["sapContrastPlus", "sapMShellBG", "sapUiGlobalBackgroundImageForce"],  oControl.getBackgroundImage(), oControl.getBackgroundRepeat(), oControl.getBackgroundOpacity());

		rm.openStart("div");
		rm.class("sapMShellBrandingBar");
		rm.openEnd();
		rm.close("div");

		rm.openStart("div");
		rm.class("sapMShellCentralBox");
		rm.openEnd();


		// header
		var extraHeaderClass = "", extraBGClass = "";
		if (!oControl.getBackgroundImage()) {
			extraHeaderClass = "sapMShellBackgroundColorOnlyIfDefault";
			extraBGClass = "sapUiGlobalBackgroundImageOnlyIfDefault";
		}
		rm.openStart("header", oControl.getId() + "-hdr");
		rm.class("sapMShellHeader");
		rm.class(extraHeaderClass);
		rm.openEnd();
		rm.openStart("div");
		rm.class(extraBGClass);
		rm.openEnd();
		rm.close("div");
		// logo
		ShellRenderer.renderLogoImage(rm, oControl);

		// header title
		if (oControl.getTitle()) {
			rm.openStart(sTitleLevel, oControl.getId() + "-hdrTxt");
			rm.class("sapMShellHeaderText");
			rm.openEnd();
			rm.text(oControl.getTitle());
			rm.close(sTitleLevel);
		}

		// header right area
		rm.openStart("span");
		rm.class("sapMShellHeaderRight");
		rm.openEnd();

		// headerRightText
		rm.openStart("span", oControl.getId() + "-hdrRightTxt");
		if (!oControl.getHeaderRightText()) {
			rm.style("display", "none");
		}
		rm.class("sapMShellHeaderRightText");
		rm.openEnd();
		rm.text(oControl.getHeaderRightText());
		rm.close("span");

		// logout button
		if (oControl.getShowLogout()) {
			var rb = Library.getResourceBundleFor("sap.m");
			rm.openStart("a", oControl.getId() + "-logout");
			rm.attr("tabindex", "0");
			rm.attr("role", "button");
			rm.class("sapMShellHeaderLogout");
			rm.openEnd();
			rm.text(rb.getText("SHELL_LOGOUT"));
			rm.close("a");
		}

		rm.close("span");
		rm.close("header");

		// content
		rm.openStart("div", oControl.getId() + "-content");
		rm.attr("data-sap-ui-root-content", "true");
		rm.class("sapMShellContent");
		rm.class("sapMShellGlobalInnerBackground");
		rm.openEnd();
		rm.renderControl(oControl.getApp());
		rm.close("div");
		rm.close("div");
		rm.close("div");
	};

	ShellRenderer.renderLogoImage = function(rm, oControl) {
		if (oControl._getImageSrc()) {
			rm.openStart("div");
			rm.class("sapMShellLogo");
			rm.openEnd();

			rm.renderControl(oControl._getImage());

			rm.close("div");
		}
	};

	return ShellRenderer;

}, /* bExport= */ true);