/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'sap/ui/core/Renderer',
	'sap/ui/Device',
	'./FormLayoutRenderer'
	], function(Renderer, Device, FormLayoutRenderer) {
	"use strict";

	/**
	 * form/ColumnLayout renderer.
	 * @namespace
	 */
	var ColumnLayoutRenderer = Renderer.extend(FormLayoutRenderer);

	ColumnLayoutRenderer.apiVersion = 2;

	ColumnLayoutRenderer.getMainClass = function(){

		return "sapUiFormCL";

	};

	ColumnLayoutRenderer.renderContainers = function(oRm, oLayout, oForm){

		var aContainers = oForm.getVisibleFormContainers();
		var iContainers = aContainers.length;

		if (iContainers > 0) {
			var bOneContainerFullSize = iContainers === 1 && !oLayout.getLayoutDataForElement(aContainers[0], "sap.ui.layout.form.ColumnContainerData");
			if (!bOneContainerFullSize) {
				// if more that one container or one container is not full size render a DIV around containers
				var iColumnsM = oLayout.getColumnsM();
				var iColumnsL = oLayout.getColumnsL();
				var iColumnsXL = oLayout.getColumnsXL();
				oRm.openStart("div");
				oRm.class("sapUiFormCLContent");
				oRm.class("sapUiFormCLColumnsM" + iColumnsM);
				oRm.class("sapUiFormCLColumnsL" + iColumnsL);
				oRm.class("sapUiFormCLColumnsXL" + iColumnsXL);
				oRm.openEnd();
			}

			for (var i = 0; i < iContainers; i++) {
				var oContainer = aContainers[i];
				this.renderContainer(oRm, oLayout, oContainer);
			}

			if (!bOneContainerFullSize) {
				oRm.close("div");
			}
		}

	};

	ColumnLayoutRenderer.renderContainer = function(oRm, oLayout, oContainer){

		var bExpandable = oContainer.getExpandable();
		var oToolbar = oContainer.getToolbar();
		var oTitle = oContainer.getTitle();
		var oOptions = oLayout._getContainerSize(oContainer);
		const bEditable = oContainer.getProperty("_editable");
		const sContentNode = bEditable ? "div" : "dl";

		oContainer._checkProperties();

		oRm.openStart("div", oContainer);
		oRm.class("sapUiFormCLContainer");
		oRm.class("sapUiFormCLContainerS" + oOptions.S.Size);
		oRm.class("sapUiFormCLContainerM" + oOptions.M.Size);
		oRm.class("sapUiFormCLContainerL" + oOptions.L.Size);
		oRm.class("sapUiFormCLContainerXL" + oOptions.XL.Size);
		// S-Break not needed as there is no float possible
		if (oOptions.M.Break) {
			oRm.class("sapUiFormCLContainerMBreak");
		}
		if (oOptions.L.Break) {
			oRm.class("sapUiFormCLContainerLBreak");
		}
		if (oOptions.XL.Break) {
			oRm.class("sapUiFormCLContainerXLBreak");
		}
		if (oOptions.S.FirstRow) {
			oRm.class("sapUiFormCLContainerSFirstRow");
		}
		if (oOptions.M.FirstRow) {
			oRm.class("sapUiFormCLContainerMFirstRow");
		}
		if (oOptions.L.FirstRow) {
			oRm.class("sapUiFormCLContainerLFirstRow");
		}
		if (oOptions.XL.FirstRow) {
			oRm.class("sapUiFormCLContainerXLFirstRow");
		}

		if (oToolbar) {
			oRm.class("sapUiFormContainerToolbar");
		} else if (oTitle) {
			oRm.class("sapUiFormContainerTitle");
		}

		if (!oContainer.getExpanded()) {
			oRm.class("sapUiFormCLContainerColl");
		}

		if (oContainer.getTooltip_AsString()) {
			oRm.attr('title', oContainer.getTooltip_AsString());
		}

		if (bEditable || bExpandable || oToolbar) {
			// in display mode render accessibility attributes on content-node. If expandable or toolbar in disply mode, role "region" is needed to annonce region if focus goes to button or inside toolbar
			const oForm = oContainer.getParent();
			let sRole = "form";

			if (bEditable && !oLayout.isContainerLabelled(oContainer) && oForm.getFormContainers().length === 1) {
				sRole = ""; // Container has no title and is only one container, no role needed as set on Form-level
			} else if (!bEditable && (bExpandable || oToolbar)) {
				sRole = "region"; // to announce region if Expander is focused or focus moves inside Toolbar
			}

			// In edit mode let every container render role, even without title (expect there is only one container). So screenreader also announces forms structure. (Was not possible for some older layouts.)
			this.writeAccessibilityStateContainer(oRm, oContainer, sRole);
		}

		oRm.openEnd();

		this.renderHeader(oRm, oToolbar, oTitle, oContainer._oExpandButton, bExpandable, oLayout._sFormSubTitleSize, oContainer.getId());

		oRm.openStart(sContentNode, oContainer.getId() + "-content")
			.class("sapUiFormCLContainerCont");
		if (!bEditable && !bExpandable && !oToolbar) {
			this.writeAccessibilityStateContainer(oRm, oContainer, ""); // no role needed on <dl>
		}
		oRm.openEnd();

		var aElements = oContainer.getVisibleFormElements();
		for (var i = 0; i < aElements.length; i++) {
			var oElement = aElements[i];
			if (oElement.isA("sap.ui.layout.form.SemanticFormElement") && !oElement._getEditable()) {
				this.renderSemanticElement(oRm, oLayout, oElement);
			} else {
				this.renderElement(oRm, oLayout, oElement);
			}

			if (Device.browser.chrome && i < oOptions.XL.Size - 1 && aElements.length > 1 && aElements.length <= oOptions.XL.Size) {
				// in Chrome columns are not filled properly for less elements -> an invisible dummy DIV helps
				// with this logic the result is near to the other browsers
				// this "work around" don't work for other browsers
				oRm.openStart("div").class("sapUiFormCLElementDummy").openEnd().close("div");
			}
		}

		oRm.close(sContentNode); // Container content
		oRm.close("div"); // Container

	};

	ColumnLayoutRenderer.renderElement = function(oRm, oLayout, oElement){

		var oLabel = oElement.getLabelControl();
		var oOptions;
		const bEditable = oElement.getProperty("_editable");
		const sFieldsNode = bEditable ? "div" : "dd";

		oRm.openStart("div", oElement);
		oRm.class("sapUiFormCLElement");
		if (oElement.getTooltip_AsString()) {
			oRm.attr('title', oElement.getTooltip_AsString());
		}
		oRm.openEnd();

		if (oLabel) {
			oOptions = oLayout._getFieldSize(oLabel);
			_renderLabel(oRm, oElement, oLabel, oOptions);
		}

		var aFields = oElement.getFieldsForRendering();
		if (aFields && aFields.length > 0) {
			for (var k = 0, kl = aFields.length; k < kl; k++) {
				var oField = aFields[k];
				if (!oField.isA("sap.ui.core.IFormContent")) {
					throw new Error(oField + " is not a valid Form content! Only use valid content in " + oLayout);
				}
				oOptions = oLayout._getFieldSize(oField);
				oRm.openStart(sFieldsNode);
				oRm.class("sapUiFormCLCellsS" + oOptions.S.Size);
				oRm.class("sapUiFormCLCellsL" + oOptions.L.Size);
				if (oOptions.S.Break) {
					oRm.class("sapUiFormCLCellSBreak");
				}
				if (oOptions.L.Break) {
					oRm.class("sapUiFormCLCellLBreak");
				}
				if (oOptions.S.Space) {
					oRm.class("sapUiFormCLCellSSpace" + oOptions.S.Space);
				}
				if (oOptions.L.Space) {
					oRm.class("sapUiFormCLCellLSpace" + oOptions.L.Space);
				}
				oRm.openEnd();

				oRm.renderControl(oField);

				oRm.close(sFieldsNode);
			}
		}
		oRm.close("div");

	};

	ColumnLayoutRenderer.renderSemanticElement = function(oRm, oLayout, oElement){

		var oLabel = oElement.getLabelControl();
		var oOptions;
		var iColumns = 12;
		var iSizeS = iColumns;
		var iSizeL = iColumns;
		const bEditable = oElement.getProperty("_editable");
		const sFieldsNode = bEditable ? "div" : "dd";

		oRm.openStart("div", oElement);
		oRm.class("sapUiFormCLElement").class("sapUiFormCLSemanticElement");
		if (oElement.getTooltip_AsString()) {
			oRm.attr('title', oElement.getTooltip_AsString());
		}
		oRm.openEnd();

		if (oLabel) {
			oOptions = oLayout._getFieldSize(oLabel);
			_renderLabel(oRm, oElement, oLabel, oOptions);
			if (oOptions.S.Size < iSizeS) {
				iSizeS = iSizeS - oOptions.S.Size;
			}
			if (oOptions.L.Size < iSizeL) {
				iSizeL = iSizeL - oOptions.L.Size;
			}
		}

		oRm.openStart(sFieldsNode);
		oRm.class("sapUiFormCLCellsS" + iSizeS);
		oRm.class("sapUiFormCLCellsL" + iSizeL);
		oRm.openEnd();

		var aFields = oElement.getFieldsForRendering();
		if (aFields && aFields.length > 0) {
			for (var k = 0, kl = aFields.length; k < kl; k++) {
				var oField = aFields[k];
				if (!oField.isA("sap.ui.core.IFormContent") || !oField.isA("sap.ui.core.ISemanticFormContent")) {
					throw new Error(oField + " is not a valid Form content! Only use valid content in " + oLayout);
				}
				oRm.renderControl(oField);
			}
		}

		oRm.close(sFieldsNode);
		oRm.close("div");

	};

	function _renderLabel(oRm, oElement, oLabel, oOptions) {

		const bEditable = oElement.getProperty("_editable");
		const sLabelNode = bEditable ? "div" : "dt";

		oRm.openStart(sLabelNode)
			.class("sapUiFormElementLbl")
			.class("sapUiFormCLCellsS" + oOptions.S.Size)
			.class("sapUiFormCLCellsL" + oOptions.L.Size)
			.openEnd();

		oRm.renderControl(oLabel);

		oRm.close(sLabelNode);

	}

	return ColumnLayoutRenderer;

}, /* bExport= */ true);
