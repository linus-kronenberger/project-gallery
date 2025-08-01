/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides helper class ValueStateSupport
sap.ui.define(['./Element', './library', './Lib', "sap/base/assert"],
	function(Element, coreLib, Library, assert) {
	"use strict";

	// shortcut for enum(s)
	var ValueState = coreLib.ValueState;

		/**
		 * Helper functionality for value state support.
		 *
		 * @author SAP SE
		 * @version 1.138.0
		 * @public
		 * @namespace sap.ui.core.ValueStateSupport
		 */
		var ValueStateSupport = {};
		var mTexts = null;


		var ensureTexts = function() {
			if (!mTexts) { // initialize texts if required
				mTexts = {};
				var rb = Library.getResourceBundleFor("sap.ui.core");
				mTexts[ValueState.Error] = rb.getText("VALUE_STATE_ERROR");
				mTexts[ValueState.Warning] = rb.getText("VALUE_STATE_WARNING");
				mTexts[ValueState.Success] = rb.getText("VALUE_STATE_SUCCESS");
				mTexts[ValueState.Information] = rb.getText("VALUE_STATE_INFORMATION");
			}
		};


		/**
		 * Appends a generic success, warning or error message to the given tooltip text if the given Element
		 * has a property "valueState" with one of these three states.
		 *
		 * @param {sap.ui.core.Element} oElement the Element of which the tooltip needs to be modified
		 * @param {string} sTooltipText the original tooltip text (may be null)
		 * @returns {string} the given text, with appended success/warning/error text, if appropriate
		 *
		 * @public
		 * @name sap.ui.core.ValueStateSupport.enrichTooltip
		 * @function
		 */
		ValueStateSupport.enrichTooltip = function(oElement, sTooltipText) {
			assert(oElement instanceof Element, "oElement must be an Element");

			if (!sTooltipText && oElement.getTooltip()) {
				return undefined; // this means there is no tooltip text configured, but a tooltip object like a RichTooltip
			}

			var sText = ValueStateSupport.getAdditionalText(oElement);
			if (sText) {
				return (sTooltipText ? sTooltipText + " - " : "") + sText;
			}

			return sTooltipText; // when there is no value state
		};


		/**
		 * Returns a generic success, warning or error message if the given Element
		 * has a property "valueState" with one of these three states or the given ValueState
		 * represents one of these states.
		 *
		 * @param {sap.ui.core.Element|sap.ui.core.ValueState} vValue the Element of which the valueState needs to be checked, or the ValueState explicitly
		 * @returns {string|null} the success/warning/error text, if appropriate; otherwise null
		 *
		 * @public
		 * @name sap.ui.core.ValueStateSupport.getAdditionalText
		 * @function
		 */
		ValueStateSupport.getAdditionalText = function(vValue) {
			var sState = null;

			if (vValue && vValue.getValueState) {
				sState = vValue.getValueState();
			} else if (ValueState[vValue]) {
				sState = vValue;
			}

			if (sState && (sState != ValueState.None)) { // only for one of the three interesting state, not for the default
				ensureTexts();
				return mTexts[sState];
			}

			return null;
		};

		/**
		 * Returns a ValueState object based on the given integer value
		 *
		 *  0 : ValueState.None
		 *  1 : ValueState.Warning
		 *  2 : ValueState.Success
		 *  3 : ValueState.Error
		 *  4 : ValueState.Information
		 *
		 * @param {int} iState the state as an integer
		 * @return {sap.ui.core.ValueState} the corresponding ValueState object
		 * @static
		 * @public
		 * @name sap.ui.core.ValueStateSupport.formatValueState
		 * @function
		 * @since 1.25.0
		 */
		ValueStateSupport.formatValueState = function(iState) {
			switch (iState) {
				case 1:
					return ValueState.Warning;
				case 2:
					return ValueState.Success;
				case 3:
					return ValueState.Error;
				case 4:
					return ValueState.Information;
				default:
					return ValueState.None;
			}
		};


	return ValueStateSupport;

}, /* bExport= */ true);