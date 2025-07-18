/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.ws.WebSocket for standard WebSocket support
sap.ui.define([
	'sap/ui/Device',
	'sap/ui/base/EventProvider',
	'./ReadyState',
	'sap/ui/thirdparty/URI',
	"sap/base/Log"
],
	function(Device, EventProvider, ReadyState, URI, Log) {
	"use strict";

	/**
	 * Creates a new WebSocket connection.
	 *
	 * @param {string} sUrl relative or absolute URL for WebSocket connection.
	 * @param {array} [aProtocols] array of protocols as strings, a single protocol as a string
	 * @public
	 *
	 * @class Basic WebSocket class.
	 * @extends sap.ui.base.EventProvider
	 * @author SAP SE
	 * @version 1.138.0
	 * @alias sap.ui.core.ws.WebSocket
	 */
	var WebSocket = EventProvider.extend("sap.ui.core.ws.WebSocket", /** @lends sap.ui.core.ws.WebSocket.prototype */ {

		constructor: function(sUrl, aProtocols) {
			EventProvider.apply(this);

			// Check WebSocket support
			if (!Device.support.websocket) {
				throw new Error("Browser does not support WebSockets.");
			}

			// Check url
			if (typeof (sUrl) !== "string") {
				throw new Error("sUrl must be a string.");
			}

			// Check protocols
			if (typeof (aProtocols) !== 'undefined' && !Array.isArray(aProtocols) && typeof (aProtocols) !== 'string') {
				throw new Error("aProtocols must be a string, array of strings or undefined.");
			}

			this._openConnection(sUrl, aProtocols);
		},

		metadata: {
			publicMethods : [ "send", "close", "getReadyState", "getProtocol" ]
		}

	});

	/**
	 * <code>WebSockets</code> don't have a facade and therefore return themselves as their interface.
	 *
	 * @returns {sap.ui.core.Element} <code>this</code> as there's no facade for a <code>Websocket</code> instance
	 * @see sap.ui.base.Object#getInterface
	 * @public
	 */
	WebSocket.prototype.getInterface = function() {
		return this;
	};

	/**
	 * Map of event names, that are provided by the WebSocket.
	 */
	WebSocket.M_EVENTS = {

		/**
		 * Fired when the connection was successfully opened.
		 */
		Open : "open",

		/**
		 * Fired when the connection was closed.
		 */
		Close : "close",

		/**
		 * Fired when an error occurred.
		 * Contains Parameters: error
		 */
		Error : "error",

		/**
		 * Fired when a message was received
		 * Contains Parameters: data
		 */
		Message : "message"
	};

	/**
	 * The <code>open</code> event is fired, when the connection was successfully opened.
	 *
	 * @name sap.ui.core.ws.WebSocket#open
	 * @event
	 * @param {sap.ui.base.Event} oControlEvent
	 * @param {sap.ui.base.EventProvider} oControlEvent.getSource
	 * @param {object} oControlEvent.getParameters
	 * @public
	 */

	/**
	 * Attaches event handler <code>fnFunction</code> to the {@link #event:open open} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code>
	 * if specified, otherwise it will be bound to this <code>sap.ui.core.ws.WebSocket</code> itself.
	 *
	 * @param {object}
	 *            [oData] An application-specific payload object that will be passed to the event handler
	 *            along with the event object when firing the event
	 * @param {function}
	 *            fnFunction The function to be called, when the event occurs
	 * @param {object}
	 *            [oListener] Context object to call the event handler with. Defaults to this
	 *            <code>WebSocket</code> itself
	 *
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.attachOpen = function(oData, fnFunction, oListener) {
		this.attachEvent("open", oData, fnFunction, oListener);
		return this;
	};

	/**
	 * Detaches event handler <code>fnFunction</code> from the {@link #event:open open} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * The passed function and listener object must match the ones used for event registration.
	 *
	 * @param {function}
	 *            fnFunction The function to call, when the event occurs
	 * @param {object}
	 *            [oListener] Context object on which the given function had to be called
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.detachOpen = function(fnFunction, oListener) {
		this.detachEvent("open", fnFunction, oListener);
		return this;
	};

	/**
	 * Fires event {@link #event:open open} to attached listeners.
	 *
	 * @param {object} [oParameters] Parameters to pass along with the event
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @protected
	 */
	WebSocket.prototype.fireOpen = function(oParameters) {
		this.fireEvent("open", oParameters);
		return this;
	};


	/**
	 * The <code>close</code> event is fired, when the connection was closed.
	 *
	 * @name sap.ui.core.ws.WebSocket#close
	 * @event
	 * @param {sap.ui.base.Event} oControlEvent
	 * @param {sap.ui.base.EventProvider} oControlEvent.getSource
	 * @param {object} oControlEvent.getParameters
	 * @param {string} oControlEvent.getParameters.code Close code provided by the server.
	 * @param {string} oControlEvent.getParameters.reason Reason from server for closing the connection.
	 * @param {string} oControlEvent.getParameters.wasClean Indicates whether the connection was cleanly closed or not.
	 * @public
	 */

	/**
	 * Attaches event handler <code>fnFunction</code> to the {@link #event:close close} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code>
	 * if specified, otherwise it will be bound to this <code>sap.ui.core.ws.WebSocket</code> itself.
	 *
	 * @param {object}
	 *            [oData] An application-specific payload object that will be passed to the event handler
	 *            along with the event object when firing the event
	 * @param {function}
	 *            fnFunction The function to be called, when the event occurs
	 * @param {object}
	 *            [oListener] Context object to call the event handler with. Defaults to this
	 *            <code>WebSocket</code> itself
	 *
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.attachClose = function(oData, fnFunction, oListener) {
		this.attachEvent("close", oData, fnFunction, oListener);
		return this;
	};

	/**
	 * Detaches event handler <code>fnFunction</code> from the {@link #event:close close} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * The passed function and listener object must match the ones used for event registration.
	 *
	 * @param {function}
	 *            fnFunction The function to call, when the event occurs
	 * @param {object}
	 *            [oListener] Context object on which the given function had to be called
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.detachClose = function(fnFunction, oListener) {
		this.detachEvent("close", fnFunction, oListener);
		return this;
	};

	/**
	 * Fires event {@link #event:close close} to attached listeners.
	 *
	 * @param {object} [oParameters] Parameters to pass along with the event
	 * @param {string} [oParameters.code] Close code provided by the server
	 * @param {string} [oParameters.reason] Reason from server for closing the connection
	 * @param {string} [oParameters.wasClean] Indicates whether the connection was cleanly closed or not
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @protected
	 */
	WebSocket.prototype.fireClose = function(oParameters) {
		this.fireEvent("close", oParameters);
		return this;
	};


	/**
	 * The <code>error</code> event is fired, when an error occurred.
	 *
	 * @name sap.ui.core.ws.WebSocket#error
	 * @event
	 * @param {sap.ui.base.Event} oControlEvent
	 * @param {sap.ui.base.EventProvider} oControlEvent.getSource
	 * @param {object} oControlEvent.getParameters
	 * @public
	 */

	/**
	 * Attaches event handler <code>fnFunction</code> to the {@link #event:error error} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code>
	 * if specified, otherwise it will be bound to this <code>sap.ui.core.ws.WebSocket</code> itself.
	 *
	 * @param {object}
	 *            [oData] An application-specific payload object that will be passed to the event handler
	 *            along with the event object when firing the event
	 * @param {function}
	 *            fnFunction The function to be called, when the event occurs
	 * @param {object}
	 *            [oListener] Context object to call the event handler with. Defaults to this
	 *            <code>WebSocket</code> itself
	 *
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.attachError = function(oData, fnFunction, oListener) {
		this.attachEvent("error", oData, fnFunction, oListener);
		return this;
	};

	/**
	 * Detaches event handler <code>fnFunction</code> from the {@link #event:error error} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * The passed function and listener object must match the ones used for event registration.
	 *
	 * @param {function}
	 *            fnFunction The function to call, when the event occurs
	 * @param {object}
	 *            [oListener] Context object on which the given function had to be called
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.detachError = function(fnFunction, oListener) {
		this.detachEvent("error", fnFunction, oListener);
		return this;
	};

	/**
	 * Fires event {@link #event:error error} to attached listeners.
	 *
	 * @param {object} [oParameters] Parameters to pass along with the event
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @protected
	 */
	WebSocket.prototype.fireError = function(oParameters) {
		this.fireEvent("error", oParameters);
		return this;
	};

	/**
	 * The <code>message</code> event is fired, when a message was received.
	 *
	 * @name sap.ui.core.ws.WebSocket#message
	 * @event
	 * @param {sap.ui.base.Event} oControlEvent
	 * @param {sap.ui.base.EventProvider} oControlEvent.getSource
	 * @param {object} oControlEvent.getParameters
	 * @param {string} oControlEvent.getParameters.data Received data from the server.
	 * @public
	 */

	/**
	 * Attaches event handler <code>fnFunction</code> to the {@link #event:message message} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code>
	 * if specified, otherwise it will be bound to this <code>sap.ui.core.ws.WebSocket</code> itself.
	 *
	 * @param {object}
	 *            [oData] An application-specific payload object that will be passed to the event handler
	 *            along with the event object when firing the event
	 * @param {function}
	 *            fnFunction The function to be called, when the event occurs
	 * @param {object}
	 *            [oListener] Context object to call the event handler with. Defaults to this
	 *            <code>WebSocket</code> itself
	 *
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.attachMessage = function(oData, fnFunction, oListener) {
		this.attachEvent("message", oData, fnFunction, oListener);
		return this;
	};

	/**
	 * Detaches event handler <code>fnFunction</code> from the {@link #event:message message} event of this
	 * <code>sap.ui.core.ws.WebSocket</code>.
	 *
	 * The passed function and listener object must match the ones used for event registration.
	 *
	 * @param {function}
	 *            fnFunction The function to call, when the event occurs
	 * @param {object}
	 *            [oListener] Context object on which the given function had to be called
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.detachMessage = function(fnFunction, oListener) {
		this.detachEvent("message", fnFunction, oListener);
		return this;
	};

	/**
	 * Fires event {@link #event:message message} to attached listeners.
	 *
	 * @param {object} [oParameters] Parameters to pass along with the event
	 * @param {string} [oParameters.data] Received data from the server
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @protected
	 */
	WebSocket.prototype.fireMessage = function(oParameters) {
		this.fireEvent("message", oParameters);
		return this;
	};

	// Private Methods
	/**
	 * Resolves the full WebSocket-URL from an absolute or relative URL.
	 *
	 * @param {string} sUrl input URL
	 * @return {string} sFullUrl full URL which can be used for the ws-connection
	 * @private
	 */
	WebSocket.prototype._resolveFullUrl = function(sUrl) {
		// parse URI string
		var oUri = new URI(sUrl);

		// create base URI to resolve absolute URL
		var oBaseUri = new URI(document.baseURI);

		// clear search string to remove parameters from the current page
		oBaseUri.search('');

		// set according WebSocket protocol (secure / non-secure)
		oBaseUri.protocol(oBaseUri.protocol() === 'https' ? 'wss' : 'ws');

		// resolve absolute to base
		// if there is already a protocol defined it won't be replaced
		oUri = oUri.absoluteTo(oBaseUri);

		// build string
		return oUri.toString();
	};

	/**
	 * Opens the connection and binds the event-handlers.
	 *
	 * @param {string} sUrl	URL for WebSocket
	 * @param {array} [aProtocols] array of protocols as strings, a single protocol as a string
	 * @private
	 */
	WebSocket.prototype._openConnection = function(sUrl, aProtocols) {
		sUrl = this._resolveFullUrl(sUrl);
		this._oWs = (typeof (aProtocols) === 'undefined')
			? new window.WebSocket(sUrl)
			: new window.WebSocket(sUrl, aProtocols);
		this._oWs.onopen = this._onopen.bind(this);
		this._oWs.onclose = this._onclose.bind(this);
		this._oWs.onmessage = this._onmessage.bind(this);
		this._oWs.onerror = this._onerror.bind(this);
	};

	// Event-Handlers
	/**
	 * Internal handler for open-event.
	 *
	 * @private
	 */
	WebSocket.prototype._onopen = function() {
		this.fireOpen();
	};

	/**
	 * Internal handler for close-event.
	 *
	 * @private
	 */
	WebSocket.prototype._onclose = function(oCloseEvent) {
		this.fireClose({
			code: oCloseEvent.code,
			reason: oCloseEvent.reason,
			wasClean: oCloseEvent.wasClean
		});
	};

	/**
	 * Internal handler for error-event.
	 *
	 * @private
	 */
	WebSocket.prototype._onerror = function(oEvent) {
		this.fireError();
	};

	/**
	 * Internal handler for message-event.
	 *
	 * @private
	 */
	WebSocket.prototype._onmessage = function(oMessageEvent) {
		this.fireMessage({
			data: oMessageEvent.data
		});
	};

	// Public Methods
	/**
	 * Sends a message.
	 *
	 * If the connection is not yet opened, the message will be queued and sent
	 * when the connection is established.
	 *
	 * @param {string} sMessage Message to send
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.send = function(sMessage) {
		if (this.getReadyState() === ReadyState.OPEN) {
			this._oWs.send(sMessage);
		} else if (this.getReadyState() === ReadyState.CONNECTING) {
			// queue the message until the connection is opened
			this.attachEventOnce("open", function(oEvent) {
				this._oWs.send(sMessage);
			});
		} else {
			Log.warning("Unable to send WebSocket message. " +
				"Connection is already closed or closing. message: " + sMessage);
		}
		return this;
	};

	/**
	 * Closes the connection.
	 *
	 * @param {int} [iCode=1000] Status code that explains why the connection is closed. Must either be 1000, or
	 *                      between 3000 and 4999
	 * @param {string} [sReason] Closing reason as a string
	 * @ui5-omissible-params iCode
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	WebSocket.prototype.close = function(iCode, sReason) {

		// Check if only sReason is given
		if (typeof (iCode) === 'string') {
			sReason = iCode;
			iCode = undefined;
		}

		iCode = (typeof (iCode) === 'undefined') ? 1000 : iCode;
		sReason = (typeof (sReason) === 'undefined') ? "" : sReason;

		if (this.getReadyState() === ReadyState.OPEN) {
			this._oWs.close(iCode, sReason);
		} else if (this.getReadyState() === ReadyState.CONNECTING) {
			// queue closing until the connection is opened
			this.attachEventOnce("open", function(oEvent) {
				this._oWs.close(iCode, sReason);
			});
		} else {
			var sText = '';

			switch (this.getReadyState()) {
			case ReadyState.CLOSED:
				sText = "Connection is already closed.";
				break;
			case ReadyState.CLOSING:
				sText = "Connection is already closing.";
				break;
			}

			Log.warning("Unable to close WebSocket connection. " + sText);
		}

		return this;
	};

	/**
	 * Getter for WebSocket readyState.
	 *
	 * @returns {sap.ui.core.ws.ReadyState} readyState
	 * @public
	 */
	WebSocket.prototype.getReadyState = function() {
		return this._oWs.readyState;
	};

	/**
	 * Getter for the protocol selected by the server once the connection is open.
	 *
	 * @returns {string} protocol
	 * @public
	 */
	WebSocket.prototype.getProtocol = function() {
		return this._oWs.protocol;
	};

	return WebSocket;

});