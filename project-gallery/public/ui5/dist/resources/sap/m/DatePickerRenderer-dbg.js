/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/core/Lib", 'sap/ui/core/Renderer', './DateTimeFieldRenderer', 'sap/ui/core/library'],
	function(Library, Renderer, DateTimeFieldRenderer, coreLibrary) {
	"use strict";

	/**
	 * DatePicker renderer.
	 * @namespace
	 */
	var DatePickerRenderer = Renderer.extend(DateTimeFieldRenderer);
	DatePickerRenderer.apiVersion = 2;

	const MAX_INPUT_VALUE_LENGTH = 512;

	/**
	 * Write the value of the input.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.DatePicker} oDP An object representation of the control that should be rendered.
	 */
	DatePickerRenderer.writeInnerValue = function(oRm, oDP) {
		if (oDP._inPreferredUserInteraction()) {
			oRm.attr("value", oDP._$input.val());
		} else if (oDP._bValid || oDP._bOutOfAllowedRange) {
			oRm.attr("value", oDP._formatValue(oDP.getDateValue()));
		} else {
			oRm.attr("value", oDP.getValue());
		}
	};

	/**
	 * This method is reserved for derived classes to add extra attributes for the input element.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.DatePicker} oDP An object representation of the control that should be rendered.
	 */
	DatePickerRenderer.writeInnerAttributes = function(oRm, oDP) {
		oRm.attr("type", "text");
		oRm.attr("maxlength", MAX_INPUT_VALUE_LENGTH);
		if (oDP._bMobile) {
			// prevent keyboard in mobile devices
			oRm.attr("readonly", "readonly");
		}
	};

	DatePickerRenderer.getAccessibilityState = function(oDP) {
		var mAccessibilityState = DateTimeFieldRenderer.getAccessibilityState.apply(this, arguments);

		mAccessibilityState["roledescription"] = Library.getResourceBundleFor("sap.m").getText("ACC_CTR_TYPE_DATEINPUT");
		if (oDP.getEditable() && oDP.getEnabled()) {
			mAccessibilityState["haspopup"] = coreLibrary.aria.HasPopup.Grid.toLowerCase();
		}
		// aria-disabled is not necessary if we already have a native 'disabled' attribute
		mAccessibilityState["disabled"] = null;

		if (oDP._bMobile && oDP.getEnabled() && oDP.getEditable()) {
			// if on mobile device readonly property is set, but should not be announced
			mAccessibilityState["readonly"] = false;
		}

		return mAccessibilityState;
	};

	/**
	 * Adds specific class to hide the <code>DatePicker</code> input field when the <code>hideInput</code> property is set to <code>true</code>.
	 * @protected
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.DatePicker} oControl An object representation of the control that should be rendered.
	 */
	 DatePickerRenderer.addOuterClasses = function(oRm, oControl) {
		if (oControl.getHideInput()) {
			oRm.class("sapMDatePickerHiddenInput");
		}
		DateTimeFieldRenderer.addOuterClasses.apply(this, arguments);
	};

	return DatePickerRenderer;

}, /* bExport= */ true);
