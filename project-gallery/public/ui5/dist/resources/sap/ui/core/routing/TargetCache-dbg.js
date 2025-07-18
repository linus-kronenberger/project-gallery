/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/base/Log",
	"sap/base/assert",
	"sap/ui/base/EventProvider",
	"sap/ui/core/Component",
	"sap/ui/core/mvc/_ViewFactory",
	"sap/ui/core/mvc/View",
	"sap/ui/core/routing/HashChanger",
	"sap/ui/core/routing/sync/TargetCache"
],
	function (
		Log,
		assert,
		EventProvider,
		Component,
		_ViewFactory,
		View,
		HashChanger,
		SyncCache
	) {
		"use strict";

		/**
		 * Instantiates a cache repository that creates and caches views and components which are loaded by {@link sap.u.core.routing.Targets}.
		 *
		 * If it is destroyed, all the views and components which it created are destroyed. If the views or components are still being loaded,
		 * they will be destroyed after they are loaded.
		 *
		 * This class is currently private and shouldn't be used out of the sap.ui.core.routing scope.
		 *
		 * @class
		 * @extends sap.ui.base.EventProvider
		 * @private
		 * @param {object} [oOptions]
		 * @param {sap.ui.core.UIComponent} [oOptions.component] the owner of all the views that will be created by this Instance.
		 * @param {boolean} [oOptions.async=true] Whether the views and components which are created through this class are loaded asynchronously.
		 * This option can be set only when TargetCache is used standalone without the involvement of a Router.
		 * Otherwise the async option is inherited from the Router.
		 * @alias sap.ui.core.routing.TargetCache
		 * @ui5-transform-hint replace-param oOptions.async true
		 */
		var TargetCache = EventProvider.extend("sap.ui.core.routing.TargetCache", /** @lends sap.ui.core.routing.TargetCache.prototype */ {

			constructor : function (oOptions) {
				if (!oOptions) {
					oOptions = {};
				}

				// make the default value for async to true
				if (oOptions.async === undefined) {
					oOptions.async = true;
				}

				this._oCache = {
					view: {},
					component: {}
				};

				this._oComponent = oOptions.component;
				if (this._oComponent) {
					assert(this._oComponent.isA("sap.ui.core.UIComponent"), this + ' - the component passed to the constructor needs to be an instance of UIComponent');
				}

				EventProvider.apply(this, arguments);

				this.async = oOptions.async;

				if (!oOptions.async) {
					for (const fn in SyncCache) {
						this[fn] = SyncCache[fn];
					}
				}
			},

			metadata : {
				publicMethods: ["get", "set"]
			},

			/**
			 * Returns a cached view or component, for a given name. If it does not exist yet, it will create the view or component with the provided options.
			 * If you provide a "id" in the "oOptions", it will be prefixed with the id of the component.
			 *
			 * @param {object} oOptions see {@link sap.ui.core.mvc.View.create} or {@link sap.ui.core.Component.create} for the documentation.
			 * @param {string} oOptions.name If you do not use setView please see {@link sap.ui.core.mvc.View.create} or {@link sap.ui.core.Component.create} for the documentation.
			 * This is used as a key in the cache of the view or component instance. If you want to retrieve a view or a component that has been given an alternative name in {@link #set},
			 * you need to provide the same name here and you can skip all the other options.
			 * @param {string} [oOptions.id] The id you pass into the options will be prefixed with the id of the component you pass into the constructor.
			 * So you can retrieve the view later by calling the {@link sap.ui.core.UIComponent#byId} function of the UIComponent.
			 * @param {string} sType whether the object is a "View" or "Component". Views and components are stored separately in the cache. This means that a view and a component instance
			 * could be stored under the same name.
			 * @return {Promise} A promise that is resolved when the view or component is loaded. The view or component instance will be passed to the resolve function.
			 * @private
			 */
			get : function (oOptions, sType) {
				var oObject;

				try {
					/**
					 * @deprecated
					 */
					if (sType === "Component" && !this.async) {
						Log.error("sap.ui.core.routing.Target doesn't support loading component in synchronous mode, please switch routing to async");
						throw new Error("sap.ui.core.routing.Target doesn't support loading component in synchronous mode, please switch routing to async");
					}

					if (!oOptions) {
						Log.error("the oOptions parameter of getObject is mandatory", this);
						throw new Error("the oOptions parameter of getObject is mandatory");
					}

					oObject = this._get(oOptions, sType);
				} catch (e) {
					return Promise.reject(e);
				}

				if (oObject instanceof Promise) {
					return oObject;
				} else if (oObject.isA("sap.ui.core.mvc.View")) {
					return oObject.loaded();
				} else {
					return Promise.resolve(oObject);
				}
			},

			/**
			 * Determines the object with the given <code>oOptions</code>, <code>sType</code> from the Target cache.
			 *
			 * @param {object} oOptions The options of the desired object
			 * @param {string} sType The type of the desired object, e.g. 'View', 'Component', etc.
			 * @return {sap.ui.core.Control|Promise} The object if it already exists in the cache, if not the promise is returned
			 */
			fetch: function(oOptions, sType) {
				return this._get(oOptions, sType, undefined, undefined, true);
			},

			/**
			 * Adds or overwrites a view or a component in the TargetCache. The given object is cached under its name and the 'undefined' key.
			 *
			 * If the third parameter is set to null or undefined, the previous cache view or component under the same name isn't managed by the TargetCache instance.
			 * The lifecycle (for example the destroy) of the view or component instance should be maintained by additional code.
			 *
			 *
			 * @param {string} sName Name of the view or component, may differ from the actual name of the oObject parameter provided, since you can retrieve this view or component per {@link #.getObject}.
			 * @param {string} sType whether the object is a "View" or "Component". Views and components are stored separately in the cache. This means that a view and a component instance
			 * could be stored under the same name.
			 * @param {sap.ui.core.mvc.View|sap.ui.core.UIComponent|null|undefined} oObject the view or component instance
			 * @return {this} this for chaining.
			 * @private
			 */
			set : function (sName, sType, oObject) {
				var oInstanceCache;

				this._checkName(sName, sType);
				assert(sType === "View" || sType === "Component", "sType must be either 'View' or 'Component'");

				oInstanceCache = this._oCache[sType.toLowerCase()][sName];

				if (!oInstanceCache) {
					oInstanceCache = this._oCache[sType.toLowerCase()][sName] = {};
				}

				oInstanceCache[undefined] = oObject;

				return this;
			},

			/**
			 * Destroys all the views and components created by this instance.
			 *
			 * @returns {this} this for chaining.
			 */
			destroy : function () {
				EventProvider.prototype.destroy.apply(this);

				if (this.bIsDestroyed) {
					return this;
				}

				function destroyObject(oObject) {
					if (oObject && oObject.destroy && !oObject._bIsBeingDestroyed) {
						oObject.destroy();
					}
				}

				Object.keys(this._oCache).forEach(function (sType) {
					var oTypeCache = this._oCache[sType];
					Object.keys(oTypeCache).forEach(function (sKey) {
						var oInstanceCache = oTypeCache[sKey];
						Object.keys(oInstanceCache).forEach(function(sId) {
							var vObject = oInstanceCache[sId];
							if (vObject instanceof Promise) { // if the promise isn't replaced by the real object yet
								// wait until the promise resolves to destroy the object
								vObject.then(destroyObject);
							} else {
								destroyObject(vObject);
							}
						});
					});
				}.bind(this));

				this._oCache = undefined;
				this.bIsDestroyed = true;

				return this;
			},

			/**
			 * If a view or component is created the event will be fired.
			 * It will not be fired, if a view or component was read from the cache.
			 *
			 * @name sap.ui.core.routing.TargetCache#created
			 * @event
			 * @param {sap.ui.base.Event} oEvent refer to {@link sap.ui.base.EventProvider} for details about getSource and getParameters
			 * @param {sap.ui.base.EventProvider} oEvent.getSource
			 * @param {object} oEvent.getParameters
			 * @param {sap.ui.core.mvc.View|sap.ui.core.UIComponent} oEvent.getParameters.object the instance of the created view.
			 * @param {string} oEvent.getParameters.type whether it's a "View" or "Component"
			 * @param {object} oEvent.getParameters.options The options passed to {@link sap.ui.core.mvc.View.create} or {@link sap.ui.core.Component.create}
			 * @public
			 */

			/**
			 * Attaches event handler <code>fnFunction</code> to the {@link #event:created created} event of this
			 * <code>sap.ui.core.routing.TargetCache</code>.
			 *
			 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code>
			 * if specified, otherwise it will be bound to this <code>sap.ui.core.routing.TargetCache</code> itself.
			 *
			 * @param {object}
			 *            [oData] An application-specific payload object that will be passed to the event handler
			 *            along with the event object when firing the event
			 * @param {function}
			 *            fnFunction The function to be called, when the event occurs
			 * @param {object}
			 *            [oListener] Context object to call the event handler with. Defaults to this
			 *            <code>sap.ui.core.routing.TargetCache</code> itself
			 *
			 * @returns {this} Reference to <code>this</code> in order to allow method chaining
			 * @public
			 */
			attachCreated : function(oData, fnFunction, oListener) {
				return this.attachEvent("created", oData, fnFunction, oListener);
			},

			/**
			 * Detaches event handler <code>fnFunction</code> from the {@link #event:created created} event of this
			 * <code>sap.ui.core.routing.TargetCache</code>.
			 *
			 * The passed function and listener object must match the ones used for event registration.
			 *
			 * @param {function} fnFunction The function to be called, when the event occurs
			 * @param {object} [oListener] Context object on which the given function had to be called
			 * @returns {this} Reference to <code>this</code> in order to allow method chaining
			 * @public
			 */
			detachCreated : function(fnFunction, oListener) {
				return this.detachEvent("created", fnFunction, oListener);
			},

			/**
			 * Fires event {@link #event:created created} to attached listeners.
			 *
			 * @param {object} [oParameters] Parameters to pass along with the event
			 * @returns {this} Reference to <code>this</code> in order to allow method chaining
			 * @protected
			 */
			fireCreated : function(oParameters) {
				return this.fireEvent("created", oParameters);
			},

			/*
			 * Privates
			 */
			_get : function (oOptions, sType, bGlobalId, oInfo, bNoCreate) {
				var oObject;
				switch (sType) {
					case "View":
						oObject = this._getView(oOptions, bGlobalId, bNoCreate);
						break;
					case "Component":
						oObject = this._getComponent(oOptions, bGlobalId, oInfo, bNoCreate);
						break;
					default:
						throw Error("The given sType: " + sType + " isn't supported by TargetCache.getObject");
				}
				return oObject;
			},

			/**
			 * Hook for retrieving views synchronous way since Targets and router are not doing this yet
			 * @param {object} oOptions The options to determine the view
			 * @param {boolean} bGlobalId True, if a global id should be generated
			 * @returns {*} the view
			 * @private
			 */
			_getView : function (oOptions, bGlobalId, bNoCreate) {
				if (!bGlobalId) {
					oOptions = this._createId(oOptions);
				}

				return this._getViewWithGlobalId(oOptions, false /* sync creation */, bNoCreate);
			},

			_getComponent : function (oOptions, bGlobalId, oInfo, bNoCreate) {
				if (!bGlobalId) {
					oOptions = this._createId(oOptions);
				}

				return this._getComponentWithGlobalId(oOptions, oInfo, bNoCreate);
			},

			_createId: function (oOptions) {
				if (this._oComponent && oOptions.id) {
					oOptions = Object.assign({}, oOptions, { id : this._oComponent.createId(oOptions.id) });
				}
				return oOptions;
			},

			/**
			 * @param {string} sName logs an error if it is empty or undefined
			 * @param {string} sType whether it's a 'View' or 'Component'
			 * @private
			 */
			_checkName : function (sName, sType) {

				if (!sName) {
					var sMessage = "A name for the " + sType.toLowerCase() + " has to be defined";
					Log.error(sMessage, this);
					throw Error(sMessage);
				}

			},

			/**
			 * Determines the object with the given <code>oOptions</code>, <code>sType</code> and <code>oTargetCreateInfo</code>
			 *
			 * @param {object} oOptions The options of the desired object
			 * @param {string} sType The type of the desired object, e.g. 'View', 'Component', etc.
			 * @param {object} oTargetCreateInfo The object which contains extra information for the creation of the target
			 * @param {boolean} [bSynchronousCreate] When <code>true</code> the <code>_ViewFactory.create</code> is used for creating
			 *  the view instance synchronously. In all other cases the asynchronous <code>View.create</code> factory is used.
			 * @returns {Promise | object} The desired object, if the object already exists in the cache, if not the promise is returned
			 * @private
			 * @ui5-transform-hint replace-param bSynchronousCreate false
			 * @ui5-transform-hint replace-param oOptions.async true
			 */
			_getObjectWithGlobalId : function (oOptions, sType, oTargetCreateInfo, bSynchronousCreate, bNoCreate) {
				var that = this,
					vPromiseOrObject,
					sName,
					oInstanceCache,
					oOwnerComponent = this._oComponent,
					aWrittenIds = [];

				oTargetCreateInfo = oTargetCreateInfo || {};

				function fnCreateObjectAsync() {
					/**
					 * @ui5-transform-hint replace-local false
					 */
					const bLegacyCreate = !oOptions.async || bSynchronousCreate;

					switch (sType) {
						case "View":
							oOptions.viewName = oOptions.name;
							delete oOptions.name;
							if (bLegacyCreate) {
								return _ViewFactory.create(oOptions);
							} else {
								return View.create(oOptions);
							}
						case "Component":
							oOptions.settings = oOptions.settings || {};

							// forward info, if parent component expects title propagation
							oOptions.settings._propagateTitle = oTargetCreateInfo.propagateTitle;

							// create the RouterHashChanger for the component which is going to be created
							var oRouterHashChanger = that._createRouterHashChanger(oTargetCreateInfo.prefix);
							if (oRouterHashChanger) {
								// put the RouterHashChanger as a private property to the Component constructor
								oOptions.settings._routerHashChanger = oRouterHashChanger;
							}

							if (oOptions.usage) {
								return oOwnerComponent.createComponent(oOptions);
							} else {
								return Component.create(oOptions);
							}
						default:
							// do nothing
					}
				}

				function afterLoaded(oObject) {
					if (that._oCache) { // the TargetCache may already be destroyed
						aWrittenIds.forEach(function(sId) {
							oInstanceCache[sId] = oObject;
						});

						if (oTargetCreateInfo.afterCreate) {
							oTargetCreateInfo.afterCreate(oObject);
						}

						that.fireCreated({
							object: oObject,
							type: sType,
							options: oOptions
						});
					}

					return oObject;
				}

				if (oOptions.async === undefined) {
					oOptions.async = true;
				}

				sName = oOptions.usage || oOptions.name;
				this._checkName(sName, sType);

				oInstanceCache = this._oCache[sType.toLowerCase()][sName];

				vPromiseOrObject = oInstanceCache && oInstanceCache[oOptions.id];

				if (bNoCreate || vPromiseOrObject) {
					return vPromiseOrObject;
				}

				if (oOwnerComponent) {
					vPromiseOrObject = oOwnerComponent.runAsOwner(fnCreateObjectAsync);

					if (vPromiseOrObject instanceof Promise) {
						oOwnerComponent.registerForDestroy(vPromiseOrObject);
					}
				} else {
					vPromiseOrObject = fnCreateObjectAsync();
				}

				if (vPromiseOrObject instanceof Promise) {
					vPromiseOrObject = vPromiseOrObject.then(afterLoaded);
				} else {
					vPromiseOrObject.loaded().then(afterLoaded);
				}

				if (!oInstanceCache) {
					oInstanceCache = this._oCache[sType.toLowerCase()][sName] = {};
					// save the object also to the undefined key if this is the first object created for its class
					oInstanceCache[undefined] = vPromiseOrObject;
					aWrittenIds.push(undefined);
				}

				if (oOptions.id !== undefined) {
					oInstanceCache[oOptions.id] = vPromiseOrObject;
					aWrittenIds.push(oOptions.id);
				}

				return vPromiseOrObject;
			},

			/**
			 * Determines the view with the given <code>oOptions</code>
			 *
			 * @param {object} oOptions The options of the desired object
			 * @param {boolean} [bSynchronousCreate] When <code>true</code> the <code>_ViewFactory.create</code> is used for creating
			 *  the view instance synchronously. In all other cases the asynchronous <code>View.create</code> factory is used.
			 * @returns {Promise | object} The desired object, if the object already exists in the cache, if not the promise is returned
			 * @private
			 * @ui5-transform-hint replace-param bSynchronousCreate false
			 */
			_getViewWithGlobalId : function (oOptions, bSynchronousCreate, bNoCreate) {
				if (oOptions && !oOptions.name) {
					oOptions.name = oOptions.viewName;
				}
				return this._getObjectWithGlobalId(oOptions, "View", undefined, bSynchronousCreate, bNoCreate);
			},

			/**
			 * Determines the component with the given <code>oOptions</code> and <code>oTargetCreateInfo</code>
			 *
			 * @param {object} oOptions The options of the desired object
			 * @param {object} oTargetCreateInfo The object which contains extra information for the creation of the target
			 * @returns {Promise | object} The desired object, if the object already exists in the cache, if not the promise is returned
			 * @private
			 */
			_getComponentWithGlobalId : function(oOptions, oTargetCreateInfo, bNoCreate) {
				return this._getObjectWithGlobalId(oOptions, "Component", oTargetCreateInfo, bNoCreate);
			},

			/**
			 * Creates a new hash changer for the nested component
			 *
			 * @param {string} [sPrefix] The prefix of the target
			 * @returns {sap.ui.core.routing.HashChanger} The created sub hash changer, if creation was not possible the hash changer of the current component is returned
			 * @private
			 */
			_createRouterHashChanger: function(sPrefix) {
				var oRouterHashChanger;

				var oRouter = this._oComponent && this._oComponent.getRouter();
				if (oRouter) {
					oRouterHashChanger = oRouter.getHashChanger();
					if (oRouterHashChanger && sPrefix) {
						oRouterHashChanger = oRouterHashChanger.createSubHashChanger(sPrefix);
					}
				}
				// default to the root RouterHashChanger
				return oRouterHashChanger || HashChanger.getInstance().createRouterHashChanger();
			}

		});

		return TargetCache;

	});
