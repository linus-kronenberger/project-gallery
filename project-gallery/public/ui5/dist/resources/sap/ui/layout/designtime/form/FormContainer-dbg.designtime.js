/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.ui.layout.form.FormContainer control
sap.ui.define([
	"sap/ui/thirdparty/jquery",
	"sap/ui/core/Element",
	"sap/ui/layout/form/Form"
], function (
	jQuery,
	UI5Element,
	Form
) {
	"use strict";

	function _allFormElementsInvisible(oFormContainer) {
		return oFormContainer.getFormElements().every(function (oFormElement) {
			return oFormElement.getVisible() === false;
		});
	}

	function fnFindForm(oElement) {
		if (oElement && !(oElement instanceof Form)) {
			return fnFindForm(oElement.getParent());
		}
		return oElement;
	}

	function fnIsLayoutSupported(oFormContainer) {
		var oForm = fnFindForm(oFormContainer);
		if (oForm &&
			oForm.getLayout() &&
			oForm.getLayout().isA("sap.ui.layout.form.GridLayout")) {
			return false;
		}
		return true;
	}

	return {
		palette: {
			group: "LAYOUT",
			icons: {
				svg: "sap/ui/layout/designtime/form/FormContainer.icon.svg"
			}
		},
		isVisible: function (oFormContainer) {
			return oFormContainer.isVisible();
		},
		actions: {
			remove: function (oFormContainer) {
				if (fnIsLayoutSupported(oFormContainer)) {
					return {
						changeType: "hideControl"
					};
				} else {
					return null;
				}
			},
			rename: function (oFormContainer) {
				if (fnIsLayoutSupported(oFormContainer)) {
					return {
						changeType: "renameGroup",
						domRef: function (oFormContainer) {
							if (!oFormContainer.getRenderedDomRef()) {
								var oTitleOrToolbar = oFormContainer.getTitle() || oFormContainer.getToolbar();
								return oTitleOrToolbar.getDomRef();
							}
							return jQuery(oFormContainer.getRenderedDomRef()).find(".sapUiFormTitle")[0];
						},
						isEnabled: function (oFormContainer) {
							return !(oFormContainer.getToolbar() || !oFormContainer.getTitle());
						}
					};
				} else {
					return null;
				}
			}
		},
		aggregations: {
			formElements: {
				childNames: {
					singular: "FIELD_CONTROL_NAME",
					plural: "FIELD_CONTROL_NAME_PLURAL"
				},
				domRef: function (oFormContainer) {
					var oDomRef = oFormContainer.getRenderedDomRef();
					var oHeader = oFormContainer.getTitle() || oFormContainer.getToolbar();
					if (oDomRef) {
						return oDomRef;
					}
					if (oFormContainer.getFormElements().length === 0 || _allFormElementsInvisible(oFormContainer)) {
						if (oHeader instanceof UI5Element) {
							return oHeader.getDomRef();
						}
						if (typeof oHeader === "string") {
							return jQuery(oDomRef).find(".sapUiFormTitle").get(0);
						}
					}
					return undefined;
				},
				actions: {
					move: function (oFormContainer) {
						if (fnIsLayoutSupported(oFormContainer)) {
							return {
								changeType: "moveControls"
							};
						} else {
							return null;
						}
					},
					remove : {
						removeLastElement: true
					},
					add: {
						delegate: function (oFormContainer) {
							if (fnIsLayoutSupported(oFormContainer)) {
								return {
									changeType: "addFormField",
									changeOnRelevantContainer: true
								};
							}
						}
					}
				}
			},
			toolbar: {
				domRef: function (oFormContainer) {
					var oToolbar = oFormContainer.getToolbar();
					if (oToolbar) {
						return oToolbar.getDomRef();
					}
				}
			}
		},
		name: {
			singular: "GROUP_CONTROL_NAME",
			plural: "GROUP_CONTROL_NAME_PLURAL"
		}
	};

});