/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides enumeration sap.ui.model.odata.v4.SubmitMode
sap.ui.define(function () {
	"use strict";

	// noinspection UnnecessaryLocalVariableJS
	/**
	 * Modes to control the use of batch requests for a group ID.
	 *
	 * @enum {string}
	 * @public
	 * @alias sap.ui.model.odata.v4.SubmitMode
	 */
	var SubmitMode = { // keep the var for JSDoc generation
		/**
		 * Requests associated with the group ID are sent in a batch request via
		 * {@link sap.ui.model.odata.v4.ODataModel#submitBatch}.
		 * @public
		 */
		API : "API",

		/**
		 * Requests associated with the group ID are sent in a batch request which is initiated
		 * automatically before rendering.
		 * @public
		 */
		Auto : "Auto",

		/**
		 * Requests associated with the group ID are sent directly without batch.
		 * @public
		 */
		Direct : "Direct"
	};

	return SubmitMode;
}, /* bExport= */ true);
