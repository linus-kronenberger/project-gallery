/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["./ListItemBaseRenderer", "sap/base/i18n/Localization", "sap/ui/core/Renderer"],
	function(ListItemBaseRenderer, Localization, Renderer) {
	"use strict";

	/**
	 * TreeItemBaseRenderer renderer.
	 * @namespace
	 */
	var TreeItemBaseRenderer = Renderer.extend(ListItemBaseRenderer);
	TreeItemBaseRenderer.apiVersion = 2;

	TreeItemBaseRenderer.renderLIAttributes = function(rm, oLI) {
		rm.class("sapMTreeItemBase");

		if (!oLI.isTopLevel()) {
			rm.class("sapMTreeItemBaseChildren");
		}
		if (oLI.isLeaf()) {
			rm.class("sapMTreeItemBaseLeaf");
		} else {
			rm.attr("aria-expanded", oLI.getExpanded());
		}

		var iIndentation = oLI._getPadding();
		if (Localization.getRTL()){
			rm.style("padding-right", iIndentation + "rem");
		} else {
			rm.style("padding-left", iIndentation + "rem");
		}

	};

	TreeItemBaseRenderer.renderContentFormer = function(rm, oLI) {
		this.renderHighlight(rm, oLI);
		this.renderExpander(rm, oLI);
		this.renderMode(rm, oLI, -1);
	};

	TreeItemBaseRenderer.renderExpander = function(rm, oLI) {
		var oExpander = oLI._getExpanderControl();
		if (oExpander) {
			rm.renderControl(oExpander);
		}
	};

	/**
	 * Returns the ARIA accessibility role.
	 *
	 * @param {sap.m.TreeItemBase} oLI An object representation of the control
	 * @returns {string}
	 * @protected
	 */
	TreeItemBaseRenderer.getAriaRole = function(oLI) {
		return "treeitem";
	};

	TreeItemBaseRenderer.getAccessibilityState = function(oLI) {
		var mAccessibilityState = ListItemBaseRenderer.getAccessibilityState.call(this, oLI);

		mAccessibilityState.level = oLI.getLevel() + 1;
		if (!oLI.isLeaf()) {
			mAccessibilityState.expanded = oLI.getExpanded();
		}

		return mAccessibilityState;
	};

	return TreeItemBaseRenderer;

}, /* bExport= */ true);
