/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.VBox.
sap.ui.define(['./FlexBox', './library', "./VBoxRenderer"],
	function(FlexBox, library, VBoxRenderer) {
	"use strict";

	// shortcut for sap.m.FlexDirection
	var FlexDirection = library.FlexDirection;

	/**
	 * Constructor for a new VBox.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * The VBox control builds the container for a vertical flexible box layout. VBox is a convenience control, as it is just a specialized FlexBox control.<br>
	 * <br>
	 * <b>Note:</b> Be sure to check the <code>renderType</code> setting to avoid issues due to browser inconsistencies.
	 *
	 * @extends sap.m.FlexBox
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @alias sap.m.VBox
	 * @see https://www.w3.org/TR/css-flexbox-1/
	 * @see https://www.w3.org/TR/css-flexbox-1/#propdef-justify-content
	 * @see https://www.w3.org/TR/css-flexbox-1/#propdef-flex-direction
	 * @see https://www.w3schools.com/css/css3_flexbox.asp#flex-direction
	 */
	var VBox = FlexBox.extend("sap.m.VBox", /** @lends sap.m.VBox.prototype */ {
		metadata : {

			library : "sap.m",
			properties: {
				/**
				 * Determines the direction of the layout of child elements.
				 *
				 * @see http://www.w3.org/TR/css-flexbox-1/#flex-direction-property
				 * @override
				 */
				direction : {type : "sap.m.FlexDirection", group : "Appearance", defaultValue : FlexDirection.Column}
			},
			designtime: "sap/m/designtime/VBox.designtime"
		},

		renderer: VBoxRenderer
	});

	VBox.prototype.init = function () {
		this.setDirection(FlexDirection.Column);

		FlexBox.prototype.init.apply(this, arguments);
	};

	return VBox;
});
