/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.EventBus
sap.ui.define([
	'sap/ui/base/Object',
	'sap/ui/base/EventProvider',
	"sap/base/assert",
	"sap/base/Log"
],
	function(BaseObject, EventProvider, assert, Log) {
	"use strict";

	let oEventBus;

	/**
	 * Creates an instance of EventBus.
	 *
	 * @class Provides eventing capabilities for applications like firing events and attaching or detaching event
	 *        handlers for events which are notified when events are fired.
	 *
	 *        It is recommended to use the EventBus only when there is no other option to communicate between different instances, e.g. native UI5 events.
	 *        Custom events can be fired by classes that extend {@link sap.ui.base.EventProvider}, such as sap.ui.core.Control, sap.ui.core.mvc.View or sap.ui.core.Component,
	 *        and the events can be consumed by other classes to achieve communication between different instances.
	 *
	 *        Heavily using the EventBus can easily result in code which is hard to read and maintain because it's
	 *        difficult to keep an overview of all event publishers and subscribers.
	 *
	 * @extends sap.ui.base.Object
	 * @author SAP SE
	 * @version 1.138.0
	 * @public
	 * @since 1.8.0
	 * @alias sap.ui.core.EventBus
	 */
	var EventBus = BaseObject.extend("sap.ui.core.EventBus", {

		constructor : function() {
			BaseObject.apply(this);
			this._mChannels = {};
			this._defaultChannel = new EventProvider();
			this._bIsSuspended = false;
		}

	});

	/**
	 * Attaches an event handler to the event with the given identifier on the given event channel.
	 *
	 * @param {string}
	 *            [sChannelId] The channel of the event to subscribe to. If not given, the default channel is used.
	 *                         The channel <code>"sap.ui"</code> is reserved by the UI5 framework. An application might listen to
	 *                         events on this channel but is not allowed to publish its own events there.
	 * @param {string}
	 *            sEventId The identifier of the event to listen for
	 * @param {function(string, string, Object)}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the event bus instance. The channel is provided as first argument of the handler, and
	 *                       the event identifier is provided as the second argument. The parameter map carried by the event is provided as the third argument (if present).
	 *                       Handlers must not change the content of this map.
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the event bus.
	 * @return {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	EventBus.prototype.subscribe = function(sChannelId, sEventId, fnFunction, oListener) {
		if (typeof (sEventId) === "function") {
			oListener = fnFunction;
			fnFunction = sEventId;
			sEventId = sChannelId;
			sChannelId = null;
		}

		assert(!sChannelId || typeof (sChannelId) === "string", "EventBus.subscribe: sChannelId must be empty or a non-empty string");
		assert(typeof (sEventId) === "string" && sEventId, "EventBus.subscribe: sEventId must be a non-empty string");
		assert(typeof (fnFunction) === "function", "EventBus.subscribe: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventBus.subscribe: oListener must be empty or an object");

		var oChannel = getOrCreateChannel(this, sChannelId);
		oChannel.attachEvent(sEventId, fnFunction, oListener);
		return this;
	};

	/**
	 * Attaches an event handler, called one time only, to the event with the given identifier on the given event channel.
	 *
	 * When the event occurs, the handler function is called and the handler registration is automatically removed afterwards.
	 *
	 * @param {string}
	 *            [sChannelId] The channel of the event to subscribe to. If not given, the default channel is used.
	 *                         The channel <code>"sap.ui"</code> is reserved by the UI5 framework. An application might listen to
	 *                         events on this channel but is not allowed to publish its own events there.
	 * @param {string}
	 *            sEventId The identifier of the event to listen for
	 * @param {function(string, string, Object)}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the event bus instance. The channel is provided as first argument of the handler, and
	 *                       the event identifier is provided as the second argument. The parameter map carried by the event is provided as the third argument (if present).
	 *                       Handlers must not change the content of this map.
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the event bus.
	 * @since 1.32.0
	 * @return {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	EventBus.prototype.subscribeOnce = function(sChannelId, sEventId, fnFunction, oListener){
		if (typeof (sEventId) === "function") {
			oListener = fnFunction;
			fnFunction = sEventId;
			sEventId = sChannelId;
			sChannelId = null;
		}

		function fnOnce() {
			this.unsubscribe(sChannelId, sEventId, fnOnce, undefined); // 'this' is always the control, due to the context 'undefined' in the attach call below
			fnFunction.apply(oListener || this, arguments);
		}
		return this.subscribe(sChannelId, sEventId, fnOnce, undefined); // a listener of 'undefined' enforce a context of 'this' in fnOnce
	};

	/**
	 * Removes a previously subscribed event handler from the event with the given identifier on the given event channel.
	 *
	 * The passed parameters must match those used for registration with {@link #subscribe } beforehand!
	 *
	 * @param {string}
	 *            [sChannelId] The channel of the event to unsubscribe from. If not given, the default channel is used.
	 * @param {string}
	 *            sEventId The identifier of the event to unsubscribe from
	 * @param {function(string, string, Object)}
	 *            fnFunction The handler function to unsubscribe from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 * @return {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	EventBus.prototype.unsubscribe = function(sChannelId, sEventId, fnFunction, oListener) {
		if (typeof (sEventId) === "function") {
			oListener = fnFunction;
			fnFunction = sEventId;
			sEventId = sChannelId;
			sChannelId = null;
		}

		assert(!sChannelId || typeof (sChannelId) === "string", "EventBus.unsubscribe: sChannelId must be empty or a non-empty string");
		assert(typeof (sEventId) === "string" && sEventId, "EventBus.unsubscribe: sEventId must be a non-empty string");
		assert(typeof (fnFunction) === "function", "EventBus.unsubscribe: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventBus.unsubscribe: oListener must be empty or an object");

		var oChannel = getChannel(this, sChannelId);
		if (!oChannel) {
			return this;
		}

		oChannel.detachEvent(sEventId, fnFunction, oListener);
		if (oChannel != this._defaultChannel) { // Check whether Channel is unused
			var mEvents = EventProvider.getEventList(oChannel);
			var bIsEmpty = true;
			for (var sId in mEvents) {
				if (oChannel.hasListeners(sId)) {
					bIsEmpty = false;
					break;
				}
			}
			if (bIsEmpty) {
				delete this._mChannels[sChannelId];
			}
		}

		return this;
	};

	/**
	 * Fires an event using the specified settings and notifies all attached event handlers.
	 *
	 * @param {string}
	 *            [sChannelId] The channel of the event to fire. If not given, the default channel is used. The channel <code>"sap.ui"</code> is
	 *                         reserved by the UI5 framework. An application might listen to events on this channel but is not allowed
	 *                         to publish its own events there.
	 * @param {string}
	 *            sEventId The identifier of the event to fire
	 * @param {object}
	 *            [oData] The parameters which should be carried by the event
	 * @public
	 */
	EventBus.prototype.publish = function(sChannelId, sEventId, oData) {

		if (arguments.length == 1) { //sEventId
			oData = null;
			sEventId = sChannelId;
			sChannelId = null;
		} else if (arguments.length == 2) { //sChannelId + sEventId || sEventId + oData
			if (typeof (sEventId) != "string") {
				oData = sEventId;
				sEventId = sChannelId;
				sChannelId = null;
			}
		}

		if (this._bIsSuspended) {
			Log.warning("Failed to publish into channel '" + sChannelId + "'." + " The EventBus is suspended.", sChannelId + "#" + sEventId, "sap.ui.core.EventBus");
			return;
		}

		oData = oData ? oData : {};

		assert(!sChannelId || typeof (sChannelId) === "string", "EventBus.publish: sChannelId must be empty or a non-empty string");
		assert(typeof (sEventId) === "string" && sEventId, "EventBus.publish: sEventId must be a non-empty string");
		assert(typeof (oData) === "object", "EventBus.publish: oData must be an object");

		var oChannel = getChannel(this, sChannelId);
		if (!oChannel) {
			// no channel
			if (Log.isLoggable(Log.Level.DEBUG, "sap.ui.core.EventBus")) {
				Log.debug("Failed to publish into channel '" + sChannelId + "'." + " No such channel.", sChannelId, "sap.ui.core.EventBus");
			}
			return;
		}

		//see sap.ui.base.EventProvider.prototype.fireEvent
		var aEventListeners = EventProvider.getEventList(oChannel)[sEventId];
		if (Array.isArray(aEventListeners)) {
			// this ensures no 'concurrent modification exception' occurs (e.g. an event listener deregisters itself).
			aEventListeners = aEventListeners.slice();
			var oInfo;
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				oInfo = aEventListeners[i];
				try {
					this._callListener(oInfo.fFunction, oInfo.oListener || this, sChannelId, sEventId, oData);
				} catch (error) {
					Log.error("Error occurred in calling the listener with index " + i + " in channel '" + sChannelId + "' for event '" + sEventId + "' (ignored). ", error, "sap.ui.core.EventBus");
				}
			}
		} else if (Log.isLoggable(Log.Level.DEBUG, "sap.ui.core.EventBus")) {
			// no listeners
			Log.debug("Failed to publish Event '" + sEventId + "' in '" + sChannelId + "'." + " No listeners found.", sChannelId + "#" + sEventId, "sap.ui.core.EventBus");
		}
	};

	EventBus.prototype.getInterface = function() {
		return this;
	};

	EventBus.prototype._callListener = function (fnCallback, oListener, sChannelId, sEventId, mData) {
		fnCallback.call(oListener, sChannelId, sEventId, mData);
	};


	/**
	 * Cleans up the internal structures and removes all event handlers.
	 *
	 * The object must not be used anymore after destroy was called.
	 *
	 * @see sap.ui.base.Object#destroy
	 * @public
	 */
	EventBus.prototype.destroy = function() {
		this._defaultChannel.destroy();
		for (var channel in this._mChannels) {
			this._mChannels[channel].destroy();
		}
		this._mChannels = {};
		BaseObject.prototype.destroy.apply(this, arguments);
	};

	/**
	 * Suspends the EventBus, so no further events will be published
	 *
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	EventBus.prototype.suspend = function () {
		this._bIsSuspended = true;
	};

	/**
	 * Resumes the EventBus, so future events will be published
	 *
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	EventBus.prototype.resume = function () {
		this._bIsSuspended = false;
	};

	function getChannel(oEventBus, sChannelId){
		if (!sChannelId) {
			return oEventBus._defaultChannel;
		}
		return oEventBus._mChannels[sChannelId];
	}

	function getOrCreateChannel(oEventBus, sChannelId){
		var oChannel = getChannel(oEventBus, sChannelId);
		if (!oChannel && sChannelId) {
			oEventBus._mChannels[sChannelId] = new EventProvider();
			oChannel = oEventBus._mChannels[sChannelId];
		}
		return oChannel;
	}
	/**
	 * Returns the singleton instance of the EventBus for global usage.
	 *
	 * @return {sap.ui.core.EventBus} the event bus
	 * @since 1.119.0
	 * @public
	 */
	EventBus.getInstance = () => {
		if (!oEventBus) {
			oEventBus = new EventBus();
			// protect against destruction
			oEventBus.destroy = () => {
				Log.error("Global EventBus cannot be destroyed!");
			};
		}
		return oEventBus;
	};

	return EventBus;
});
