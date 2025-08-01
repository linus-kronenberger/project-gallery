/*
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides base class sap.ui.core.Component for all components
sap.ui.define([
	'./Manifest',
	'./ComponentHooks',
	'./ComponentMetadata',
	'./ElementRegistry',
	'sap/base/config',
	'sap/base/future',
	'sap/base/i18n/Localization',
	'sap/base/util/extend',
	'sap/base/util/deepExtend',
	'sap/base/util/merge',
	'sap/ui/base/_runWithOwner',
	'sap/ui/base/ManagedObject',
	'sap/ui/core/Lib',
	'sap/ui/core/ResizeHandler',
	'sap/ui/thirdparty/URI',
	'sap/ui/performance/trace/Interaction',
	'sap/ui/util/_enforceNoReturnValue',
	'sap/base/assert',
	'sap/base/Log',
	'sap/base/util/Deferred',
	'sap/base/util/ObjectPath',
	'sap/base/util/isPlainObject',
	'sap/base/util/LoaderExtensions',
	'sap/base/strings/camelize',
	'sap/ui/core/_UrlResolver',
	'sap/ui/VersionInfo',
	'sap/ui/core/mvc/ViewType',
	'sap/ui/core/ComponentRegistry',
	'sap/ui/core/util/_LocalizationHelper'
], function(
	Manifest,
	ComponentHooks,
	ComponentMetadata,
	ElementRegistry,
	BaseConfig,
	future,
	Localization,
	extend,
	deepExtend,
	merge,
	_runWithOwner,
	ManagedObject,
	Library,
	ResizeHandler,
	URI,
	Interaction,
	_enforceNoReturnValue,
	assert,
	Log,
	Deferred,
	ObjectPath,
	isPlainObject,
	LoaderExtensions,
	camelize,
	_UrlResolver,
	VersionInfo,
	ViewType,
	ComponentRegistry,
	_LocalizationHelper
) {
	"use strict";

	/* global Promise */

	var ServiceStartupOptions = {
		lazy: "lazy",
		eager: "eager",
		waitFor: "waitFor"
	};

	function getConfigParam(sName) {
		return {name: sName, type: BaseConfig.Type.String, external: true};
	}
	/**
	 * Utility function which adds SAP-specific parameters to a URI instance
	 *
	 * @param {URI} oUri URI.js instance
	 * @private
	 */
	function addSapParams(oUri) {
		['sap-client', 'sap-server'].forEach(function(sName) {
			if (!oUri.hasSearch(sName)) {
				var sValue = BaseConfig.get(getConfigParam(camelize(sName)));
				if (sValue) {
					oUri.addSearch(sName, sValue);
				}
			}
		});
	}

	/**
	 * Utility function which merges a map of property definitions to track
	 * from which "source" a property was defined.
	 *
	 * This function is used to find out which Component has defined
	 * which "dataSource/model".
	 *
	 * @param {object} mDefinitions Map with definitions to check
	 * @param {object} mDefinitionSource Object to extend with definition - source mapping
	 * @param {object} mSourceData Actual map with definitions
	 * @param {object} oSource Corresponding source object which should be assigned to the definitions-source map
	 * @private
	 */
	function mergeDefinitionSource(mDefinitions, mDefinitionSource, mSourceData, oSource) {
		if (mSourceData) {
			for (var sName in mDefinitions) {
				if (!mDefinitionSource[sName] && mSourceData[sName] && mSourceData[sName].uri) {
					mDefinitionSource[sName] = oSource;
				}
			}
		}
	}

	/**
	 * Returns the configuration of a manifest section or the value for a
	 * specific path. If no section or key is specified, the return value is null.
	 *
	 * <b>Note:</b>
	 * This function is a local variant of sap.ui.core.ComponentMetadata#_getManifestEntry.
	 * This function allows to access manifest information on an instance-specific manifest
	 * first, before then looking up the inheritance chain.
	 * All Components using the default manifest will rely on the above default implementation.
	 *
	 * @param {sap.ui.core.ComponentMetadata} oMetadata the Component metadata
	 * @param {sap.ui.core.Manifest} oManifest the manifest
	 * @param {string} sKey Either the manifest section name (namespace) or a concrete path
	 * @param {boolean} [bMerged] Indicates whether the manifest entry is merged with the manifest entries of the parent component.
	 * @return {any|null} Value of the manifest section or the key (could be any kind of value)
	 * @private
	 * @see {@link sap.ui.core.Component#_getManifestEntry}
	 */
	function getManifestEntry(oMetadata, oManifest, sKey, bMerged) {
		var oData = oManifest.getEntry(sKey);

		// merge / extend should only be done for objects or when entry wasn't found
		if (oData !== undefined && !isPlainObject(oData)) {
			return oData;
		}

		// merge the configuration of the parent manifest with local manifest
		// the configuration of the static component metadata will be ignored
		var oParent, oParentData;
		if (bMerged && (oParent = oMetadata.getParent()) instanceof ComponentMetadata) {
			oParentData = oParent._getManifestEntry(sKey, bMerged);
		}

		// only extend / clone if there is data
		// otherwise "null" will be converted into an empty object
		if (oParentData || oData) {
			oData = deepExtend({}, oParentData, oData);
		}

		return oData;
	}

	/**
	 * Utility function which creates a metadata proxy object for the given
	 * metadata object
	 *
	 * @param {sap.ui.core.ComponentMetadata} oMetadata the Component metadata
	 * @param {sap.ui.core.Manifest} oManifest the manifest
	 * @return {sap.ui.core.ComponentMetadata} a metadata proxy object
	 */
	function createMetadataProxy(oMetadata, oManifest) {

		// create a proxy for the metadata object and simulate to be an
		// instance of the original metadata object of the Component
		// => retrieving the prototype from the original metadata to
		//    support to proxy sub-classes of ComponentMetadata
		var oMetadataProxy = Object.create(Object.getPrototypeOf(oMetadata));

		// provide internal access to the static metadata object
		oMetadataProxy._oMetadata = oMetadata;
		oMetadataProxy._oManifest = oManifest;

		// copy all functions from the metadata object except of the
		// manifest related functions which will be instance specific now
		// we proxy private core restricted manifest related API, as well as older public/deprecated API (for compatibility)
		for (var m in oMetadata) {
			if (!/^(getManifest|_getManifest|getManifestObject|getManifestEntry|_getManifestEntry|getMetadataVersion)$/.test(m) && typeof oMetadata[m] === "function") {
				oMetadataProxy[m] = oMetadata[m].bind(oMetadata);
			}
		}

		/**
		 * Public on ComponentMetadata, kept for compatibility.
		 *
		 * @deprecated
		 * @return {Object|null} manifest.
		 */
		oMetadataProxy.getManifest = function() {
			return this._getManifest();
		};

		/**
		 * Public on ComponentMetadata, kept for compatibility.
		 * Detailed documentation see ComponentMetadata#getManifestEntry
		 *
		 * @param {string} sKey Either the manifest section name (namespace) or a concrete path
		 * @param {boolean} [bMerged=false] Indicates whether the custom configuration is merged with the parent custom configuration of the Component.
		 * @deprecated
		 * @return {any|null} Value of the manifest section or the key (could be any kind of value)
		 */
		oMetadataProxy.getManifestEntry = function(sKey, bMerged) {
			return this._getManifestEntry(sKey, bMerged);
		};

		oMetadataProxy._getManifest = function() {
			// return the content of the manifest instead of the static metadata
			return oManifest && oManifest.getJson();
		};
		oMetadataProxy.getManifestObject = function() {
			return oManifest;
		};
		oMetadataProxy._getManifestEntry = function(sKey, bMerged) {
			return getManifestEntry(oMetadata, oManifest, sKey, bMerged);
		};
		oMetadataProxy.getMetadataVersion = function() {
			return 2; // instance specific manifest => metadata version 2!
		};

		/*
		 * Provide oMetadataProxy to collectRoutingClasses, to derive routing classes from correct manifest object
		 */
		oMetadataProxy.collectRoutingClasses = oMetadata.collectRoutingClasses;

		oMetadataProxy[Symbol("isProxy")] = true;

		return oMetadataProxy;

	}

	let pCommandPool;

	const _loadCommandPool = () => {
		pCommandPool ??= new Promise((resolve, reject) => {
			sap.ui.require(["sap/ui/core/_CommandPool"], resolve, reject);
		});

		return pCommandPool;
	};

	const _resolveCommandsInManifest = async (oManifest) => {
		if (oManifest?.getEntry("/sap.ui5/commands")) {
			const _CommandPool = await _loadCommandPool();
			_CommandPool.resolve(oManifest);
		}
	};

	/** @deprecated As of version 1.135 */
	const _resolveCommandsInManifestSync = (oManifest) => {
		if (oManifest?.getEntry("/sap.ui5/commands")) {
			const _CommandPool = sap.ui.requireSync("sap/ui/core/_CommandPool");
			_CommandPool.resolve(oManifest);
		}
	};

	/**
	 * As <code>Component</code> is an abstract base class for components, applications should not call the constructor.
	 * For many use cases the static {@link #.create Component.create} factory can be used to instantiate a <code>Component</code>.
	 * Depending on the requirements, the framework also provides other ways to instantiate a <code>Component</code>, documented under the
	 * {@link topic:958ead51e2e94ab8bcdc90fb7e9d53d0 "Component"} chapter.
	 *
	 * The set of allowed entries in the <code>mSettings</code> object depends on
	 * the concrete subclass and is described there. See {@link sap.ui.core.Component}
	 * for a general description of this argument.
	 *
	 * @param {string}
	 *            [sId] Optional ID for the new control; generated automatically if
	 *            no non-empty ID is given. Note: this can be omitted, no matter
	 *            whether <code>mSettings</code> are given or not!
	 * @param {object}
	 *            [mSettings] Optional object with initial settings for the
	 *            new Component instance
	 * @public
	 *
	 * @class Base Class for Components.
	 * Components are independent and reusable parts of UI5 applications.
	 * They facilitate the encapsulation of closely related parts of an application,
	 * thus enabling developers to structure and maintain their applications more easily.
	 *
	 * @extends sap.ui.base.ManagedObject
	 * @abstract
	 * @author SAP SE
	 * @version 1.138.0
	 * @alias sap.ui.core.Component
	 * @since 1.9.2
	 */
	var Component = ManagedObject.extend("sap.ui.core.Component", /** @lends sap.ui.core.Component.prototype */

	{
		constructor : function(sId, mSettings) {

			// create a copy of arguments for later handover to ManagedObject
			var args = Array.prototype.slice.call(arguments);

			// identify how the constructor has been used to extract the settings
			if (typeof sId !== "string") {
				mSettings = sId;
				sId = undefined;
			}

			/**
			 * Checks whether a settings object was provided plus a proxy for
			 * the metadata object. If <strong>true</strong> the metadata proxy
			 * and the manifest will be stored at the instance of the Component.
			 *
			 * @param  {string} [mSettings._metadataProxy]
			 *         The proxy object for the metadata
			 */
			if (mSettings && typeof mSettings._metadataProxy === "object") {

				// set the concrete metadata proxy and the manifest and
				// delete the metadata proxy setting to avoid assert issues
				this._oMetadataProxy = mSettings._metadataProxy;
				this._oManifest = mSettings._metadataProxy._oManifest;
				delete mSettings._metadataProxy;

				/**
				 * Returns the metadata object which has been adopted to return
				 * the <strong>instance specific</strong> manifest.
				 *
				 * @return {object} the proxy object of the component metadata
				 */
				this.getMetadata = function() {
					return this._oMetadataProxy;
				};

			}

			// --- Special settings (internal only) below ---

			// cache tokens
			if (mSettings && typeof mSettings._cacheTokens === "object") {
				this._mCacheTokens = mSettings._cacheTokens;
				delete mSettings._cacheTokens;
			}

			// active terminologies
			if (mSettings && Array.isArray(mSettings._activeTerminologies)) {
				this._aActiveTerminologies = mSettings._activeTerminologies;
				delete mSettings._activeTerminologies;
			}

			// component factory config
			if (mSettings && typeof mSettings._componentConfig === "object") {
				this._componentConfig = mSettings._componentConfig;
				delete mSettings._componentConfig;
			}
			/**
			 * whether the component was created synchronously (e.g. via legacy-factory or constructor call)
			 * @deprecated since 1.120
			 */
			(() => {
				// Note: why is <true> the default?
				//       Instantiating a Component via constructor is a sync creation, meaning in
				//       UI5 1.x we must load manifest models sync. during the constructor, see _initComponentModels()
				//       In UI5 2.x this code is not needed anymore, since only the async factory remains.
				//       Creation via constructor does not allow for sync class loading anymore, meaning
				//       consumers must provision the model classes before calling the constructor.
				this._bSyncCreation = mSettings?._syncCreation ?? true;
				delete mSettings?._syncCreation;
			})();

			// registry of preloaded models from manifest ('afterManifest' models)
			if (mSettings && typeof mSettings._manifestModels === "object") {
				// use already created models from sap.ui.component.load if available
				this._mManifestModels = mSettings._manifestModels;
				delete mSettings._manifestModels;
			} else {
				this._mManifestModels = {};
			}

			// registry for services
			this._mServices = {};

			this._oKeepAliveConfig = this.getManifestEntry("/sap.ui5/keepAlive");
			if (this._oKeepAliveConfig) {
				this._oKeepAliveConfig.supported = !!this._oKeepAliveConfig.supported;
			}

			this._bIsActive = true;
			this._aDestroyables = [];

			ManagedObject.apply(this, args);
		},

		metadata : {
			stereotype : "component",
			"abstract": true,
			specialSettings: {
				/*
				 * Component data
				 */
				componentData: 'any'
			},
			version : "0.0",
			/*enable/disable type validation by Messaging
			handleValidation: 'boolean'*/
			includes : [],    // css, javascript files that should be used in the component
			dependencies : {  // external dependencies
				libs : [],
				components : [],
				ui5version : ""
			},
			config: {}, // static configuration
			customizing: { // component/view customizing

				/* Example:
				"sap.ui.viewReplacements": {
					"sap.xx.org.Main": {
						viewName: "sap.xx.new.Main",
						type: "XML"
					}
				},
				"sap.ui.viewExtensions": {
					"sap.xx.new.Main": {
						"extensionX": {
							name: "sap.xx.new.Fragment1",
							type: "sap.ui.core.XMLFragment"
						},
						"extensionY": {
							...
						}
					}
				},
				"sap.ui.controllerExtensions": {
					"sap.xx.org.Main": {
						"controllerName": "sap.xx.new.Main",
						"controllerNames": ["sap.xx.new.Sub1", "sap.xx.new.Sub2"]
					}
				},
				"sap.ui.viewModification": {
					"sap.xx.new.Main": {
						"myControlId": {
							text: "{i18n_custom>mytext}"
						}
					}
				}
				*/
			},
			/*
			properties: {
				config : "any"
			},
			*/
			library: "sap.ui.core"
		}

	}, /* Metadata constructor */ ComponentMetadata);

	ComponentRegistry.init(Component);

	/**
	 * Creates a new subclass of class <code>sap.ui.core.Component</code> with name
	 * <code>sClassName</code> and enriches it with the information contained in <code>oClassInfo</code>.
	 *
	 * <code>oClassInfo</code> might contain the same kind of information as described in
	 * {@link sap.ui.base.ManagedObject.extend}, plus the <code>manifest</code> property in the 'metadata'
	 * object literal, indicating that the component configuration should be read from a manifest.json file.
	 *
	 * @param {string} sClassName
	 *            Qualified name of the newly created class
	 * @param {object} [oClassInfo]
	 *            Object literal with information about the class
	 * @param {sap.ui.core.Component.MetadataOptions} [oClassInfo.metadata]
	 *            The metadata object describing the class.
	 *            See {@link sap.ui.core.Component.MetadataOptions MetadataOptions} for the values allowed in every extend.
	 * @param {function} [FNMetaImpl=sap.ui.core.ComponentMetadata]
	 *            Constructor function for the metadata object. If not given, it defaults to an
	 *            internal subclass of <code>sap.ui.core.ComponentMetadata</code>.
	 * @returns {function} The created class / constructor function
	 * @name sap.ui.core.Component.extend
	 * @function
	 * @static
	 * @public
	 */

	/**
	 * @typedef {sap.ui.base.ManagedObject.MetadataOptions} sap.ui.core.Component.MetadataOptions
	 *
	 * The structure of the "metadata" object which is passed when inheriting from sap.ui.core.Component using its static "extend" method.
	 * See {@link sap.ui.core.Component.extend} and {@link sap.ui.core.Component.create} for additional details on its usage.
	 *
	 * @property {undefined|false|object|"json"} [manifest=undefined] The manifest option determines how a component manifest should be evaluated.
	 *            Default is <code>undefined</code>.
	 *
	 *            When set to <code>false</code> or <code>undefined</code>, no manifest.json is present for this Component, however the Component can
         *            still be started with a manifest given as an argument of the factory function, see {@link sap.ui.core.Component.create}.
	 *            When set to an object, this object will be interpreted as a manifest and must adhere to the
	 *            {@link topic:be0cf40f61184b358b5faedaec98b2da descriptor schema for components}.
	 *            When set to the string literal <code>"json"</code>, this property indicates that the component configuration
	 *            should be read from a manifest.json file which is assumed to exist next to the Component.js file.
	 *
	 * @public
	 */

	/**
	 * Executes the given callback function for each sap.ui.core.Element whose owner-component
	 * has the given ID and which has no parent.
	 * @param {function(sap.ui.core.Element, sap.ui.core.ID)} fn callback function
	 * @param {sap.ui.core.ID} sComponentId the component ID used for the owner check
	 */
	function forEachChildElement(fn, sComponentId) {
		ElementRegistry.forEach(function(oElement, sId) {
			var sElementOwnerId = Component.getOwnerIdFor(oElement);
			if (sElementOwnerId === sComponentId && !oElement.getParent()) {
				fn(oElement, sId);
			}
		});
	}

	/**
	 * Helper function to retrieve owner (extension) component holding the customizing configuration.
	 * @param {string|sap.ui.core.Component|sap.ui.base.ManagedObject} vObject Component Id, component instance or ManagedObject
	 * @throws {Error} If 'getExtensionComponent' function is given, but does not return an instance.
	 * @returns {sap.ui.core.Component|undefined} The owner component or <code>undefined</code>
	 */
	function getCustomizingComponent(vObject) {
		var oComponent, sComponentId;

		/**
		 * deprecated as of Version 1.120
		 */
		if (BaseConfig.get({name: "sapUiXxDisableCustomizing", type: BaseConfig.Type.Boolean})) {
			return oComponent;
		}

		if (typeof vObject === "string") {
			sComponentId = vObject;
		} else if (vObject && typeof vObject.isA === "function" && !vObject.isA("sap.ui.core.Component")) {
			sComponentId = Component.getOwnerIdFor(vObject);
		} else {
			oComponent = vObject;
		}

		if (sComponentId) {
			oComponent = Component.getComponentById(sComponentId);
		}

		if (oComponent) {
			if (oComponent.getExtensionComponent) {
				oComponent = oComponent.getExtensionComponent();
				if (!oComponent) {
					throw new Error("getExtensionComponent() must return an instance.");
				}
			}
		}
		return oComponent;
	}

	/**
	 * @param {string|sap.ui.base.ManagedObject|sap.ui.core.Component} vObject Either Component Id, ManagedObject or component instance
	 * @param {object} mOptions Info object to retrieve the customizing config
	 * @param {object} mOptions.type Either <code>sap.ui.viewExtension</code>, <code>sap.ui.controllerReplacement</code>, <code>sap.ui.viewReplacement</code>, <code>sap.ui.viewModification</code> or <code>sap.ui.controllerExtension</code>
	 * @param {object} [mOptions.name] Name of the customizing configuration. If none given the complete extension object is returned.
	 * @param {object} [mOptions.extensionName] If type <code>sap.ui.viewExtension</code>, the extension name must be provided
	 * @throws {Error} If 'getExtensionComponent' function is given, but does not return an instance.
	 * @returns {object|undefined} Object containing the customizing config or <code>undefined</code>
	 * @static
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	Component.getCustomizing = function(vObject, mOptions) {
		var sType = mOptions.type,
			sExtensionSuffix = mOptions.name ? "/" + mOptions.name : "",
			sPath = "/sap.ui5/extends/extensions/" + sType + sExtensionSuffix;

		if (sType === "sap.ui.viewExtensions") {
			sPath += "/" + mOptions.extensionName;
		}

		var oComponent = getCustomizingComponent(vObject);
		return oComponent ? oComponent._getManifestEntry(sPath, true) : undefined;
	};

	/**
	 * Currently active preload mode for components or falsy value.
	 *
	 * @returns {string} component preload mode
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ui.fl
	 * @since 1.120.0
	 */
	Component.getComponentPreloadMode = function() {
		return BaseConfig.get({
			name: "sapUiXxComponentPreload",
			type: BaseConfig.Type.String,
			external: true
		}) || Library.getPreloadMode();
	};

	/**
	 * Returns the metadata for the Component class.
	 *
	 * @return {sap.ui.core.ComponentMetadata} Metadata for the Component class.
	 * @static
	 * @public
	 * @name sap.ui.core.Component.getMetadata
	 * @function
	 */

	/**
	 * Returns the metadata for the specific class of the current instance.
	 *
	 * @return {sap.ui.core.ComponentMetadata} Metadata for the specific class of the current instance.
	 * @public
	 * @name sap.ui.core.Component#getMetadata
	 * @function
	 */

	/**
	 * Returns the manifest defined in the metadata of the component.
	 * If not specified, the return value is null.
	 *
	 * @return {object} manifest.
	 * @public
	 * @since 1.33.0
	 */
	Component.prototype.getManifest = function() {
		if (!this._oManifest) {
			return this.getMetadata()._getManifest();
		} else {
			return this._oManifest.getJson();
		}
	};

	/**
	 * Returns the configuration of a manifest section or the value for a
	 * specific path. If no section or key is specified, the return value is null.
	 *
	 * Example:
	 * <code>
	 *   {
	 *     "sap.ui5": {
	 *       "dependencies": {
	 *         "libs": {
	 *           "sap.m": {}
	 *         },
	 *         "components": {
	 *           "my.component.a": {}
	 *         }
	 *       }
	 *   });
	 * </code>
	 *
	 * The configuration above can be accessed in the following ways:
	 * <ul>
	 * <li><b>By section/namespace</b>: <code>oComponent.getManifestEntry("sap.ui5")</code></li>
	 * <li><b>By path</b>: <code>oComponent.getManifestEntry("/sap.ui5/dependencies/libs")</code></li>
	 * </ul>
	 *
	 * By section/namespace returns the configuration for the specified manifest
	 * section and by path allows to specify a concrete path to a dedicated entry
	 * inside the manifest. The path syntax always starts with a slash (/).
	 *
	 * @param {string} sKey Either the manifest section name (namespace) or a concrete path
	 * @return {any|null} Value of the manifest section or the key (could be any kind of value)
	 * @public
	 * @since 1.33.0
	 */
	Component.prototype.getManifestEntry = function(sKey) {
		return this._getManifestEntry(sKey);
	};

	/**
	 * Returns the configuration of a manifest section or the value for a
	 * specific path. If no section or key is specified, the return value is null.
	 *
	 * @param {string} sKey Either the manifest section name (namespace) or a concrete path
	 * @param {boolean} [bMerged] Indicates whether the manifest entry is merged with the manifest entries of the parent component.
	 * @return {any|null} Value of the manifest section or the key (could be any kind of value)
	 * @see {@link #getManifestEntry}
	 * @private
	 * @ui5-restricted sap.ushell
	 * @since 1.34.2
	 */
	Component.prototype._getManifestEntry = function(sKey, bMerged) {
		if (!this._oManifest) {
			// get entry via standard component metadata
			return this.getMetadata()._getManifestEntry(sKey, bMerged);
		} else {
			// get entry via instance-specific manifest
			// this.getMetadata() returns the instance-specific ComponentMetadata Proxy
			return getManifestEntry(this.getMetadata(), this._oManifest, sKey, bMerged);
		}
	};

	/**
	 * Returns the manifest object.
	 * @return {sap.ui.core.Manifest} manifest.
	 * @public
	 * @since 1.33.0
	 */
	Component.prototype.getManifestObject = function() {
		if (!this._oManifest) {
			return this.getMetadata().getManifestObject();
		} else {
			return this._oManifest;
		}
	};

	/**
	 * Returns true, if the Component instance is a variant.
	 *
	 * A Component is a variant if the property sap.ui5/componentName
	 * is present in the manifest and if this property and the sap.app/id
	 * differs.
	 *
	 * @return {boolean} true, if the Component instance is a variant
	 * @private
	 * @since 1.45.0
	 */
	Component.prototype._isVariant = function() {
		if (this._oManifest) {
			// read the "/sap.ui5/componentName" which should be present for variants
			var sComponentName = this.getManifestEntry("/sap.ui5/componentName");
			// a variant differs in the "/sap.app/id" and "/sap.ui5/componentName"
			return sComponentName && sComponentName !== this.getManifestEntry("/sap.app/id");
		} else {
			return false;
		}
	};

	/**
	 * Activates the Customizing configuration for the given Component.
	 * @param {string} sComponentName the name of the component to activate
	 * @private
	 * @deprecated Since 1.21.0 as it is handled by component instantiation
	 */
	Component.activateCustomizing = function(sComponentName) {
		// noop since it will be handled by component instantiation
	};

	/**
	 * Deactivates the Customizing configuration for the given Component.
	 * @param {string} sComponentName Name of the Component to activate
	 * @private
	 * @deprecated Since 1.21.0 as it is handled by component termination
	 */
	Component.deactivateCustomizing = function(sComponentName) {
		// noop since it will be handled by component termination
	};

	// ---- Ownership functionality ------------------------------------------------------------

	//
	// Implementation note: the whole ownership functionality is now part of Component
	//  a) to ensure that only Components are used as owners
	//  b) to keep component related code out of ManagedObject as far as possible
	//
	// Only exception is the _sOwnerId property and its assignment in the ManagedObject
	// constructor, but that doesn't require much knowledge about components

	/**
	 * Returns the ID of the object in whose "context" the given ManagedObject has been created.
	 *
	 * For objects that are not ManagedObjects or for which the owner is unknown,
	 * <code>undefined</code> will be returned as owner ID.
	 *
	 * <strong>Note</strong>: Ownership for objects is only checked by the framework at the time
	 * when they are created. It is not checked or updated afterwards. And it can only be detected
	 * while the {@link sap.ui.core.Component#runAsOwner Component.runAsOwner} function is executing.
	 * Without further action, this is only the case while the content of a UIComponent is
	 * {@link sap.ui.core.UIComponent#createContent constructed} or when a
	 * {@link sap.ui.core.routing.Router Router} creates a new View and its content.
	 *
	 * <strong>Note</strong>: This method does not guarantee that the returned owner ID belongs
	 * to a Component. Currently, it always does. But future versions of UI5 might introduce a
	 * more fine grained ownership concept, e.g. taking Views into account. Callers that
	 * want to deal only with components as owners, should use the following method:
	 * {@link sap.ui.core.Component.getOwnerComponentFor Component.getOwnerComponentFor}.
	 * It guarantees that the returned object (if any) will be a Component.
	 *
	 * <strong>Further note</strong> that only the ID of the owner is recorded. In rare cases,
	 * when the lifecycle of a ManagedObject is not bound to the lifecycle of its owner,
	 * (e.g. by the means of aggregations), then the owner might have been destroyed already
	 * whereas the ManagedObject is still alive. So even the existence of an owner ID is
	 * not a guarantee for the existence of the corresponding owner.
	 *
	 * @param {sap.ui.base.ManagedObject} oObject Object to retrieve the owner ID for
	 * @return {string|undefined} ID of the owner or <code>undefined</code>
	 * @static
	 * @public
	 * @since 1.15.1
	 */
	Component.getOwnerIdFor = function(oObject) {
		assert(oObject instanceof ManagedObject, "oObject must be given and must be a ManagedObject");
		var sOwnerId = ( oObject instanceof ManagedObject ) && oObject._sOwnerId;
		return sOwnerId || undefined; // no or empty id --> undefined
	};

	/**
	 * Returns the Component instance in whose "context" the given ManagedObject has been created
	 * or <code>undefined</code>.
	 *
	 * This is a convenience wrapper around {@link sap.ui.core.Component.getOwnerIdFor Component.getOwnerIdFor}.
	 * If the owner ID cannot be determined for reasons documented on <code>getOwnerForId</code>
	 * or when the Component for the determined ID no longer exists, <code>undefined</code>
	 * will be returned.
	 *
	 * @param {sap.ui.base.ManagedObject} oObject Object to retrieve the owner Component for
	 * @return {sap.ui.core.Component|undefined} the owner Component or <code>undefined</code>.
	 * @static
	 * @public
	 * @since 1.25.1
	 */
	Component.getOwnerComponentFor = function(oObject) {
		return Component.getComponentById(Component.getOwnerIdFor(oObject));
	};

	/**
	 * Calls the function <code>fn</code> once and marks all ManagedObjects
	 * created during that call as "owned" by this Component.
	 *
	 * Nested calls of this method are supported (e.g. inside a newly created,
	 * nested component). The currently active owner Component will be remembered
	 * before executing <code>fn</code> and restored afterwards.
	 *
	 * @param {function} fn Function to execute
	 * @return {any} result of function <code>fn</code>
	 * @since 1.25.1
	 * @public
	 */
	Component.prototype.runAsOwner = function(fn) {
		if (!this.isActive()) {
			throw new Error("Execute 'runAsOwner' on an inactive owner component is not supported. Component: '" +
				this.getMetadata().getName() + "' with id '" + this.getId() + "'.");
		}
		return _runWithOwner(fn, this.getId());
	};

	// ---- ----

	/**
	 * Components don't have a facade and therefore return themselves as their interface.
	 *
	 * @returns {this} <code>this</code> as there's no facade for components
	 * @see sap.ui.base.Object#getInterface
	 * @public
	 */
	Component.prototype.getInterface = function() {
		return this;
	};

	/*
	 * initialize the Component and keep the component data
	 */
	Component.prototype._initCompositeSupport = function(mSettings) {

		// make user specific data available during component instantiation
		this.oComponentData = mSettings && mSettings.componentData;

		// manifest initialization (loading dependencies, includes, ... / register customizing)
		//   => either call init on the instance specific manifest or the static one on the ComponentMetadata
		if (this._oManifest) {
			this._oManifest.init(this);
		} else {
			this.getMetadata().init();
		}

		if (this._isVariant()) {
			// in case of variants we ensure to register the module path for the variant
			// to allow module loading of code extensibility relative to the manifest
			var sAppId = this._oManifest.getEntry("/sap.app/id");
			if (sAppId) {
				registerModulePath(sAppId, this._oManifest.resolveUri("./", "manifest"));
			}
		}

		// init the component models
		this.initComponentModels();

		/**
		 * @deprecated Since 1.119
		 */
		(() => {
			// error handler (if exists)
			if (this.onWindowError) {
				this._fnWindowErrorHandler = function(oEvent) {
					var oError = oEvent.originalEvent;
					this.onWindowError(oError.message, oError.filename, oError.lineno);

				}.bind(this);
				window.addEventListener("error", this._fnWindowErrorHandler);
			}

			// before unload handler (if exists)
			if (this.onWindowBeforeUnload) {
				this._fnWindowBeforeUnloadHandler = function(oEvent) {
					var vReturnValue = this.onWindowBeforeUnload.apply(this, arguments);
					// set returnValue for Chrome
					if (typeof (vReturnValue) === 'string') {
						oEvent.returnValue = vReturnValue;
						oEvent.preventDefault();
						return vReturnValue;
					}
				}.bind(this);
				window.addEventListener("beforeunload", this._fnWindowBeforeUnloadHandler);
			}

			// unload handler (if exists)
			if (this.onWindowUnload) {

				this._fnWindowUnloadHandler = this.onWindowUnload.bind(this);
				window.addEventListener("unload", this._fnWindowUnloadHandler);
			}
		})();

	};

	/**
	 * Returns the list of Promises for which an automatic destroy is scheduled.
	 * Logs an error in case the application Component is missing a mandatory
	 * constructor super call.
	 * For compatibility reason we must not fail in this obviously broken scenario!
	 *
	 * @private
	 */
	Component.prototype._getDestroyables = function() {
		if (!this._aDestroyables) {
			future.errorThrows(`${this.getManifestObject().getComponentName()}: A sub-class of sap.ui.core.Component which overrides the constructor must apply the super constructor as well.`,
				null,
				"sap.ui.support",
				function() {
					return { type: "missingSuperConstructor" };
				});
			this._aDestroyables = [];
		}
		return this._aDestroyables;
	};

	/*
	 * clean up the component and its dependent entities like models or event handlers
	 */
	Component.prototype.destroy = function() {
		var pAsyncDestroy, bSomeRejected = false;
		// destroy all services
		for (var sLocalServiceAlias in this._mServices) {
			if (this._mServices[sLocalServiceAlias].instance) {
				this._mServices[sLocalServiceAlias].instance.destroy();
			}
		}
		delete this._mServices;

		// destroy all models created via manifest definition
		for (var sModelName in this._mManifestModels) {
			this._mManifestModels[sModelName].destroy();
		}
		delete this._mManifestModels;

		/**
		 * @deprecated Since 1.119
		 */
		(() => {
			// remove the event handlers
			if (this._fnWindowErrorHandler) {
				window.removeEventListener("error", this._fnWindowErrorHandler);
				delete this._fnWindowErrorHandler;
			}
			if (this._fnWindowBeforeUnloadHandler) {
				window.removeEventListener("beforeunload", this._fnWindowBeforeUnloadHandler);
				delete this._fnWindowBeforeUnloadHandler;
			}
			if (this._fnWindowUnloadHandler) {
				window.removeEventListener("unload", this._fnWindowUnloadHandler);
				delete this._fnWindowUnloadHandler;
			}
		})();

		// destroy event bus
		if (this._oEventBus) {
			this._oEventBus.destroy();
			delete this._oEventBus;
		}

		function fnDestroy(oInstance) {
			if (oInstance && !oInstance._bIsBeingDestroyed) {
				oInstance.destroy();
			}
		}
		function fnError(oError) {
			// We ignore errors if we are in destroy phase and try to cleanup dangling objects
			// via the Element registry and the owner Component
			// remember rejections so we can do a defensive destruction of dangling controls in this case
			bSomeRejected = true;
		}

		// trigger an async destroy for all registered commponent promises
		var aDestroyables = this._getDestroyables();
		for (var i = 0; i < aDestroyables.length; i++ ) {
			aDestroyables[i] = aDestroyables[i].then(fnDestroy, fnError);
		}
		if (aDestroyables.length > 0) {
			pAsyncDestroy = Promise.all(aDestroyables).then(function() {
				// defensive destroy: Do it only if some collected Promises rejected
				if (bSomeRejected) {
					// destroy dangling Controls
					forEachChildElement(function(oElement) {
						// we assume that we can safely destroy a control that has no parent
						oElement.destroy();
					}, this.getId());
				}
			}.bind(this));
		}

		// destroy the object
		ManagedObject.prototype.destroy.apply(this, arguments);

		// unregister for messaging (on Messaging)
		const Messaging = sap.ui.require("sap/ui/core/Messaging");
		Messaging?.unregisterObject(this);

		// manifest exit (unload includes, ... / unregister customzing)
		//   => either call exit on the instance specific manifest or the static one on the ComponentMetadata
		if (this._oManifest) {
			this._oManifest.exit(this);
			delete this._oManifest;
		} else {
			this.getMetadata().exit();
		}
		return pAsyncDestroy;
	};


	/**
	 * Returns user specific data object
	 *
	 * @return {object} componentData
	 * @public
	 * @since 1.15.0
	 */
	Component.prototype.getComponentData = function() {
		return this.oComponentData;
	};


	/**
	 * Returns the event bus of this component.
	 * @return {sap.ui.core.EventBus} the event bus
	 * @since 1.20.0
	 * @public
	 */
	Component.prototype.getEventBus = function() {
		if (!this._oEventBus) {
			var EventBus = sap.ui.require("sap/ui/core/EventBus");
			if (!EventBus) {
				var sClassName = this.getMetadata().getName();
				future.warningThrows("The module 'sap/ui/core/EventBus' needs to be required before calling #getEventBus() on Component '" + sClassName + "'.");

				/**
				 * @deprecated
				 */
				(() => {
					Log.warning("Synchronous loading of EventBus, due to #getEventBus() call on Component '" + sClassName + "'.", "SyncXHR", null, function() {
						return {
							type: "SyncXHR",
							name: sClassName
						};
					});
					// We don't expect the application to use this API anymore (see Dev-Guide)
					// For the application it is recommended to declare the EventBus via sap.ui.require or sap.ui.define
					EventBus = sap.ui.requireSync("sap/ui/core/EventBus"); // legacy-relevant
				})();
			}

			this._oEventBus = new EventBus();

			if (!this.isActive()) {
				this._oEventBus.suspend();
			}
		}
		return this._oEventBus;
	};

	/**
	 * Determines if the component is active
	 *
	 * @returns {boolean} If the component is active <code>true</code>, otherwise <code>false</code>
	 * @since 1.88
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	Component.prototype.isActive = function() {
		return this._bIsActive;
	};

	/**
	 * Initializes the component models and services with the configuration
	 * as defined in the manifest.json.
	 *
	 * @private
	 */
	Component.prototype.initComponentModels = function() {

		// in case of having no parent metadata we simply skip that function
		// since this would mean to init the models on the Component base class
		var oMetadata = this.getMetadata();
		if (oMetadata.isBaseClass()) {
			return;
		}

		// retrieve the merged sap.app and sap.ui5 sections of the manifest
		// to create the models for the component + inherited ones
		var oManifestDataSources = this._getManifestEntry("/sap.app/dataSources", true) || {};
		var oManifestModels = this._getManifestEntry("/sap.ui5/models", true) || {};

		// pass the models and data sources to the internal helper
		this._initComponentModels(oManifestModels, oManifestDataSources, this._mCacheTokens);

	};

	/**
	 * Initializes the component models and services which are passed as
	 * parameters to this function.
	 *
	 * @param {object} mModels models configuration from manifest.json
	 * @param {object} mDataSources data sources configuration from manifest.json
	 * @param {object} mCacheTokens cache tokens for OData models
	 *
	 * @private
	 */
	Component.prototype._initComponentModels = function(mModels, mDataSources, mCacheTokens) {
		var sComponentName = this.getManifestObject().getComponentName();

		var mAllModelConfigs = _findManifestModelClasses({
			models: mModels,
			dataSources: mDataSources,
			componentName: sComponentName
		});
		/**
		 * Sync provisioning of model classes.
		 * @deprecated since 1.120
		 */
		if (this._bSyncCreation) {
			_loadManifestModelClasses(mAllModelConfigs, sComponentName, this._bSyncCreation);
		}

		var mAllModelConfigurations = _createManifestModelConfigurations({
			models: mAllModelConfigs,
			dataSources: mDataSources,
			component: this,
			mergeParent: true,
			cacheTokens: mCacheTokens,
			activeTerminologies: this.getActiveTerminologies()
		}),
			mModelConfigurations = {},
			sModelName;

		if (!mAllModelConfigurations) {
			return;
		}

		// filter out models which are already created
		for (sModelName in mAllModelConfigurations) {
			if (!this._mManifestModels[sModelName]) {
				mModelConfigurations[sModelName] = mAllModelConfigurations[sModelName];
			}
		}

		// create all models which are not created, yet.
		var mCreatedModels = _createManifestModels(mModelConfigurations, this._componentConfig, this.getManifestObject());
		for (sModelName in mCreatedModels) {
			// keep the model instance to be able to destroy the created models on component destroy
			this._mManifestModels[sModelName] = mCreatedModels[sModelName];
		}

		// set all the models to the component
		for (sModelName in this._mManifestModels) {
			var oModel = this._mManifestModels[sModelName];

			// apply the model to the component with provided name ("" as key means unnamed model)
			this.setModel(oModel, sModelName || undefined);
		}
	};


	/**
	 * Returns a service interface for the {@link sap.ui.core.service.Service Service}
	 * declared in the descriptor for components (manifest.json). The declaration needs
	 * to be done in the <code>sap.ui5/services</code> section as follows:
	 * <pre>
	 * {
	 *   [...]
	 *   "sap.ui5": {
	 *     "services": {
	 *       "myLocalServiceAlias": {
	 *         "factoryName": "my.ServiceFactory",
	 *         ["optional": true]
	 *       }
	 *     }
	 *   }
	 *   [...]
	 * }
	 * </pre>
	 * The service declaration is used to define a mapping between the local
	 * alias for the service that can be used in the Component and the name of
	 * the service factory which will be used to create a service instance.
	 *
	 * The <code>getService</code> function will look up the service factory and will
	 * create a new instance by using the service factory function
	 * {@link sap.ui.core.service.ServiceFactory#createInstance createInstance}
	 * The optional property defines that the service is not mandatory and the
	 * usage will not depend on the availability of this service. When requesting
	 * an optional service the <code>getService</code> function will reject but
	 * there will be no error logged in the console.
	 *
	 * When creating a new instance of the service the Component context will be
	 * passed as <code>oServiceContext</code> as follows:
	 * <pre>
	 * {
	 *   "scopeObject": this,     // the Component instance
	 *   "scopeType": "component" // the stereotype of the scopeObject
	 * }
	 * </pre>
	 *
	 * The service will be created only once per Component and reused in future
	 * calls to the <code>getService</code> function.
	 * <p>
	 * This function will return a <code>Promise</code> which provides the service
	 * interface when resolved. If the <code>factoryName</code> could not
	 * be found in the {@link sap.ui.core.service.ServiceFactoryRegistry Service Factory Registry}
	 * or the service declaration in the descriptor for components (manifest.json)
	 * is missing the Promise will reject.
	 *
	 * This is an example of how the <code>getService</code> function can be used:
	 * <pre>
	 * oComponent.getService("myLocalServiceAlias").then(function(oService) {
	 *   oService.doSomething();
	 * }).catch(function(oError) {
	 *   Log.error(oError);
	 * });
	 * </pre>
	 *
	 * @param {string} sLocalServiceAlias Local service alias as defined in the manifest.json
	 * @return {Promise<sap.ui.core.service.Service>} Promise which will be resolved with the Service interface
	 * @public
	 * @since 1.37.0
	 */
	Component.prototype.getService = function(sLocalServiceAlias) {

		// check whether the Service has already been created or not
		if (!this._mServices[sLocalServiceAlias]) {

			this._mServices[sLocalServiceAlias] = {};

			// cache the promise to avoid redundant creation
			this._mServices[sLocalServiceAlias].promise = new Promise(function(fnResolve, fnReject) {

				sap.ui.require(["sap/ui/core/service/ServiceFactoryRegistry"], function(ServiceFactoryRegistry){

					var oServiceManifestEntry = this._getManifestEntry("/sap.ui5/services/" + sLocalServiceAlias, true);

					// lookup the factoryName in the manifest
					var sServiceFactoryName = oServiceManifestEntry && oServiceManifestEntry.factoryName;
					if (!sServiceFactoryName) {
						fnReject(new Error("Service " + sLocalServiceAlias + " not declared!"));
						return;
					}

					// lookup the factory in the registry
					var oServiceFactory = ServiceFactoryRegistry.get(sServiceFactoryName);
					if (oServiceFactory) {
						// create a new Service instance with the current Component as context
						oServiceFactory.createInstance({
							scopeObject: this,
							scopeType: "component",
							settings: oServiceManifestEntry.settings || {}
						}).then(function(oServiceInstance) {
							if (!this.bIsDestroyed) {
								// store the created Service instance and interface
								this._mServices[sLocalServiceAlias].instance = oServiceInstance;
								this._mServices[sLocalServiceAlias].interface = oServiceInstance.getInterface();

								// return the Service interface
								fnResolve(this._mServices[sLocalServiceAlias].interface);
							} else {
								fnReject(new Error("Service " + sLocalServiceAlias + " could not be loaded as its Component was destroyed."));
							}
						}.bind(this)).catch(fnReject);

					} else {

						// the Service Factory could not be found in the registry
						var sErrorMessage = "The ServiceFactory " + sServiceFactoryName + " for Service " + sLocalServiceAlias + " not found in ServiceFactoryRegistry!";
						var bOptional = this._getManifestEntry("/sap.ui5/services/" + sLocalServiceAlias + "/optional", true);
						if (!bOptional) {
							// mandatory services will log an error into the console
							Log.error(sErrorMessage);
						}
						fnReject(new Error(sErrorMessage));

					}
				}.bind(this), fnReject);
			}.bind(this));
		}
		return this._mServices[sLocalServiceAlias].promise;
	};

	/**
	 * Internal activation function for non lazy services which should be started immediately
	 *
	 * @param {sap.ui.core.Component} oComponent The Component instance
	 * @param {boolean} bAsyncMode Whether or not the component is loaded in async mode
	 * @returns {Promise[]|null} An array of promises from then loaded services
	 * @private
	 * @ui5-transform-hint replace-param bAsyncMode true
	 */
	function activateServices(oComponent, bAsyncMode) {
		var oServices = oComponent._getManifestEntry("/sap.ui5/services", true);
		var aOutPromises = bAsyncMode ? [] : null;
		if (!oServices) {
			return aOutPromises;
		}
		var aServiceKeys = Object.keys(oServices);
		if (!bAsyncMode && aServiceKeys.some(function (sService) {
			return oServices[sService].startup === ServiceStartupOptions.waitFor;
		})) {
			throw new Error("The specified component \"" + oComponent.getMetadata().getName() +
				"\" cannot be loaded in sync mode since it has some services declared with \"startup\" set to \"waitFor\"");
		}
		return aServiceKeys.reduce(function (aPromises, sService) {
			if (oServices[sService].lazy === false ||
				oServices[sService].startup === ServiceStartupOptions.waitFor ||
				oServices[sService].startup === ServiceStartupOptions.eager) {
				var oServicePromise = oComponent.getService(sService);
				if (oServices[sService].startup === ServiceStartupOptions.waitFor) {
					aPromises.push(oServicePromise);
				}
			}
			return aPromises;
		}, aOutPromises);
	}


	/**
	 * Creates a nested component that is declared in the <code>sap.ui5/componentUsages</code> section of
	 * the descriptor (manifest.json). The following snippet shows the declaration:
	 * <pre>
	 * {
	 *   [...]
	 *   "sap.ui5": {
	 *     "componentUsages": {
	 *       "myUsage": {
	 *         "name": "my.useful.Component"
	 *       }
	 *     }
	 *   }
	 *   [...]
	 * }
	 * </pre>
	 * The syntax of the configuration object of the component usage matches the
	 * configuration object of the {#link sap.ui.component} factory function.
	 *
	 * This is an example of how the <code>createComponent</code> function can
	 * be used for asynchronous scenarios:
	 * <pre>
	 * oComponent.createComponent("myUsage").then(function(oComponent) {
	 *   oComponent.doSomething();
	 * }).catch(function(oError) {
	 *   Log.error(oError);
	 * });
	 * </pre>
	 *
	 * The following example shows how <code>createComponent</code> can be used to create a nested
	 * component by providing specific properties like <code>id</code>, <code>async</code>,
	 * <code>settings</code>, or <code>componentData</code>:
	 * <pre>
	 * var oComponent = oComponent.createComponent({
	 *   usage: "myUsage",
	 *   id: "myId",
	 *   settings: { ... },
	 *   componentData: { ... }
	 * });
	 * </pre>
	 * The allowed list of properties are defined in the parameter documentation
	 * of this function.
	 *
	 * The properties can also be defined in the descriptor. These properties can
	 * be overwritten by the local properties of that function.
	 *
	 * Synchronous Component creation is deprecated as of 1.135.0.
	 *
	 * @param {string|object} vUsage ID of the component usage or the configuration object that creates the component
	 * @param {string} vUsage.usage ID of component usage
	 * @param {string} [vUsage.id] ID of the nested component that is prefixed with <code>autoPrefixId</code>
	 * @param {boolean} [vUsage.async=true] Indicates whether the component creation is done asynchronously (You should use synchronous creation only if really necessary, because this has a negative impact on performance.)
	 * @param {object} [vUsage.settings] Settings for the nested component like for {#link sap.ui.component} or the component constructor
	 * @param {object} [vUsage.componentData] Initial data of the component, see {@link sap.ui.core.Component#getComponentData}
	 * @return {sap.ui.core.Component|Promise<sap.ui.core.Component>} Component instance or Promise which will be resolved with the component instance (defaults to Promise / asynchronous behavior)
	 * @public
	 * @since 1.47.0
	 */
	Component.prototype.createComponent = function(vUsage) {
		assert(
			(typeof vUsage === 'string' && vUsage)
			|| (typeof vUsage === 'object' && typeof vUsage.usage === 'string' && vUsage.usage),
			"vUsage either must be a non-empty string or an object with a non-empty usage id"
		);

		// extract the config from the configuration object
		var mConfig = {
			async: true // async is by default true
		};
		if (vUsage) {
			var sUsageId;
			if (typeof vUsage === "object") {
				sUsageId = vUsage.usage;
				["id", /* deprecated since 1.135.0 */ "async", "settings", "componentData"].forEach(function(sName) {
					if (vUsage[sName] !== undefined) {
						mConfig[sName] = vUsage[sName];
					}
				});
			} else if (typeof vUsage === "string") {
				sUsageId = vUsage;
			}

			mConfig = this._enhanceWithUsageConfig(sUsageId, mConfig);
		}

		// create the component in the owner context of the current component
		if (!this.isActive()) {
			throw new Error("Creation of component '" + mConfig.name + "' is not possible due to inactive owner component '" + this.getId() + "'");
		}

		/**
		* @ui5-transform-hint replace-local true
		*/
		const bAsync = mConfig.async;

		// create the nested component in the context of this component
		const oComponent = this.runAsOwner(() => {
			if (bAsync === true) {
				return Component.create(mConfig);
			} else {
				return sap.ui.component(mConfig); // legacy-relevant: use deprecated factory for sync use case only
			}
		});

		if (oComponent instanceof Promise) {
			this.registerForDestroy(oComponent);
		}
		return oComponent;
	};

	/**
	 * Enhances the given config object with the manifest configuration of the given usage.
	 * The given object is not modified, but the final object will be returned.
	 *
	 * @param {*} sUsageId ID of the component usage
	 * @param {*} mConfig Configuration object for a component
	 * @return {object} Enhanced configuration object
	 *
	 * @private
	 * @ui5-restricted sap.ui.core.ComponentContainer
	 */
	Component.prototype._enhanceWithUsageConfig = function(sUsageId, mConfig) {
		var mUsageConfig = this.getManifestEntry("/sap.ui5/componentUsages/" + sUsageId);
		if (!mUsageConfig) {
			throw new Error("Component usage \"" + sUsageId + "\" not declared in Component \"" + this.getManifestObject().getComponentName() + "\"!");
		}
		if (mUsageConfig.activeTerminologies) {
			throw new Error("Terminologies vector can't be used in component usages");
		}
		// mix in the component configuration on top of the usage configuration
		return deepExtend(mUsageConfig, mConfig);
	};

	/**
	 * Returns the list of active terminologies.
	 * See the {@link sap.ui.core.Component.create Component.create} factory API documentation for more detail.
	 *
	 * @return {string[]|undefined} List of active terminologies
	 *
	 * @public
	 * @since 1.76
	 */
	Component.prototype.getActiveTerminologies = function(){
		return this._aActiveTerminologies ? this._aActiveTerminologies.slice() : undefined;
	};

	/**
	 * Initializes the Component instance after creation.
	 *
	 * Applications must not call this hook method directly, it is called by the
	 * framework while the constructor of a Component is executed.
	 *
	 * Subclasses of Component should override this hook to implement any necessary
	 * initialization.
	 *
	 * @function
	 * @name sap.ui.core.Component.prototype.init
	 * @returns {void|undefined} This hook method must not have a return value. Return value <code>void</code> is deprecated since 1.120, as it does not force functions to <b>not</b> return something.
	 * 	This implies that, for instance, no async function returning a Promise should be used.
	 *
	 * 	<b>Note:</b> While the return type is currently <code>void|undefined</code>, any
	 *	implementation of this hook must not return anything but undefined. Any other
	 * 	return value will cause an error log in this version of UI5 and will fail in future
	 * 	major versions of UI5.
	 * @protected
	 */
	//Component.prototype.init = function() {};

	/**
	 * Cleans up the Component instance before destruction.
	 *
	 * Applications must not call this hook method directly, it is called by the
	 * framework when the element is {@link #destroy destroyed}.
	 *
	 * Subclasses of Component should override this hook to implement any necessary
	 * cleanup.
	 *
	 * @function
	 * @name sap.ui.core.Component.prototype.exit
	 * @returns {void|undefined} This hook method must not have a return value. Return value <code>void</code> is deprecated since 1.120, as it does not force functions to <b>not</b> return something.
	 * 	This implies that, for instance, no async function returning a Promise should be used.
	 *
	 * 	<b>Note:</b> While the return type is currently <code>void|undefined</code>, any
	 *	implementation of this hook must not return anything but undefined. Any other
	 * 	return value will cause an error log in this version of UI5 and will fail in future
	 * 	major versions of UI5.
	 * @protected
	 */
	//Component.prototype.exit = function() {};


	/**
	 * The window before unload hook. Override this method in your Component class
	 * implementation, to handle cleanup before the real unload or to prompt a question
	 * to the user, if the component should be exited.
	 *
	 * @return {string|undefined} a string if a prompt should be displayed to the user
	 *                  confirming closing the Component (e.g. when the Component is not yet saved),
	 * 					or <code>undefined</code> if no prompt should be shown.
	 *
	 * @public
	 * @since 1.15.1
	 * @name sap.ui.core.Component.prototype.onWindowBeforeUnload
	 * @function
	 * @deprecated Since version 1.119, recommended to use the browser-native page lifecycle API,
	 * providing events such as 'pageshow' and 'pagehide'
	 */
	//onWindowBeforeUnload : function() {},


	/**
	 * The window unload hook. Override this method in your Component class
	 * implementation, to handle cleanup of the component once the window
	 * will be unloaded (e.g. closed).
	 *
	 * @public
	 * @since 1.15.1
	 * @name sap.ui.core.Component.prototype.onWindowUnload
	 * @function
	 * @deprecated Since 1.119. Newer browser versions deprecate the browser-native 'unload' event.
	 * Therefore, the former API won't reliably work anymore. Please have a look at the
	 * browser-native page lifecycle API, e.g. its events 'pageshow' and 'pagehide'.
	 */
	//onWindowUnload : function() {},


	/**
	 * The window error hook. Override this method in your Component class implementation
	 * to listen to unhandled errors.
	 *
	 * @param {string} sMessage The error message.
	 * @param {string} sFile File where the error occurred
	 * @param {int} iLine Line number of the error
	 * @public
	 * @since 1.15.1
	 * @name sap.ui.core.Component.prototype.onWindowError
	 * @function
	 * @deprecated Since version 1.119, recommended to use the browser-native API
	 * to listen for errors: window.addEventListener("error", function() { ... })
	 */
	//onWindowError : null, // function(sMessage, sFile, iLine) - function not added directly as it might result in bad stack traces in older browsers


	/**
	 * The hook which gets called when the static configuration of the component
	 * has been changed by some configuration extension.
	 *
	 * @param {string} sConfigKey Error message.
	 * @public
	 * @since 1.15.1
	 * @name sap.ui.core.Component.prototype.onConfigChange
	 * @function
	 */
	//onConfigChange : null, // function(sConfigKey)

	function _applyCacheToken(oUri, oLogInfo, mMetadataUrlParams) {
		var sSource = mMetadataUrlParams ? "Model" : "DataSource";
		var sManifestPath = mMetadataUrlParams ? "[\"sap.ui5\"][\"models\"]" : "[\"sap.app\"][\"dataSources\"]";
		var sLanguage = mMetadataUrlParams && mMetadataUrlParams["sap-language"] || oUri.search(true)["sap-language"];
		var sClient = mMetadataUrlParams && mMetadataUrlParams["sap-client"] || oUri.search(true)["sap-client"];

		// 1. "sap-language" must be part of the annotation URI
		if (!sLanguage) {
			Log.warning("Component Manifest: Ignoring provided \"sap-context-token=" + oLogInfo.cacheToken + "\" for " + sSource + " \"" + oLogInfo.dataSource + "\" (" + oUri.toString() + "). " +
				"Missing \"sap-language\" URI parameter",
				sManifestPath + "[\"" + oLogInfo.dataSource + "\"]", oLogInfo.componentName);
			return;
		}

		// 2. "sap-client" must be set as URI param
		if (!sClient) {
			Log.warning("Component Manifest: Ignoring provided \"sap-context-token=" + oLogInfo.cacheToken + "\" for " + sSource + " \"" + oLogInfo.dataSource + "\" (" + oUri.toString() + "). " +
				"Missing \"sap-client\" URI parameter",
				sManifestPath + "[\"" + oLogInfo.dataSource + "\"]", oLogInfo.componentName);
			return;
		}

		// 3. "sap-client" must equal to the value of Configuration "sap-client"
		var sClientFromConfig = BaseConfig.get(getConfigParam("sapClient"));
		if (sClient !== sClientFromConfig) {
			Log.warning("Component Manifest: Ignoring provided \"sap-context-token=" + oLogInfo.cacheToken + "\" for " + sSource + " \"" + oLogInfo.dataSource + "\" (" + oUri.toString() + "). " +
				"URI parameter \"sap-client=" + sClient + "\" must be identical with configuration \"sap-client=" + sClientFromConfig + "\"",
				sManifestPath + "[\"" + oLogInfo.dataSource + "\"]", oLogInfo.componentName);
			return;
		}

		// 4. uri has cache-token that does not match the given one - override it
		if (oUri.hasQuery("sap-context-token") && !oUri.hasQuery("sap-context-token", oLogInfo.cacheToken) ||
			mMetadataUrlParams && mMetadataUrlParams["sap-context-token"] && mMetadataUrlParams["sap-context-token"] !== oLogInfo.cacheToken) {
			Log.warning("Component Manifest: Overriding existing \"sap-context-token=" + (oUri.query(true)["sap-context-token"] || mMetadataUrlParams["sap-context-token"]) + "\" with provided value \"" + oLogInfo.cacheToken + "\" for " + sSource + " \"" + oLogInfo.dataSource + "\" (" + oUri.toString() + ").",
			sManifestPath + "[\"" + oLogInfo.dataSource + "\"]", oLogInfo.componentName);
		}

		if (mMetadataUrlParams) {
			//if serviceUrl contains a valid cache token move it to metadataURLParams so it will be only added for the metadata request
			if (oUri.hasQuery("sap-context-token")) {
				Log.warning("Component Manifest: Move existing \"sap-context-token=" + oUri.query(true)["sap-context-token"] + "\" to metadataUrlParams for " + sSource + " \"" + oLogInfo.dataSource + "\" (" + oUri.toString() + ").",
				sManifestPath + "[\"" + oLogInfo.dataSource + "\"]", oLogInfo.componentName);
			}
			oUri.removeQuery("sap-context-token");
			mMetadataUrlParams["sap-context-token"] = oLogInfo.cacheToken;
		} else {
			oUri.setQuery("sap-context-token", oLogInfo.cacheToken);
		}

	}

	function _findManifestModelClasses(mOptions) {
		if (!mOptions.models) {
			// skipping model creation because of missing sap.ui5 models manifest entry
			return null;
		}

		var mConfig = {

			// ui5 model definitions
			models: mOptions.models,

			// optional dataSources from "sap.app" manifest
			dataSources: mOptions.dataSources || {},

			// to identify where the dataSources/models have been originally defined
			origin: {
				dataSources: {},
				models: {}
			}
		};

		var sLogComponentName = mOptions.componentName;
		var mModelConfigurations = {};

		// create a model for each ["sap.ui5"]["models"] entry
		for (var sModelName in mConfig.models) {

			var oModelConfig = mConfig.models[sModelName];

			// normalize dataSource shorthand, e.g.
			// "myModel": "myDataSource" => "myModel": { dataSource: "myDataSource" }
			if (typeof oModelConfig === 'string') {
				oModelConfig = {
					dataSource: oModelConfig
				};
			}

			// check for referenced dataSource entry and read out settings/uri/type
			// if not already provided in model config
			if (oModelConfig.dataSource) {

				var oDataSource = mConfig.dataSources && mConfig.dataSources[oModelConfig.dataSource];
				if (typeof oDataSource === 'object') {

					// default type is OData
					if (oDataSource.type === undefined) {
						oDataSource.type = 'OData';
					}

					var sODataVersion;

					// read out type and translate to model class
					// (only if no model type was set to allow overriding)
					if (!oModelConfig.type) {
						switch (oDataSource.type) {
							case 'OData':
								sODataVersion = oDataSource.settings && oDataSource.settings.odataVersion;
								if (sODataVersion === "4.0") {
									oModelConfig.type = 'sap.ui.model.odata.v4.ODataModel';
								} else if (!sODataVersion || sODataVersion === "2.0") {
									// 2.0 is the default in case no version is provided
									oModelConfig.type = 'sap.ui.model.odata.v2.ODataModel';
								} else {
									future.errorThrows(`${sLogComponentName}: Component Manifest: Provided OData version "${sODataVersion}" in dataSource "${oModelConfig.dataSource}" for model "${sModelName}" is unknown. ["sap.app"]["dataSources"]["${oModelConfig.dataSource}"].`,
										{ suffix: 'Falling back to default model type "sap.ui.model.odata.v2.ODataModel".' });
									oModelConfig.type = 'sap.ui.model.odata.v2.ODataModel';
								}
								break;
							case 'JSON':
								oModelConfig.type = 'sap.ui.model.json.JSONModel';
								break;
							case 'XML':
								oModelConfig.type = 'sap.ui.model.xml.XMLModel';
								break;
							default:
								// for custom dataSource types, the class should already be specified in the sap.ui5 models config
						}
					}
				}
			}

			// model type is required!
			if (!oModelConfig.type) {
				future.errorThrows(`${sLogComponentName}: Component Manifest: Missing "type" for model "${sModelName}". ["sap.ui5"]["models"]["${sModelName}"].`);
				continue;
			}

			// Add final configuration to result map
			mModelConfigurations[sModelName] = oModelConfig;
		}

		return mModelConfigurations;
	}

	/**
	 * Creates model configurations by processing "/sap.app/dataSources" and "/sap.ui5/models" manifest entries.
	 * Result can be handed over to _createManifestModels function in order to create instances.
	 *
	 * @param {object} mOptions Configuration object (see below)
	 * @param {object} mOptions.models Manifest models section (/sap.ui5/models)
	 * @param {object} mOptions.dataSources Manifest dataSources section (/sap.app/dataSources)
	 * @param {sap.ui.core.Component} [mOptions.component] Corresponding component instance
	 * @param {sap.ui.core.Manifest} [mOptions.manifest] Component manifest instance (defaults to component's manifest if not set)
	 * @param {boolean} [mOptions.mergeParent=false] Whether the component's parent configuration should be taken into account (only relevant when component is set)
	 * @param {object} [mOptions.componentData] componentData object which should be used to create the configurations (only relevant when component is not set, defaults to componentData of provided component)
	 * @param {string[]} [mOptions.activeTerminologies] optional list of active terminologies.
	 * @return {object} key-value map with model name as key and model configuration as value
	 * @private
	 */
	function _createManifestModelConfigurations(mOptions) {
		var oComponent = mOptions.component;
		var oManifest = mOptions.manifest || oComponent.getManifestObject();
		var bMergeParent = mOptions.mergeParent;
		var mCacheTokens = mOptions.cacheTokens || {};
		var sLogComponentName = oComponent ? oComponent.getMetadata().getComponentName() : oManifest.getComponentName();
		var aActiveTerminologies = mOptions.activeTerminologies;

		if (!mOptions.models) {
			// skipping model creation because of missing sap.ui5 models manifest entry
			return null;
		}

		var mConfig = {

			// ui5 model definitions
			models: mOptions.models,

			// optional dataSources from "sap.app" manifest
			dataSources: mOptions.dataSources || {},

			// to identify where the dataSources/models have been originally defined
			origin: {
				dataSources: {},
				models: {}
			}

		};

		if (oComponent && bMergeParent) {
			// identify the configuration in parent chain
			var oMeta = oComponent.getMetadata();
			while (oMeta instanceof ComponentMetadata) {
				var oCurrentManifest = oMeta.getManifestObject();

				var mCurrentDataSources = oMeta._getManifestEntry("/sap.app/dataSources");
				mergeDefinitionSource(mConfig.dataSources, mConfig.origin.dataSources, mCurrentDataSources, oCurrentManifest);

				var mCurrentModelConfigs = oMeta._getManifestEntry("/sap.ui5/models");
				mergeDefinitionSource(mConfig.models, mConfig.origin.models, mCurrentModelConfigs, oCurrentManifest);

				oMeta = oMeta.getParent();
			}
		}

		var mModelConfigurations = {};
		// create a model for each ["sap.ui5"]["models"] entry
		for (var sModelName in mConfig.models) {

			var oModelConfig = mConfig.models[sModelName];
			var fnClass = sap.ui.require(oModelConfig.type.replace(/\./g, "/"));
			/** @deprecated since 1.120 */
			if (!fnClass) {
				fnClass =  ObjectPath.get(oModelConfig.type);
			}
			// class could not be loaded by _loadManifestModelClasses, or module export is not
			// a valid UI5 class (no metadata available) -> a legacy testcases exist for this scenario!
			if (!fnClass?.getMetadata) {
				future.errorThrows(`${sLogComponentName}: Component Manifest: Class "${oModelConfig.type}" for model "${sModelName}" could not be found. ["sap.ui5"]["models"]["${sModelName}"].`);
				continue;
			}
			var oClassMetadata = fnClass.getMetadata();

			var bIsV1Model = oClassMetadata.isA("sap.ui.model.odata.ODataModel");
			var bIsV2Model = oClassMetadata.isA("sap.ui.model.odata.v2.ODataModel");
			var bIsV4Model = oClassMetadata.isA("sap.ui.model.odata.v4.ODataModel");
			var bIsResourceModel = oClassMetadata.isA("sap.ui.model.resource.ResourceModel");

			var bIsDataSourceUri = false;
			var mMetadataUrlParams = null;

			// normalize dataSource shorthand, e.g.
			// "myModel": "myDataSource" => "myModel": { dataSource: "myDataSource" }
			if (typeof oModelConfig === 'string') {
				oModelConfig = {
					dataSource: oModelConfig
				};
			}

			// check for referenced dataSource entry and read out settings/uri/type
			// if not already provided in model config
			if (oModelConfig.dataSource) {

				var oDataSource = mConfig.dataSources && mConfig.dataSources[oModelConfig.dataSource];
				if (typeof oDataSource === 'object') {

					// default type is OData
					if (oDataSource.type === undefined) {
						oDataSource.type = 'OData';
					}

					// pass OData service version (e.g. "2.0"), if specified, to the OData V4 model
					if (bIsV4Model && oDataSource.settings && oDataSource.settings.odataVersion) {
						oModelConfig.settings = oModelConfig.settings || {};
						oModelConfig.settings.odataVersion = oDataSource.settings.odataVersion;
					}

					// use dataSource uri if it isn't already defined in model config
					if (!oModelConfig.uri) {
						oModelConfig.uri = oDataSource.uri;
						bIsDataSourceUri = true;
					}

					if (oDataSource.type === 'OData' && oDataSource.settings) {
						oModelConfig.settings = oModelConfig.settings || {};

						if (typeof oDataSource.settings.maxAge === "number") {
							oModelConfig.settings.headers = oModelConfig.settings.headers || {};
							oModelConfig.settings.headers["Cache-Control"] = "max-age=" + oDataSource.settings.maxAge;
						}

						// Pass the ODataModel's "ignoreAnnotationsFromMetadata" setting, if specified
						if ("ignoreAnnotationsFromMetadata" in oDataSource.settings) {
							oModelConfig.settings.ignoreAnnotationsFromMetadata = oDataSource.settings.ignoreAnnotationsFromMetadata;
						}

						// read out OData annotations and create ODataModel settings for it
						if (oDataSource.settings.annotations) {
							var aAnnotations = oDataSource.settings.annotations;

							for (var i = 0; i < aAnnotations.length; i++) {
								var sAnnotation = aAnnotations[i];
								var oAnnotation = mConfig.dataSources[sAnnotation];

								// dataSource entry should be defined!
								if (!oAnnotation) {
									future.errorThrows(`${sLogComponentName}: Component Manifest: ODataAnnotation "${sAnnotation}" for dataSource "${oModelConfig.dataSource}" could not be found in manifest. ["sap.app"]["dataSources"]["${sAnnotation}"].`);
									continue;
								}

								// type should be ODataAnnotation!
								if (oAnnotation.type !== 'ODataAnnotation') {
									future.errorThrows(`${sLogComponentName}: Component Manifest: dataSource "${sAnnotation}" was expected to have type "ODataAnnotation" but was "${oAnnotation.type}". ["sap.app"]["dataSources"]["${sAnnotation}"].`);
									continue;
								}

								// uri is required!
								if (!oAnnotation.uri) {
									future.errorThrows(`${sLogComponentName}: Component Manifest: Missing "uri" for ODataAnnotation "${sAnnotation}". ["sap.app"]["dataSources"]["${sAnnotation}"].`);
									continue;
								}

								var oAnnotationUri = new URI(oAnnotation.uri);

								if (bIsV2Model || bIsV4Model) {
									var sValueFromConfig = Localization.getSAPLogonLanguage();
									if (!oAnnotationUri.hasQuery("sap-language") && sValueFromConfig) {
										oAnnotationUri.setQuery("sap-language", sValueFromConfig);
									}
									sValueFromConfig = BaseConfig.get(getConfigParam("sapClient"));
									if (!oAnnotationUri.hasQuery("sap-client") && sValueFromConfig) {
										oAnnotationUri.setQuery("sap-client", sValueFromConfig);
									}

									var sCacheTokenForAnnotation = mCacheTokens.dataSources && mCacheTokens.dataSources[oAnnotation.uri];
									if (sCacheTokenForAnnotation) {
										_applyCacheToken(oAnnotationUri, {
											cacheToken: sCacheTokenForAnnotation,
											componentName: sLogComponentName,
											dataSource: sAnnotation
										});
									}
								}

								// resolve relative to component, ui5:// URLs are already resolved upfront
								var oAnnotationSourceManifest = mConfig.origin.dataSources[aAnnotations[i]] || oManifest;
								var sAnnotationUri = oAnnotationSourceManifest.resolveUri(oAnnotationUri.toString());

								// add uri to annotationURI array in settings (this parameter applies for ODataModel v1 & v2)
								oModelConfig.settings.annotationURI = oModelConfig.settings.annotationURI || [];
								oModelConfig.settings.annotationURI.push(sAnnotationUri);
							}
						}

					}

				} else {
					future.errorThrows(`${sLogComponentName}: Component Manifest: dataSource "${oModelConfig.dataSource}" for model "${sModelName}" not found or invalid. ["sap.app"]["dataSources"]["${oModelConfig.dataSource}"].`);
					continue;
				}
			}

			// set mode of old ODataModel to "json" (default is xml).
			// as the automatic model creation is a new feature, this is not incompatible here
			if (bIsV1Model && (!oModelConfig.settings || oModelConfig.settings.json === undefined)) {
					// do not overwrite the flag if it was explicitly defined!
					oModelConfig.settings = oModelConfig.settings || {};
					oModelConfig.settings.json = true;
			}

			// Check resource models for bundleUrl configuration
			if (bIsResourceModel) {
				if (oModelConfig.uri && oModelConfig.settings && oModelConfig.settings.bundleUrl) {
					Log.warning("Defining both model uri and bundleUrl is not supported. Only model uri will be resolved.");
				}

				// in case of terminologies and the bundleUrl is defined, map bundleUrl to uri
				if (!oModelConfig.uri && oModelConfig.settings && oModelConfig.settings.terminologies) {
					if (oModelConfig.bundleUrl || oModelConfig.settings.bundleUrl) {
						oModelConfig.uri = oModelConfig.bundleUrl || oModelConfig.settings.bundleUrl;
						delete oModelConfig.settings.bundleUrl;
					}
				}
			}

			// adopt model uri
			if (oModelConfig.uri) {

				// parse model URI to be able to modify it
				var oUri = new URI(oModelConfig.uri);

				// resolve URI relative to component which defined it
				var oUriSourceManifest = (bIsDataSourceUri ? mConfig.origin.dataSources[oModelConfig.dataSource] : mConfig.origin.models[sModelName]) || oManifest;
				oUri = new URI(oUriSourceManifest.resolveUri(oModelConfig.uri));

				// inherit sap-specific parameters from document (only if "sap.app/dataSources" reference is defined)
				if (oModelConfig.dataSource) {
					addSapParams(oUri);

					if (bIsV2Model || bIsV4Model) {

						var oModelDataSource = mConfig.dataSources && mConfig.dataSources[oModelConfig.dataSource];
						var sCacheToken = mCacheTokens.dataSources && mCacheTokens.dataSources[oModelDataSource.uri];
						// Handle sap-language URI parameter
						// Do not add it if it is already set in the "metadataUrlParams" or is part of the model URI
						mMetadataUrlParams = oModelConfig.settings && oModelConfig.settings.metadataUrlParams;
						var bNeedsLanguage = (!mMetadataUrlParams || typeof mMetadataUrlParams['sap-language'] === 'undefined')
							&& !oUri.hasQuery('sap-language')
							&& Localization.getSAPLogonLanguage();

						if (bNeedsLanguage || sCacheToken) {
							// Lazy initialize settings and metadataUrlParams objects
							oModelConfig.settings = oModelConfig.settings || {};
							mMetadataUrlParams = oModelConfig.settings.metadataUrlParams = oModelConfig.settings.metadataUrlParams || {};

							// Add sap-language only to $metadata URL params
							if (bNeedsLanguage) {
								mMetadataUrlParams['sap-language'] = Localization.getSAPLogonLanguage();
							}
						}

						// Handle cacheToken
						if (sCacheToken) {
							_applyCacheToken(oUri, {
								cacheToken: sCacheToken,
								componentName: sLogComponentName,
								dataSource: sModelName
							}, mMetadataUrlParams);
						}
					}
				}

				oModelConfig.uri = oUri.toString();
			}

			// set model specific "uri" property names which should be used to map "uri" to model specific constructor
			// (only if it wasn't specified before)
			if (oModelConfig.uriSettingName === undefined) {
				if (bIsV1Model || bIsV2Model || bIsV4Model) {
					oModelConfig.uriSettingName = 'serviceUrl';
				} else if (bIsResourceModel) {
					oModelConfig.uriSettingName = 'bundleUrl';
				} else {
					// default 'undefined' is already set in this case
				}
			}

			// Origin: if sap-system paramter is given -> add this alias to the service url(s) of ODataModels
			var sSystemParameter;
			var oComponentData;
			if (oComponent) {
				oComponentData = oComponent.getComponentData();
			} else {
				oComponentData = mOptions.componentData;
			}
			sSystemParameter = oComponentData && oComponentData.startupParameters && oComponentData.startupParameters["sap-system"];
			// Check the URL as "fallback", the system parameter of the componentData.startup has precedence over a URL parameter
			if (!sSystemParameter) {
				sSystemParameter = BaseConfig.get(getConfigParam("sapSystem"));
			}

			// lazy load the ODataUtils if systemParameter is given
			var bAddOrigin = false;
			var ODataUtils;
			if (sSystemParameter && (bIsV1Model || bIsV2Model || bIsV4Model)) {
				bAddOrigin = true;
				ODataUtils = sap.ui.require("sap/ui/model/odata/ODataUtils");
			}

			// include "uri" property in "settings" object, depending on "uriSettingName"
			if (oModelConfig.uri) {

				if (bAddOrigin) {
					// Origin segment: pre- and postOriginBaseUris do not include uri params, they will be used for annotation uri adaption
					oModelConfig.preOriginBaseUri = oModelConfig.uri.split("?")[0];
					oModelConfig.uri = ODataUtils.setOrigin(oModelConfig.uri, {
						alias: sSystemParameter
					});
					oModelConfig.postOriginBaseUri = oModelConfig.uri.split("?")[0];
				}

				if (oModelConfig.uriSettingName !== undefined) {
					oModelConfig.settings = oModelConfig.settings || {};

					// do not override the property if it's already defined!
					if (!oModelConfig.settings[oModelConfig.uriSettingName]) {
						oModelConfig.settings[oModelConfig.uriSettingName] = oModelConfig.uri;
					}

				} else if (oModelConfig.settings) {
					// shift settings to 2nd argument if no "uriSettingName" was specified
					oModelConfig.settings = [ oModelConfig.uri, oModelConfig.settings ];
				} else {
					// only use 1st argument with "uri" string if there are no settings
					oModelConfig.settings = [ oModelConfig.uri ];
				}
			} else if (bAddOrigin && oModelConfig.uriSettingName !== undefined && oModelConfig.settings && oModelConfig.settings[oModelConfig.uriSettingName]) {
				// Origin segment: only if the uri is given via the respective settingsName, e.g. "serviceURL"
				oModelConfig.preOriginBaseUri = oModelConfig.settings[oModelConfig.uriSettingName].split("?")[0];
				oModelConfig.settings[oModelConfig.uriSettingName] = ODataUtils.setOrigin(oModelConfig.settings[oModelConfig.uriSettingName], {
					alias: sSystemParameter
				});
				oModelConfig.postOriginUri = oModelConfig.settings[oModelConfig.uriSettingName].split("?")[0];
			}

			// Origin segment: Adapt annotation uris here, based on the base part of the service uri.
			// Replaces the base uri prefix with the one after adding the origin
			if (bAddOrigin && oModelConfig.settings && oModelConfig.settings.annotationURI) {
				var aAnnotationUris = [].concat(oModelConfig.settings.annotationURI); //"to array"
				var aOriginAnnotations = [];
				for (var k = 0; k < aAnnotationUris.length; k++) {
					aOriginAnnotations.push(ODataUtils.setAnnotationOrigin(aAnnotationUris[k], {
						alias: sSystemParameter,
						preOriginBaseUri: oModelConfig.preOriginBaseUri,
						postOriginBaseUri: oModelConfig.postOriginBaseUri
					}));
				}
				oModelConfig.settings.annotationURI = aOriginAnnotations;
			}

			// resolve the bundleUrl of the enhancing resource bundle relative to
			// the component (default) or relative to manifest, e.g.:
			// bundleUrlRelativeTo: 'component|manifest'
			if (bIsResourceModel && oModelConfig.settings) {
				if (aActiveTerminologies) {
					oModelConfig.settings.activeTerminologies = aActiveTerminologies;
				}

				_UrlResolver._processResourceConfiguration(oModelConfig.settings, {
					alreadyResolvedOnRoot: true,
					baseURI: oManifest._oBaseUri,
					manifestBaseURI: oManifest._oManifestBaseUri,
					relativeTo: undefined
				});
			}

			// normalize settings object to array
			if (oModelConfig.settings && !Array.isArray(oModelConfig.settings)) {
				oModelConfig.settings = [ oModelConfig.settings ];
			}

			// Add final configuration to result map
			mModelConfigurations[sModelName] = oModelConfig;

		}

		if (oManifest.getEntry("/sap.ui5/commands") || (oComponent && oComponent._getManifestEntry("/sap.ui5/commands", true))) {
			// add $cmd model for CommandExecution
			mModelConfigurations["$cmd"] = {
				type: 'sap.ui.model.json.JSONModel'
			};
		}

		return mModelConfigurations;
	}

	/**
	 * @private
	 * @ui5-transform-hint replace-param bSync false
	 */
	function _loadManifestModelClasses(mModelConfigurations, sLogComponentName, bSync) {
		const aLoadPromises = [];

		function logLoadingError(sModelClassName, sModelName, oError) {
			future.errorThrows(`${sLogComponentName}: Component Manifest: Class "${sModelClassName}" for model "${sModelName}" could not be loaded. ["sap.ui5"]["models"]["${sModelName}"].`, { cause: oError });
		}

		for (const sModelName in mModelConfigurations) {
			const oModelConfig = mModelConfigurations[sModelName];
			const sModelClass = oModelConfig.type.replace(/\./g, "/");

			/** @deprecated since 1.120 */
			if (bSync) {
				// load model class and log error message if it couldn't be loaded.
				// error gets caught to continue creating the other models and not breaking the execution here
				try {
					sap.ui.requireSync(sModelClass); // legacy-relevant
				} catch (oError) {
					logLoadingError(oModelConfig.type, sModelName, oError);
				}
				continue; // note: we want to skip the below async processing!
			}

			aLoadPromises.push(new Promise((resolve, reject) => {
				sap.ui.require([sModelClass], resolve, reject);
			}).catch(logLoadingError.bind(null, oModelConfig.type, sModelName)));
		}

		return Promise.all(aLoadPromises);
	}

	/**
	 * Creates model instances using a configuration provided by {@link _createManifestModelConfigurations}.
	 *
	 * @param {object} mModelConfigurations key-value configuration object created via {@link _createManifestModelConfigurations}
	 * @param {object} oConfig see <code>sap.ui.component</code> / <code>sap.ui.component.load</code>
	 * @param {object} oManifest The manifest object
	 * @returns {object} key-value map with model name as key and model instance as value
	 * @private
	 */
	function _createManifestModels(mModelConfigurations, oConfig, oManifest) {
		var mModels = {};
		for (var sModelName in mModelConfigurations) {
			var oModelConfig = mModelConfigurations[sModelName];

			// TODO The tests for the Model creation make use of a constructor stub,
			// and this only works from the global namespace export, not via probing require.
			// To keep those tests working, the global name is checked first. Only in a context
			// where global names don't exist or when the model is unknown, the fallback will be used.
			let fnModelClass;
			/** @deprecated since 1.120 */
			fnModelClass = ObjectPath.get(oModelConfig.type);

			if (!fnModelClass) {
				fnModelClass = sap.ui.require(oModelConfig.type.replace(/\./g, "/"));
			}

			// create arguments array with leading "null" value so that it can be passed to the apply function
			var aArgs = [null].concat(oModelConfig.settings || []);

			// create factory function by calling "Model.bind" with the provided arguments
			var fnFactory = fnModelClass.bind.apply(fnModelClass, aArgs);

			// the factory will create the model with the arguments above
			var oModel = new fnFactory();

			// Call hook and provide model instance, manifest model ID to UI5 flex lib
			if (oModel.isA("sap.ui.model.odata.v2.ODataModel") || oModel.isA("sap.ui.model.odata.v4.ODataModel")) {
				const oInfo = {
					factoryConfig: oConfig,
					manifest: oManifest,
					model: oModel,
					modelId: sModelName
				};
				const oOwnerComponent = Component.getComponentById(_runWithOwner.getCurrentOwnerId());
				if (oOwnerComponent) {
					oInfo.owner = {
						id: _runWithOwner.getCurrentOwnerId(),
						config: oOwnerComponent._componentConfig
					};
				}
				ComponentHooks.onModelCreated.execute(oInfo);
			}

			// add model instance to the result map
			mModels[sModelName] = oModel;
		}
		return mModels;
	}

	/**
	 * Returns two maps of model configurations to be used for the model "preload" feature.
	 * Used within loadComponent to create models during component load.
	 *
	 * "afterManifest"
	 * Models that are configured for preload via "preload=true" or URI parameter.
	 * They will be created after the manifest is available.
	 *
	 * "afterPreload"
	 * Currently only for ResourceModels with async=false (default) to prevent sync requests
	 * by loading the corresponding ResourceBundle in advance.
	 * They will be created after the Component-preload has been loaded, as most apps package
	 * their ResourceBundles within the Component-preload.
	 *
	 * @param {sap.ui.core.Manifest} oManifest Manifest instance
	 * @param {object} [oComponentData] optional component data object
	 * @param {object} [mCacheTokens] optional cache tokens for OData models
	 * @param {string[]} [aActiveTerminologies] optional list of active terminologies
	 * @returns {object} object with two maps, see above
	 */
	function getPreloadModelConfigsFromManifest(oManifest) {
		var mModelConfigs = {
			afterManifest: {},
			afterPreload: {}
		};

		// deep clone is needed as manifest only returns a read-only copy (frozen object)
		var oManifestDataSources = merge({}, oManifest.getEntry("/sap.app/dataSources"));
		var oManifestModels = merge({}, oManifest.getEntry("/sap.ui5/models"));
		var sComponentName = oManifest.getComponentName();
		var mAllModelConfigurations = _findManifestModelClasses({
			models: oManifestModels,
			dataSources: oManifestDataSources,
			componentName: sComponentName
		});

		// Read internal URI parameter to enable model preload for testing purposes
		// Specify comma separated list of model names. Use an empty segment for the "default" model
		// Examples:
		//   sap-ui-xx-preload-component-models-<componentName>=, => preload default model (empty string key)
		//   sap-ui-xx-preload-component-models-<componentName>=foo, => preload "foo" + default model (empty string key)
		//   sap-ui-xx-preload-component-models-<componentName>=foo,bar => preload "foo" + "bar" models
		var sPreloadModels = new URLSearchParams(window.location.search).get("sap-ui-xx-preload-component-models-" + oManifest.getComponentName());
		var aPreloadModels = sPreloadModels && sPreloadModels.split(",");

		for (var sModelName in mAllModelConfigurations) {
			var mModelConfig = mAllModelConfigurations[sModelName];

			// activate "preload" flag in case URI parameter for testing is used (see code above)
			if (!mModelConfig.preload && aPreloadModels && aPreloadModels.indexOf(sModelName) > -1 ) {
				mModelConfig.preload = true;
				Log.warning("FOR TESTING ONLY!!! Activating preload for model \"" + sModelName + "\" (" + mModelConfig.type + ")",
					sComponentName, "sap.ui.core.Component");
			}

			// ResourceModels with async=false should be always loaded beforehand to get rid of sync requests under the hood (regardless of the "preload" flag)
			if (mModelConfig.type === "sap.ui.model.resource.ResourceModel" &&
				(!mModelConfig.settings ||
				mModelConfig.settings.async !== true)
			) {
				// Use separate config object for ResourceModels as the resourceBundle might be
				// part of the Component-preload which isn't available when the regular "preloaded"-models are created
				mModelConfigs.afterPreload[sModelName] = mModelConfig;
			} else if (mModelConfig.preload) {
				// Only create models:
				//   - which are flagged for preload (mModelConfig.preload) or configured via internal URI param (see above)
				//   - in case the model class is already loaded (otherwise log a warning)
				// We check for the moduleState here instead of a simple sap.ui.require probing, because it captures the following cases:
				//   - modules defined in a preload (via predefine) are "available, but not executed"
				//   - modules which are already loaded/executed
				if (sap.ui.loader._.getModuleState(mModelConfig.type.replace(/\./g, "/") + ".js")) {
					mModelConfigs.afterManifest[sModelName] = mModelConfig;
				} else {
					Log.warning("Can not preload model \"" + sModelName + "\" as required class has not been loaded: \"" + mModelConfig.type + "\"",
						sComponentName, "sap.ui.core.Component");
				}
			}

		}

		return mModelConfigs;
	}

	/**
	 * Retrieves the component manifest url.
	 * @param {string} sComponentName component name.
	 * @returns {string} component manifest url.
	 */
	function getManifestUrl(sComponentName){
		return sap.ui.require.toUrl(sComponentName.replace(/\./g, "/") + "/manifest.json");
	}

	/*
	 * Registers a URL prefix for a module name prefix
	 */
	function registerModulePath(sModuleNamePrefix, vUrlPrefix) {
		LoaderExtensions.registerResourcePath(sModuleNamePrefix.replace(/\./g, "/"), vUrlPrefix);
	}

	function loadManifests(oRootMetadata) {
		var aManifestsToLoad = [];

		/**
		 * Collects the promises to load the manifest content and all of its parents manifest files.
		 *
		 * Gathers promises within aManifestsToLoad.
		 * Gathers associates meta data objects within aMetadataObjects.
		 * @param {object} oMetadata The metadata object
		 */
		function collectLoadManifestPromises(oMetadata) {
			// ComponentMetadata classes with a static manifest or with legacy metadata
			// do already have a manifest, so no action required
			if (!oMetadata._oManifest) {
				// TODO: If the "manifest" property is set, the code to load the manifest.json could be moved up to run in
				// parallel with the ResourceModels that are created (after the Component-preload has finished) to trigger
				// a potential request a bit earlier. Right now the whole component loading would be delayed by the async request.

				var sName = oMetadata.getComponentName();
				var sDefaultManifestUrl = getManifestUrl(sName);

				// We need to load the manifest.json for the metadata class as
				// it might differ from the one already loaded
				// If the manifest.json is part of the Component-preload it will be taken from there
				var pLoadManifest = LoaderExtensions.loadResource({
					url: sDefaultManifestUrl,
					dataType: "json",
					async: true
				}).catch(function(oError) {
					Log.error(
						"Failed to load component manifest from \"" + sDefaultManifestUrl + "\" (component " + sName
						+ ")! Reason: " + oError
					);

					// If the request fails, ignoring the error would end up in a sync call, which would fail, too.
					return {};
				}).then(async function(oManifestJson) {
					if (oManifestJson) {
						oMetadata._applyManifest(oManifestJson, true /* skip processing */);
						// Resolve command descriptions
						await _resolveCommandsInManifest(oMetadata.getManifestObject());

						return oMetadata.getManifestObject()._processI18n(true);
					}
				});

				aManifestsToLoad.push(pLoadManifest);
			}

			var oParentMetadata = oMetadata.getParent();
			if (oParentMetadata && (oParentMetadata instanceof ComponentMetadata) && !oParentMetadata.isBaseClass()) {
				collectLoadManifestPromises(oParentMetadata);
			}
		}

		collectLoadManifestPromises(oRootMetadata);

		return Promise.all(aManifestsToLoad);
	}

	/**
	 * Asynchronously creates a new component instance from the given configuration.
	 *
	 * If the component class does not already exists, the component class is loaded and
	 * afterwards the new component instance is created.
	 *
	 * To optimize the loading process, additional <code>asyncHints</code> can be provided. The structure of
	 * these hints and how they impact the loading of components is an internal feature of this API and reserved
	 * for UI5 internal use only. Code that wants to be safe wrt. version updates, should not use the
	 * <code>asyncHints</code> property.
	 *
	 * If Components and/or libraries are listed in the <code>asyncHints</code>, all the corresponding preload
	 * files will be requested in parallel, loading errors (404s) will be ignored. The constructor class will
	 * only be required after all preloads have been rejected or resolved. Only then, the new instance will
	 * be created.
	 *
	 * A component can implement the {@link sap.ui.core.IAsyncContentCreation} interface.
	 * Please see the respective documentation for more information.
	 *
	 * @example
	 *
	 *   Component.create({
	 *     name: "my.comp",
	 *     url: "find/my/comp/here",
	 *     id: "myCompId1"
	 *   }).then(function(oComponent) {
	 *     ...
	 *   });
	 *
	 * @param {object} mOptions Configuration options
	 * @param {string} mOptions.name Name of the component to load, this is the dot-separated name of the package
	 *     that contains the Component.js module;
	 *     Even when an alternative location is specified from which the manifest should be loaded
	 *     (<code>mOptions.manifest</code> is set to a non-empty string), then the name specified in that
	 *     manifest will be ignored and this name will be used instead to determine the module to be loaded.
	 * @param {string} [mOptions.url] Alternative location from where to load the Component. If <code>mOptions.manifest</code>
	 *     is set to a non-empty string, this URL specifies the location of the final component defined via that
	 *     manifest, otherwise it specifies the location of the component defined via its name <code>mOptions.name</code>.
	 * @param {object} [mOptions.componentData] Initial data of the Component, see {@link sap.ui.core.Component#getComponentData}.
	 * @param {sap.ui.core.ID} [mOptions.id] ID of the new Component
	 * @param {string[]} [mOptions.activeTerminologies] List of active terminologies.
	 *              The order of the given active terminologies is significant. The {@link module:sap/base/i18n/ResourceBundle ResourceBundle} API
	 *              documentation describes the processing behavior in more detail.
	 *              Please have a look at this dev-guide chapter for general usage instructions: {@link topic:eba8d25a31ef416ead876e091e67824e Text Verticalization}.
	 * @param {object} [mOptions.settings] Settings of the new Component
	 * @param {boolean|string|object} [mOptions.manifest=true] Whether and from where to load the manifest.json for the Component.
	 *     When set to any truthy value, the manifest will be loaded and evaluated before the Component controller.
	 *     If it is set to a falsy value, the manifest will not be evaluated before the controller. It might still be loaded synchronously
	 *     if declared in the Component metadata.
	 *     A non-empty string value will be interpreted as the URL to load the manifest from.
	 *     If the manifest could not be loaded from a given URL, the Promise returned by the </code>Component.create</code> factory rejects.
	 *     A non-null object value will be interpreted as manifest content.
	 *     <b>Note:</b> If a manifest is provided as URL or plain object, it must use the same major schema version as the original manifest
	 *      to avoid incompatible changes in the behavior of the component.
	 * @param {string} [mOptions.altManifestUrl] @since 1.61.0 Alternative URL for the manifest.json. If <code>mOptions.manifest</code>
	 *     is set to an object value, this URL specifies the location to which the manifest object should resolve the relative
	 *     URLs to.
	 * @param {string} [mOptions.handleValidation=false] If set to <code>true</code> validation of the component is handled by the <code>Messaging</code>
	 * @param {object} [mOptions.asyncHints] Hints for asynchronous loading.
	 *     <b>Beware:</b> This parameter is only used internally by the UI5 framework and compatibility cannot be guaranteed.
	 *     The parameter must not be used in productive code, except in code delivered by the UI5 teams.
	 * @param {string[]|object[]} [mOptions.asyncHints.components] a list of components needed by the current component and its subcomponents
	 *     The framework will try to preload these components (their Component-preload.js) asynchronously, errors will be ignored.
	 *     Please note that the framework has no knowledge about whether a Component provides a preload file or whether it is bundled
	 *     in some library preload. If Components are listed in the hints section, they will be preloaded.
	 *     Instead of specifying just the names of components, an object might be given that contains a
	 *     mandatory <code>name</code> property and optionally, an <code>url</code> that will be used for a <code>registerModulePath</code>,
	 *     and/or a <code>lazy</code> property. When <code>lazy</code> is set to a truthy value, only a necessary <code>registerModulePath</code>
	 *     will be executed, but the corresponding component won't be preloaded.
	 * @param {string[]|object[]} [mOptions.asyncHints.libs] libraries needed by the Component and its subcomponents
	 *     These libraries should be (pre-)loaded before the Component.
	 *     The framework will asynchronously load those libraries, if they're not loaded yet.
	 *     Instead of specifying just the names of libraries, an object might be given that contains a
	 *     mandatory <code>name</code> property and optionally, an <code>url</code> that will be used for a <code>registerModulePath</code>,
	 *     and/or a <code>lazy</code> property. When <code>lazy</code> is set to a truthy value, only a necessary <code>registerModulePath</code>
	 *     will be executed, but the corresponding library won't be preloaded.
	 * @param {string[]|object[]} [mOptions.asyncHints.preloadBundles] a list of additional preload bundles
	 *     The framework will try to load these bundles asynchronously before requiring the Component, errors will be ignored.
	 *     The named modules must only represent preload bundles. If they are normal modules, their dependencies
	 *     will be loaded with the normal synchronous request mechanism and performance might degrade.
	 *     Instead of specifying just the names of preload bundles, an object might be given that contains a
	 *     mandatory <code>name</code> property and optionally, an <code>url</code> that will be used for a <code>registerModulePath</code>.
	 * @param {Promise|Promise[]} [mOptions.asyncHints.waitFor] <code>Promise</code> or array of <code>Promise</code>s for which the Component instantiation should wait
	 * @returns {Promise<sap.ui.core.Component>} A Promise that resolves with the newly created component instance
	 * @throws {TypeError} When <code>mOptions</code> is null or not an object.
	 * @since 1.56.0
	 * @static
	 * @public
	 */
	Component.create = function(mOptions) {
		if (mOptions == null || typeof mOptions !== "object") {
			throw new TypeError("Component.create() must be called with a configuration object.");
		}

		var mParameters = merge({}, mOptions);
		mParameters.async = true;

		// if no manifest option is given, the default is true
		// Note: this intentionally prevents the use of the legacy options manifestUrl and manifestFirst
		if (mParameters.manifest === undefined) {
			mParameters.manifest = true;
		}

		return componentFactory(mParameters);
	};

	/**
	 * Creates a new instance of a <code>Component</code> or returns the instance
	 * of an existing <code>Component</code>.
	 *
	 * If you want to look up an existing <code>Component</code> you can call
	 * this function with a Component ID as parameter:
	 * <pre>
	 *   var oComponent = sap.ui.component(sComponentId);
	 * </pre>
	 *
	 * To create a new instance of a component you pass a component configuration
	 * object into this function:
	 * <pre>
	 *   var oComponent = sap.ui.component({
	 *     name: "my.Component",
	 *     url: "my/component/location",
	 *     id: "myCompId1"
	 *   });
	 * </pre>
	 *
	 * @param {string|object} vConfig ID of an existing Component or the configuration object to create the Component
	 * @param {string} vConfig.name Name of the Component to load, as a dot-separated name;
	 *              Even when an alternative location is specified from which the manifest should be loaded (e.g.
	 *              <code>vConfig.manifest</code> is set to a non-empty string), then the name specified in that
	 *              manifest will be ignored and this name will be used instead to determine the module to be loaded.
	 * @param {string} [vConfig.url] Alternative location from where to load the Component. If a <code>manifestUrl</code> is given, this URL specifies the location of the final component defined via that manifest, otherwise it specifies the location of the component defined via its name <code>vConfig.name</code>.
	 * @param {object} [vConfig.componentData] Initial data of the Component, see {@link sap.ui.core.Component#getComponentData}
	 * @param {string} [vConfig.id] sId of the new Component
	 * @param {object} [vConfig.settings] Settings of the new Component
	 * @param {string[]} [vConfig.activeTerminologies] List of active terminologies.
	 *              The order of the given active terminologies is significant. The {@link module:sap/base/i18n/ResourceBundle ResourceBundle} API
	 *              documentation describes the processing behavior in more detail.
	 *              Please also have a look at this dev-guide chapter for general usage instructions: {@link topic:eba8d25a31ef416ead876e091e67824e Text Verticalization}.
	 * @param {boolean} [vConfig.async] Indicates whether the Component creation should be done asynchronously; defaults to true when using the manifest property with a truthy value otherwise the default is false (experimental setting)
	 * @param {object} [vConfig.asyncHints] @since 1.27.0 Hints for the asynchronous loading.
	 *     <b>Beware:</b> This parameter is only used internally by the UI5 framework and compatibility cannot be guaranteed.
	 *     The parameter must not be used in productive code, except in code delivered by the UI5 teams.
	 * @param {string[]} [vConfig.asyncHints.libs] Libraries that should be (pre-)loaded before the Component (experimental setting)
	 * @param {string[]} [vConfig.asyncHints.components] Components that should be (pre-)loaded before the Component (experimental setting)
	 * @param {Promise|Promise[]} [vConfig.asyncHints.waitFor] @since 1.37.0 a <code>Promise</code> or and array of <code>Promise</code>s for which the Component instantiation should wait (experimental setting)
	 * @param {boolean|string|object} [vConfig.manifest=undefined] @since 1.49.0 Controls when and from where to load the manifest for the Component.
	 *              When set to any truthy value, the manifest will be loaded asynchronously by default and evaluated before the Component controller, if it is set to a falsy value
	 *              other than <code>undefined</code>, the manifest will be loaded after the controller.
	 *              A non-empty string value will be interpreted as the URL location from where to load the manifest.
	 *              A non-null object value will be interpreted as manifest content.
	 *              Setting this property to a value other than <code>undefined</code>, completely deactivates the properties
	 *              <code>manifestUrl</code> and <code>manifestFirst</code>, no matter what their values are.
	 * @param {string} [vConfig.manifestUrl] @since 1.33.0 Specifies the URL from where the manifest should be loaded from
	 *              Using this property implies <code>vConfig.manifestFirst=true</code>.
	 *              <br/><b>DEPRECATED since 1.49.0, use <code>vConfig.manifest=url</code> instead!</b>.
	 *              Note that this property is ignored when <code>vConfig.manifest</code> has a value other than <code>undefined</code>.
	 * @param {boolean} [vConfig.manifestFirst] @since 1.33.0 defines whether the manifest is loaded before or after the
	 *              Component controller. Defaults to <code>sap.ui.getCore().getConfiguration().getManifestFirst()</code>
	 *              <br/><b>DEPRECATED since 1.49.0, use <code>vConfig.manifest=true|false</code> instead!</b>
	 *              Note that this property is ignored when <code>vConfig.manifest</code> has a value other than <code>undefined</code>.
	 * @param {string} [vConfig.handleValidation=false] If set to <code>true</code> validation of the component is handled by the <code>Messaging</code>
	 * @returns {sap.ui.core.Component|Promise} the Component instance or a Promise in case of asynchronous loading
	 *
	 * @deprecated Since 1.56, use {@link sap.ui.core.Component.get Component.get} or {@link sap.ui.core.Component.create Component.create} instead.
	 *   Note: {@link sap.ui.core.Component.create Component.create} does not support synchronous loading or the deprecated options <em>manifestFirst</em> and <em>manifestUrl</em>.
	 * @public
	 * @static
	 * @since 1.15.0
	 * @ui5-global-only
	 */
	sap.ui.component = function(vConfig) {
		// a parameter must be given!
		if (!vConfig) {
			throw new Error("sap.ui.component cannot be called without parameter!");
		}

		var fnLogProperties = function(name) {
			return {
				type: "sap.ui.component",
				name: name
			};
		};

		if (typeof vConfig === 'string') {
			Log.warning("Do not use deprecated function 'sap.ui.component' (" + vConfig + ") + for Component instance lookup. " +
				"Use 'Component.get' instead", "sap.ui.component", null, fnLogProperties.bind(null, vConfig));
			// when only a string is given, then this function behaves like a
			// getter and returns an existing component instance
			return Component.getComponentById(vConfig);
		}

		if (vConfig.async) {
			Log.info("Do not use deprecated factory function 'sap.ui.component' (" + vConfig["name"] + "). " +
				"Use 'Component.create' instead", "sap.ui.component", null, fnLogProperties.bind(null, vConfig["name"]));
		} else {
			Log.warning("Do not use synchronous component creation (" + vConfig["name"] + ")! " +
				"Use the new asynchronous factory 'Component.create' instead", "sap.ui.component", null, fnLogProperties.bind(null, vConfig["name"]));
		}

		return componentFactory(vConfig, /*bLegacy=*/true);
	};

	/**
	 * Loads a module and logs a potential loading error as a warning.
	 *
	 * @param {string} sModuleName the module to be loaded
	 * @param {string} sComponentName the component-name for which the module is loaded
	 * @returns {Promise} the loading promise of the module
	 */
	function loadModuleAndLog(sModuleName, sComponentName) {
		const def = new Deferred();

		// might be in module if define in the manifest
		sModuleName = sModuleName.replace("module:", "");

		sap.ui.require([sModuleName], def.resolve, (err) => {
			future.warningRejects(def.resolve, def.reject, `sap.ui.core.Component: Cannot load module '${sModuleName}' during creation of component: "${sComponentName}".`);
			Log.warning(err);
		});

		return def.promise;
	}

	function findRoutingClasses(oClassMetadata) {
		const mRoutingClasses =  oClassMetadata.collectRoutingClasses?.() ?? {};
		return Object.values(mRoutingClasses);
	}

	/*
	 * Part of the old sap.ui.component implementation than can be re-used by the new factory
	 */
	function componentFactory(vConfig, bLegacy) {
		var oOwnerComponent = Component.getComponentById(_runWithOwner.getCurrentOwnerId());

		if (Array.isArray(vConfig.activeTerminologies) && vConfig.activeTerminologies.length &&
			Array.isArray(Localization.getActiveTerminologies()) && Localization.getActiveTerminologies().length) {
			if (JSON.stringify(vConfig.activeTerminologies) !== JSON.stringify(Localization.getActiveTerminologies())) {
				Log.warning(bLegacy ? "sap.ui.component: " : "Component.create: " +
					"The 'activeTerminolgies' passed to the component factory differ from the ones defined on the global 'sap/base/i18n/Localization.getActiveTerminologies';" +
					"This might lead to inconsistencies; ResourceModels that are not defined in the manifest and created by the component will use the globally configured terminologies.");
			}
		}
		// get terminologies information: API -> Owner Component -> Configuration
		var aActiveTerminologies = vConfig.activeTerminologies || (oOwnerComponent && oOwnerComponent.getActiveTerminologies()) || Localization.getActiveTerminologies();

		// Inherit cacheTokens from owner component if not defined in asyncHints
		if (!vConfig.asyncHints || !vConfig.asyncHints.cacheTokens) {
			var mCacheTokens = oOwnerComponent && oOwnerComponent._mCacheTokens;
			if (typeof mCacheTokens === "object") {
				vConfig.asyncHints = vConfig.asyncHints || {};
				vConfig.asyncHints.cacheTokens = mCacheTokens;
			}
		}

		function notifyOnInstanceCreated(oInstance, vConfig) {
			if (vConfig.async) {
				var pRootControlReady = oInstance.rootControlLoaded ? oInstance.rootControlLoaded() : Promise.resolve();

				// collect instance-created listeners
				var aOnInstanceCreatedPromises = ComponentHooks.onInstanceCreated.execute(oInstance, vConfig) ||  [];

				// root control loaded promise
				aOnInstanceCreatedPromises.push(pRootControlReady);

				return Promise.all(aOnInstanceCreatedPromises);
			} else {
				ComponentHooks.onInstanceCreated.execute(oInstance, vConfig);
			}
			return oInstance;
		}

		function createInstance(oClass) {
			if (bLegacy && oClass.getMetadata().isA("sap.ui.core.IAsyncContentCreation")) {
				throw new Error("Do not use deprecated factory function 'sap.ui.component' in combination with IAsyncContentCreation (" + vConfig["name"] + "). " +
				"Use 'Component.create' instead");
			}

			// retrieve the required properties
			var sName = vConfig.name,
			sId = vConfig.id,
			oComponentData = vConfig.componentData,
			sController = sName + '.Component',
			mSettings = vConfig.settings;

			// create an instance
			var oInstance = new oClass(extend({}, mSettings, {
				id: sId,
				componentData: oComponentData,
				_cacheTokens: vConfig.asyncHints && vConfig.asyncHints.cacheTokens,
				_activeTerminologies: aActiveTerminologies,
				_componentConfig: vConfig,
				/**
				 * @deprecated since 1.120
				 */
				_syncCreation: !vConfig.async
			}));
			assert(oInstance instanceof Component, "The specified component \"" + sController + "\" must be an instance of sap.ui.core.Component!");
			Log.info("Component instance Id = " + oInstance.getId());

			/*
			 * register for messaging: register if either handleValidation is set in metadata
			 * or if not set in metadata and set on instance
			 */
			var bHandleValidation = oInstance.getMetadata()._getManifestEntry("/sap.ui5/handleValidation");
			if (bHandleValidation !== undefined || vConfig.handleValidation) {
				const Messaging = sap.ui.require("sap/ui/core/Messaging");
				if (Messaging) {
					Messaging.registerObject(oInstance, bHandleValidation === undefined ? vConfig.handleValidation : bHandleValidation);
				} else {
					sap.ui.require(["sap/ui/core/Messaging"], function(Messaging) {
						if (!oInstance.isDestroyed()) {
							Messaging.registerObject(oInstance, bHandleValidation === undefined ? vConfig.handleValidation : bHandleValidation);
						}
					});
				}
			}

			// Some services may demand immediate startup
			var aPromises = activateServices(oInstance, vConfig.async);

			if (vConfig.async) {
				return notifyOnInstanceCreated(oInstance, vConfig)
					.then(function () {
						return Promise.all(aPromises);
					})
					.then(function () {
						// Make sure that the promise returned by the hook can not modify the resolve value
						return oInstance;
					});
			} else {
				return notifyOnInstanceCreated(oInstance, vConfig);
			}
		}

		// load the component class
		var vClassOrPromise = loadComponent(vConfig, {
			failOnError: true,
			createModels: true,
			waitFor: vConfig.asyncHints && vConfig.asyncHints.waitFor,
			activeTerminologies: aActiveTerminologies
		});
		if ( vConfig.async ) {
			// async: instantiate component after Promise has been fulfilled with component
			//        constructor and delegate the current owner id for the instance creation
			var sCurrentOwnerId = _runWithOwner.getCurrentOwnerId();
			return vClassOrPromise.then(function(oClass) {
				// [Compatibility]: We sequentialize the dependency loading for the inheritance chain of the component.
				// This keeps the order of the dependency execution stable (e.g. thirdparty script includes).
				var loadDependenciesAndIncludes = function (oMetadata) {
					var oParent = oMetadata.getParent();
					var oPromise = Promise.resolve();
					if (oParent instanceof ComponentMetadata) {
						oPromise = oPromise.then(function () {
							return loadDependenciesAndIncludes(oParent);
						});
					}
					return oPromise.then(function () {
						return oMetadata.getManifestObject().loadDependenciesAndIncludes(true);
					});
				};
				return loadDependenciesAndIncludes(oClass.getMetadata()).then(async function () {
					const oClassMetadata = oClass.getMetadata();
					const oManifest = oClassMetadata.getManifestObject();
					const sComponentName = oManifest.getComponentName();

					// --- final class provisioning before instantiation ---

					// [1] after evaluating the manifest & loading the necessary dependencies,
					//     we make sure the routing related classes are required before instantiating the Component
					const aRoutingClassNames = findRoutingClasses(oClassMetadata);
					const aModuleLoadingPromises = aRoutingClassNames.map((vClass) => {
						let pClass;
						if (typeof vClass === 'function') {
							pClass = Promise.resolve(vClass);
						} else {
							pClass = loadModuleAndLog(vClass, sComponentName);
						}
						return pClass;
					});

					// [2] Async require for all(!) manifests models ("preload: true" models might be required already)
					//     in v1 we prevent sync requests, in v2 we ensure all manifest models can be instantiated
					//     The best practice is that all model classes are part of a Component dependency (e.g. lib, eager dep in Component.js, ...)

					//     retrieve the merged sap.app and sap.ui5 sections of the manifest
					const mManifestDataSources = getManifestEntry(oClassMetadata, oManifest, "/sap.app/dataSources", true) || {};
					const mManifestModels = getManifestEntry(oClassMetadata, oManifest, "/sap.ui5/models", true) || {};

					//     extract classes from manifest
					const mAllModelConfigs = _findManifestModelClasses({
						models: mManifestModels,
						dataSources: mManifestDataSources,
						componentName: sComponentName
					});

					//     load model classes async
					const pModelClassLoading = _loadManifestModelClasses(mAllModelConfigs, sComponentName);

					// load all classes in parallel
					await Promise.all([...aModuleLoadingPromises, pModelClassLoading]);

					return _runWithOwner(function() {
						return createInstance(oClass);
					}, sCurrentOwnerId);
				});
			});
		} else {
			// sync: constructor has been returned, instantiate component immediately
			return createInstance(vClassOrPromise);
		}
	}

	/**
	 * Asynchronously loads a component class without instantiating it; returns a promise on the loaded class.
	 *
	 * Beware: "Asynchronous component loading" doesn't necessarily mean that no more synchronous loading
	 * occurs. Both the framework as well as component implementations might still execute synchronous
	 * requests. <code>Component.load</code> just allows to use async calls internally.
	 *
	 * When a manifest is referenced in <code>mOptions</code>, this manifest is not automatically used
	 * for instances of the Component class that are created after loading. The manifest or the manifest url
	 * must be provided for every instance explicitly.
	 *
	 * To optimize the loading process, additional <code>asyncHints</code> can be provided.
	 * If components and/or libraries are listed in the <code>asyncHints</code>, all the corresponding preload
	 * files will be requested in parallel, loading errors (404s) will be ignored. The constructor class will
	 * only be required after all preloads have been rejected or resolved.
	 * The structure of the hints and how they impact the loading of components is an internal feature
	 * of this API and reserved for UI5 internal use only. Code that wants to be safe wrt. version updates,
	 * should not use the <code>asyncHints</code> property.
	 *
	 * @param {object} mOptions Configuration options
	 * @param {string} mOptions.name Name of the Component to load, as a dot-separated name;
	 *     Even when an alternative location is specified from which the manifest should be loaded
	 *     (<code>mOptions.manifest</code> is set to a non-empty string), then the name specified in that
	 *     manifest will be ignored and this name will be used instead to determine the module to be loaded.
	 * @param {string} [mOptions.url] Alternative location from where to load the Component. If <code>mOptions.manifest</code>
	 *     is set to a non-empty string, this URL specifies the location of the final component defined via that
	 *     manifest, otherwise it specifies the location of the component defined via its name <code>mOptions.name</code>.
	 * @param {boolean|string|object} [mOptions.manifest=true] Whether and from where to load the manifest.json for the Component.
	 *     When set to a truthy value, the manifest will be loaded and evaluated <b>before</b> the Component controller.
	 *     When set to a falsy value, the manifest will be loaded and evaluated <b>after</b> the Component controller.
	 *     A non-empty string value will be interpreted as the URL to load the manifest from.
	 *     This implies that the manifest is loaded and evaluated <b>before</b> the Component controller.
	 *     A non-null object value will be interpreted as manifest content.
	 * @param {string} [mOptions.altManifestUrl] @since 1.61.0 Alternative URL for the manifest.json. If <code>mOptions.manifest</code>
	 *     is set to an object value, this URL specifies the location to which the manifest object should resolve the relative
	 *     URLs to.
	 * @param {object} [mOptions.asyncHints] Hints for asynchronous loading.
	 *     <b>Beware:</b> This parameter is only used internally by the UI5 framework and compatibility cannot be guaranteed.
	 *     The parameter must not be used in productive code, except in code delivered by the UI5 teams.
	 * @param {string[]|object[]} [mOptions.asyncHints.components] a list of components needed by the current component and its subcomponents
	 *     The framework will try to preload these components (their Component-preload.js) asynchronously, errors will be ignored.
	 *     Please note that the framework has no knowledge about whether a Component provides a preload file or whether it is bundled
	 *     in some library preload. If Components are listed in the hints section, they will be preloaded.
	 *     Instead of specifying just the names of components, an object might be given that contains a
	 *     mandatory <code>name</code> property and optionally, an <code>url</code> that will be used for a <code>registerModulePath</code>,
	 *     and/or a <code>lazy</code> property. When <code>lazy</code> is set to a truthy value, only a necessary <code>registerModulePath</code>
	 *     will be executed, but the corresponding component won't be preloaded.
	 * @param {string[]|object[]} [mOptions.asyncHints.libs] libraries needed by the Component and its subcomponents
	 *     These libraries should be (pre-)loaded before the Component.
	 *     The framework will asynchronously load those libraries, if they're not loaded yet.
	 *     Instead of specifying just the names of libraries, an object might be given that contains a
	 *     mandatory <code>name</code> property and optionally, an <code>url</code> that will be used for a <code>registerModulePath</code>,
	 *     and/or a <code>lazy</code> property. When <code>lazy</code> is set to a truthy value, only a necessary <code>registerModulePath</code>
	 *     will be executed, but the corresponding library won't be preloaded.
	 * @param {string[]|object[]} [mOptions.asyncHints.preloadBundles] a list of additional preload bundles
	 *     The framework will try to load these bundles asynchronously before requiring the component, errors will be ignored.
	 *     The named modules must only represent preload bundles. If they are normal modules, their dependencies
	 *     will be loaded with the standard module loading mechanism and performance might degrade.
	 *     Instead of specifying just the names of preload bundles, an object might be given that contains a
	 *     mandatory <code>name</code> property and, optionally, a <code>url</code> that will be used for a <code>registerModulePath</code>.
	 * @param {boolean} [mOptions.asyncHints.preloadOnly=false] Whether only the preloads should be done, but not the loading of the Component controller class itself.
	 * @returns {Promise<function>} A Promise that resolves with the loaded component class or <code>undefined</code> in case
	 *      <code>mOptions.asyncHints.preloadOnly</code> is set to <code>true</code>
	 *
	 * @since 1.56.0
	 * @static
	 * @public
	 */
	Component.load = function (mOptions) {

		var mParameters = merge({}, mOptions);
		mParameters.async = true;

		// if no manifest option is given, the default is true
		if (mParameters.manifest === undefined) {
			mParameters.manifest = true;
		}

		return loadComponent(mParameters, {
			preloadOnly: mParameters.asyncHints && mParameters.asyncHints.preloadOnly
		});
	};

	/**
	 * Returns an existing component instance, identified by its ID.
	 *
	 * @param {string} sId ID of the component.
	 * @returns {sap.ui.core.Component|undefined} Component instance or <code>undefined</code> when no component
	 *     with the given ID exists.
	 * @since 1.56.0
	 * @static
	 * @public
	 * @deprecated As of version 1.120, please use the static {@link sap.ui.core.Component.getComponentById getComponentById} instead.
	 */
	Component.get = function (sId) {
		// lookup and return the component
		return Component.getComponentById(sId);
	};

	/**
	 * Returns an existing component instance, identified by its ID.
	 *
	 * @param {string} sId ID of the component.
	 * @returns {sap.ui.core.Component|undefined} Component instance or <code>undefined</code> when no component
	 *     with the given ID exists.
	 * @since 1.120
	 * @static
	 * @public
	 */
	Component.getComponentById = function(sId) {
		return ComponentRegistry.get(sId);
	};

	/**
	 * Load a component without instantiating it.
	 *
	 * Provides support for loading components asynchronously by setting
	 * <code>oConfig.async</code> to true. In that case, the method returns a JavaScript 6
	 * Promise that will be fulfilled with the component class after loading.
	 *
	 * Using <code>async = true</code> doesn't necessarily mean that no more synchronous loading
	 * occurs. Both the framework as well as component implementations might still execute
	 * synchronous requests. The contract for <code>async = true</code> just allows to use
	 * async calls.
	 *
	 * When a manifest.json is referenced in oConfig this manifest is not used for the derived instances of the Component class.
	 * The manifest/manifest url must be provided for every instance explicitly.
	 *
	 * Since 1.27.0, when asynchronous loading is used, additional <code>asyncHints</code> can be provided.
	 * This parameter is only used internally by the UI5 framework and compatibility cannot be guaranteed.
	 * The parameter must not be used in productive code, except in code delivered by the UI5 teams.
	 *
	 * <ul>
	 * <li><code>oConfig.asyncHints.components : string[]</code>a list of components needed by the current component and its subcomponents
	 *     The framework will try to preload these components (their Component-preload.js) asynchronously, errors will be ignored.
	 *     Please note that the framework has no knowledge about whether a Component provides a preload file or whether it is bundled
	 *     in some library preload. If Components are listed in the hints section, they will be preloaded.</li>
	 * <li><code>oConfig.asyncHints.libs : string[]</code>libraries needed by the Component and its subcomponents.
	 *     The framework will asynchronously load those libraries, if they're not loaded yet.</li>
	 * <li><code>oConfig.asyncHints.preloadBundles : string[]</code>a list of additional preload bundles
	 *     The framework will try to load these bundles asynchronously before requiring the Component, errors will be ignored.
	 *     The named modules must only represent preload bundles. If they are normal modules, their dependencies
	 *     will be loaded with the normal synchronous request mechanism and performance might degrade.</li>
	 * <li><code>oConfig.asyncHints.preloadOnly : boolean (default: false)</code> whether only the preloads should be done,
	 *     but not the loading of the Component controller class itself.
	 * </ul>
	 *
	 * If Components and/or libraries are listed in the hints section, all the corresponding preload files will
	 * be requested in parallel. The constructor class will only be required after all of them are rejected or resolved.
	 * Instead of specifying just the name of a component or library in the hints, an object might be given that contains a
	 * mandatory <code>name</code> property and, optionally, an <code>url</code> that will be used for a <code>registerModulePath</code>
	 * and/or a <code>lazy</code> property. When <code>lazy</code> is set to a truthy value, only a necessary <code>registerModulePath</code>
	 * will be executed, but the corresponding component or lib won't be preloaded. For preload bundles, also an object might be given
	 * instead of a simple name, but there only the <code>url</code> property is supported, not the <code>lazy</code> property.
	 *
	 * Note: so far, only the requests for the preload files (library and/or component) are executed asynchronously.
	 * If a preload is deactivated by configuration (e.g. debug mode), then remaining requests still might be synchronous.
	 *
	 * @param {object} oConfig Configuration object describing the Component to be loaded. See {@link sap.ui.component} for more information.
	 * @returns {function|Promise} Constructor of the component class or a Promise that will be fulfilled with the same
	 *
	 * @deprecated since 1.56, use {@link sap.ui.core.Component.load}
	 * @since 1.16.3
	 * @static
	 * @public
	 * @ui5-global-only
	 */
	sap.ui.component.load = function(oConfig, bFailOnError) {
		Log.warning("Do not use deprecated function 'sap.ui.component.load'! Use 'Component.load' instead");
		return loadComponent(oConfig, {
			failOnError: bFailOnError,
			preloadOnly: oConfig.asyncHints && oConfig.asyncHints.preloadOnly
		});
	};


	/**
	 * Internal loading method used by the factory methods.
	 *
	 * @param {object} oConfig
	 *     Configuration options as provided to the calling factory, see e.g. {@link sap.ui.core.Component.create}
	 * @param {object} [oConfig.async]
	 *     Whether the Component loading should be done asynchronously
	 * @param {object} mOptions Additional, internal loading configuration
	 * @param {string[]} mOptions.activeTerminologies list of active terminologies.
	 *                   See the public API documentation for more detail: {@link sap.ui.core.Component.create Component.create}
	 * @param {boolean} mOptions.failOnError see <code>sap.ui.component.load</code>
	 * @param {boolean} mOptions.createModels whether models from manifest should be created during
	 *                                        component preload (should only be set via <code>sap.ui.component</code>)
	 * @param {boolean} mOptions.preloadOnly see <code>sap.ui.component.load</code> (<code>vConfig.asyncHints.preloadOnly</code>)
	 * @param {Promise|Promise[]} mOptions.waitFor see <code>sap.ui.component</code> (<code>vConfig.asyncHints.waitFor</code>)
	 * @return {function|Promise<function>} the constructor of the Component class or a Promise that will be fulfilled with the same
	 *
	 * @private
	 * @ui5-transform-hint replace-param oConfig.async true
	 */
	function loadComponent(oConfig, mOptions) {
		var aActiveTerminologies = mOptions.activeTerminologies,
			sName = oConfig.name,
			sUrl = oConfig.url,
			bComponentPreload = /^(sync|async)$/.test(Component.getComponentPreloadMode()),
			vManifest = oConfig.manifest,
			bManifestFirst,
			sManifestUrl,
			oManifest,
			mModels,
			mPreloadModelConfigs,
			fnCallLoadComponentCallback;

		// The loading Promise of the FL library, need to orchestrate the execution of the manifest
		// preprocessing hook in case the FL library is part of the async hints
		const { promise: pFlLibLoading, resolve: flLibResolve, reject: flLibReject } = Promise.withResolvers();
		const sFlLibId = "sap.ui.fl";

		function createSanitizedManifest( oRawManifestJSON, mOptions ) {
			var oManifestCopy = JSON.parse(JSON.stringify(oRawManifestJSON));

			if (oConfig.async) {
				return preprocessManifestJSON(oManifestCopy).then(function(oFinalJSON) {
					// oFinalJSON might be modified by the flex-hook
					return new Manifest(oFinalJSON, mOptions);
				});
			} else {
				return new Manifest(oManifestCopy, mOptions);
			}
		}

		async function preprocessManifestJSON(oRawJson) {

			await pFlLibLoading; // flex lib can be part of the async hints!

			// the preprocessing flex-hook is only called if a manifest.json was loaded or an object was given via config
			if (ComponentHooks.onPreprocessManifest.isRegistered() && oRawJson != null) {
				try {
					// secure configuration from manipulation
					var oConfigCopy = deepExtend({}, oConfig);
					return ComponentHooks.onPreprocessManifest.execute(oRawJson, oConfigCopy);
				} catch (oError) {
					// in case the hook itself crashes without 'safely' rejecting, we log the error and reject directly
					Log.error("Failed to execute flexibility hook for manifest preprocessing.", oError);
					return Promise.reject(oError);
				}
			} else {
				return Promise.resolve(oRawJson);
			}
		}

		// url must be a string, although registerModulePath would also accept an object
		assert(!sUrl || typeof sUrl === 'string', "sUrl must be a string or undefined");

		// if a component name and a URL is given, we register this URL for the name of the component:
		// the name is the package in which the component is located (dot separated)
		if (sName && typeof sUrl === 'string') {
			registerModulePath(sName, sUrl);
		}

		// set the name of this newly loaded component at the interaction measurement,
		// as otherwise this would be the outer component from where it was called,
		// which is not true - this component causes the load
		Interaction.setStepComponent(sName);

		/**
		 * With Component.create() the manifest option cannot be undefined (default is <true>, other options see API doc for Component.create)
		 * @deprecated since 1.120
		 */
		if ( vManifest === undefined ) {
			// no manifest property set, evaluate legacy properties
			bManifestFirst = oConfig.manifestFirst === undefined ? BaseConfig.get({name: "sapUiManifestFirst", type: BaseConfig.Type.Boolean, external: true}) : !!oConfig.manifestFirst;
			sManifestUrl = oConfig.manifestUrl;
			// oManifest = undefined;
		}

		if (vManifest !== undefined) {
			// in case of manifest property is set, by default we load async
			if ( oConfig.async === undefined ) {
				oConfig.async = true;
			}
			// determine the semantic of the manifest property
			bManifestFirst = !!vManifest;
			sManifestUrl = vManifest && typeof vManifest === 'string' ? vManifest : undefined;
			oManifest = vManifest && typeof vManifest === 'object' ? createSanitizedManifest(vManifest, {url: oConfig && oConfig.altManifestUrl, activeTerminologies: aActiveTerminologies, process: !oConfig.async}) : undefined;
		}

		// if we find a manifest URL in the configuration
		// we will load the manifest from the specified URL (sync or async)
		if (!oManifest && sManifestUrl) {
			oManifest = Manifest.load({
				activeTerminologies: aActiveTerminologies,
				manifestUrl: sManifestUrl,
				componentName: sName,
				processJson: preprocessManifestJSON,
				async: oConfig.async,
				// If a dedicated manifest URL is given, e.g. for a Variant
				// we expect that the Manifest can be loaded successfully
				// If not, the manifest loading promise rejects and the further Component creation is stopped
				failOnError: true
			});
		}

		// once the manifest is available we extract the controller name
		if (oManifest && !oConfig.async) {
			sName = oManifest.getComponentName();

			// if a component name and a URL is given, we register this URL for the name of the component:
			// the name is the package in which the component is located (dot separated)
			if (sName && typeof sUrl === 'string') {
				registerModulePath(sName, sUrl);
			}
		}

		// Only if loading a manifest is done asynchronously we will skip the
		// name check because this will be done once the manifest is loaded!
		if (!(oManifest && oConfig.async)) {

			// check for an existing name
			if (!sName) {
				throw new Error("The name of the component is undefined.");
			}

			// check the type of the name
			assert(typeof sName === 'string', "sName must be a string");

		}

		// in case of loading the manifest first by configuration we need to
		// wait until the registration of the module path is done if needed and
		// then we can use the standard capabilities of the framework to resolve
		// the Components' modules namespace
		if (bManifestFirst && !oManifest) {
			oManifest = Manifest.load({
				activeTerminologies: aActiveTerminologies,
				manifestUrl: getManifestUrl(sName),
				componentName: sName,
				async: oConfig.async,
				processJson: preprocessManifestJSON,
				// Legacy components might not have a manifest.json but use the Component metadata instead.
				// For compatibility reasons we don't want to break the Component creation in these cases.
				failOnError: false
			});
		}

		function getControllerModuleName() {
			return (sName + ".Component").replace(/\./g, "/");
		}

		function prepareControllerClass(oClass) {

			var sController = sName + '.Component';

			if (!oClass) {
				var sMsg = "The specified component controller '" + sController + "' could not be found!";
				if (mOptions.failOnError) {
					throw new Error(sMsg);
				} else {
					future.warningThrows(sMsg);
				}
			}

			if (oManifest) {
				// create the proxy metadata object
				var oMetadataProxy = createMetadataProxy(oClass.getMetadata(), oManifest);
				// create the proxy class for passing the manifest
				var oClassProxy = function() {

					// create a copy of arguments for local modification
					// and later handover to Component constructor
					var args = Array.prototype.slice.call(arguments);

					// inject the manifest to the settings object
					var mSettings;
					if (args.length === 0 || typeof args[0] === "object") {
						mSettings = args[0] = args[0] || {};
					} else if (typeof args[0] === "string") {
						mSettings = args[1] = args[1] || {};
					}
					mSettings._metadataProxy = oMetadataProxy;

					// mixin created "models" into "mSettings"
					if (mModels) {
						mSettings._manifestModels = mModels;
					}

					// call the original constructor of the component class
					var oInstance = Object.create(oClass.prototype);
					oClass.apply(oInstance, args);
					return oInstance;

				};

				oMetadataProxy.getClass = function() {
					return oClassProxy;
				};

				oClassProxy[Symbol("isProxy")] = true;

				// overload the getMetadata function
				oClassProxy.getMetadata = function() {
					return oMetadataProxy;
				};
				// overload the extend function
				oClassProxy.extend = function() {
					throw new Error("Extending Components created by Manifest is not supported!");
				};
				return oClassProxy;
			} else {
				return oClass;
			}
		}

		/*
		 * Process .url and .lazy options.
		 * For preloadBundles, lazy will be ignored
		 */
		function processOptions(vObj, bIgnoreLazy) {

			assert(
				(typeof vObj === 'string' && vObj) ||
				(typeof vObj === 'object' && typeof vObj.name === 'string' && vObj.name),
				"reference either must be a non-empty string or an object with a non-empty 'name' and an optional 'url' property");

			if ( typeof vObj === 'object' ) {
				if ( vObj.url ) {
					registerModulePath(vObj.name, vObj.url);
				}
				return (vObj.lazy && bIgnoreLazy !== true) ? undefined : vObj.name; // expl. check for true to allow usage in Array.prototype.map below
			}

			return vObj;
		}

		/**
		 * @private
		 * @ui5-transform-hint replace-param bAsync true
		 */
		function preload(sComponentName, bAsync) {

			var sController = sComponentName + '.Component',
				http2 = Library.isDepCacheEnabled(),
				sPreloadName,
				oTransitiveDependencies,
				aLibs,
				errorLogging = function (sPreloadName, bAsync) {
					return function (e) {
						var sErrorMessage = "Component-preload for this component does not exist.";
						Log.warning(
							"Couldn't preload component from " + sPreloadName + ": " + ((e && e.message) || e),
							!bAsync ? sErrorMessage : sErrorMessage + " If the component is part of a library or another component, the configuration 'sap.app/embeddedBy' is not maintained. " +
							" The 'sap.app/embeddedBy' property must be relative path inside the deployment unit (library or component).",
							"sap.ui.core.Component#preload"
						);
					};
				};

			// only load the Component-preload file if the Component module is not yet available
			if ( bComponentPreload && sComponentName != null && !sap.ui.loader._.getModuleState(sController.replace(/\./g, "/") + ".js") ) {

				if ( bAsync ) {
					// check whether component controller is included in a library preload
					oTransitiveDependencies = VersionInfo._getTransitiveDependencyForComponent(sComponentName);

					if (oTransitiveDependencies && !oTransitiveDependencies.hasOwnPreload) {
						aLibs = [oTransitiveDependencies.library];
						// add all dependencies to aLibs
						Array.prototype.push.apply(aLibs, oTransitiveDependencies.dependencies);

						// load library preload for every transitive dependency
						return Library._load( aLibs, { preloadOnly: true } ).catch(errorLogging(oTransitiveDependencies.library, true));
					} else {
						sPreloadName = sController.replace(/\./g, "/") + (http2 ? '-h2-preload.js' : '-preload.js'); // URN
						return sap.ui.loader._.loadJSResourceAsync(sPreloadName).catch(errorLogging(sPreloadName, true));
					}
				} else {
					try {
						sPreloadName = sController + '-preload'; // Module name
						sap.ui.requireSync(sPreloadName.replace(/\./g, "/")); // legacy-relevant: Sync path
					} catch (e) {
						errorLogging(sPreloadName, false)(e);
					}
				}
			} else if (bAsync) {
				return Promise.resolve();
			}
		}

		/**
		 * @private
		 * @ui5-transform-hint replace-param bAsync true
		 */
		function preloadDependencies(sComponentName, oManifest, bAsync) {

			var aPromises = [];
			var fnCollect = bAsync ? function(oPromise) {
				aPromises.push(oPromise);
			} : function() {};

			// lookup the required libraries
			var mLibs = oManifest.getEntry("/sap.ui5/dependencies/libs");
			if (mLibs) {
				var aLibs = [];
				// filter the lazy libs
				for (var sLibName in mLibs) {
					if (!mLibs[sLibName].lazy) {
						aLibs.push(sLibName);
					}
				}
				if (aLibs.length > 0) {
					Log.info("Component \"" + sComponentName + "\" is loading libraries: \"" + aLibs.join(", ") + "\"");
					fnCollect(Library._load(aLibs, {
						sync: !bAsync
					}));
				}
			}

			// lookup the extended component and preload it
			var sExtendedComponent = oManifest.getEntry("/sap.ui5/extends/component");
			if (sExtendedComponent) {
				fnCollect(preload(sExtendedComponent, bAsync));
			}

			// lookup the non-lazy components from component dependencies
			var aComponents = [];
			var mComponents = oManifest.getEntry("/sap.ui5/dependencies/components");
			if (mComponents) {
				for (var sCompName in mComponents) {
					// filter the lazy components
					if (!mComponents[sCompName].lazy) {
						aComponents.push(sCompName);
					}
				}
			}

			// lookup the non-lazy components from component usages
			var mUsages = oManifest.getEntry("/sap.ui5/componentUsages");
			if (mUsages) {
				// filter the lazy usages
				for (var sUsage in mUsages) {
					// default value is true, so explicit check for false
					if (mUsages[sUsage].lazy === false && aComponents.indexOf(mUsages[sUsage].name) === -1) {
						aComponents.push(mUsages[sUsage].name);
					}
				}
			}

			// preload the collected components
			if (aComponents.length > 0) {
				aComponents.forEach(function(sComponentName) {
					fnCollect(preload(sComponentName, bAsync));
				});
			}

			return bAsync ? Promise.all(aPromises) : undefined;

		}

		if ( oConfig.async ) {

			// trigger loading of libraries and component preloads and collect the given promises
			var hints = oConfig.asyncHints || {},
				promises = [],
				reflect = function(oPromise) {
					// In order to make the error handling of the Promise.all() happen after all Promises finish, we catch all rejected Promises and make them resolve with an marked object.
					oPromise = oPromise.then(
						function(v) {
							return {
								result: v,
								rejected: false
							};
						},
						function(v) {
							return {
								result: v,
								rejected: true
							};
						}
					);
					return oPromise;
				},
				collect = function(oPromise) {
					if ( oPromise ) {
						promises.push(reflect(oPromise));
					}
				},
				identity = function($) { return $; },
				phase1Preloads,
				libs;

			phase1Preloads = [];

			// load any required preload bundles
			if ( Array.isArray(hints.preloadBundles) ) {
				hints.preloadBundles.forEach(function(vBundle) {
					phase1Preloads.push(
						sap.ui.loader._.loadJSResourceAsync(processOptions(vBundle, /* ignoreLazy */ true), /* ignoreErrors */ true) );
				});
			}

			// preload any libraries
			if ( Array.isArray(hints.libs) ) {
				libs = hints.libs.map(processOptions).filter(identity);

				// try if FL lib is part of async hints and needs separate preloading
				// we do this in order to orchestrate the manifest preprocessing hook to the loading of the lib
				if (!libs.includes(sFlLibId) || mOptions.preloadOnly) {
					flLibResolve();
				}

				phase1Preloads.push(
					Library._load( libs, { preloadOnly: true } )
				);
			} else {
				flLibResolve();
			}

			// sync preloadBundles and preloads of libraries first before requiring the libs
			// Note: component preloads are assumed to be always independent from libs
			// therefore those requests are not synchronized with the require calls for the libs
			phase1Preloads = Promise.all( phase1Preloads );
			if ( libs && !mOptions.preloadOnly ) {
				phase1Preloads = phase1Preloads.then( function() {
					let pFlLib = Promise.resolve();
					if (libs.includes(sFlLibId)) {
						libs = libs.filter((libId) => libId !== sFlLibId);
						pFlLib = Library._load([sFlLibId]).then(flLibResolve).catch(flLibReject);
					}

					return Promise.all([pFlLib, Library._load( libs )]);
				});
			}
			collect( phase1Preloads );

			// if a hint about "used" components is given, preload those components
			if ( hints.components ) {
				Object.keys(hints.components).forEach(function(sComp) {
					collect(preload(processOptions(hints.components[sComp]), true));
				});
			}

			// preload the component itself
			if (!oManifest) {
				collect(preload(sName, true));
			} else {
				var aI18nProperties = [];
				// // we have a manifest, so we can register the module path for the component
				// // and resolve any "ui5://" pseudo-protocol URLs inside.
				// // This needs to be done before we create the "afterPreload" models.
				oManifest = oManifest.then(async function(oManifest) {
					// if a URL is given we register this URL for the name of the component:
					// the name is the package in which the component is located (dot separated)
					var sComponentName = oManifest.getComponentName();

					if (typeof sUrl === 'string') {
						registerModulePath(sComponentName, sUrl);
					}

					// define resource roots, so they can be respected for "ui5://..." URL resolution
					oManifest.defineResourceRoots();

					// Resolve command descriptions
					await _resolveCommandsInManifest(oManifest);

					oManifest._preprocess({
						resolveUI5Urls: true,
						i18nProperties: aI18nProperties
					});

					return oManifest;
				});

				// create "afterPreload" models in parallel to loading the component preload (below)
				if (mOptions.createModels) {
					collect(oManifest.then(async function(oManifest) {
						var sComponentName = oManifest.getComponentName();
						// Calculate configurations of preloaded models once the manifest is available
						mPreloadModelConfigs = getPreloadModelConfigsFromManifest(oManifest);

						// Create preloaded models directly after the manifest has been loaded
						if (Object.keys(mPreloadModelConfigs.afterManifest).length > 0) {
							await _loadManifestModelClasses(mPreloadModelConfigs.afterManifest, sComponentName);

							// deep clone is needed as manifest only returns a read-only copy (frozen object)
							var oManifestDataSources = merge({}, oManifest.getEntry("/sap.app/dataSources"));
							var mAllModelConfigurations = _createManifestModelConfigurations({
								models: mPreloadModelConfigs.afterManifest,
								dataSources: oManifestDataSources,
								manifest: oManifest,
								componentData: oConfig.componentData,
								cacheTokens: hints.cacheTokens,
								activeTerminologies: aActiveTerminologies
							});

							mModels = _createManifestModels(mAllModelConfigurations, oConfig, oManifest);
						}

						return oManifest;
					}));
				}

				// in case of manifest first we need to load the manifest
				// to know the component name and then preload the component itself
				collect(oManifest.then(function(oManifest) {

					// preload the component only if not embedded in a library
					// If the Component controller is not preloaded, the Component.js file is loaded as a single request later on.
					// This situation should be fixed by the factory caller, so we log it as a warning.
					var pPreload = Promise.resolve();
					var sEmbeddedBy = oManifest.getEntry("/sap.app/embeddedBy");
					var sComponentName = oManifest.getComponentName();
					if (!sEmbeddedBy) {
						pPreload = preload(sComponentName, true);
					} else if (!sap.ui.loader._.getModuleState(getControllerModuleName() + ".js")) {
						Log.warning(
							"Component '" + sComponentName + "' is defined to be embedded in a library or another component" +
							"The relatively given preload for the embedding resource was not loaded before hand. " +
							"Please make sure to load the embedding resource containing this Component before instantiating.",
							undefined,
							"sap.ui.core.Component#embeddedBy"
						);
					}

					return pPreload.then(function() {
						// after preload is finished, load the i18n resource and process the placeholder texts
						return oManifest._processI18n(true, aI18nProperties);
					}).then(function() {
						// after i18n resource is finished, the resource models from the manifest are loaded

						if (!mOptions.createModels) {
							return null;
						}

						var aResourceModelNames = Object.keys(mPreloadModelConfigs.afterPreload);

						if (aResourceModelNames.length === 0) {
							return null;
						}

						// if there are resource models to be loaded, load the resource bundle async first.
						// a promise is returned which resolves after all resource models are loaded
						return new Promise(function(resolve, reject) {
							// load the sap.ui.model/resource/ResourceModel class async if it's not loaded yet
							sap.ui.require(["sap/ui/model/resource/ResourceModel"], function(ResourceModel) {
								// Directly resolve as otherwise uncaught exceptions can't be handled
								resolve(ResourceModel);
							}, reject);
						}).then(function(ResourceModel) {

							// deep clone is needed as manifest only returns a read-only copy (frozen object)
							var oManifestDataSources = merge({}, oManifest.getEntry("/sap.app/dataSources"));
							var mAfterPreloadModelConfigurations = _createManifestModelConfigurations({
								models: mPreloadModelConfigs.afterPreload,
								dataSources: oManifestDataSources,
								manifest: oManifest,
								componentData: oConfig.componentData,
								cacheTokens: hints.cacheTokens,
								activeTerminologies: aActiveTerminologies
							});

							function loadResourceBundle(sModelName) {
								var mModelConfig = mAfterPreloadModelConfigurations[sModelName];
								if (Array.isArray(mModelConfig.settings) && mModelConfig.settings.length > 0) {
									var mModelSettings = mModelConfig.settings[0]; // first argument is the config map

									// in order to load the whole ResourceBundle/terminologies closure upfront
									// we need pass the active terminologies to the ResourceModel/-Bundle.
									mModelSettings.activeTerminologies = mOptions.activeTerminologies;

									return ResourceModel.loadResourceBundle(mModelSettings, true).then(function(oResourceBundle) {
										// Extend the model settings with the preloaded bundle so that no sync request
										// is triggered once the model gets created
										mModelSettings.bundle = oResourceBundle;

										/*
										 * Compatibility concerning ResourceModel API:
										 * If active terminologies were given we need to remove the "enhanceWith", "terminologies" and "activeTerminologies"
										 * parameters from the model settings. The ResourceModel's constructor does not accept a mixed scenario
										 * where a constructed bundle, as well as additional enhance bundles with terminologies, are given.
										 */
										delete mModelSettings.terminologies;
										delete mModelSettings.activeTerminologies;
										delete mModelSettings.enhanceWith;

									}, function(err) {
										Log.error("Component Manifest: Could not preload ResourceBundle for ResourceModel. " +
											"The model will be skipped here and tried to be created on Component initialization.",
											"[\"sap.ui5\"][\"models\"][\"" + sModelName + "\"]", oManifest.getComponentName());
										Log.error(err);

										// If the resource bundle can't be loaded, the resource model will be skipped.
										// But once the component instance gets created, the model will be tried to created again.
										delete mAfterPreloadModelConfigurations[sModelName];
									});
								} else {
									// Can't load bundle as no settings are defined.
									// Should not happen as those models won't be part of "afterPreload"
									return Promise.resolve();
								}
							}

							// Load all ResourceBundles for all models in parallel
							return Promise.all(aResourceModelNames.map(loadResourceBundle)).then(function() {
								if (Object.keys(mAfterPreloadModelConfigurations).length > 0) {
									var mResourceModels = _createManifestModels(mAfterPreloadModelConfigurations);
									if (!mModels) {
										mModels = {};
									}
									for (var sKey in mResourceModels) {
										mModels[sKey] = mResourceModels[sKey];
									}
								}
							});
						});
					});
				}));

				fnCallLoadComponentCallback = function(oLoadedManifest) {
					// if a callback is registered to the component load, call it with the configuration
					if (ComponentHooks.onComponentLoaded.isRegistered()) {
						// secure configuration from manipulation, manifest can be adjusted by late changes
						var oConfigCopy = deepExtend({}, oConfig);
						// trigger the callback with a copy of its required data
						// do not await any result from the callback nor stop component loading on an occurring error
						try {
							return ComponentHooks.onComponentLoaded.execute(oConfigCopy, oLoadedManifest);
						} catch (oError) {
							future.errorThrows("sap.ui.core.Component: Callback for loading the component \"" + oLoadedManifest.getComponentName() +
								"\" run into an error.", { cause: oError , suffix: "The callback was skipped and the component loading resumed." });
						}
					}
				};
			}

			// combine given promises
			return Promise.all(promises).then(function(v) {
				// If any promise is rejected, a new rejected Promise is forwarded on the chain which leads to the catch clause
				var aResults = [],
					bErrorFound = false,
					vError;

				bErrorFound = v.some(function(oResult) {
					if (oResult && oResult.rejected) {
						vError = oResult.result;
						return true;
					}
					aResults.push(oResult.result);
					return false;
				});

				if (bErrorFound) {
					return Promise.reject(vError);
				}

				return aResults;
			}).then(function (v) {
				// after all promises including the loading of dependent libs have been resolved
				// pass the manifest to the callback function in case the manifest is present and a callback was set
				if (oManifest && fnCallLoadComponentCallback) {
					return oManifest.then(fnCallLoadComponentCallback).then(function() {
						return v;
					});
				}
				return v;
			}).then(function(v) {
				Log.debug("Component.load: all promises fulfilled, then " + v);
				if (oManifest) {
					return oManifest.then(function(oLoadedManifest) {
						if (!oLoadedManifest._bLoadManifestRequestFailed) {
							// store the loaded manifest in the oManifest variable
							// which is used for the scope constructor function
							oManifest = oLoadedManifest;
							// read the component name from the manifest and
							// preload the dependencies defined in the manifest
							sName = oManifest.getComponentName();
							return preloadDependencies(sName, oManifest, true);
						} else {
							// Set oManifest to undefined in case the loadManifest request failed
							// This should be only the case if manifestFirst is true but there was
							// no manifest.json
							oManifest = undefined;
							return oManifest;
						}
					});
				} else {
					return v;
				}
			}).then(function() {
				if ( mOptions.preloadOnly ) {
					return true;
				}

				return new Promise(function(resolve, reject) {
					// asynchronously require component controller class
					sap.ui.require( [ getControllerModuleName() ], function(oClass) {
						// Directly resolve as otherwise uncaught exceptions can't be handled
						resolve(oClass);
					}, reject);
				}).then(function(oClass) {
					var oMetadata = oClass.getMetadata();
					var sName = oMetadata.getComponentName();
					var sDefaultManifestUrl = getManifestUrl(sName);
					var aPromises = [];

					// Check if we loaded the manifest.json from the default location
					// In this case it can be directly passed to its metadata class to prevent an additional request
					if (oManifest && typeof vManifest !== "object" && (typeof sManifestUrl === "undefined" || sManifestUrl === sDefaultManifestUrl)) {
						// We could use oManifest.getJson() to avoid calling '_processI18n(true)' at the next line.
						// However, we have to use oManifest.getRawJson() instead of oManifest.getJson() because the
						//  urls start with "ui5://" are already resolved in the oManifest.getJson() and
						//  ComponentMetadata needs to keep them unresolved until the resource roots are set.
						oMetadata._applyManifest(JSON.parse(JSON.stringify(oManifest.getRawJson())), true /* skip processing */);

						// Resolve commands description
						const pI18n = _resolveCommandsInManifest(oMetadata.getManifestObject()).then(() => {
							return oMetadata.getManifestObject()._processI18n(true);
						});
						aPromises.push(pI18n);
					}

					aPromises.push(loadManifests(oMetadata));

					return Promise.all(aPromises).then(function() {

						// The following processing of the sap.app/i18n resources happens under two conditions:
						//    1. The manifest is defined in the component metadata (no Manifest object yet)
						//    2. We have instance specific information (activeTerminologies)
						// In case of a manifest-first approach (Manifest object exists already),
						// the i18n processing has already happened and we skip this part.

						// Why do we set the oManifest object here?
						// > If we have instance specific information like "activeTerminologies" (non-empty array), the resulting
						//   Manifest instance differs from the Manifest that is stored on the ComponentMetadata.
						//   The function prepareControllerClass() then creates a ComponentMetadata Proxy,
						//   which encapsulates this single instance specific Manifest object.
						var pProcessI18n = Promise.resolve();
						if (!oManifest && Array.isArray(mOptions.activeTerminologies) && mOptions.activeTerminologies.length > 0) {
							oManifest = new Manifest(oMetadata.getManifestObject().getRawJson(), {
								process: false,
								activeTerminologies: aActiveTerminologies
							});

							pProcessI18n = _resolveCommandsInManifest(oMetadata.getManifestObject()).then(() => {
								return oManifest._processI18n(true);
							});
						}

						// prepare the loaded class and resolve with it
						return pProcessI18n.then(prepareControllerClass.bind(undefined, oClass));
					});
				});
			}).then(function(oControllerClass) {
				if (!oManifest) {
					return oControllerClass;
				}

				// collect routing related class names for async loading
				const oClassMetadata = oControllerClass.getMetadata();
				const aModuleNames = findRoutingClasses(oClassMetadata);

				// lookup model classes
				var mManifestModels = merge({}, oManifest.getEntry("/sap.ui5/models"));
				var mManifestDataSources = merge({}, oManifest.getEntry("/sap.app/dataSources"));
				var mAllModelConfigurations = _findManifestModelClasses({
					models: mManifestModels,
					dataSources: mManifestDataSources,
					componentName: oManifest.getComponentName()
				});
				for (var mModelName in mAllModelConfigurations) {
					if (!mAllModelConfigurations.hasOwnProperty(mModelName)) {
						continue;
					}
					var oModelConfig = mAllModelConfigurations[mModelName];
					if (!oModelConfig.type) {
						continue;
					}
					var sModuleName = oModelConfig.type.replace(/\./g, "/");
					if (aModuleNames.indexOf(sModuleName) === -1) {
						aModuleNames.push(sModuleName);
					}
				}

				if (aModuleNames.length > 0) {
					const sComponentName = oManifest.getComponentName();
					return Promise.all(aModuleNames.map(function(sModuleName) {
						// All modules are required separately to have a better error logging.
						// Most of the classes collected here will be instantiated during the (UI)Component constructor.
						// The upfront async loading is done to prevent synchronous loading during instantiation.
						// If loading fails, the component should still be created which might fail once the required module is actually used / loaded.
						return loadModuleAndLog(sModuleName, sComponentName);
					})).then(function() {
						return oControllerClass;
					});
				} else {
					return oControllerClass;
				}
			}).then(function(oControllerClass) {
				var waitFor = mOptions.waitFor;
				if (waitFor) {
					// when waitFor Promises have been specified we also wait for
					// them before we call the component constructor
					var aPromises = Array.isArray(waitFor) ? waitFor : [ waitFor ];
					return Promise.all(aPromises).then(function() {
						return oControllerClass;
					});
				}
				return oControllerClass;
			}).catch(function(vError) {
				// handle preload errors

				// destroy "preloaded" models in case of any error to prevent memory leaks
				if (mModels) {
					for (var sName in mModels) {
						var oModel = mModels[sName];
						if (oModel && typeof oModel.destroy === "function") {
							oModel.destroy();
						}
					}
				}

				// re-throw error to hand it over to the application
				throw vError;

			});

		}

		/**
		 * Sync creation path
		 */
		if (oManifest) {

			// define resource roots, so they can be respected for "ui5://..." URL resolution
			oManifest.defineResourceRoots();

			/** @deprecated As of version 1.135 */
			_resolveCommandsInManifestSync(oManifest);

			oManifest._preprocess({
				resolveUI5Urls: true
			});

			preloadDependencies(sName, oManifest);
		}
		preload(sName);

		// synchronously load the controller class, prepare and return it
		return prepareControllerClass(
			sap.ui.requireSync( getControllerModuleName() ) // legacy-relevant: Sync path
		);
	}

	/**
	 * Registry of all <code>Component</code>s that currently exist.
	 *
	 * @namespace sap.ui.core.Component.registry
	 * @public
	 * @since 1.67
	 * @deprecated As of version 1.120. Use {@link module:sap/ui/core/ComponentRegistry} instead.
	 * @borrows module:sap/ui/core/ComponentRegistry.size as size
	 * @borrows module:sap/ui/core/ComponentRegistry.all as all
	 * @borrows module:sap/ui/core/ComponentRegistry.get as get
	 * @borrows module:sap/ui/core/ComponentRegistry.forEach as forEach
	 * @borrows module:sap/ui/core/ComponentRegistry.filter as filter
	 */
	Component.registry = ComponentRegistry;

	/**
	 * Returns the information defined in the manifests command section. If a command name
	 * is passed only the info for this command will be returned. If no name is passed a map
	 * of all commands will be returned.
	 *
	 * @param {string} [sCommandName] The name of the command defined in manifest
	 *
	 * @returns {object|undefined} The command object as defined in the manifest, undefined if no command is found under the given name.
	 * @private
	 */
	Component.prototype.getCommand = function(sCommandName) {
		if (!this._mComputedCommands) {
			var oCommandExtensions = Component.getCustomizing(this, {
					type: "sap.ui.commands"
				}) || {},
				oOwnCommands = this._getManifestEntry("/sap.ui5/commands", true) || {},
				sComponentName = this.getMetadata().getComponentName(),
				sComponentIdSuffix = "",
				oExtensionComponent = this.getExtensionComponent && this.getExtensionComponent();

			if (oExtensionComponent && oExtensionComponent.getLocalId) {
				sComponentIdSuffix = "#" + (oExtensionComponent.getLocalId(this.getId()) || this.getId());
			}
			this._mComputedCommands = merge({}, oOwnCommands, oCommandExtensions[sComponentName], oCommandExtensions[sComponentName + sComponentIdSuffix]);
		}

		return sCommandName ? this._mComputedCommands[sCommandName] : this._mComputedCommands;
	};

	/**
	 * Deactivates the component and all descendant components
	 *
	 * If this or any descendant component has not enabled keep alive, no component will be deactivated
	 *
	 * Deactivation includes following steps:
	 * <ul>
	 * <li>all elements associated (via ownerId) with the deactivated component are notified about the deactivation</li>
	 * <li>the eventbus of each deactivated component is suspended</li>
	 * <li>the router of each deactivated component is stopped</li>
	 * <li>the 'onDeactivate' hook of each deactivated component is executed</li>
	 * </ul>
	 *
	 * @since 1.88
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ushell
	 */
	Component.prototype.deactivate = function() {
		var oOwnerComponent = Component.getOwnerComponentFor(this);
		if (oOwnerComponent && oOwnerComponent.isActive()) {
			throw new Error("Component.deactivate must not be called on nested components.");
		}

		if (!this.isKeepAliveSupported()) {
			Log.warning("Deactivation of component failed. Component '" + this.getId() + "' does not support 'keepAlive'.");
			return;
		}
		if (!this.isActive()) {
			Log.warning("Deactivation of component failed. Component '" + this.getId() + "' is already inactive.");
			return;
		}

		// deactivate component
		this.onOwnerDeactivation();

		// mark the component as inactive
		this._bIsActive = false;

		// deactivate all child elements
		forEachChildElement(function(oElement) {
			ResizeHandler.suspend(oElement.getDomRef());
			oElement.onOwnerDeactivation();
		}, this.getId());

		// deactivate all child components
		ComponentRegistry.forEach(function(oComponent) {
			var sOwnerId = Component.getOwnerIdFor(oComponent);
			if (sOwnerId === this.getId()) {
				oComponent.deactivate();
			}
		}, this);

		// suspend EventBus
		if (this._oEventBus) {
			this._oEventBus.suspend();
		}

		// stop the router
		if (this.getRouter()) {
			this.getRouter().stop();
		}

		// call lifecyclehook 'onDeactivate'
		if (typeof this.onDeactivate === "function") {
			_enforceNoReturnValue(this.onDeactivate(), /*mLogInfo=*/{name: "onDeactivate", component: this.getId()});
		}
	};

	/**
	 * Activates the component and all descendant components.
	 *
	 * If this or any descendant component does not enabled keep alive, no component will be activated
	 *
	 * Activation includes following steps:
	 * <ul>
	 * <li>all elements associated (via ownerId) with the activated components are notified about the activation</li>
	 * <li>the eventbus of each activated component is resumed</li>
	 * <li>the router of each activated component is initialized</li>
	 * <li>the 'onActivate' hook of each activated component is executed</li>
	 * </ul>
	 *
	 * @since 1.88
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ushell
	 */
	Component.prototype.activate = function() {
		if (!this.isKeepAliveSupported()) {
			Log.warning("Activation of component failed. Component '" + this.getId() + "' does not support 'keepAlive'.");
			return;
		}
		if (this.isActive()) {
			Log.warning("Activation of component failed. Component '" + this.getId() + "' is already active.");
			return;
		}

		// activate component
		this.onOwnerActivation();

		// mark the component as active
		this._bIsActive = true;

		// resume all child elements
		forEachChildElement(function(oElement) {
			ResizeHandler.resume(oElement.getDomRef());
			oElement.onOwnerActivation();
		}, this.getId());

		// activate all child components
		ComponentRegistry.forEach(function(oComponent) {
			var sOwnerId = Component.getOwnerIdFor(oComponent);
			if (sOwnerId === this.getId()) {
				oComponent.activate();
			}
		}, this);

		// resume eventbus
		if (this._oEventBus) {
			this._oEventBus.resume();
		}

		// resume router
		if (this.getRouter()) {
			this.getRouter().initialize();
		}

		// call lifecyclehook 'onActivate'
		if (typeof this.onActivate === "function") {
			_enforceNoReturnValue(this.onActivate(), /*mLogInfo=*/{ name: "onActivate", component: this.getId() });
		}
	};

	/**
	 * Checks whether a component and its nested components support "keep-alive" or not.
	 * Returns <code>false</code>, if at least one component does not support "keep-alive".
	 *
	 * @return {boolean} Whether the component supports "keep-alive" or not
	 * @since 1.88
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ushell
	 */
	Component.prototype.isKeepAliveSupported = function() {
		var bIsKeepAliveSupported = this._oKeepAliveConfig && this._oKeepAliveConfig.supported;

		if (bIsKeepAliveSupported) {
			bIsKeepAliveSupported = ComponentRegistry
				.filter(function (oComponent) {
					var sOwnerId = Component.getOwnerIdFor(oComponent);
					return sOwnerId === this.getId();
				}, this).every(function (oComponent) {
					return oComponent.isKeepAliveSupported();
				}, this);
		}

		return !!bIsKeepAliveSupported;
	};

	/**
	 * Register a <code>Promise</code> to handle asynchronous destroy
	 *
	 * @param {Promise} pInstance Promise to handle asynchronous destroy
	 * @private
	 */
	Component.prototype.registerForDestroy = function(pInstance) {
		var aDestroyables = this._getDestroyables();
		pInstance = pInstance.then(function(oInstance) {
			// if already resolved, destroy must be done by the application
			aDestroyables.splice(aDestroyables.indexOf(pInstance),1);
			return oInstance;
		});
		aDestroyables.push(pInstance);
	};

	/**
	 * This method is called after the component is activated
	 *
	 * @function
	 * @name sap.ui.core.Component.prototype.onActivate
	 * @abstract
	 * @since 1.88
	 * @returns {void|undefined} This lifecycle hook must not have a return value.
	 *
	 * 	<b>Note:</b> While the return type is currently <code>void|undefined</code>, any
	 *	implementation of this hook must not return anything but undefined. Any other
	 * 	return value will cause an error log in this version of UI5 and will fail in future
	 * 	major versions of UI5.
	 * @protected
	 */

	/**
	 * This method is called after the component is deactivated
	 *
	 * @function
	 * @name sap.ui.core.Component.prototype.onDeactivate
	 * @abstract
	 * @since 1.88
	 * @returns {void|undefined} This lifecycle hook must not have a return value.
	 *
	 * 	<b>Note:</b> While the return type is currently <code>void|undefined</code>, any
	 *	implementation of this hook must not return anything but undefined. Any other
	 * 	return value will cause an error log in this version of UI5 and will fail in future
	 * 	major versions of UI5.
	 * @protected
	 */

	_LocalizationHelper.registerForUpdate("Components", ComponentRegistry.all);

	return Component;
});
