/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.core.TooltipBase.
sap.ui.define([
	'./Control',
	'./Element',
	'./Popup',
	'./StaticArea',
	'./library',
	"sap/ui/core/RenderManager",
	"sap/ui/events/KeyCodes",
	"sap/ui/thirdparty/jquery"
],
	function(Control, Element, Popup, StaticArea, library, RenderManager, KeyCodes, jQuery) {
	"use strict";


	// shortcut for enum(s)
	var OpenState = library.OpenState;

	/**
	 * Constructor for a new TooltipBase.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @abstract
	 * @class
	 * Abstract class that can be extended in order to implement any extended tooltip. For example, RichTooltip Control is based on it. It provides the opening/closing behavior and the main "text" property.
	 * @extends sap.ui.core.Control
	 * @version 1.138.0
	 *
	 * @public
	 * @alias sap.ui.core.TooltipBase
	 */
	var TooltipBase = Control.extend("sap.ui.core.TooltipBase", /** @lends sap.ui.core.TooltipBase.prototype */ {
		metadata : {
			"abstract" : true,
			library : "sap.ui.core",
			properties : {

				/**
				 * The text that is shown in the tooltip that extends the TooltipBase class, for example in RichTooltip.
				 */
				text : {type : "string", group : "Data", defaultValue : ""},

				/**
				 * Optional. Open Duration in milliseconds.
				 */
				openDuration : {type : "int", group : "Behavior", defaultValue : 200},

				/**
				 * Optional. Close Duration in milliseconds.
				 */
				closeDuration : {type : "int", group : "Behavior", defaultValue : 200},

				/**
				 * Optional. My position defines which position on the extended tooltip being positioned to align with the target control.
				 */
				myPosition : {type : "sap.ui.core.Dock", group : "Behavior", defaultValue : 'begin top'},

				/**
				 * Optional. At position defines which position on the target control to align the positioned tooltip.
				 */
				atPosition : {type : "sap.ui.core.Dock", group : "Behavior", defaultValue : 'begin bottom'},

				/**
				 * Optional. Offset adds these left-top values to the calculated position.
				 * Example: "10 3".
				 */
				offset : {type : "string", group : "Behavior", defaultValue : '10 3'},

				/**
				 * Optional. Collision - when the positioned element overflows the window in some direction, move it to an alternative position.
				 */
				collision : {type : "sap.ui.core.Collision", group : "Behavior", defaultValue : 'flip'},

				/**
				 * Opening delay of the tooltip in milliseconds
				 */
				openDelay : {type : "int", group : "Misc", defaultValue : 500},

				/**
				 * Closing delay of the tooltip in milliseconds
				 */
				closeDelay : {type : "int", group : "Misc", defaultValue : 100}
			},
			events : {

				/**
				 * This event is fired when the Tooltip has been closed
				 * @since 1.11.0
				 */
				closed : {}
			}
		},
		renderer: null // this control has no renderer (it is abstract)
	});


	/**
	 * Determines the popup to use but do not expose it to the outside.
	 *
	 * @returns {sap.ui.core.Popup} The popup to use
	 * @private
	 */
	TooltipBase.prototype._getPopup = function() {
		var oPopup = new Popup();
		oPopup.setShadow(true);
		TooltipBase.prototype._getPopup = function() {
			return oPopup;
		};
		return oPopup;
	};

	/**
	 * When a control that has a Tooltip gets the focus, this method is called.
	 * @param {jQuery.Event} oEvent The event that occurred on the Control that has extended Tooltip.
	 * @private
	 */
	TooltipBase.prototype.onfocusin = function(oEvent) {

		var oSC = Element.closestTo(oEvent.target);
		if (oSC != null) {
			var oDomRef = oSC.getFocusDomRef();
			this.sStoredTooltip = null;
			if (oDomRef.title && oDomRef.title != "") {
				this.sStoredTooltip = oDomRef.title;
				oDomRef.title = "";
			}

			var oPopup = this._getPopup();
			if (!(oPopup.isOpen() && oPopup.getContent() == this)) {
				// Update Tooltip or create a new span with texts.
				new RenderManager().getInterface().render(this, StaticArea.getDomRef(), true);
			}

			// Attach accessibility info to the control oSC
			var sValue = oDomRef.getAttribute("aria-describedby");
			var sIdsString = this.getId() + "-title " + this.getId() + "-txt";
			if (sValue == null || sValue == "" ) {
				oDomRef.setAttribute("aria-describedby", sIdsString);
			} else if (sValue.indexOf(sIdsString) == -1) {
				oDomRef.setAttribute("aria-describedby", sValue + " " + sIdsString);
			}
		}
	};

	/**
	 * When a control that has a Tooltip looses the focus, this method is called.
	 * @param {jQuery.Event} oEvent The event that occurred on the extended Tooltip.
	 * @private
	 */
	TooltipBase.prototype.onfocusout = function(oEvent) {
		var oSC = Element.closestTo(oEvent.target);
		if (oSC != null) {

			var oDomRef = oSC.getFocusDomRef();
			if (this.sStoredTooltip) {
				oDomRef.title = this.sStoredTooltip;
			}

			// Detach accessibility information from control oSC.
			var sValue = oDomRef.getAttribute("aria-describedby");
			var sIdsString = this.getId() + "-title " + this.getId() + "-txt";
			if (sValue && sValue.indexOf(sIdsString) >= 0) {
				if (sValue.trim() == sIdsString) {
					oDomRef.removeAttribute("aria-describedby");
				} else  {
					sValue = sValue.replace(sIdsString, "");
					oDomRef.setAttribute("aria-describedby", sValue);
				}
			}
		}
		if (TooltipBase.sOpenTimeout) {
			clearTimeout(TooltipBase.sOpenTimeout);
			TooltipBase.sOpenTimeout = undefined;
		}

		// Avoid closing the popup when there is a move inside the control to another control or element (for example div)
		this.sCloseNowTimeout = setTimeout(this["closePopup"].bind(this), this.getCloseDelay());
	};

	/**
	 * Check if the parameter is a standard browser Tooltip.
	 *
	 * @param {string|sap.ui.core.TooltipBase} vTooltip The tooltip can be either a simple string or a subclass of
	 *  {@link sap.ui.core.TooltipBase}.
	 * @return {boolean} <code>true</code> if the Tooltip is a standard tooltip type of string. <code>false</code> if not a string or empty.
	 * @private
	 */
	TooltipBase.prototype.isStandardTooltip = function(vTooltip) {
		return typeof vTooltip === "string"  &&  !!vTooltip.trim();
	};

	/**
	* Handle the mouseover event of a Control that has a Tooltip.
	* @param {jQuery.Event} oEvent - The event that occurred on the Control.
	* @private
	 */
	TooltipBase.prototype.onmouseover = function(oEvent) {

		var oEventSource = Element.closestTo(oEvent.target), // The Element or Control that initiated the event.
			oCurrentElement = Element.closestTo(oEvent.currentTarget), // The current Element or Control within the event bubbling phase.
			oLeftElement = Element.closestTo(oEvent.relatedTarget); // Indicates the element being exited.
		// Log.debug("MOUSE OVER    " +  oEventSource + "  " + Element.closestTo(oEvent.currentTarget) + "   " + this._currentControl.getId());

		if (!oEventSource) {
			return;
		}

		if (oEventSource === this) {
			// If we move in the tooltip itself then do not close the tooltip.
			// Since the focus goes into the tooltip which means the tooltip is already open,
			// we don't need to execute the opening logic and simply return.
			if (this.sCloseNowTimeout) {
				clearTimeout(this.sCloseNowTimeout);
				this.sCloseNowTimeout = null;
			}
			oEvent.stopPropagation();
			oEvent.preventDefault();
			return;
		}

		if (oCurrentElement === oEventSource || !this.isStandardTooltip(oEventSource.getTooltip())) {
			// if the same element is reached from both oEvent.currentTarget and oEvent.target or the oEventSource
			// doesn't have a tooltip set, it means that there's no new control between the oEvent.target and
			// oEvent.currentTarget and the mouse moves within the same control, the close should be cancelled.
			if (this.sCloseNowTimeout) {
				clearTimeout(this.sCloseNowTimeout);
				this.sCloseNowTimeout = null;
				oEvent.stopPropagation();
				oEvent.preventDefault();
			}
		}

		if (oLeftElement) {
			// Cancel close event if we move from child without own tooltip to the parent with rtt - current element has to have rtt.
			if (oLeftElement.getParent()) {
				if (oLeftElement.getParent() === oCurrentElement && oCurrentElement === oEventSource) {
					// It is a child of the current element and has no tooltip
					var oLeftElementTooltip = oLeftElement.getTooltip();
					if ( !this.isStandardTooltip(oLeftElementTooltip) && (!oLeftElementTooltip || !(oLeftElementTooltip instanceof TooltipBase))) {
						if (this.sCloseNowTimeout) {
							clearTimeout(this.sCloseNowTimeout);
							this.sCloseNowTimeout = null;
							oEvent.stopPropagation();
							oEvent.preventDefault();
						}
					}
				}
			}
		}

		// Open the popup
		if (this._currentControl === oEventSource || !this.isStandardTooltip(oEventSource.getTooltip())) {
			// Set all standard tooltips to empty string
			this.removeStandardTooltips();
			// Open with delay 0,5 sec.
			if (TooltipBase.sOpenTimeout) {
				clearTimeout(TooltipBase.sOpenTimeout);
			}
			TooltipBase.sOpenTimeout = setTimeout(this["openPopup"].bind(this, this._currentControl), this.getOpenDelay());
			// We need this for the scenario if the both a child and his parent have a RichTooltip
			oEvent.stopPropagation();
			oEvent.preventDefault();
		}

	};

	/**
	 * Handle the mouseout event  of a Control that has a Tooltip.
	 * @param {jQuery.Event} oEvent Event that occurred on the Control that has extended Tooltip.
	 * @private
	 */
	TooltipBase.prototype.onmouseout = function(oEvent) {
		// Log.debug("MOUSE OUT    " + Element.closestTo(oEvent.target) + "   " + Element.closestTo(oEvent.currentTarget) );
		if (TooltipBase.sOpenTimeout) {
			clearTimeout(TooltipBase.sOpenTimeout);
			TooltipBase.sOpenTimeout = undefined;
		}
		// Avoid closing the popup when there is a move inside the control to another control or element (for example div)
		if (!this.sCloseNowTimeout) {
			this.sCloseNowTimeout = setTimeout(this["closePopup"].bind(this), this.getCloseDelay());
		}
		this.restoreStandardTooltips();
		oEvent.stopPropagation();
		oEvent.preventDefault();
	};

	/**
	 * Close the popup holding the content of the tooltip.
	 * Clears all delayed calls for closing this popup as those are not needed anymore.
	 * @private
	 */
	TooltipBase.prototype.closePopup = function() {

		var oPopup = this._getPopup();

		if (this.sCloseNowTimeout) {
			clearTimeout(this.sCloseNowTimeout);
		}
		this.sCloseNowTimeout = undefined;

		oPopup.attachClosed(this.handleClosed, this);
		oPopup.close();
		// Log.debug("CLOSE POPUP  " + this.getId());
		this.restoreStandardTooltips();
	};

	TooltipBase.prototype.handleClosed = function(){
		this._getPopup().detachClosed(this.handleClosed, this);
		this.fireClosed();
	};


	/**
	 * Open the popup holding the content of the tooltip.
	 * @param {Object} oSC - the Control that has extended Tooltip.
	 * @private
	 */
	TooltipBase.prototype.openPopup = function(oSC) {
		// Popup should be not open if visible is set to false
		if (!this.getVisible()) {
			return;
		}

		if (oSC.getTooltip() != null) {

			// Clear Delayed Call if exist
			if (this.sCloseNowTimeout) {
				clearTimeout(this.sCloseNowTimeout);
				this.sCloseNowTimeout = null;
				return;
			}

			// If already opened with the needed content then return
			var oPopup = this._getPopup();
			if (oPopup.isOpen() && oPopup.getContent() == this) {
				return;
			}

			// Open popup
			var oDomRef = oSC.getDomRef();
			oPopup.setContent(this);
			oPopup.setPosition(this.getMyPosition(), this.getAtPosition(), oDomRef, this.getOffset(), this.getCollision());
			oPopup.setDurations(this.getOpenDuration(), this.getCloseDuration());
			oPopup.open();
			this.removeStandardTooltips();
		}
	};

	/**
	 * Switch off the browser standard tooltips and store then in an array.
	 * @private
	*/
	TooltipBase.prototype.removeStandardTooltips = function() {

		var oDomRef = this._currentControl.getDomRef();
		if (!this.aStoredTooltips) {
			this.aStoredTooltips = [];
		} else {
			return;
		}

		var tooltip = "";
		while (oDomRef && !(oDomRef === document)) {
			tooltip = oDomRef.title;
			if ( tooltip ) {
				this.aStoredTooltips.push({ domref : oDomRef, tooltip : tooltip });
				oDomRef.title = "";
			}
			oDomRef = oDomRef.parentNode;
		}

		// Do it for the specified elements under the root Dom ref.
		if (this._currentControl.getTooltipDomRefs) {
			// oDomRefs is jQuery Object that contains DOM nodes of the elements to remove the tooltips
			var aDomRefs = this._currentControl.getTooltipDomRefs();
			for (var i = 0; i < aDomRefs.length; i++) {
				oDomRef = aDomRefs[i];
				if (oDomRef) {
					tooltip = oDomRef.title;
					if (tooltip) {
						this.aStoredTooltips.push({ domref : oDomRef, tooltip : tooltip });
						oDomRef.title = "";
					}
				}
			}
		}
	};

	/**
	 * Restore the standard browser tooltips.
	 * @private
	 */
	TooltipBase.prototype.restoreStandardTooltips = function() {

		var oPopup = this._getPopup();
		var eState = oPopup.getOpenState();
		if (eState === OpenState.OPEN || eState === OpenState.OPENING) {
			// Log.debug(oPopup.getOpenState());
			return;
		}
		if (TooltipBase.sOpenTimeout) {
			return;
		}
		if (this.aStoredTooltips) {
			for (var i = 0; i < this.aStoredTooltips.length; i++) {
				var oDomRef = this.aStoredTooltips[i].domref;
				oDomRef.title = this.aStoredTooltips[i].tooltip;
			}
		}
		this.aStoredTooltips = null;
	};

	/**
	 * Defines the new parent of this TooltipBase using {@link sap.ui.core.Element#setParent}.
	 * Additionally closes the Tooltip.
	 *
	 * @param {sap.ui.core.Element} oParent The element that becomes this element's parent.
	 * @param {string} sAggregationName - The name of the parent element's aggregation.
	 * @private
	 */
	TooltipBase.prototype.setParent = function(oParent, sAggregationName) {
		// As there is a new parent, close popup.
		var _oPopup = this._getPopup();
		if (_oPopup && _oPopup.isOpen()) {
			this.closePopup();
		}
		Control.prototype.setParent.apply(this, arguments);
	};
	/**
	 * Handle the key down event Ctrl+i and ESCAPE.
	 * @param {jQuery.Event} oEvent - the event that occurred on the Parent of the Extended Tooltip.
	 * @private
	 */
	TooltipBase.prototype.onkeydown = function(oEvent) {
		// Ctrl is pressed together with "i" - Open Rich tooltip.
		if (oEvent.ctrlKey && oEvent.which == KeyCodes.I) {
			// The Element or Control that initiated the event.

			var oEventSource = Element.closestTo(oEvent.target);
			if (oEventSource != null) {
				// If the current control is the event source or event source does not have a standard tooltip
				if (this._currentControl === oEventSource || !this.isStandardTooltip(oEventSource.getTooltip())) {

					// Set all standard tooltips to empty string
					this.removeStandardTooltips();

					// Open extended tooltip
					this.openPopup( this._currentControl);

					oEvent.preventDefault();
					oEvent.stopPropagation();
				}
			}
		} else if (oEvent.which == KeyCodes.ESCAPE) {
			// If ESC is pressed then close the Rich Tooltip.

			if (TooltipBase.sOpenTimeout) {
				clearTimeout(TooltipBase.sOpenTimeout);
				TooltipBase.sOpenTimeout = undefined;
			}


			var bWasOpen = this.oPopup && this.oPopup.isOpen();
			this.closePopup();
			if (bWasOpen) {
				// Only prevent event propagation when there actually was an open Popup
				// that has now been closed
				oEvent.preventDefault();
				oEvent.stopPropagation();
			}

		}
	};

	/**
	 * Closes the tooltip if open or clears the open timer.
	 * @private
	 */
	TooltipBase.prototype._closeOrPreventOpen = function() {
		var oPopup = this._getPopup();
		if (oPopup.isOpen()) {
			this.closePopup();
		} else if (TooltipBase.sOpenTimeout) {
			clearTimeout(TooltipBase.sOpenTimeout);
			TooltipBase.sOpenTimeout = undefined;
		}
	};


	return TooltipBase;

});