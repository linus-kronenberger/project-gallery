/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["sap/base/i18n/Localization", "sap/ui/Device", "sap/ui/core/Lib"], function(Localization, Device, Library) {
	"use strict";

	/**
	 * TimePickerSlidersRenderer renderer.
	 * @namespace
	 */
	var TimePickerSlidersRenderer = {
		apiVersion: 2
	};

	/**
	 * Renders the HTML for the given {@link sap.m.TimePickerSliders} control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRM The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.m.TimePickerSliders} oControl An object representation of the control that should be rendered
	 */
	TimePickerSlidersRenderer.render = function(oRM, oControl) {
		var aSliders = oControl.getAggregation("_columns"),
			sLabelText = oControl.getLabelText() || "",
			oRb = Library.getResourceBundleFor("sap.m"),
			iSliderIndex,
			bRtl = Localization.getRTL();

		oRM.openStart("div", oControl);
		oRM.class("sapMTimePickerContainer");
		oRM.style("width", oControl.getWidth());
		oRM.style("height", oControl.getHeight());

		//WAI-ARIA region
		oRM.accessibilityState(oControl, {
			label: (sLabelText + " " + oRb.getText("TIMEPICKER_SCREENREADER_TAG")).trim()
		});

		oRM.openEnd();

		if (!Device.system.desktop) {
			oRM.openStart("div", oControl.getId() + "-label");
			oRM.class("sapMTimePickerContainerLabel");
			oRM.openEnd();
			oRM.text(sLabelText);
			oRM.close("div");
		}

		if (bRtl) {
			for (iSliderIndex = aSliders.length - 1; iSliderIndex >= 0; iSliderIndex--) {
				oRM.renderControl(aSliders[iSliderIndex]);
			}
		} else {
			for (iSliderIndex = 0; iSliderIndex < aSliders.length; iSliderIndex++) {
				oRM.renderControl(aSliders[iSliderIndex]);
			}
		}

		oRM.close("div");
	};

	return TimePickerSlidersRenderer;
}, /* bExport= */ true);
