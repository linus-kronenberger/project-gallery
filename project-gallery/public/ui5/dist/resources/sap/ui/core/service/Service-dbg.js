/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.service.Service
sap.ui.define(['sap/ui/base/Object', "sap/base/assert", "sap/base/Log"],
	function(BaseObject, assert, Log) {
	"use strict";


	/**
	 * Creates a service for the given context.
	 *
	 * @param {sap.ui.core.service.Service.Context} oServiceContext Context for which the service is created
	 *
	 * @class
	 * A service provides a specific functionality. A service instance can be obtained
	 * by a {@link sap.ui.core.service.ServiceFactory ServiceFactory} or at a Component
	 * via {@link sap.ui.core.Component#getService getService} function.
	 *
	 * This class is the abstract base class for services and needs to be extended:
	 * <pre>
	 * sap.ui.define("my/Service", [
	 *   "sap/ui/core/service/Service"
	 * ], function(Service) {
	 *
	 *   return Service.extend("my.Service", {
	 *
	 *     init: function() {
	 *       // handle init lifecycle
	 *     },
	 *
	 *     exit: function() {
	 *       // handle exit lifecycle
	 *     },
	 *
	 *     doSomething: function() {
	 *       // some functionality
	 *     }
	 *
	 *  });
	 *
	 * });
	 * </pre>
	 *
	 * A service instance will have a service context:
	 * <pre>
	 * {
	 *   "scopeObject": oComponent, // the Component instance
	 *   "scopeType": "component"   // the stereotype of the scopeObject
	 * }
	 * </pre>
	 *
	 * The service context can be retrieved with the function <code>getContext</code>.
	 * This function is private to the service instance and will not be exposed via
	 * the service interface.
	 *
	 * For consumers of the service it is recommended to provide the service instance
	 * only - as e.g. the {@link sap.ui.core.Component#getService getService} function
	 * of the Component does. The service interface can be accessed via the
	 * <code>getInterface</code> function.
	 *
	 * Other private functions of the service instance are the lifecycle functions.
	 * Currently there are two lifecycle functions: <code>init</code> and <code>exit</code>.
	 * In addition the <code>destroy</code> function will also by hidden to avoid
	 * the control of the service lifecycle for service interface consumers.
	 *
	 * @extends sap.ui.base.Object
	 * @author SAP SE
	 * @version 1.138.0
	 * @alias sap.ui.core.service.Service
	 * @abstract
	 * @private
	 * @ui5-restricted sap.ushell
	 * @since 1.37.0
	 */
	var Service = BaseObject.extend("sap.ui.core.service.Service", /** @lends sap.ui.service.Service.prototype */ {

		metadata: {
			"abstract" : true,
			"library" : "sap.ui.core" // UI Library that contains this class
		},

		constructor : function(oServiceContext) {

			BaseObject.apply(this);

			// Service context can either be undefined or null
			// or an object with the properties scopeObject and scopeType
			if (oServiceContext) {
				assert(typeof oServiceContext.scopeObject === "object", "The service context requires a scope object!");
				assert(typeof oServiceContext.scopeType === "string", "The service context requires a scope type!");
			}

			this._oServiceContext = oServiceContext;

			// call the init lifecycle function
			if (typeof this.init === "function") {
				this.init();
			}

		}

	});

	/**
	 * @typedef {object} sap.ui.core.service.Service.Context
	 * @property {sap.ui.core.Component} scopeObject Object that is in scope (e.g. component instance)
	 * @property {"component"} scopeType Type of object that is in scope
	 * @property {object} [oServiceContext.settings={}] The settings object for the service
	 * @public
	 */

	/**
	 * Returns the public interface of the service. By default, this filters the
	 * internal functions like <code>getInterface</code>, <code>getContext</code>
	 * and all other functions starting with "_". Additionally the lifecycle
	 * functions <code>init</code>, <code>exit</code> and <code>destroy</code>
	 * will be filtered for the service interface. This function can be
	 * overridden in order to self-create a service interface.
	 *
	 * This function is not available on the service interface.
	 *
	 * @returns {sap.ui.core.service.Service} the public interface of the service
	 * @protected
	 */
	Service.prototype.getInterface = function() {
		// create a proxy object (interface)
		var oProxy = Object.create(null);
		for (var sMember in this) {
			// filter out internal functions:
			//  - metadata, constructor, getInterface, getContext
			//  - functions starting with "_"
			// or lifecycle functions:
			//  - destroy, init, exit
			if (!sMember.match(/^_|^metadata$|^constructor$|^getInterface$|^destroy$|^init$|^exit$|^getContext$/) &&
				typeof this[sMember] === "function") {
				oProxy[sMember] = this[sMember].bind(this);
			}
		}
		// override the getInterface function to avoid the
		// creation of yet another proxy/interface object again
		this.getInterface = function() {
			return oProxy;
		};
		return oProxy;
	};


	/**
	 * Returns the context of the service:
	 * <pre>
	 * {
	 *   "scopeObject": oComponent, // the Component instance
	 *   "scopeType": "component",   // the stereotype of the scopeObject
	 *   "settings": {} // the provided service settings
	 * }
	 * </pre>
	 *
	 * This function is not available on the service interface.
	 *
	 * @return {sap.ui.core.service.Service.Context} the context of the service
	 * @protected
	 */
	Service.prototype.getContext = function() {
		return this._oServiceContext;
	};


	/**
	 * Lifecycle method to destroy the service instance.
	 *
	 * This function is not available on the service interface.
	 *
	 * @protected
	 */
	Service.prototype.destroy = function() {

		// call the exit lifecycle function
		if (typeof this.exit === "function") {
			this.exit();
		}

		BaseObject.prototype.destroy.apply(this, arguments);
		delete this._oServiceContext;

	};


	/**
	 * Initializes the service instance after creation.
	 *
	 * Applications must not call this hook method directly, it is called by the
	 * framework while the constructor of a service is executed.
	 *
	 * Subclasses of service should override this hook to implement any necessary
	 * initialization.
	 *
	 * @function
	 * @name sap.ui.core.service.Service.prototype.init
	 * @protected
	 */
	//Service.prototype.init = function() {};


	/**
	 * Cleans up the service instance before destruction.
	 *
	 * Applications must not call this hook method directly, it is called by the
	 * framework when the service is {@link #destroy destroyed}.
	 *
	 * Subclasses of service should override this hook to implement any necessary
	 * clean-up.
	 *
	 * @function
	 * @name sap.ui.core.service.Service.prototype.exit
	 * @protected
	 */
	//Service.prototype.exit = function() {};


	return Service;


});