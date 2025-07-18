/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'./library', 'sap/ui/core/Item'
], function(library, Item) {
	"use strict";

	/**
	 * Constructor for a new P13nDimMeasureItem.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class Type for <code>columnsItems</code> aggregation in <code>P13nDimMeasurePanel</code> control.
	 * @extends sap.ui.core.Item
	 * @version 1.138.0
	 * @constructor
	 * @author SAP SE
	 * @public
	 * @since 1.34.0
	 * @alias sap.m.P13nDimMeasureItem
     * @deprecated As of 1.120, replaced by the artifacts in {@link sap.m.p13n}.
	 */
	var P13nDimMeasureItem = Item.extend("sap.m.P13nDimMeasureItem", /** @lends sap.m.P13nDimMeasureItem.prototype */
		{
			metadata: {

				library: "sap.m",
				properties: {

					/**
					 * Specifies the unique chart column key. In this context a column refers to dimensions or measures of a chart.
					 */
					columnKey: {
						type: "string"
					},

					/**
					 * Specifies the order of visible dimensions or measures of a chart.
					 */
					index: {
						type: "int",
						defaultValue: -1
					},

					/**
					 * Specifies the visibility of dimensions or measures.
					 */
					visible: {
						type: "boolean"
					},

					/**
					 * Specifies the role of dimensions or measures. The role determines how dimensions and measures influence the chart.
					 */
					role: {
						type: "string"
					}
				}
			}
		});

	return P13nDimMeasureItem;

});
