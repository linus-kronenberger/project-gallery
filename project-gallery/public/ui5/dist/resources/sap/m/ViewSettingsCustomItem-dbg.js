/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.ViewSettingsCustomItem.
sap.ui.define(['./ViewSettingsItem', './library'],
	function(ViewSettingsItem, library) {
	"use strict";



	/**
	 * Constructor for a new ViewSettingsCustomItem.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * The ViewSettingsCustomItem control is used for modelling custom filters in the ViewSettingsDialog.
	 * @extends sap.m.ViewSettingsItem
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.16
	 * @alias sap.m.ViewSettingsCustomItem
	 */
	var ViewSettingsCustomItem = ViewSettingsItem.extend("sap.m.ViewSettingsCustomItem", /** @lends sap.m.ViewSettingsCustomItem.prototype */ { metadata : {

		library : "sap.m",
		properties : {

			/**
			 * The number of currently active filters for this custom filter item. It will be displayed in the filter list of the ViewSettingsDialog to represent the filter state of the custom control.
			 */
			filterCount : {type : "int", group : "Behavior", defaultValue : 0}
		},
		aggregations : {

			/**
			 * A custom control for the filter field. It can be used for complex filtering mechanisms.
			 */
			customControl : {type : "sap.ui.core.Control", multiple : false}
		}
	}});

	ViewSettingsCustomItem.prototype.init = function () {
		this.attachEvent("modelContextChange", function() {
			this._control && this._control.setModel(this.getModel());
		}.bind(this));
	};

	/**
	 * Destroys the control.
	 * @private
	 */
	ViewSettingsCustomItem.prototype.exit = function () {
		if (this._control && !this._control.getParent()) {
			// control is not aggregated, so we have to destroy it
			this._control.destroy();
			delete this._control;
		}
	};

	/**
	 * Internally the control is handled as a managed object instead of an aggregation
	 * as this control is sometimes aggregated in other controls like a popover or a dialog.
	 * @override
	 * @public
	 * @param {sap.ui.core.Control} oControl A control used for filtering purposes
	 * @returns {this} Reference to <code>this</code> for method chaining
	 */
	ViewSettingsCustomItem.prototype.setCustomControl = function (oControl) {
		this._control = oControl;
		return this;
	};

	/**
	 * Internally the control is handled as a managed object instead of an aggregation
	 * because this control is sometimes aggregated in other controls like a popover or a dialog.
	 * @override
	 * @public
	 * @returns {sap.ui.core.Control} oControl a control used for filtering purposes
	 */
	ViewSettingsCustomItem.prototype.getCustomControl = function () {
		return this._control;
	};

	/**
	 * Sets the filterCount without invalidating the control as it is never rendered directly.
	 * @override
	 * @param {int} iValue The new value for property filterCount
	 * @public
	 * @returns {this} Reference to <code>this</code> for method chaining
	 */
	ViewSettingsCustomItem.prototype.setFilterCount = function (iValue) {
		this.setProperty("filterCount", iValue, true);
		return this;
	};

	/**
	 * Sets the selected property without invalidating the control as it is never rendered directly.
	 * @override
	 * @param {boolean} bValue The new value for property selected
	 * @public
	 * @returns {this} Reference to <code>this</code> for method chaining
	 */
	ViewSettingsCustomItem.prototype.setSelected = function (bValue) {
		this.setProperty("selected", bValue, true);
		return this;
	};

	/**
	 * Creates a clone of the ViewSettingsCustomItem instance.
	 *
	 * @param {string} [sIdSuffix] a suffix to be appended to the cloned object id
	 * @param {string[]} [aLocalIds] an array of local IDs within the cloned hierarchy (internally used)
	 * @param {{cloneChildren: boolean, cloneBindings: boolean}} [oOptions] configuration object
	 * 		{@link https://openui5.hana.ondemand.com/api/sap.ui.base.ManagedObject#methods/clone}
	 * @returns {this} reference to the newly created clone
	 * @public
	 * @override
	 */
	ViewSettingsCustomItem.prototype.clone = function(sIdSuffix, aLocalIds, oOptions) {
		var oClonedObj = ViewSettingsItem.prototype.clone.apply(this, arguments);
		//clones the 'customControl' aggregation instance, as the framework does not know about it
		oClonedObj._control = this._control.clone();
		return oClonedObj;
	};

	return ViewSettingsCustomItem;

});
