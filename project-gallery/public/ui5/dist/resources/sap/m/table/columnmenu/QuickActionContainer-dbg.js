/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/m/table/columnmenu/QuickActionBase"
], function(
	QuickActionBase
) {
	"use strict";

	var QuickActionContainer = QuickActionBase.extend("sap.m.table.columnmenu.QuickActionContainer", {
		metadata: {
			library: "sap.m",
			aggregations: {
				quickActions: {type: "sap.m.table.columnmenu.QuickActionBase"}
			}
		}
	});

	QuickActionContainer.prototype.getEffectiveQuickActions = function() {
		return !this.getVisible() ? [] : this.getQuickActions().reduce(function(aQuickActions, oQuickAction) {
			return aQuickActions.concat(oQuickAction.getEffectiveQuickActions());
		}, []);
	};

	return QuickActionContainer;
});
