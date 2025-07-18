/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/ui/base/EventProvider"
], (EventProvider) => {
	"use strict";

	const ERROR_INSTANCING = "StateHandlerRegistry: This class is a singleton and should not be used without an AdaptationProvider. Please use 'Engine.getInstance().stateHandlerRegistry' instead";

	//Singleton storage
	let oStateHandlerRegistry;

	/**
	 * Constructor for a new StateHandlerRegistry.
	 *
	 * @class
	 * @extends sap.ui.base.EventProvider
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @private
	 * @since 1.104
	 * @alias sap.m.p13n.modules.StateHandlerRegistry
	 */
	const StateHandlerRegistry = EventProvider.extend("sap.m.p13n.modules.StateHandlerRegistry", {
		constructor: function() {

			if (oStateHandlerRegistry) {
				throw Error(ERROR_INSTANCING);
			}

			EventProvider.call(this);
		}
	});

	/**
	 * @private
	 * @ui5-restricted sap.m
	 *
	 * Attaches an event handler to the <code>StateHandlerRegistry</code> class.
	 * The event handler may be fired every time a user triggers a personalization change for a control instance during runtime.
	 *
	 * @param {function} fnStateEventHandler The handler function to call when the event occurs
	 * @param {object} [oListener] The context object to call the event handler with (value of <code>this</code> in the event handler function). Defaults to the StateHandlerRegistry instance itself.
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 */
	StateHandlerRegistry.prototype.attachChange = function(fnStateEventHandler, oListener) {
		return EventProvider.prototype.attachEvent.call(this, "stateChange", fnStateEventHandler, oListener);
	};

	/**
	 * @private
	 * @ui5-restricted sap.m
	 *
	 * Removes a previously attached state change event handler from the <code>StateHandlerRegistry</code> class.
	 * The passed parameters must match those used for registration with {@link StateHandlerRegistry#attachChange} beforehand.
	 *
	 * @param {function} fnStateEventHandler The handler function to detach from the event
	 * @param {object} [oListener] The context object to call the event handler with (value of <code>this</code> in the event handler function). Defaults to the StateHandlerRegistry instance itself.
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 */
	StateHandlerRegistry.prototype.detachChange = function(fnStateEventHandler, oListener) {
		return EventProvider.prototype.detachEvent.call(this, "stateChange", fnStateEventHandler, oListener);
	};

	/**
	 * @private
	 * @ui5-restricted sap.m
	 *
	 * Fires an {@link sap.ui.base.Event event} with the given settings and notifies all attached event handlers.
	 *
	 * @param {sap.ui.core.Control} oControl The control instance
	 * @param {object} oFullState The updated state after change processing
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 */
	StateHandlerRegistry.prototype.fireChange = function(oControl, oFullState) {
		return EventProvider.prototype.fireEvent.call(this, "stateChange", {
			control: oControl,
			state: oFullState
		});
	};

	/**
	 * This method is the central point of access to the DefaultProviderRegistry Singleton.
	 *
	 * @private
	 * @ui5-restricted sap.m
	 *
	 * @returns {this} Returns the <code>StateHandlerRegistry</code> instance.
	 */
	StateHandlerRegistry.getInstance = () => {
		if (!oStateHandlerRegistry) {
			oStateHandlerRegistry = new StateHandlerRegistry();
		}
		return oStateHandlerRegistry;
	};

	return StateHandlerRegistry;
});