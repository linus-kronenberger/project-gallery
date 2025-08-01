/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'sap/ui/core/Renderer',
	'./FormLayoutRenderer'
	], function(Renderer, FormLayoutRenderer) {
	"use strict";


	/**
	 * ResponsiveLayout renderer.
	 * @namespace
	 */
	var ResponsiveLayoutRenderer = Renderer.extend(FormLayoutRenderer);

	ResponsiveLayoutRenderer.apiVersion = 2;

	ResponsiveLayoutRenderer.getMainClass = function(){
		return "sapUiFormResLayout";
	};

	ResponsiveLayoutRenderer.renderContainers = function(rm, oLayout, oForm){

		var aVisibleContainers = oForm.getVisibleFormContainers();
		var iLength = aVisibleContainers.length;

		if (iLength > 0) {
			// special case: only one container -> do not render an outer ResponsiveFlowLayout
			if (iLength > 1) {
				//render ResponsiveFlowLayout
				rm.renderControl(oLayout._mainRFLayout);
			} else if (oLayout.mContainers[aVisibleContainers[0].getId()][0]) {
				// render panel
				rm.renderControl(oLayout.mContainers[aVisibleContainers[0].getId()][0]);
			} else {
				// render ResponsiveFlowLayout of container
				rm.renderControl(oLayout.mContainers[aVisibleContainers[0].getId()][1]);
			}
		}

	};


	return ResponsiveLayoutRenderer;

}, /* bExport= */ true);
