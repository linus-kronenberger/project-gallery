/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["sap/ui/core/ControlBehavior", 'sap/ui/core/library', 'sap/ui/core/ValueStateSupport', 'sap/ui/Device'],
	function(ControlBehavior, coreLibrary, ValueStateSupport, Device) {
	"use strict";


	// shortcut for sap.ui.core.ValueState
	var ValueState = coreLibrary.ValueState;


	/**
	 * CheckBox renderer.
	 * @namespace
	 */
	var CheckBoxRenderer = {
		apiVersion: 2
	};


	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the Render-Output-Buffer
	 * @param {sap.m.CheckBox} oCheckBox An object representation of the control that should be rendered
	 */
	CheckBoxRenderer.render = function(oRm, oCheckBox){
		// get control properties
		var sId = oCheckBox.getId(),
			bEnabled = oCheckBox.getEnabled(),
			bDisplayOnly = oCheckBox.getDisplayOnly(),
			bEditable = oCheckBox.getEditable(),
			bRequired = oCheckBox.getRequired(),
			bInteractive = bEnabled && !bDisplayOnly,
			bDisplayOnlyApplied = bEnabled && bDisplayOnly,
			oCbLabel = oCheckBox.getAggregation("_label"),
			sValueState = oCheckBox.getValueState(),
			bInErrorState = ValueState.Error === sValueState,
			bInWarningState = ValueState.Warning === sValueState,
			bInSuccessState = ValueState.Success === sValueState,
			bInInformationState = ValueState.Information === sValueState,
			bUseEntireWidth = oCheckBox.getUseEntireWidth(),
			bEditableAndEnabled = bEditable && bEnabled;

		// CheckBox wrapper
		oRm.openStart("div", oCheckBox);
		oRm.class("sapMCb");
		oRm.attr("data-ui5-accesskey", oCheckBox.getProperty("accesskey"));

		if (!bEditable) {
			oRm.class("sapMCbRo");
		}

		if (bDisplayOnlyApplied) {
			oRm.class("sapMCbDisplayOnly");
		}

		if (!bEnabled) {
			oRm.class("sapMCbBgDis");
		}

		if (oCheckBox.getText()) {
			oRm.class("sapMCbHasLabel");
		}

		if (oCheckBox.getWrapping()) {
			oRm.class("sapMCbWrapped");
		}

		if (bEditableAndEnabled) {
			if (bInErrorState) {
				oRm.class("sapMCbErr");
			} else if (bInWarningState) {
				oRm.class("sapMCbWarn");
			} else if (bInSuccessState) {
				oRm.class("sapMCbSucc");
			} else if (bInInformationState) {
				oRm.class("sapMCbInfo");
			}
		}

		if (bUseEntireWidth) {
			oRm.style("width", oCheckBox.getWidth());
		}

		var sTooltip = this.getTooltipText(oCheckBox);

		if (sTooltip) {
			oRm.attr("title", sTooltip);
		}

		if (oCheckBox._getVisualOnlyMode()) {
			oRm.accessibilityState(oCheckBox, {
				role: "presentation",
				selected: null,
				required: null,
				labelledby: null
			});
		} else {
			if (bInteractive) {
				oRm.attr("tabindex", oCheckBox.getTabIndex());
			}

			//ARIA attributes
			oRm.accessibilityState(oCheckBox, {
				role: "checkbox",
				selected: null,
				required: oCheckBox._isRequired() || undefined,
				checked: oCheckBox._getAriaChecked(),
				describedby: sTooltip && bEditableAndEnabled ? sId + "-Descr" : undefined,
				labelledby: { value: oCbLabel ? oCbLabel.getId() : undefined, append: true }
			});

			if (bDisplayOnlyApplied) {
				oRm.attr("aria-readonly", true);
			}
		}

		oRm.openEnd();		// DIV element

		// write the HTML into the render manager
		oRm.openStart("div", oCheckBox.getId() + "-CbBg");

		// CheckBox style class
		oRm.class("sapMCbBg");

		if (bInteractive && bEditable && Device.system.desktop) {
			oRm.class("sapMCbHoverable");
		}

		if (!oCheckBox.getActiveHandling()) {
			oRm.class("sapMCbActiveStateOff");
		}

		oRm.class("sapMCbMark"); // TODO: sapMCbMark is redundant, remove it and simplify CSS

		if (oCheckBox.getSelected()) {
			oRm.class("sapMCbMarkChecked");
		}

		if (oCheckBox.getPartiallySelected()) {
			oRm.class("sapMCbMarkPartiallyChecked");
		}

		oRm.openEnd();		// DIV element

		if (!oCheckBox._getVisualOnlyMode()) {
			oRm.voidStart("input", oCheckBox.getId() + "-CB");
			oRm.attr("type", "CheckBox");

			if (oCheckBox.getSelected()) {
				oRm.attr("checked", "checked");
			}

			if (oCheckBox.getName()) {
				oRm.attr("name", oCheckBox.getName());
			}

			if (!bEnabled) {
				oRm.attr("disabled", "disabled");
			}

			if (!bEditable) {
				oRm.attr("readonly", "readonly");
			}

			oRm.voidEnd();
		}

		oRm.close("div");

		if (oCbLabel) {
			oCbLabel.setRequired(bRequired);
		}

		oRm.renderControl(oCbLabel);

		if (sTooltip && ControlBehavior.isAccessibilityEnabled() && bEditableAndEnabled) {
			// for ARIA, the tooltip must be in a separate SPAN and assigned via aria-describedby.
			// otherwise, JAWS does not read it.
			oRm.openStart("span", sId + "-Descr");
			oRm.class("sapUiHidden");
			oRm.openEnd();
			oRm.text(sTooltip);
			oRm.close("span");
		}

		oRm.close("div");
	};

	/**
	 * Returns the correct value of the tooltip.
	 *
	 * @param {sap.m.CheckBox} oCheckBox CheckBox instance
	 * @returns {string} The correct tooltip value
	 */
	CheckBoxRenderer.getTooltipText = function (oCheckBox) {
		var sValueStateText = oCheckBox.getProperty("valueStateText"),
			sTooltipText = oCheckBox.getTooltip_AsString(),
			bEnabled = oCheckBox.getEnabled(),
			bEditable = oCheckBox.getEditable();

		if (sValueStateText) {
			// custom value state text is set, concat to tooltip and return
			return (sTooltipText ? sTooltipText + " - " : "") + sValueStateText;
		} else if (bEditable && bEnabled) {
			// the visual value state is only set for editable and enabled checkboxes
			// the default value state text should only be set in those cases
			return ValueStateSupport.enrichTooltip(oCheckBox, sTooltipText);
		}

		// if no value state text is provided or the checkbox
		// is disabled only the custom tooltip is returned
		return sTooltipText;
	};

	return CheckBoxRenderer;

}, /* bExport= */ true);
