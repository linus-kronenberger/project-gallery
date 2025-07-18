/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([],
function() {
	"use strict";

	/**
	 * SinglePlanningCalendar renderer.
	 * @namespace
	 */
	var SinglePlanningCalendarRenderer = {
		apiVersion: 2
	};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
	 * @param {sap.m.SinglePlanningCalendar} oCalendar An object representation of the <code>SinglePlanningCalendarRenderer</code> control that should be rendered.
	 */
	SinglePlanningCalendarRenderer.render = function(oRm, oCalendar){
		var oHeader = oCalendar._getHeader(),
			oGrid = oCalendar._getCurrentGrid(),
			sTitleId = `${oHeader.getId()}-Title`;

		oRm.openStart("div", oCalendar);
		oRm.accessibilityState({
			role: "region",
			roledescription: oCalendar._oRB.getText("SPC_CONTROL_NAME"),
			labelledby: {
				value: `${sTitleId}`,
				append: true
			}
		});
		oRm.class("sapMSinglePC");
		oRm.openEnd();

		oRm.renderControl(oHeader);
		oRm.renderControl(oGrid);

		oRm.close("div");
	};

	return SinglePlanningCalendarRenderer;

}, /* bExport= */ true);