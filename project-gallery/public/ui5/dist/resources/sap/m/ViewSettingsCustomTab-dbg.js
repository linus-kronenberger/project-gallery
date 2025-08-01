/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.ViewSettingsCustomTab.
sap.ui.define(['./library', 'sap/ui/core/Item', 'sap/ui/core/IconPool'],
		function(library, Item) {
			"use strict";

			/**
			 * Constructor for a new ViewSettingsCustomTab.
			 *
			 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
			 * @param {object} [mSettings] Initial settings for the new control
			 *
			 * @class
			 * The ViewSettingsCustomTab control is used for adding custom tabs in the ViewSettingsDialog.
			 * @extends sap.ui.core.Item
			 *
			 * @author SAP SE
			 * @version 1.138.0
			 *
			 * @constructor
			 * @public
			 * @since 1.30
			 * @alias sap.m.ViewSettingsCustomTab
			 */
			var ViewSettingsCustomTab = Item.extend("sap.m.ViewSettingsCustomTab", /** @lends sap.m.ViewSettingsCustomTab.prototype */ { metadata : {

				library : "sap.m",
				properties : {
					/**
					 * Custom tab button icon
					 */
					icon    : {type : "sap.ui.core.URI", group : "Misc", defaultValue : "sap-icon://competitor" },
					/**
					 * Custom tab title
					 */
					title   : {type : "string", defaultValue : "" }
				},
				aggregations : {
					/**
					 * The content of this Custom tab
					 */
					content: {type: "sap.ui.core.Control", multiple: true, singularName: "content"}
				}
			}});



			ViewSettingsCustomTab.prototype.init = function() {
				this._aTabContents      = [];
			};

			/**
			 * Destroys the control
			 * @private
			 */
			ViewSettingsCustomTab.prototype.exit = function () {
				this._aTabContents.forEach(function (oContent, i) {
					oContent.destroy();
					delete this._aTabContents[i];
				}, this);
			};

			return ViewSettingsCustomTab;

		});
