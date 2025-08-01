/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.core.Item.
sap.ui.define(['./Element', './library'],
	function(Element, library) {
	"use strict";

	// shortcut for enum(s)
	var TextDirection = library.TextDirection;


	/**
	 * Constructor for a new Item.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * A control base type.
	 * @extends sap.ui.core.Element
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @public
	 * @alias sap.ui.core.Item
	 */
	var Item = Element.extend("sap.ui.core.Item", /** @lends sap.ui.core.Item.prototype */ { metadata : {

		library : "sap.ui.core",
		properties : {

			/**
			 * The text to be displayed for the item.
			 */
			text : {type : "string", group : "Data", defaultValue : ""},

			/**
			 * Enabled items can be selected.
			 */
			enabled : {type : "boolean", group : "Misc", defaultValue : true},

			/**
			 * Options are RTL and LTR. Alternatively, an item can inherit its text direction from its parent control.
			 */
			textDirection : {type : "sap.ui.core.TextDirection", group : "Misc", defaultValue : TextDirection.Inherit},

			/**
			 * Can be used as input for subsequent actions.
			 */
			key : {type : "string", group : "Data", defaultValue : null}
		}
	}});



	return Item;

});
