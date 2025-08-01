/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/p13n/PersistenceProvider",
	"sap/ui/core/Element"
], (BaseObject, PersistenceProvider, Element) => {
	"use strict";

	const ERROR_INSTANCING = "DefaultProviderRegistry: This class is a singleton and should not be used without an AdaptationProvider. Please use 'Engine.getInstance().defaultProviderRegistry' instead";

	//Singleton storage
	let oDefaultProviderRegistry;

	/**
	 * Constructor for a new DefaultProviderRegistry.
	 * This registry creates and manages default persistence providers for each persistence mode.
	 * It is intended for use cases where no dedicated provider can or should be created by an application.
	 * The DefaultProviderRegistry currently resides in the Engine and must never be called separately.
	 *
	 * @class
	 * @extends sap.ui.base.Object
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @private
	 * @since 1.104
	 * @alias sap.m.p13n.modules.DefaultProviderRegistry
	 */
	const DefaultProviderRegistry = BaseObject.extend("sap.m.p13n.modules.DefaultProviderRegistry", {
		constructor: function(oEngine) {

			if (oDefaultProviderRegistry) {
				throw Error(ERROR_INSTANCING);
			}

			BaseObject.call(this);
			this._mDefaultProviders = {};
			this._oEngine = oEngine;
		}
	});

	/**
	 * @override
	 * @inheritDoc
	 */
	DefaultProviderRegistry.prototype.destroy = function() {
		Object.keys(this._mDefaultProviders).forEach((sProviderName) => {
			this._mDefaultProviders[sProviderName].destroy();
			delete this._mDefaultProviders[sProviderName];
		});
		this._oEngine = null;
		oDefaultProviderRegistry = null;
		BaseObject.prototype.destroy.apply(this, arguments);
	};

	/**
	 * @private
	 * @ui5-restricted sap.m
	 *
	 * Attaches a control to a default persistence provider held inside the DefaultProviderRegistry for the given <code>PersistenceMode</code>
	 *
	 * @param {sap.ui.core.Control|string} vElement The control instance or a control id.
	 * @param {sap.m.enum.PersistenceMode} sPersistenceMode Desired persistence mode for the retrieved persistence provider
	 * @returns {sap.m.p13n.PersistenceProvider} Returns a persistence provider instance, if possible
	 */
	DefaultProviderRegistry.prototype.attach = function(vElement, sPersistenceMode) {
		if (this._oEngine.isRegisteredForModification(vElement)) { // Modification settings for a registered element are only determined once in the Engine
			throw new Error("DefaultProviderRegistry: You must not change the modificationSettings for an already registered element");
		}

		const oElement = typeof vElement === "string" ? Element.getElementById(vElement) : vElement,
			sElementId = typeof vElement === "string" ? vElement : vElement.getId();
		const oDefaultProvider = this._retrieveDefaultProvider(oElement, sPersistenceMode);

		if (oDefaultProvider.getFor().indexOf(sElementId) === -1) {
			oDefaultProvider.addFor(vElement);
		}

		return oDefaultProvider;
	};

	/**
	 * @private
	 * @ui5-restricted sap.m
	 *
	 * Detaches a control from any existing default persistence provider
	 *
	 * @param {sap.ui.core.Control|string} vControl The control instance or a control id.
	 */
	DefaultProviderRegistry.prototype.detach = function(vControl) {
		Object.keys(this._mDefaultProviders).forEach((sMode) => {
			const oDefaultProvider = this._mDefaultProviders[sMode];
			oDefaultProvider.removeFor(vControl);
		});
	};

	/**
	 * @private
	 * @ui5-restricted sap.ui.mdc
	 *
	 * Returns a promise resolving a default persistence provider for the given <code>Control</code> and <code>PersistenceMode</code>.
	 * @param {sap.ui.core.Element} oElement The element instance.
	 * @param {sap.ui.mdc.enum.PersistenceMode} sPersistenceMode Desired persistence mode for the retrieved persistence provider
	 * @returns {Promise} Returns a <code>Promise</code> returning a persistence provider instance, if possible
	 */
	DefaultProviderRegistry.prototype._retrieveDefaultProvider = function(oElement, sPersistenceMode) {

		if (!this._mDefaultProviders[sPersistenceMode]) {
			const oProvider = new PersistenceProvider("defaultProviderRegistry" + sPersistenceMode, {
				mode: sPersistenceMode
			});
			this._mDefaultProviders[sPersistenceMode] = oProvider;
		}

		return this._mDefaultProviders[sPersistenceMode];
	};

	/**
	 * This method is the central point of access to the DefaultProviderRegistry Singleton.
	 *
	 * @private
	 * @ui5-restricted sap.m
	 */
	DefaultProviderRegistry.getInstance = (Engine) => {
		if (!oDefaultProviderRegistry) {
			oDefaultProviderRegistry = new DefaultProviderRegistry(Engine);
		}
		return oDefaultProviderRegistry;
	};

	return DefaultProviderRegistry;
});