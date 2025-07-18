/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/m/table/columnmenu/Entry",
	"sap/m/library"
], function(
	Entry,
	library
) {
	"use strict";

	/**
	 * Constructor for a new <code>QuickActionBase</code>.
	 *
	 * @param {string} [sId] ID for the new <code>QuickActionBase</code>, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new <code>QuickActionBase</code>
	 *
	 * @class
	 * The <code>QuickActionBase</code> class is used as a base class for quick actions for the <code>sap.m.table.columnmenu.Menu</code>.
	 * This faceless class can be used to specify control- and application-specific quick actions.
	 *
	 * @extends sap.m.table.columnmenu.Entry
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @public
	 * @since 1.110
	 *
	 * @alias sap.m.table.columnmenu.QuickActionBase
	 */
	var QuickActionBase = Entry.extend("sap.m.table.columnmenu.QuickActionBase", {

		metadata: {
			"abstract": true,
			library: "sap.m"
		}
	});

	/**
	 * Retrieves the effective quick actions.
	 *
	 * Subclasses can implement this method, if there are compositions of other quick actions.
	 * @returns {sap.m.table.columnmenu.QuickActionBase[]} The effective quick actions
	 *
	 * @virtual
	 * @public
	 */
	QuickActionBase.prototype.getEffectiveQuickActions = function() {
		return this.getVisible() ? [this] : [];
	};

	/**
	 * Gets the category of this quick action.
	 *
	 * @returns {sap.m.table.columnmenu.Category} The category
	 * @virtual
	 */
	QuickActionBase.prototype.getCategory = function() {
		if (this.getMetadata().hasProperty("category")) {
			return this.getProperty("category");
		}
		return library.table.columnmenu.Category.Generic;
	};

	/**
	 * Gets the content size.
	 *
	 * @returns {sap.m.table.columnmenu.QuickActionContentSize} The content size
	 * @virtual
	 */
	QuickActionBase.prototype.getContentSize = function() {
		if (this.getMetadata().hasProperty("contentSize")) {
			return this.getProperty("contentSize");
		}
		return library.table.columnmenu.QuickActionContentSize.L;
	};

	return QuickActionBase;
});