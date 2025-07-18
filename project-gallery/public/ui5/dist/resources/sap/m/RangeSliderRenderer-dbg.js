/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["sap/base/i18n/Localization", "sap/ui/core/Renderer", "./SliderRenderer", "sap/ui/core/InvisibleText"], function (Localization, Renderer, SliderRenderer, InvisibleText) {
	"use strict";

	/**
	 * RangeSlider renderer.
	 * @namespace
	 */
	var RangeSliderRenderer = Renderer.extend(SliderRenderer);
	RangeSliderRenderer.apiVersion = 2;

	RangeSliderRenderer.renderHandles = function (oRM, oControl, sRangeSliderLabels) {
		this.renderHandle(oRM, oControl, {
			id: oControl.getId() + "-handle1",
			position: "start",
			forwardedLabels: sRangeSliderLabels,
			pressed: oControl.getProperty("startHandlePressed")
		});
		this.renderHandle(oRM, oControl, {
			id: oControl.getId() + "-handle2",
			position: "end",
			forwardedLabels: sRangeSliderLabels,
			pressed: oControl.getProperty("endHandlePressed")
		});

		// Render ARIA labels
		oRM.renderControl(oControl._mHandleTooltip.start.label);
		oRM.renderControl(oControl._mHandleTooltip.end.label);
		oRM.renderControl(oControl.getAggregation("_handlesLabels")[2]);
	};

	/**
	 * Used to render each of the handles of the RangeSlider.
	 *
	 * @param {sap.ui.core.RenderManager} oRM The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.RangeSlider} oControl An object representation of the slider that should be rendered.
	 * @param {object} mOptions Options used for specificity of the handles
	 */
	RangeSliderRenderer.renderHandle = function (oRM, oControl, mOptions) {
		var fValue,
			aRange = oControl.getRange(),
			bEnabled = oControl.getEnabled(),
			bRTL = Localization.getRTL();

		oRM.openStart("span", mOptions && mOptions.id);
		if (mOptions && (mOptions.position !== undefined)) {
			fValue = aRange[mOptions.position === "start" ? 0 : 1];

			oRM.attr("data-range-val", mOptions.position);
			oRM.attr("aria-labelledby", (mOptions.forwardedLabels + " " + oControl._mHandleTooltip[mOptions.position].label.getId()).trim());

			if (oControl.getInputsAsTooltips()) {
				oRM.attr("aria-describedby", InvisibleText.getStaticId("sap.m", "SLIDER_INPUT_TOOLTIP"));
				bEnabled && oRM.attr("aria-keyshortcuts", "F2");
			}
		}
		if (oControl.getShowHandleTooltip() && !oControl.getShowAdvancedTooltip()) {
			this.writeHandleTooltip(oRM, oControl);
		}

		oRM.class(SliderRenderer.CSS_CLASS + "Handle");
		oRM.attr("data-ui5-handle-position", mOptions.position);

		if (mOptions.pressed) {
			oRM.class(SliderRenderer.CSS_CLASS + "HandlePressed");
		}

		if (mOptions && (mOptions.id !== undefined) && mOptions.id === (oControl.getId() + "-handle1")) {
			oRM.style(bRTL ? "right" : "left", aRange[0]);
		}
		if (mOptions && (mOptions.id !== undefined) && mOptions.id === (oControl.getId() + "-handle2")) {
			oRM.style(bRTL ? "right" : "left", aRange[1]);
		}

		this.writeAccessibilityState(oRM, oControl, fValue);

		if (bEnabled) {
			oRM.attr("tabindex", "0");
		}
		oRM.openEnd().close("span");
	};

	/**
	 * Writes the accessibility state to the control.
	 * To be overwritten by subclasses.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.RangeSlider} oSlider An object representation of the control that should be rendered.
	 * @param {string} fValue The current value for the accessibility state
	 */
	RangeSliderRenderer.writeAccessibilityState = function(oRm, oSlider, fValue) {
		var bNotNumericalLabel = oSlider._isElementsFormatterNotNumerical(fValue),
			sScaleLabel = oSlider._formatValueByCustomElement(fValue),
			sValueNow;

		if (oSlider._getUsedScale() && !bNotNumericalLabel) {
			sValueNow = sScaleLabel;
		} else {
			sValueNow = oSlider.toFixed(fValue);
		}

		oRm.accessibilityState(oSlider, {
			role: "slider",
			orientation: "horizontal",
			valuemin: oSlider.toFixed(oSlider.getMin()),
			valuemax: oSlider.toFixed(oSlider.getMax()),
			valuenow: sValueNow
		});

		if (bNotNumericalLabel) {
			oRm.accessibilityState(oSlider, {
				valuetext: sScaleLabel
			});
		}
	};

	/**
	 * Renders the lower range label under the left part of the RangeSlider control.
	 *
	 * @param {sap.ui.core.RenderManager} oRM The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.RangeSlider} oControl An object representation of the slider that should be rendered.
	 */
	RangeSliderRenderer.renderStartLabel = function (oRM, oControl) {
		oRM.openStart("div")
			.class(SliderRenderer.CSS_CLASS + "RangeLabel")
			.openEnd()
			.text(oControl.getMin())
			.close("div");
	};

	/**
	 * Renders the higher range label under the right part of the RangeSlider control.
	 *
	 * @param {sap.ui.core.RenderManager} oRM The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.RangeSlider} oControl An object representation of the slider that should be rendered.
	 */
	RangeSliderRenderer.renderEndLabel = function (oRM, oControl) {
		oRM.openStart("div")
			.class(SliderRenderer.CSS_CLASS + "RangeLabel")
			.style("width", oControl._getMaxTooltipWidth() + "px")
			.openEnd()
			.text(oControl.getMax())
			.close("div");
	};

	/**
	 * Renders the label under the RangeSlider control.
	 *
	 * @param {sap.ui.core.RenderManager} oRM The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.RangeSlider} oControl An object representation of the slider that should be rendered.
	 */
	RangeSliderRenderer.renderLabels = function (oRM, oControl) {
		if (!oControl.getEnableTickmarks()) {
			oRM.openStart("div")
				.class(SliderRenderer.CSS_CLASS + "Labels")
				.openEnd();

			this.renderStartLabel(oRM, oControl);
			this.renderEndLabel(oRM, oControl);

			oRM.close("div");
		}
	};

	RangeSliderRenderer.renderProgressIndicator = function(oRm, oSlider, sForwardedLabels) {
		var aRange = oSlider.getRange();
		var oProggressBarSize = oSlider.getProperty("progressBarSize");

		aRange[0] = oSlider.toFixed(aRange[0], oSlider._iDecimalPrecision);
		aRange[1] = oSlider.toFixed(aRange[1], oSlider._iDecimalPrecision);

		var iValueNow = Math.abs(aRange[1] - aRange[0]);

		oRm.openStart("div", oSlider.getId() + "-progress");
		if (oSlider.getEnabled()) {
			oRm.attr("tabindex", "0");
		}
		this.addProgressIndicatorClass(oRm, oSlider);
		oRm.style("width", oSlider._sProgressValue);

		if (oProggressBarSize) {
			oRm.style("left", oProggressBarSize.left);
			oRm.style("right", oProggressBarSize.right);
		}

		oRm.accessibilityState(oSlider, {
			role: "slider",
			orientation: "horizontal",
			valuemin: oSlider.toFixed(oSlider.getMin()),
			valuemax: oSlider.toFixed(oSlider.getMax()),
			valuenow: iValueNow,
			valuetext: oSlider._oResourceBundle.getText('RANGE_SLIDER_RANGE_ANNOUNCEMENT', aRange.map(oSlider._formatValueByCustomElement, oSlider)),
			labelledby: (sForwardedLabels + " " + oSlider.getAggregation("_handlesLabels")[2].getId()).trim() // range label
		}).openEnd().close("div");
	};

	RangeSliderRenderer.addClass = function(oRm, oSlider) {
		SliderRenderer.addClass(oRm, oSlider);
		oRm.class("sapMRangeSlider");
	};

	RangeSliderRenderer.applyTickmarkStyles = function(oRM, oSlider, iTickmarkIndex, iTickmarksToRender) {
		const findTickmark = (value, min, max, step) => {
			return Math.floor((value - min) / step);
		};
		const min = oSlider.getMin();
		const max = oSlider.getMax();
		const step = oSlider.getStep();
		const value = oSlider.getValue();
		const endValue = oSlider.getValue2();
		const startTickIndex = findTickmark(value, min, max, step);
		const endTIckIndex = findTickmark(endValue, min, max, step);
		const isWithinRange = (number, min, max) => {
			return number >= Math.min(min, max) && number <= Math.max(min, max);
		};

		oRM.attr("data-ui5-active-tickmark", isWithinRange(iTickmarkIndex, startTickIndex, endTIckIndex));
	};

	RangeSliderRenderer.shouldRenderFirstActiveTickmark = function (oSlider) {
		return oSlider.getValue() === oSlider.getMin();
	};

	RangeSliderRenderer.shouldRenderLastActiveTickmark = function (oSlider) {
		return oSlider.getValue2() === oSlider.getMax();
	};

	return RangeSliderRenderer;
}, /* bExport= */ true);