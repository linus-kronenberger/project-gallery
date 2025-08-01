/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.P13nAnyFilterItem.
sap.ui.define([
	'./library', 'sap/m/P13nFilterItem'
], function(library, P13nFilterItem) {
	"use strict";

	/**
	 * Constructor for a new P13nAnyFilterItem. The class extends sap.m.P13nFilterItem and changes the value1 and value2 properties type to any.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class Type for <code>filterItems</code> aggregation in P13nFilterPanel control.
	 * @extends sap.m.P13nFilterItem
	 * @version 1.138.0
	 * @constructor
	 * @private
	 * @since 1.56.0
	 * @alias sap.m.P13nAnyFilterItem
	 * @deprecated As of version 1.124, replaced by the artifacts in {@link sap.m.p13n}.
	 */
	var P13nAnyFilterItem = P13nFilterItem.extend("sap.m.P13nAnyFilterItem", /** @lends sap.m.P13nAnyFilterItem.prototype */
	{
		metadata: {

			library: "sap.m",
			properties: {
				/**
				 * value of the filter. Type of value1 is any.
				 */
				value1: {
					type: "any",
					group: "Misc",
					defaultValue: null
				},

				/**
				 * to value of the between filter. Type of value2 is any.
				 */
				value2: {
					type: "any",
					group: "Misc",
					defaultValue: null
				}
			}
		}
	});

	return P13nAnyFilterItem;

});
