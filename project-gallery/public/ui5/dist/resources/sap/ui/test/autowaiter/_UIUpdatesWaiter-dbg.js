/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"./WaiterBase",
	"../OpaPlugin"
], function (WaiterBase, OpaPlugin) {
	"use strict";

	var UIUpdatesWaiter = WaiterBase.extend("sap.ui.test.autowaiter._UIUpdatesWaiter", {
		// ensure that timeouts set by control inner updates are not hooked into by _timeoutWaiter
		// if an update is continuously made by the UI, at some point it will be ignored by this validation
		hasPending: function () {
			var bUIDirty = OpaPlugin.isUIDirty();
			if (bUIDirty) {
				this._oHasPendingLogger.debug("The UI needs rerendering");
			}
			return bUIDirty;
		}
	});

	return new UIUpdatesWaiter();
});
