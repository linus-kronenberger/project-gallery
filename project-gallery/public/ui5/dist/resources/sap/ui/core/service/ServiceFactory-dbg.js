/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.service.ServiceFactory
sap.ui.define(['sap/ui/base/Object', 'sap/ui/core/service/Service', "sap/base/assert", "sap/base/Log"],
	function(BaseObject, Service, assert, Log) {
	"use strict";

	/**
	 * Creates an anonymous service for the provided structured object with
	 * service information. It allows to define an anonymous service without
	 * extending it as follows:
	 *
	 * <pre>
	 *   var oAnonymousService = create({
	 *
	 *     init: function() { ... },
	 *     exit: function() { ... },
	 *
	 *     doSomething: function() { ... }
	 *
	 *  });
	 * </pre>
	 *
	 * The anonymous service is defined as object literal and must not implement
	 * members called <code>metadata</code>, <code>constructor</code>,
	 * <code>getContext</code> or <code>destroy</code>. Those members will be
	 * ignored and not applied to the service instance. A warning will be
	 * reported in the log.
	 *
	 * @param {object} oServiceInfo Structured object with information about the service
	 * @return {function} function to create a new anonymous service instance
	 * @private
	 */
	const create = function(oServiceInfo) {
		var AnonymousService = function AnonymousService(oServiceContext) {
			for (var sMember in oServiceInfo) {
				if (!sMember.match(/^(metadata|constructor|getContext|destroy)$/)) {
					this[sMember] = oServiceInfo[sMember];
				} else {
					Log.warning("The member " + sMember + " is not allowed for anonymous service declaration and will be ignored!");
				}
			}
			Service.apply(this, arguments);
		};
		AnonymousService.prototype = Object.create(Service.prototype);
		return AnonymousService;
	};

	/**
	 * Creates a service factory.
	 * @param {function|object} [vService] A constructor function of a service or
	 *          a structured object with information about the service which
	 *          creates an anonymous service.
	 *
	 * @class
	 * A service factory is used to create service instances for a specific context.
	 * The service factory needs to be registered in a central
	 * {@link sap.ui.core.service.ServiceFactoryRegistry service factory registry}.
	 * Consumers of services require the service factory to create service instances.
	 *
	 * The service factory base class can be used in a generic way to act as a
	 * factory for any service:
	 * <pre>
	 * sap.ui.require([
	 *   "sap/ui/core/service/ServiceFactoryRegistry",
	 *   "sap/ui/core/service/ServiceFactory",
	 *   "my/Service"
	 * ], function(ServiceFactoryRegistry, ServiceFactory, MyService) {
	 *
	 *   ServiceFactoryRegistry.register(new ServiceFactory(MService));
	 *
	 * });
	 * </pre>
	 *
	 * Additionally a concrete service factory can be implemented by extending the
	 * service factory base class if additional functionality is needed when
	 * creating new instances for a specific context:
	 * <pre>
	 * sap.ui.define("my/ServiceFactory", [
	 *   "sap/ui/core/service/ServiceFactoryRegistry",
	 *   "sap/ui/core/service/ServiceFactory",
	 *   "my/Service"
	 * ], function(ServiceFactoryRegistry, ServiceFactory, MyService) {
	 *
	 *   return ServiceFactory.extend("my.ServiceFactory", {
	 *     createInstance: function(oServiceContext) {
	 *       return Promise.resolve(new MyService(oServiceContext));
	 *     }
	 *   });
	 *
	 * });
	 * </pre>
	 *
	 * Another option for the usage of the service factory is to provide a
	 * structured object with information about the service which will
	 * create an anonymous service internally:
	 * <pre>
	 * sap.ui.define("my/ServiceFactory", [
	 *   "sap/ui/core/service/ServiceFactoryRegistry",
	 *   "sap/ui/core/service/ServiceFactory",
	 *   "my/Service"
	 * ], function(ServiceFactoryRegistry, ServiceFactory, MyService) {
	 *
	 *   return new ServiceFactory({
	 *
	 *     init: function() { ... },
	 *     exit: function() { ... },
	 *
	 *     doSomething: function() { ... }
	 *
	 *   });
	 *
	 * });
	 * </pre>
	 *
	 * As <code>createInstance</code> returns a <code>Promise</code> e.g. the
	 * service module can also be loaded asynchronously and resolve once the
	 * module has been loaded and instantiated.
	 *
	 * @extends sap.ui.base.Object
	 * @author SAP SE
	 * @version 1.138.0
	 * @alias sap.ui.core.service.ServiceFactory
	 * @private
	 * @ui5-restricted sap.ushell
	 * @since 1.37.0
	 */
	var ServiceFactory = BaseObject.extend("sap.ui.core.service.ServiceFactory", /** @lends sap.ui.service.ServiceFactory.prototype */ {

		metadata: {
			"library" : "sap.ui.core" // UI Library that contains this class
		},

		constructor : function(vService) {

			BaseObject.apply(this);

			var fnService = typeof vService === "object" ? create(vService) : vService;

			assert(!fnService || fnService && typeof fnService === "function", "The service constructor either should be undefined or a constructor function!");

			this._fnService = fnService;

		}

	});


	/**
	 * Lifecycle method to destroy the service factory instance.
	 *
	 * @protected
	 */
	ServiceFactory.prototype.destroy = function() {
		BaseObject.prototype.destroy.apply(this, arguments);
		delete this._fnService;
	};


	/**
	 * Creates a new instance of a service. When used as a generic service factory
	 * by providing a service constructor function it will create a new service
	 * instance otherwise the function will fail. For custom service factories
	 * this function has to be overridden and should return a <code>Promise</code>.
	 *
	 * @param {object} oServiceContext Context for which the service is created
	 * @param {object} oServiceContext.scopeObject Object that is in scope (e.g. component instance)
	 * @param {string} oServiceContext.scopeType Type of object that is in scope (e.g. component, ...)
	 * @param {string} oServiceContext.settings The service settings
	 * @return {Promise<sap.ui.core.service.Service>} Promise which resolves with the new Service instance.
	 * @protected
	 */
	ServiceFactory.prototype.createInstance = function(oServiceContext) {
		if (typeof this._fnService === "function") {
			return Promise.resolve(new this._fnService(oServiceContext));
		} else {
			return Promise.reject(new Error("Usage of sap.ui.core.service.ServiceFactory requires a service constructor function to create a new service instance or to override the createInstance function!"));
		}
	};


	return ServiceFactory;


});