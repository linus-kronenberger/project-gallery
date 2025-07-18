/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.ResponsiveSplitterPage
sap.ui.define([
	"./library",
	"sap/ui/core/Control",
	"sap/ui/core/Element"
], function (library, Control, Element) {
	"use strict";

	/**
	 * Constructor for a new ResponsiveSplitterPage.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Helper control used in the ResponsiveSplitter
	 * This serves as placeholder for the content of the Panes inside the ResponsiveSplitter
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @private
	 * @since 1.38
	 * @alias sap.ui.layout.ResponsiveSplitterPage
	 */
	var ResponsiveSplitterPage = Control.extend("sap.ui.layout.ResponsiveSplitterPage", /** @lends sap.ui.layout.ResponsiveSplitterPage.prototype */{
		metadata: {
			library: "sap.ui.layout",
			associations: {
				/**
				 * The content of the SplitterPage
				 */
				content: {type : "sap.ui.core.Control", multiple : false, singularName : "content"}
			}
		},
		renderer: {
			apiVersion: 2,
			render: function(oRm, oControl) {
				oRm.openStart("div", oControl)
					.class("sapUiResponsiveSplitterPage")
					.openEnd();

				var oContent = Element.getElementById(oControl.getAssociation("content"));

				if (oContent) {
					oRm.renderControl(oContent);
				}

				oRm.close("div");
			}
		}
	});

	ResponsiveSplitterPage.prototype.containsControl = function (sControlId) {

		var oContent = Element.getElementById(this.getAssociation("content"));

		if (!oContent) {
			return false;
		}

		if (oContent.isA("sap.ui.layout.AssociativeSplitter")) {
			return oContent.containsControl(sControlId);
		}

		return oContent.getId() === sControlId;
	};

	return ResponsiveSplitterPage;
});