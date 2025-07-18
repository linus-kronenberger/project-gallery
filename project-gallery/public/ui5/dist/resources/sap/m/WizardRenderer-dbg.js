/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/m/library",
	"sap/ui/core/Element",
	"sap/ui/core/Lib"
], function(library, Element, Library) {
	"use strict";

	var WizardRenderer = {
		apiVersion: 2
	};

	WizardRenderer.render = function (oRm, oWizard) {
		this.startWizard(oRm, oWizard);
		this.renderProgressNavigator(oRm, oWizard);
		this.renderWizardSteps(oRm, oWizard);
		this.endWizard(oRm);
	};

	WizardRenderer.startWizard = function (oRm, oWizard) {
		var sWizardLabelText = Library.getResourceBundleFor("sap.m").getText("WIZARD_LABEL");

		oRm.openStart("div", oWizard)
			.class("sapMWizard")
			.class("sapMWizardMode" + oWizard.getRenderMode())
			.class("sapMWizardBg" + oWizard.getBackgroundDesign())
			.style("width", oWizard.getWidth())
			.style("height", oWizard.getHeight())
			.accessibilityState({
				role: "region",
				label: sWizardLabelText
			})
			.openEnd();
	};

	WizardRenderer.renderProgressNavigator = function (oRm, oWizard) {
		oRm.renderControl(oWizard.getAggregation("_progressNavigator"));
	};

	WizardRenderer.renderWizardSteps = function (oRm, oWizard) {
		oRm.openStart("section", oWizard.getId() + "-step-container")
			.class("sapMWizardStepContainer")
			.openEnd();

		// Page rendering mode would be handled manually
		if (oWizard.getRenderMode() === library.WizardRenderMode.Scroll) {
			this._getStepsRenderingOrder(oWizard)
				.forEach(oRm.renderControl, oRm);
		}

		oRm.close("section");
	};

	WizardRenderer.endWizard = function (oRm) {
		oRm.close("div");
	};

	/**
	 * Reorders the steps in such way that no subsequent step is rendered before its referring step.
	 *
	 * For example:
	 * If WizardStepsAggregation is [{id:1, subSeq:[2,3]},{id:2,subSeq:[4]},{id:3,subSeq[2]},{id:4,subSeq:[]}]
	 * and this array of steps gets rendered 1, 2, 3, 4 (without reordering it) the user can go 1 -> 3 -> 2 -> 4
	 * the steps need to be reordered in the DOM for correct visual order
	 * @param {sap.m.Wizard} oWizard The control instance
	 * @returns {sap.m.WizardStep[]} The step array
	 */
	WizardRenderer._getStepsRenderingOrder = function (oWizard) {
		if (!oWizard.getEnableBranching()) {
			return oWizard.getSteps();
		}

		var aSteps = oWizard.getSteps().slice(),
			index, oRefStep, j, aSubsequent;


		var fnCheckStepOrder = function (sSubsequentStepId, index, oRefStep) {
			var oSubsequentStep = Element.getElementById(sSubsequentStepId);
			if (aSteps.indexOf(oSubsequentStep) < aSteps.indexOf(oRefStep)) {
				var iSubsequentStep = aSteps.indexOf(oSubsequentStep),
					temp = aSteps[iSubsequentStep];

				aSteps[iSubsequentStep] = oRefStep;
				aSteps[index] = temp;
				index = 0;
			}

			return index;
		};

		for (index = 0; index < aSteps.length; index++) {
			oRefStep = aSteps[index];
			aSubsequent = oRefStep.getSubsequentSteps();

			if (aSubsequent.length < 1 && oRefStep.getNextStep()) {
				aSubsequent = [oRefStep.getNextStep()];
			}

			for (j = 0; j < aSubsequent.length; j++) {
				index = fnCheckStepOrder(aSubsequent[j], index, oRefStep);
			}
		}

		return aSteps;
	};

	return WizardRenderer;

}, /* bExport= */ true);

