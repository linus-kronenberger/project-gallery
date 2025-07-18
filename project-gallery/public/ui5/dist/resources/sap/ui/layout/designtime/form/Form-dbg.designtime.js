/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.ui.layout.form.Form control
sap.ui.define([
	'sap/ui/layout/form/Form'
], function(
	Form
) {
	"use strict";

	function isChildOfFormElement(oElement) {
		return oElement.getParent() && oElement.getParent().isA("sap.ui.layout.form.FormElement");
	}

	function fnIsLayoutSupported(oForm){
		if ((oForm instanceof Form) &&
			oForm.getLayout() &&
			oForm.getLayout().getMetadata().getName() === "sap.ui.layout.form.GridLayout"){
			return false;
		}
		return true;
	}

	return {
		palette: {
			group: "LAYOUT",
			icons: {
				svg: "sap/ui/layout/designtime/form/Form.icon.svg"
			}
		},
		aggregations : {
			title : {
				ignore : true
			},
			toolbar : {
				ignore : function(oForm){
					return !oForm.getToolbar();
				},
				domRef : function(oForm){
					return oForm.getToolbar().getDomRef();
				}
			},
			formContainers : {
				propagateRelevantContainer: true,
				propagateMetadata: function (oElement) {
					if (isChildOfFormElement(oElement)) {
						return {
							actions: "not-adaptable"
						};
					}
				},
				childNames : {
					singular : "GROUP_CONTROL_NAME",
					plural : "GROUP_CONTROL_NAME_PLURAL"
				},
				domRef: ":sap-domref",
				actions: {
					move: function(oForm) {
						if (fnIsLayoutSupported(oForm)){
							return "moveControls";
						} else {
							return null;
						}
					},
					remove : {
						removeLastElement: true
					},
					createContainer :  function(oForm){
						if (fnIsLayoutSupported(oForm)){
							return {
								changeType : "addGroup",
								isEnabled : true,
								getCreatedContainerId : function(sNewControlID) {
									return sNewControlID;
								}
							};
						} else {
							return null;
						}
					}
				}

			}
		},
		actions: {
			localReset: "localReset"
		}
	};

});