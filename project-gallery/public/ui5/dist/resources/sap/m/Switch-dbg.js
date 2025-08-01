/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.Switch.
sap.ui.define([
	'./library',
	"sap/base/i18n/Localization",
	'sap/ui/core/Control',
	'sap/ui/core/EnabledPropagator',
	'sap/ui/core/IconPool',
	"sap/ui/core/Lib",
	'sap/ui/core/theming/Parameters',
	'sap/ui/events/KeyCodes',
	'./SwitchRenderer',
	"sap/base/assert"
],
function(
	library,
	Localization,
	Control,
	EnabledPropagator,
	IconPool,
	Library,
	Parameters,
	KeyCodes,
	SwitchRenderer,
	assert
) {
		"use strict";

		// shortcut for sap.m.touch
		var touch = library.touch;

		// shortcut for sap.m.SwitchType
		var SwitchType = library.SwitchType;

		/**
		 * Constructor for a new Switch.
		 *
		 * @param {string} [sId] id for the new control, generated automatically if no id is given
		 * @param {object} [mSettings] initial settings for the new control
		 *
		 * @class
		 * A switch is a user interface control on mobile devices that is used for change between binary states.
		 * The user can also drag the button handle or tap to change the state.
		 *
		 * @see {@link fiori:https://experience.sap.com/fiori-design-web/switch/ Switch}
		 *
		 * @extends sap.ui.core.Control
		 *
		 * @author SAP SE
		 * @version 1.138.0
		 *
		 * @constructor
		 * @public
		 * @alias sap.m.Switch
		 */
		var Switch = Control.extend("sap.m.Switch", /** @lends sap.m.Switch.prototype */ {
			metadata: {

				interfaces: [
					"sap.ui.core.IFormContent",
					"sap.m.IOverflowToolbarContent",
					"sap.m.IToolbarInteractiveControl"
				],
				library: "sap.m",
				properties: {

					/**
					 * A boolean value indicating whether the switch is on or off.
					 */
					state: { type: "boolean", group: "Misc", defaultValue: false },

					/**
					 * Custom text for the "ON" state.
					 *
					 * "ON" translated to the current language is the default value.
					 * Beware that the given text will be cut off if available space is exceeded.
					 */
					customTextOn: { type: "string", group: "Misc", defaultValue: "" },

					/**
					 * Custom text for the "OFF" state.
					 *
					 * "OFF" translated to the current language is the default value.
					 * Beware that the given text will be cut off if available space is exceeded.
					 */
					customTextOff: { type: "string", group: "Misc", defaultValue: "" },

					/**
					 * Whether the switch is enabled.
					 */
					enabled: { type: "boolean", group: "Data", defaultValue: true },

					/**
					 * The name to be used in the HTML code for the switch (e.g. for HTML forms that send data to the server via submit).
					 */
					name: { type: "string", group: "Misc", defaultValue: "" },

					/**
					 * Type of a Switch. Possibles values "Default", "AcceptReject".
					 */
					type: { type : "sap.m.SwitchType", group: "Appearance", defaultValue: SwitchType.Default }
				},
				associations: {

					/**
					 * Association to controls / ids which label this control (see WAI-ARIA attribute aria-labelledby).
					 * @since 1.27.0
					 */
					ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
				},
				events: {

					/**
					 * Triggered when a switch changes the state.
					 */
					change: {
						parameters: {

							/**
							 * The new state of the switch.
							 */
							state: { type: "boolean" }
						}
					}
				},
				designtime: "sap/m/designtime/Switch.designtime"
			},

			renderer: SwitchRenderer
		});

		IconPool.insertFontFaceStyle();
		EnabledPropagator.apply(Switch.prototype, [true]);

		/* =========================================================== */
		/* Internal methods and properties                             */
		/* =========================================================== */

		/**
		 * Slide the switch.
		 *
		 * @private
		 */
		Switch.prototype._slide = function(iPosition) {
			if (iPosition > Switch._OFFPOSITION) {
				iPosition = Switch._OFFPOSITION;
			} else if (iPosition < Switch._ONPOSITION) {
				iPosition = Switch._ONPOSITION;
			}

			// fix handle movement when the switch is shorter (no label) in some themes | BCP: 2170252080
			if (iPosition > this._iNoLabelFix) {
				iPosition = this._iNoLabelFix;
			}

			if (this._iCurrentPosition === iPosition) {
				return;
			}

			this._iCurrentPosition = iPosition;
			this.getDomRef("inner").style[Localization.getRTL() ? "right" : "left"] = iPosition + "px";
			this._setTempState(Math.abs(iPosition) < Switch._SWAPPOINT);
		};

		Switch.prototype._resetSlide = function() {
			this.getDomRef("inner").style.cssText = "";
		};

		Switch.prototype._setTempState = function(b) {
			if (this._bTempState === b) {
				return;
			}

			this._bTempState = b;
			this.getDomRef("handle").setAttribute("data-sap-ui-swt", b ? this._sOn : this._sOff);
		};

		Switch.prototype.getInvisibleElementId = function() {
			return this.getId() + "-invisible";
		};

		Switch.prototype.getInvisibleElementText = function(bState) {
			var oBundle = Library.getResourceBundleFor("sap.m");
			var sText = "";

			switch (this.getType()) {
				case SwitchType.Default:
					sText = bState ? this.getCustomTextOn().trim() : this.getCustomTextOff().trim();
					break;

				case SwitchType.AcceptReject:
					sText = bState ? oBundle.getText("SWITCH_ARIA_ACCEPT") : oBundle.getText("SWITCH_ARIA_REJECT");
					break;

				// no default
			}

			return sText;
		};

		var mParams = Object.assign({
			// add base styles as default
			"_sap_m_Switch_OnPosition": -32,
			"_sap_m_Switch_OffPosition": 0
		}, Parameters.get({
			name: ["_sap_m_Switch_OnPosition", "_sap_m_Switch_OffPosition"],
			callback: function (_mParams) {
				Switch._ONPOSITION = Number(_mParams["_sap_m_Switch_OnPosition"]);
				Switch._OFFPOSITION = Number(_mParams["_sap_m_Switch_OffPosition"]);
				Switch._SWAPPOINT = Math.abs((Switch._ONPOSITION - Switch._OFFPOSITION) / 2);
			}
		}));

		// the position of the inner HTML element whether the switch is "ON"
		Switch._ONPOSITION = Number(mParams["_sap_m_Switch_OnPosition"]);

		// the position of the inner HTML element whether the switch is "OFF"
		Switch._OFFPOSITION = Number(mParams["_sap_m_Switch_OffPosition"]);

		// swap point
		Switch._SWAPPOINT = Math.abs((Switch._ONPOSITION - Switch._OFFPOSITION) / 2);

		/* =========================================================== */
		/* Lifecycle methods                                           */
		/* =========================================================== */

		Switch.prototype.onBeforeRendering = function() {
			var oRb = Library.getResourceBundleFor("sap.m");
			this._sOn = this.getCustomTextOn() || oRb.getText("SWITCH_ON");
			this._sOff = this.getCustomTextOff() || oRb.getText("SWITCH_OFF");
		};

		/* =========================================================== */
		/* Event handlers                                              */
		/* =========================================================== */

		/**
		 * Handle the touch start event happening on the switch.
		 *
		 * @param {jQuery.Event} oEvent The event object.
		 * @private
		 */
		Switch.prototype.ontouchstart = function(oEvent) {
			var oTargetTouch = oEvent.targetTouches[0],
				CSS_CLASS = this.getRenderer().CSS_CLASS,
				$SwitchInner = this.$("inner");

			// mark the event for components that needs to know if the event was handled by the Switch
			oEvent.setMarked();

			// only process single touches (only the first active touch point)
			if (touch.countContained(oEvent.touches, this.getId()) > 1 ||
				!this.getEnabled() ||

				// detect which mouse button caused the event and only process the standard click
				// (this is usually the left button, oEvent.button === 0 for standard click)
				// note: if the current event is a touch event oEvent.button property will be not defined
				oEvent.button) {

				return;
			}

			// track the id of the first active touch point
			this._iActiveTouchId = oTargetTouch.identifier;

			this._bTempState = this.getState();
			this._iStartPressPosX = oTargetTouch.pageX;
			this._iPosition = $SwitchInner.position().left;

			// track movement to determine if the interaction was a click or a tap
			this._bDragging = false;

			// note: force ie browsers to set the focus to switch
			setTimeout(this["focus"].bind(this), 0);

			// add active state
			this.$("switch").addClass(CSS_CLASS + "Pressed");

			// necessary for fixing handle movement when the switch is shorter (no label) in some themes | BCP: 2170252080
			this._iNoLabelFix = parseInt(getComputedStyle(this.getDomRef("switch")).outlineOffset);
		};

		/**
		 * Handle the touch move event on the switch.
		 *
		 * @param {jQuery.Event} oEvent The event object.
		 * @private
		 */
		Switch.prototype.ontouchmove = function(oEvent) {

			// mark the event for components that needs to know if the event was handled by the Switch
			oEvent.setMarked();

			// note: prevent native document scrolling
			oEvent.preventDefault();

			var oTouch,
				iPosition,
				fnTouch = touch;

			if (!this.getEnabled() ||

				// detect which mouse button caused the event and only process the standard click
				// (this is usually the left button, oEvent.button === 0 for standard click)
				// note: if the current event is a touch event oEvent.button property will be not defined
				oEvent.button) {

				return;
			}

			// only process single touches (only the first active touch point),
			// the active touch has to be in the list of touches
			assert(fnTouch.find(oEvent.touches, this._iActiveTouchId), "missing touchend");

			// find the active touch point
			oTouch = fnTouch.find(oEvent.changedTouches, this._iActiveTouchId);

			// only process the active touch
			if (!oTouch ||

				// note: do not rely on a specific granularity of the touchmove event.
				// On windows 8 surfaces, the touchmove events are dispatched even if
				// the user doesn’t move the touch point along the surface.
				// BCP:1770100948 - A threshold of 5px is added for accidental movement of the finger.
				Math.abs(oTouch.pageX - this._iStartPressPosX) < 6) {
				return;
			}

			// interaction was not a click or a tap
			this._bDragging = true;

			iPosition = ((this._iStartPressPosX - oTouch.pageX) * -1) + this._iPosition;

			// RTL mirror
			if (Localization.getRTL()) {
				iPosition = -iPosition;
			}

			this._slide(iPosition);
		};

		/**
		 * Handle the touch end event on the switch.
		 *
		 * @param {jQuery.Event} oEvent The event object.
		 * @private
		 */
		Switch.prototype.ontouchend = function(oEvent) {

			// mark the event for components that needs to know if the event was handled by the Switch
			oEvent.setMarked();

			var oTouch,
				fnTouch = touch;

			if (!this.getEnabled() ||

				// detect which mouse button caused the event and only process the standard click
				// (this is usually the left button, oEvent.button === 0 for standard click)
				// note: if the current event is a touch event oEvent.button property will be not defined
				oEvent.button) {

				return;
			}

			// only process single touches (only the first active touch)
			assert(this._iActiveTouchId !== undefined, "expect to already be touching");

			// find the active touch point
			oTouch = fnTouch.find(oEvent.changedTouches, this._iActiveTouchId);

			// process this event only if the touch we're tracking has changed
			if (oTouch) {

				// the touchend for the touch we're monitoring
				assert(!fnTouch.find(oEvent.touches, this._iActiveTouchId), "touchend still active");

				if (!this._updateStateAndNotify()) {
					this.$("switch").removeClass(this.getRenderer().CSS_CLASS + "Pressed");
					this._resetSlide();
				}
			}
		};

		/**
		 * Handle the touchcancel event on the switch.
		 *
		 * @param {jQuery.Event} oEvent The event object.
		 * @private
		 */
		Switch.prototype.ontouchcancel = Switch.prototype.ontouchend;

		/**
		 *  Handle when the space or enter key are pressed.
		 *
		 * @param {jQuery.Event} oEvent The event object.
		 * @private
		 */
		Switch.prototype._handleSpaceOrEnter = function(oEvent) {
			if (this.getEnabled()) {

				// mark the event for components that needs to know if the event was handled by the Switch
				oEvent.setMarked();

				if (!this._bDragging) {
					this._updateStateAndNotify();
				}
			}
		};

		/**
		 * @private
		 * @param {object} oEvent The fired event
		 */
		Switch.prototype.onsapspace = function(oEvent) {
			// prevent scrolling on SAPCE
			oEvent.preventDefault();
		};

		/**
		 * Handles space key on kye up
		 *
		 * @private
		*/
		Switch.prototype.onkeyup = function (oEvent) {
			if (oEvent.which === KeyCodes.SPACE) {
				this._handleSpaceOrEnter(oEvent);
			}
		};

		/**
		 * Handles enter key
		 *
		 * @private
		 */
		Switch.prototype.onsapenter = Switch.prototype._handleSpaceOrEnter;


		Switch.prototype._updateStateAndNotify = function() {
			var bState = this.getState(),
				bChanged;

			this.setState(this._bDragging ? this._bTempState : !bState);

			bChanged = bState !== this.getState();

			if (bChanged) {
				this.fireChange({ state: this.getState() });
			}
			this._bDragging = false;

			return bChanged;
		};

		/* =========================================================== */
		/* API method                                                  */
		/* =========================================================== */

		Switch.prototype.getAccessibilityInfo = function() {
			var oBundle = Library.getResourceBundleFor("sap.m"),
				sDesc = this._getAccDescription();

			return {
				role: "switch",
				type: oBundle.getText("ACC_CTR_TYPE_SWITCH"),
				description: sDesc,
				focusable: this.getEnabled(),
				enabled: this.getEnabled()
			};
		};

	/**
	 * Required by the {@link sap.m.IOverflowToolbarContent} interface.
	 *
	 * @returns {object} Configuration information for the <code>sap.m.IOverflowToolbarContent</code> interface.
	 *
	 * @private
	 * @ui5-restricted sap.m.OverflowToolBar
	 */
	Switch.prototype.getOverflowToolbarConfig = function() {
		return {
			propsUnrelatedToSize: ["enabled", "state"]
		};
	};

	/**
	 * Required by the {@link sap.m.IToolbarInteractiveControl} interface.
	 * Determines if the Control is interactive.
	 *
	 * @returns {boolean} If it is an interactive Control
	 *
	 * @private
	 * @ui5-restricted sap.m.OverflowToolBar, sap.m.Toolbar
	 */
	 Switch.prototype._getToolbarInteractive = function () {
		return true;
	};

	/**
	 * Returns accessibility description of the control
	 *
	 * @returns {string} description text
	 *
	 * @private
	 *
	 */
	 Switch.prototype._getAccDescription = function () {
		var bState = this.getState(),
			oBundle = Library.getResourceBundleFor("sap.m"),
			sStateDescr = bState ? oBundle.getText("SWITCH_ON") : oBundle.getText("SWITCH_OFF"),
			sInvisibleText = this.getInvisibleElementText(bState);

		return sStateDescr + (sInvisibleText ? ", " + sInvisibleText : "");
	};

	return Switch;
});