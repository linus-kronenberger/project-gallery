/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"./BadgeEnabler",
	"sap/ui/core/Control",
	"sap/ui/core/Lib"
], function (BadgeEnabler, Control, Library) {
	"use strict";

	/**
	 * Library internationalization resource bundle.
	 *
	 * @type {module:sap/base/i18n/ResourceBundle}
	 */
	var oResourceBundle = Library.getResourceBundleFor("sap.m");

	/**
	 * Constructor for a new IconTabFilterExpandButtonBadge.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Helper control which represents button with 'Attention' badge.
	 * Used in IconTabFilter.
	 *
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @private
	 * @alias sap.m.IconTabFilterExpandButtonBadge
	 */
	var IconTabFilterExpandButtonBadge = Control.extend("sap.m.IconTabFilterExpandButtonBadge", {
		metadata: {
			library: "sap.m",
			interfaces : [
				"sap.m.IBadge"
			]
		},
		renderer: {
			apiVersion: 2,
			render: function (oRm, oControl) {
				oRm.openStart("div", oControl)
					.class("sapMITFExpandButtonBadge")
					.openEnd()
					.close("div");
			}
		}
	});

	BadgeEnabler.call(IconTabFilterExpandButtonBadge.prototype);

	IconTabFilterExpandButtonBadge.prototype.init = function () {
		this.initBadgeEnablement({
			style: "Attention"
		});
	};

	IconTabFilterExpandButtonBadge.prototype.getAriaLabelBadgeText = function () {
		return oResourceBundle.getText("ICONTABFILTER_SUB_ITEMS_BADGES");
	};

	IconTabFilterExpandButtonBadge.prototype.onBadgeUpdate = function () {
		var oParentITF = this.getParent();
		oParentITF.onBadgeUpdate.apply(oParentITF, arguments);
	};

	return IconTabFilterExpandButtonBadge;
});