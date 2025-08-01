/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.SplitterLayoutData.
sap.ui.define(['sap/ui/core/LayoutData', './library'],
	function(LayoutData, library) {
	"use strict";



	/**
	 * Constructor for a new SplitterLayoutData.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * Holds layout data for the splitter contents.

	 * @extends sap.ui.core.LayoutData
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.22.0
	 * @alias sap.ui.layout.SplitterLayoutData
	 */
	var SplitterLayoutData = LayoutData.extend("sap.ui.layout.SplitterLayoutData", /** @lends sap.ui.layout.SplitterLayoutData.prototype */ { metadata : {

		library : "sap.ui.layout",
		properties : {

			/**
			 * Determines whether the control in the splitter can be resized or not.
			 */
			resizable : {type : "boolean", group : "Behavior", defaultValue : true},

			/**
			 * The size of the splitter content.
			 * This property is updated when the area is resized by the user.
			 * Allowed size values are numeric values ending in "px", "rem", "%" and "auto".
			 */
			size : {type : "sap.ui.core.CSSSize", group : "Dimension", defaultValue : 'auto'},

			/**
			 * Sets the minimum size of the splitter content in px.
			 */
			minSize : {type : "int", group : "Dimension", defaultValue : 0}
		}
	}});

	SplitterLayoutData.prototype.init = function () {
		LayoutData.prototype.init.apply(this, arguments);
		this._bIsModified = false;
	};

	SplitterLayoutData.prototype._markModified = function () {
		this._bIsModified = true;
	};

	SplitterLayoutData.prototype._isMarked = function () {
		return this._bIsModified;
	};

	SplitterLayoutData.prototype._getSizeUnit = function () {
		const sSize = this.getSize();

		if (sSize.includes("px")) {
			return "px";
		}

		if (sSize.includes("rem")) {
			return "rem";
		}

		if (sSize.includes("%")) {
			return "%";
		}

		return "auto";
	};

	return SplitterLayoutData;
});
