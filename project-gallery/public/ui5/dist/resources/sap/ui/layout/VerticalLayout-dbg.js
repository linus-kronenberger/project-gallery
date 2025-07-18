/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.VerticalLayout.
sap.ui.define([
 'sap/ui/core/Control',
 'sap/ui/core/EnabledPropagator',
 './library',
 "./VerticalLayoutRenderer"
],
	function(Control, EnabledPropagator, library, VerticalLayoutRenderer) {
	"use strict";

	/**
	 * Constructor for a new VerticalLayout.
	 *
	 * @param {string} [sId] Id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * In this layout the content controls are rendered one below the other.
	 *
	 * <b>Note:</b> <code>VerticalLayout</code> is not a focusable element and therefore the inheritance of the <code>tooltip</code> property isn't supported.
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.16.0
	 * @alias sap.ui.layout.VerticalLayout
	 */
	var VerticalLayout = Control.extend("sap.ui.layout.VerticalLayout", /** @lends sap.ui.layout.VerticalLayout.prototype */ {
		metadata : {

			library : "sap.ui.layout",
			properties : {

				/**
				 * Width of the <code>VerticalLayout</code>. If no width is set, the width of the content is used.
				 * If the content of the layout has a larger width than the layout, it is cut off.
				 * There is no scrolling inside the layout.
				 */
				width : {type : "sap.ui.core.CSSSize", group : "Dimension", defaultValue : null},

				/**
				 *
				 * If not enabled, all controls inside are not enabled automatically.
				 */
				enabled : {type : "boolean", group : "Behavior", defaultValue : true}
			},
			defaultAggregation : "content",
			aggregations : {

				/**
				 * Content controls within the layout.
				 */
				content : {type : "sap.ui.core.Control", multiple : true, singularName : "content"}
			},
			dnd: { draggable: false, droppable: true },
			designtime: "sap/ui/layout/designtime/VerticalLayout.designtime"
		},

		renderer: VerticalLayoutRenderer
	});

	/**
	 * @see sap.ui.core.Control#getAccessibilityInfo
	 * @protected
	 * @returns {sap.ui.core.AccessibilityInfo} An object with the accessibilty infos for this control
	 */
	VerticalLayout.prototype.getAccessibilityInfo = function() {
		return {children: this.getContent()};
	};

	EnabledPropagator.call(VerticalLayout.prototype);

	return VerticalLayout;

});
