/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides element sap.m.DynamicDateValueHelpUIType.
sap.ui.define(['sap/ui/core/Element'],
	function(Element) {
		"use strict";

		/**
		 * Constructor for a new DynamicDateValueHelpUIType.
		 *
		 * @param {string} [sId] id for the new control, generated automatically if no id is given
		 * @param {object} [mSettings] initial settings for the new control
		 *
		 * @class
		 * A class that describes the predefined value help UI type of DynamicDateRange options.
		 * @extends sap.ui.core.Element
		 *
		 * @author SAP SE
		 * @version 1.138.0
		 *
		 * @public
		 * @since 1.92
		 * @alias sap.m.DynamicDateValueHelpUIType
		 */
		var DynamicDateValueHelpUIType = Element.extend("sap.m.DynamicDateValueHelpUIType", /** @lends sap.m.DynamicDateValueHelpUIType.prototype */ {
			metadata: {
				library: "sap.m",
				properties: {
					/**
					 * One of the predefined types - "date", "daterange", "month", "int".
					 * They determine controls - calendar or input.
					 */
					type: { type: "string" },

					/**
					 * A text for an additional label that describes the interactive UI and is placed before the UI element.
					 */
					text: { type: "string" },

					/**
					 * A text for an additional label that describes the interactive UI and is placed after the UI element.
					 */
					additionalText: { type: "string" },

					/**
					 * Options are displayed into a select element.
 					 */
					options: { type: "string[]", defaultValue: null },

					/**
					 * Describes if the current period is included.
 					 */
					included: { type: "string", defaultValue: null }
				}
			}
		});

		return DynamicDateValueHelpUIType;
	});