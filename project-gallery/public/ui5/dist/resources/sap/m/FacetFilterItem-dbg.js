/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.FacetFilterItem.
sap.ui.define(['./ListItemBase', './library', './FacetFilterItemRenderer'],
	function(ListItemBase, library, FacetFilterItemRenderer) {
	"use strict";



	/**
	 * Constructor for a new <code>FacetFilterItem</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Represents a value for the {@link sap.m.FacetFilterList} control.
	 * @extends sap.m.ListItemBase
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @alias sap.m.FacetFilterItem
	 * @see {@link topic:395392f30f2a4c4d80d110d5f923da77 Facet Filter Item}
	 */
	var FacetFilterItem = ListItemBase.extend("sap.m.FacetFilterItem", /** @lends sap.m.FacetFilterItem.prototype */ {
		metadata : {

			library : "sap.m",
			properties : {

				/**
				 * Can be used as input for subsequent actions.
				 */
				key : {type : "string", group : "Data", defaultValue : null},

				/**
				 * Determines the text to be displayed for the item.
				 */
				text : {type : "string", group : "Misc", defaultValue : null},

				/**
				 * Defines the number of objects that match this item in the target data set.
				 * @deprecated as of version 1.18.11, replaced by <code>setCounter</code> method
				 */
				count : {type : "int", group : "Misc", defaultValue : null, deprecated: true}
			}
		},

		renderer: FacetFilterItemRenderer
	});

	/**
	 * Sets count for the FacetFilterList.
	 * @deprecated as of version 1.18, replaced by <code>setCounter/code>
	 * @param {int} iCount The counter to be set to
	 * @returns {this} this for chaining
	 */
	FacetFilterItem.prototype.setCount = function(iCount) {

		 // App dev can still call setCounter on ListItemBase, so we have redundancy here.
		this.setProperty("count", iCount);
		this.setProperty("counter", iCount);
		return this;
	};

	/**
	 * Sets counter for the FacetFilter list.
	 * @param {int} iCount The counter to be set to
	 * @returns {this} this for chaining
	 */
	FacetFilterItem.prototype.setCounter = function(iCount) {

		/**
		 * @deprecated As of version 1.18
		 */
		this.setProperty("count", iCount);
		this.setProperty("counter", iCount);
		return this;
	};

	/**
	 * @private
	 */
	FacetFilterItem.prototype.init = function() {
		this.attachEvent("_change", this._itemTextChange);

		ListItemBase.prototype.init.apply(this);

		// This class must be added to the ListItemBase container element, not the FacetFilterItem container
		this.addStyleClass("sapMFFLI");
	};

	/**
	 * @private
	 */
	FacetFilterItem.prototype.exit = function() {
		ListItemBase.prototype.exit.apply(this);

		this.detachEvent("_change", this._itemTextChange);
	};

	/**
	 * @protected
	 * @override
	 */
	FacetFilterItem.prototype.getContentAnnouncement = function(oBundle) {
		return this.getText() ? this.getText().concat(" . ") : "";
	};

	/**
	 * @private
	 */
	FacetFilterItem.prototype._itemTextChange = function (oEvent) {
		if (oEvent.getParameter("name") === "text") {
			this.informList("TextChange", oEvent.getParameter("newValue"));
		}
	};

	return FacetFilterItem;

});
