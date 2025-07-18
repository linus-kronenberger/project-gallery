/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/ui/base/Object"
], (BaseObject) => {
	"use strict";

	let oModificationHandler;

	/**
	 * @class This class offers modification capabilities without persistence.
	 * It should be used as the persistence layer in the {@link sap.m.p13n.Engine#register Engine#register} process.
	 *
	 * @author SAP SE
	 * @private
	 * @alias sap.m.p13n.modification.ModificationHandler
	 */
	const ModificationHandler = BaseObject.extend("sap.m.p13n.modification.ModificationHandler");

	/**
	 * Should implement the appliance of changes
	 *
	 * @param {array} aChanges An array of changes
	 * @param {object} oModificationPayload An object providing a modification handler specific payload
	 * @returns {Promise} Returns a <code>Promise</code> reflecting change processing
	 */
	ModificationHandler.prototype.processChanges = (aChanges, oModificationPayload) => {
		const aChangeAppliance = [];
		return Promise.all(aChangeAppliance);
	};

	/**
	 * Should implement a function that returns a promise resolving
	 * after the current pending changes have been applied.
	 *
	 * @private
	 * @param {object} mPropertyBag A propertybag containing modification specific configuration
	 * @param {sap.ui.core.Element} mPropertyBag.element The according element which should be checked
	 * @param {object} oModificationPayload An object providing a modification handler specific payload
	 * @returns {Promise} Returns a <code>Promise</code> reflecting change appliance

	 */
	ModificationHandler.prototype.waitForChanges = (mPropertyBag, oModificationPayload) => {
		return Promise.resolve();
	};

	/**
	 * Should implement a function that returns a promise resolving
	 * after the current pending changes have been reset.
	 *
	 * @private
	 * @param {object} mPropertyBag A propertybag containing modification specific configuration
	 * @param {sap.ui.core.Element} mPropertyBag.selector The according element which should be checked
	 * @param {object} oModificationPayload An object providing a modification handler specific payload
	 * @returns {Promise} Returns a <code>Promise</code> reflecting the reset execution
	 */
	ModificationHandler.prototype.reset = (mPropertyBag, oModificationPayload) => {
		return Promise.resolve();
	};

	/**
	 * One time operation after <code>Engine</code> registry initialization.
	 *
	 * @param {sap.ui.core.Control} oControl The registered control instance
	 * @returns {Promise} Returns a <code>Promise</code> to initialize necessary persistence dependencies
	 */
	ModificationHandler.prototype.initialize = (oControl) => {
		return Promise.resolve();
	};

	/**
	 * Should implement a function that returns information ont modification support
	 *
	 * @private
	 * @param {object} mPropertyBag A propertybag containing modification specific configuration
	 * @param {sap.ui.core.Element} mPropertyBag.selector The according element which should be checked
	 * @param {object} oModificationPayload An object providing a modification handler specific payload
	 * @returns {Promise<boolean>} reflects the modification support state
	 */
	ModificationHandler.prototype.isModificationSupported = (mPropertyBag, oModificationPayload) => {
		return Promise.resolve(true);
	};

	/**
	 * Called after the initial registration during the <code>Engine#register</code> process.
	 *
	 * @private
	 * @param {sap.ui.core.Control} oControl The initialized control instance
	 * @returns {Promise} Returns a <code>Promise</code> after initialization
	 */
	ModificationHandler.prototype.initialize = (oControl) => {
		return Promise.resolve();
	};

	ModificationHandler.getInstance = () => {
		if (!oModificationHandler) {
			oModificationHandler = new ModificationHandler();
		}
		return oModificationHandler;
	};

	return ModificationHandler;
});