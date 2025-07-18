/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.support.plugins.ViewInfo (ViewInfo support plugin)
sap.ui.define([
	"sap/ui/core/Element",
	"sap/ui/core/RenderManager",
	"sap/ui/core/support/Plugin",
	"sap/ui/core/support/controls/TreeViewer",
	"sap/ui/core/support/controls/ObjectViewer",
	"sap/ui/Device",
	"sap/base/Log",
	"sap/ui/base/BindingInfo",
	"sap/ui/base/DataType",
	"sap/ui/base/ManagedObject",
	"sap/ui/thirdparty/jquery"
], function(
	Element,
	RenderManager,
	Plugin,
	TreeViewer,
	ObjectViewer,
	Device,
	Log,
	BindingInfo,
	DataType,
	ManagedObject,
	$
) {
	"use strict";

		/**
		 * Creates an instance of sap.ui.core.support.plugins.ViewInfo.
		 * @class This class represents the ViewInfo plugin for the support tool functionality of UI5. This class is internal and all its functions must not be used by an application.
		 * @extends sap.ui.core.support.Plugin
		 * @version 1.138.0
		 * @private
		 * @deprecated As of version 1.118
		 * @alias sap.ui.core.support.plugins.ViewInfo
		 */
		var ViewInfo = Plugin.extend("sap.ui.core.support.plugins.ViewInfo", {
			metadata: {
				deprecated: true
			},
			constructor : function(oSupportStub) {
				Plugin.apply(this, [ "sapUiSupportViewInfo", "XML View and Templating Support Tools", oSupportStub]);
			}
		});

		ViewInfo.prototype.init = function(oSupportStub){
			Plugin.prototype.init.apply(this, arguments);
			if (!this.runsAsToolPlugin()) {
				return;
			}
			if (!Device.browser.chrome) {
				this.$().get(0).innerHTML = "View Info Support Tool is currently only available on Chrome. We are currently working to support all browsers.";
				return;
			}
			try {
				this.supportInfo = window.opener.sap.ui.core.support.Support.info;
			} catch (ex) {
				this.$().get(0).innerHTML = "View Info Support Tool needs access to the opener window. The opener window might not be accessible due to cross domain restrictions.";
				return;
			}

			if (typeof this.supportInfo !== "function") {
				this.$().get(0).innerHTML =
					"<div class='sapUISupportLabel'>" +
						"View Info Support Tool is only available in <b>Support Mode.</b>" +
						"<br>Turn it on by adding '<b>sap-ui-support=true</b>' to the URL of your application." +
					"</div>";
				return;
			}
			try {
				this.aViews = this.supportInfo.getAll("view");
				this.aOdataModels = this.supportInfo.getAll("datajs");
			} catch (ex) {
				this.$().get(0).innerHTML = "View Info Support Tool raised an internal error while reading the support informations.";
				return;
			}

			if (!this.aViews) {
				this.$().get(0).innerHTML = "View Info Support Tool did not record any information on the current page.<br>" +
						"Possible reasons:<br>" +
						"There are no XML Views defined in the current app.<br>" +
						"Views where not loaded before the Diagnostics tool was started.";
			}
			if (this.runsAsToolPlugin()) {
				initInTools.call(this, oSupportStub);
			}
		};

		function initInTools(oSupportStub) {
			$(document)
			.on("click", ".viewxmlheader", $.proxy(this._onToggleViewInfo, this))
			.on("click", ".viewxmlmain", $.proxy(this._onMainViewInfo, this));
			this.renderContentAreas();
		}

		ViewInfo.prototype.exit = function(oSupportStub) {
			Plugin.prototype.exit.apply(this, arguments);
			if (this.runsAsToolPlugin()) {
				$(document)
				.off("click", ".viewxmlheader", $.proxy(this._onToggleViewInfo, this))
				.off("click", ".viewxmlmain", $.proxy(this._onMainViewInfo, this));
			}
		};

		ViewInfo.prototype.provideNodeInfo = function(oViewDebugInfo, oNode, oAttribute) {
			if (oViewDebugInfo.env.type !== "template") {
				var oData = this.getObjectInfo(oNode);
				var aInfos = [];
				if (oData) {
					var mInfos = this.getBreakpointInfos(oData);
					if (mInfos.Template) {
						aInfos.push(mInfos.Template);
					}
					if (mInfos.Attributes) {
						aInfos.push(mInfos.Attributes);
					}
					if (mInfos.Properties) {
						aInfos.push(mInfos.Properties);
					}
					if (mInfos.Methods) {
						aInfos.push(mInfos.Methods);
					}
				}
				return aInfos;
			}
		};

		ViewInfo.prototype.highlightTemplateTreeNode = function(oTemplateTree, oData, i) {
			oTemplateTree.clearHighlights();
			var aInfos = this.getSupportInfos(oData);
			for (var i = 0; i < aInfos.length; i++) {
				if (aInfos[i].context) {
					oTemplateTree.expandNode(aInfos[i].context);
					oTemplateTree.highlightNode(aInfos[i].context);
				}
			}
		};

		ViewInfo.prototype.createTree = function(oViewDebugInfo, i) {
			var oTree = new TreeViewer(),
				that = this,
				oRootNode = oViewDebugInfo.context;
			oTree.viewDebugInfo = oViewDebugInfo;
			//prepare real control ids
			if (oViewDebugInfo.env.type === "template") {
				oTree.ignoreIds();
				oRootNode = oViewDebugInfo.env.clone;
			}
			var aNodes = oRootNode.querySelectorAll("*");

			for (var j = 0; j < aNodes.length; j++) {
				var oNode = aNodes[j],
					sIndices = oNode.getAttribute("support:data"),
					aControlIds = this.supportInfo.getIds(sIndices);
				if (aControlIds.length > 0) {
					if (!oNode.getAttribute("id")) {
						oNode.setAttribute("id","");
					}
					oNode.setAttribute("__id", aControlIds[0]);
				} else {
					oNode.setAttribute("__id", oNode.getAttribute("id"));

				}
			}

			oTree.setRootObject(oRootNode);
			oTree.attachSelectionChange((function(i) {
				return function(oData, sReason) {
					if (oViewDebugInfo) {
						if (oViewDebugInfo.env.type !== "template") {
							that.updateObjectInfo(oData, i, sReason);
							if (oViewDebugInfo.env.templateTree) {
								that.highlightTemplateTreeNode(oViewDebugInfo.env.templateTree, oData, i);
							}
						}
					}
				};
			})(i));
			oTree.attachAttributeInfos(function(oNode, oAttribute) {
				if (oViewDebugInfo) {
					if (oViewDebugInfo.env.type !== "template") {
						if (oAttribute.name.indexOf("support:") > -1) {
							return {visible:false};
						}
						if (oAttribute.name.indexOf("xmlns:support") > -1) {
							return {visible:false};
						}
					}
				}
			});
			oTree.attachNodeInfos(function(oNode, oAttribute) {
				return that.provideNodeInfo(oViewDebugInfo, oNode, oAttribute);
			});
			return oTree;
		};
		// -------------------------------
		// Rendering
		// -------------------------------

		ViewInfo.prototype.renderContentAreas = function() {
			this._propertyChangeDebugger = {};
			this._methodDebugger = {};
			var rm = new RenderManager().getInterface();

			if (!this.aTrees) {
				this.aTrees = [];
				this.aDataTrees = [];
				this.aObjectViewers = [];
				var i = 0;
				rm.openStart("div").class("viewxmlmain").openEnd();
				rm.openStart("div").class("settingscontainer").openEnd();
				rm.openStart("span").class("settings").attr("raise", "_onClearAllBreakpoints").openEnd().text("Clear all breakpoints").close("span");
				rm.openStart("span").class("settings").attr("raise", "_onClearAllXMLModifications").openEnd().text("Clear all XML modifications").close("span");
				rm.close("div");
				this.aMetamodels = [];
				if (this.aOdataModels) {
					for (var j = 0; j < this.aOdataModels.length; j++) {
						var oMetadata = this.aOdataModels[j];
						if (oMetadata && oMetadata.env.type === "metadata") {
							this.aMetamodels.push(oMetadata);
							var oTree = this.createTree(oMetadata, i);
							this.aTrees[i] = oTree;
							rm.openStart("div").class("viewxmlheader").attr("collapsed", "true").openEnd();
								rm.openStart("span").class("toggle").openEnd().close("span");
								rm.openStart("span").class("info").openEnd().text("Metadata: " + oMetadata.env.settings.response.requestUri).close("span");
								rm.openStart("div").class("settingscontainer").openEnd();
									rm.openStart("span").class("settings").class("sapUiSupportViewInfoElementHidden").attr("raise", "_onToggleDebugNodes").attr("idx", i).openEnd().text("Expand debugged nodes").close("span");
									rm.openStart("span").class("settings").class("sapUiSupportViewInfoElementHidden").attr("raise", "_onToggleRealIds").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Show XML View Ids");
									rm.close("span");
									rm.openStart("span").class("settings").attr("raise", "_onToggleNamespace").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Hide tag namespace");
									rm.close("span");
									rm.openStart("span").class("settings").attr("raise", "_onToggleInactive").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Hide inactive");
									rm.close("span");
								rm.close("div");
							rm.close("div");
							rm.openStart("div").class("sapUiSupportViewInfoElementHidden").openEnd();
								rm.openStart("div", "treecontent_" + i).openEnd().close("div");
								rm.openStart("div").class("viewxmlsplitter").openEnd().close("div");
								rm.openStart("div").class("viewxmlinfo").openEnd();
									rm.openStart("div", "objectHeader" + i).class("title").class("sapUiSupportViewInfoElementHidden").openEnd().text("Header").close("div");
									rm.openStart("div", "objectToolbar" + i).class("toolbar").class("sapUiSupportViewInfoElementHidden").openEnd().text("Toolbar").close("div");
									rm.openStart("div", "selectedcontent_" + i).class("content").openEnd().close("div");
								rm.close("div");
							rm.close("div");
						}
						oMetadata.env.tree = oTree;
						i++;
					}
				}
				if (this.aViews) {
					for (var j = 0; j < this.aViews.length; j++) {
						var oView = this.aViews[j];
						var oTree = this.createTree(oView, i);
						this.aTrees[i] = oTree;
						this.aObjectViewers[i] = null;
						var sId = "";
						if (oView.env.type == "template") {
							sId = oView.env.viewinfo.id;
						} else {
							sId = oView.env.viewinfo.getId();
							//find corresponding template tree
							for (var k = 0; k < this.aTrees.length; k++) {
								if (this.aTrees[k] && this.aTrees[k].viewDebugInfo.env.type === "template" && this.aTrees[k].viewDebugInfo.env.viewinfo.id === sId) {
									oView.env.templateTree = this.aTrees[k];
								}
							}
							//find preprocessor metamodels
							if (oView.env.settings.preprocessors && oView.env.settings.preprocessors.xml && oView.env.settings.preprocessors.xml.models) {
								var mModels = oView.env.settings.preprocessors.xml.models;
								if (mModels) {
									for (var n in mModels) {
										if (mModels[n].oMetadata) {
											var sUrl = mModels[n].oMetadata.sUrl;
											for (var k = 0; k < this.aMetamodels.length; k++) {
												var oMetamodel = this.aMetamodels[k];
												if (oMetamodel && oMetamodel.env.settings.response.requestUri === sUrl) {
													if (!oView.env.metamodels) {
														oView.env.metamodels = [];
													}
													oView.env.metamodels.push({
														tree: oMetamodel.env.tree,
														model: oMetamodel,
														data: mModels[n],
														metamodel: mModels[n].oMetaModel,
														metadata: mModels[n].oMetadata
													});
												}
											}
										}
									}
								}
							}
						}

						if (oView.env.type === "template") {
							rm.openStart("div").class("viewxmlheader").attr("collapsed", "true").openEnd();
								rm.openstart("span").class("toggle").openEnd().close("span");
								rm.openStart("span").class("info").openEnd().text(sId + ' (' + oView.env.type + ')').close("span");
								rm.openStart("div").class("settingscontainer").openEnd();
									rm.openStart("span").class("settings").attr("raise", "_onToggleDebugNodes").attr("idx", i).openEnd().text("Expand debugged nodes").close("span");
									rm.openStart("span").class("settings").class("sapUiSupportViewInfoElementHidden").attr("raise", "_onToggleRealIds").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Show XML View Ids");
									rm.close("span");
									rm.openStart("span").class("settings").attr("raise", "_onToggleNamespace").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Hide tag namespace");
									rm.close("span");
									rm.openStart("span").class("settings").attr("raise", "_onToggleInactive").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Hide inactive");
									rm.close("span");
								rm.close("div");
							rm.close("div");
						} else {
							var sTemplatedBy = "";
							if (oView.env.metamodels) {
								sTemplatedBy = ":templated by [";
								for (var x = 0; x < oView.env.metamodels.length; x++) {
									sTemplatedBy += oView.env.metamodels[x].metadata.sUrl;
								}
								sTemplatedBy +=  "]";
							}
							var sCache = "";
							if (oView.env.settings.cache) {
								sCache += " from client cache " + JSON.stringify(oView.env.settings.cache);
							}
							rm.openStart("div").class("viewxmlheader").attr("collapsed", "true").openEnd();
								rm.openStart("span").class("toggle").openEnd().close("span");
								rm.openStart("span").class("info").openEnd().text(sId + ' (' + oView.env.type + sTemplatedBy + ') ' + sCache).close("span");
								rm.openStart("div").class("settingscontainer").openEnd();
									rm.openStart("span").class("settings").attr("raise", "_onToggleDebugNodes").attr("idx", i).openEnd().text("Expand debugged nodes").close("span");
									rm.openStart("span").class("settings").attr("raise", "_onToggleRealIds").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Show XML View Ids");
									rm.close("span");
									rm.openStart("span").class("settings").attr("raise", "_onToggleNamespace").attr("idx", i).openEnd();
										rm.openStart("span").attr("selected", "false").openEnd().close("span");
										rm.text("Hide tag namespace");
									rm.close("span");
								rm.close("div");
							rm.close("div");
						}
						rm.openStart("div").class("sapUiSupportViewInfoElementHidden").openEnd();
							rm.openStart("div", "treecontent_" + i).openEnd().close("div");
							rm.openStart("div").class("viewxmlsplitter").openEnd().close("div");
							rm.openStart("div").class("viewxmlinfo").openEnd();
								rm.openStart("div", "objectHeader" + i).class("title").class("sapUiSupportViewInfoElementHidden").openEnd().text("Header").close("div");
								rm.openStart("div", "objectToolbar" + i).class("toolbar").class("sapUiSupportViewInfoElementHidden").openEnd().text("Toolbar").close("div");
								rm.openStart("div", "selectedcontent_" + i).class("content").openEnd().close("div");
							rm.close("div");
						rm.close("div");
						rm.close("div");
						i++;
					}
				}
			}
			rm.flush(this.$().get(0));
			if (this.aTrees) {
				for (var i = 0; i < this.aTrees.length; i++) {
					var oTree = this.aTrees[i];
					var oDomRef = document.getElementById("treecontent_" + i);
					if (oDomRef) {
						oTree.update(oDomRef);
					}
				}
			}
			rm.destroy();
		};

		ViewInfo.prototype._onClearAllBreakpoints = function() {
			this.supportInfo.removeAllBreakpoints();
		};

		ViewInfo.prototype._onClearAllXMLModifications = function() {
			this.supportInfo.removeAllXMLModification();
		};

		ViewInfo.prototype.getBreakpointInfos = function(oData) {
			var mInfos = {},
				i;
			function countBP(oData) {
				var iBreakpoints = 0;
				for (var n in oData) {
					if (oData[n].__enabled) {
						iBreakpoints++;
					}
				}
				return iBreakpoints;
			}
			if (oData.Template) {
				i = countBP(oData.Template);
				mInfos["Template"] = {selected: i > 0, color: "orange" , tooltip: "Template Breakpoints (" + i + ")"};
			}
			if (oData.Attributes) {
				i = countBP(oData.Attributes);
				mInfos["Attributes"] = {selected: i > 0, color: "blue" , tooltip: "Attribute Changes (" + i + ")"};
			}
			if (oData.Properties) {
				i = countBP(oData.Properties);
				mInfos["Properties"] = {selected: i > 0, color: "green" , tooltip: "Property Change Breakpoints (" + i + ")"};
			}
			if (oData.Methods) {
				i = countBP(oData.Methods);
				mInfos["Methods"] = {selected: i > 0, color: "red" , tooltip: "Method Breakpoints (" + i + ")"};
			}
			return mInfos;
		};

		ViewInfo.prototype.getSupportInfos = function(oNode) {
			var sIdx = oNode.getAttribute("support:data");
			return this.supportInfo.getInfos(sIdx);
		};

		ViewInfo.prototype.parseScalarType = function(sType, sValue, sName, oController) {
			// check for a binding expression (string)
			try {
				var oBindingInfo = BindingInfo.parse(sValue, oController, true);
				if ( oBindingInfo && typeof oBindingInfo === "object" ) {
					return {binding:oBindingInfo};
				}
			} catch (ex) {
				return {error: "Property " + sName + " - Invalid Binding:" + ex.message};
			}
			var vValue = sValue = typeof oBindingInfo === "string" ? oBindingInfo : sValue; // oBindingInfo could be an unescaped string
			var oType = DataType.getType(sType);
			if (oType) {
				if (oType instanceof DataType) {
					vValue = oType.parseValue(sValue);
				}
				// else keep original sValue (e.g. for enums)
			} else {
				return {error: "Property " + sName + " has unknown type " + sType};
			}
			if (!oType.isValid(vValue)) {
				return {error: "Property " + sName + " has invalid value;"};
			}

			// Note: to avoid double resolution of binding expressions, we have to escape string values once again
			return {value: vValue};
		};

		ViewInfo.prototype.getObjectInfo = function(oNode, sId) {
			var that = this;
			function fnChangeProperty(oProperty, aControls, oNode) {
				 return function(sValue) {
						var vValue = that.parseScalarType(oProperty.type, sValue, oProperty.name, null);
						for (var i = 0; i < aControls.length; i++) {
							aControls[i].isBound(oProperty.name);
							if (oProperty.bindable) {
								aControls[i][oProperty._sUnbind](vValue.binding);
							} else {
								aControls[i].unbindProperty(oProperty.name);
							}
							if (vValue.binding) {
								if (oProperty.bindable) {
									aControls[i][oProperty._sBind](vValue.binding);
								} else {
									aControls[i].bindProperty(oProperty.name, vValue.binding);
								}
							} else if (vValue.value !== undefined) {
								aControls[i][oProperty._sMutator](vValue.value);
							}
						}
						oNode.setAttribute("__changed" + oProperty.name, sValue);
						return vValue;
					};
			}
			function fnChangeAttribute(oProperty, oNode, oData) {
				 return function(sValue) {
						var vValue = that.parseScalarType(oProperty.type, sValue, oProperty.name, null);
						for (var i = 0; i < aControls.length; i++) {
							aControls[i].isBound(oProperty.name);
							if (oProperty.bindable) {
								aControls[i][oProperty._sUnbind](vValue.binding);
							} else {
								aControls[i].unbindProperty(oProperty.name);
							}
							if (vValue.binding) {
								if (oProperty.bindable) {
									aControls[i][oProperty._sBind](vValue.binding);
								} else {
									aControls[i].bindProperty(oProperty.name, vValue.binding);
								}
							} else if (vValue.value !== undefined) {
								aControls[i][oProperty._sMutator](vValue.value);
							}
						}
						if (!vValue.error) {
							oNode.getAttribute("_index");
							var oParent = oNode.parentNode,
								oRoot = null;
							while (oParent) {
								oRoot = oParent;
								oParent = oParent.parentNode;
							}
							if (oRoot) {
								var aAll = oRoot.querySelectorAll("*");
								for (var i = 0; i < aAll.length; i++) {
									if (aAll[i] === oNode) {
										that.supportInfo.addXMLModification(sId, i + 1, {setAttribute:[oProperty.name, sValue]});
										return;
									}
								}
							}
						}
						return vValue;
					};
			}
			var sNamespace = oNode.namespaceURI,
				sTag = oNode.localName,
				oData = {};
			var oControlClass = window.opener.jQuery.sap.getObject(sNamespace + "." + sTag);
			if (oControlClass) {
				var sIdx = oNode.getAttribute("support:data");
				var mAllProperties = oControlClass.getMetadata().getAllProperties(),
					mAllMethods = oControlClass.prototype,
					aControls = this.supportInfo.getElements(sIdx),
					aDebugInfos = this.getValidDebugStackIndices(oNode);

				if (aControls.length > 0) {
					oData.Control = {};
					oData.Control[aControls[0].getMetadata().getName()] = {
						value : aControls[0].getId(),
						__highlightid : true,
						__readonly: true
					};
					if (aControls.length > 1) {
						oData.Clones = {};
						for (var i = 1; i < aControls.length; i++) {
							oData.Clones[aControls[i].getMetadata().getName() + "(" + i + ")"] = {
								value : aControls[i].getId(),
								__highlightid : true
							};
						}
					}
				}
				if (aDebugInfos.length > 0) {
					oData.Template = {};
					for (var i = 0; i < aDebugInfos.length; i++) {
						var oDebugInfo = aDebugInfos[i];
						oData.Template[oDebugInfo.__infokey] = {
							value: oDebugInfo.__infovalue,
							__idx: aDebugInfos[i]._idx,
							__enabled: this.supportInfo.hasBreakpointAt(aDebugInfos[i]._idx),
							__level: oDebugInfo.__level
						};
					}
				}

				var aProperties = Object.keys(mAllProperties).sort();
				if (oNode.attributes.length > 0) {
					oData.Attributes = {};
					for (var i = 0; i < oNode.attributes.length; i++) {
						var oAttribute = oNode.attributes[i];
						if (aProperties.indexOf(oAttribute.name) > -1) {
							var oProperty = mAllProperties[aProperties[aProperties.indexOf(oAttribute.name)]];
							oData.Attributes[oAttribute.name] = {
								value: oAttribute.value,
								__enabled: false,
								__docu: ViewInfo.DemokitUrl + oProperty._oParent.getName() + "#" + oProperty._sGetter,
								__original: oAttribute.value,
								__change: fnChangeAttribute(oProperty, oNode, sId),
								__add: true
							};
						}
					}
				}
				if (aProperties.length > 0) {
					oData.Properties = {};
					for (var i = 0; i < aProperties.length; i++) {
						var oProperty = mAllProperties[aProperties[i]];
						var oPropertyData = {
							value: oNode.getAttribute("__changed" + oProperty.name) || oNode.getAttribute(aProperties[i]),
							value2: aControls[0] && aControls[0][oProperty._sGetter] ? aControls[0] && aControls[0][oProperty._sGetter]() : null,
							__controls: aControls,
							__enabled: aControls[0] && this._propertyChangeDebugger[aControls[0].getId() + "__" + aProperties[i]] != null,
							__docu: ViewInfo.DemokitUrl + oProperty._oParent.getName() + "#" + oProperty._sGetter,
							__original: oNode.getAttribute(aProperties[i]),
							__changed: null
						};
						oPropertyData.__change = fnChangeProperty(oProperty, aControls, oNode);
						oData.Properties[aProperties[i]] = oPropertyData;
					}
				}
				var aMethods = Object.keys(mAllMethods).sort();
				if (aMethods.length > 0) {
					oData.Methods = {};
					for (var i = 0; i < aMethods.length; i++) {
//						var oMethod = mAllMethods[aMethods[i]],
//							sInherited = ((aMethods[i] in mAllInterfaceMethods) && mAllInterfaceMethods[aMethods[i]]._oParent) !== oControlClass ? "inherited" : ""
						oData.Methods[aMethods[i]] = {
							value: "",
							__controls: aControls,
							__enabled: aControls[0] && this._methodDebugger[aControls[0].getId() + "__" + aMethods[i]] != null
						};
					}
				}
			}
			return oData;
		};

		ViewInfo.prototype._makePropFn = function(sKey) {
			return function (oEvent) {
				if (oEvent.getParameter("name") === sKey) {
					/*eslint-disable no-debugger */
					debugger;
					/*eslint-enable no-debugger */
					//step up to method setProperty who rased this event
				}
			};
		};

		ViewInfo.prototype._makeFn = function(fn) {
			return function () {
				/*eslint-disable no-debugger */
				debugger;
				/*eslint-enable no-debugger */
				//step into next method fn.apply
				return fn.apply(this, arguments);
			};
		};

		ViewInfo.prototype.highlightControl = function(oDataObject, sSectionKey, oObject) {
			try {
				if (this._highlightControl) {
					this._highlightControl.control.getDomRef().style.outline = this._highlightControl.outline;
				}
				if (this._highlightControls) {
					for (var i = 0;i < this._highlightControls.length; i++) {
						this._highlightControls[i].control.getDomRef().style.outline = this._highlightControls[i].outline;
					}
				}

				this._highlightControl = null;
				this._highlightControls = [];
				if (oDataObject.Control && oDataObject.Control[Object.keys(oDataObject.Control)[0]].__highlightid) {
					if (sSectionKey === "Control" && oDataObject.Clones) {
						for (var n in oDataObject.Clones) {
							var oClone = opener.Element.getElementById(oDataObject.Clones[n].value);
							if (oClone && oClone.getDomRef()) {
								this._highlightControls.push({
									control: oClone,
									outline: oClone.getDomRef().style.outline
								});
								oClone.getDomRef().style.outline = "solid 1px orange";
							}
						}
					} else {
						if (!oObject) {
							oObject = oDataObject.Control[Object.keys(oDataObject.Control)[0]];
						}
						if (sSectionKey === "Control" && oObject) {
							var oControl = opener.Element.getElementById(oObject.value);
							if (oControl && oControl.getDomRef()) {
								this._highlightControl = {
									control: oControl,
									outline: oControl.getDomRef().style.outline
								};
								if (oControl.getDomRef()) {
									oControl.getDomRef().style.outline = "solid 1px orange";
								}
							}
						}
					}
					if (sSectionKey === "Clones") {
						var oControl = opener.Element.getElementById(oObject.value);
						if (oControl && oControl.getDomRef()) {
							this._highlightControl = {
								control: oControl,
								outline: oControl.getDomRef().style.outline
							};
							if (oControl.getDomRef()) {
								oControl.getDomRef().style.outline = "solid 1px orange";
							}
						}
					}
				}
			} catch (ex) {
				Log.debug("Diagnostics: ViewInfo failed to remove highlighting of controls");
			}

		};

		ViewInfo.DemokitUrl = "https://sdk.openui5.org/api/";

		ViewInfo.prototype.updateObjectInfo = function(oData, iIdx, sReason) {
			var oObjectViewer = this.aObjectViewers[iIdx],
				that = this;

			if (!oObjectViewer) {
				oObjectViewer = new ObjectViewer();
				this.aObjectViewers[iIdx] = oObjectViewer;
			}
			var oHeader = document.getElementById("objectHeader" + iIdx);
			oHeader.style.display = "none";
			var oTree = this.aTrees[iIdx];
			oObjectViewer.initialExpandedSections = this.oObjectViewer ? this.oObjectViewer.expandedSections : [];
			var oDataObject = this.getObjectInfo(oData, oTree.viewDebugInfo.env.viewinfo.getId());
			var sHeader = "";
			try {
				if (!oDataObject.Control && oData.parentNode) {
					var sControlName = oData.parentNode.namespaceURI + "." + oData.parentNode.localName;
					var sAggr = "get" + oData.localName.substring(0,1).toUpperCase() + oData.localName.substring(1);

					sHeader += "<a target=\"_docu\" href=\"" + ViewInfo.DemokitUrl + sControlName + "\">" + sControlName + "</a> (" + oData.tagName + ") ";
					sHeader +=  ": <a target=\"_docu\" href=\"" + ViewInfo.DemokitUrl + sControlName + "#" + sAggr + "\">" + oData.localName + " aggregation</a>";

				} else {
						var sControlName = oData.namespaceURI + "." + oData.localName;
						sHeader += "<a target=\"_docu\" href=\"" + ViewInfo.DemokitUrl + sControlName + "\">" + sControlName + "</a> (" + oData.tagName + ") ";
						var sParentName = window.opener.jQuery.sap.getObject(Object.keys(oDataObject.Control)[0]).getMetadata().getParent().getName();
						sHeader += ": <a target=\"_docu\" href=\"" + ViewInfo.DemokitUrl + sParentName + "\">" + sParentName + "</a>";
				}
			} catch (ex) {
				sHeader += "";
			}
			oHeader.style.display = "block";
			oHeader.innerHTML = sHeader;
			that.highlightControl(oDataObject, "Control");
			oObjectViewer.setRootObject(oDataObject);
			oObjectViewer.attachObjectInfos(function(oSectionObject, sSectionKey, oObject, sKey) {
				if (sSectionKey === "Template") {
					if (oDataObject[sSectionKey][sKey].__enabled) {
						return [{selected: true, color: "orange" , tooltip: "Disable breakpoint"}];
					} else {
						return [{selected: false, color: "orange" , tooltip: "Break if resolved after reload/reprocess"}];
					}
				} else if (sSectionKey === "Attributes") {
					if (oDataObject[sSectionKey][sKey].__enabled) {
						return [{selected: true, color: "blue" , tooltip: "Disable breakpoint"}];
					} else {
						return [{selected: false, color: "blue" , tooltip: "Break if changed"}];
					}
				} else if (sSectionKey === "Properties") {
					if (oDataObject[sSectionKey][sKey].__enabled) {
						return [{selected: true, color: "green" , tooltip: "Disable breakpoint"}];
					} else {
						return [{selected: false, color: "green" , tooltip: "Break if changed"}];
					}
				} else if (sSectionKey === "Methods") {
					if (oDataObject[sSectionKey][sKey].__enabled) {
						return [{selected: true, color: "red" , tooltip: "Disable breakpoint"}];
					} else {
						return [{selected: false, color: "red" , tooltip: "Break if called"}];
					}
				}
				return [];
			});
			oObjectViewer.attachSelect(function(oObject) {
				if (oObject && oObject.__docu) {
					window.open(oObject.__docu, "_docu");
				}
			});
			oObjectViewer.attachHover(function(oObject, sSectionKey, sKey) {
				that.highlightControl(oDataObject, sSectionKey, oObject);
			});
			oObjectViewer.attachInfoPress(function(sSectionKey, sKey, iInfo) {
				var iIdx = oDataObject[sSectionKey][sKey].__idx,
					bEnabled = oDataObject[sSectionKey][sKey].__enabled;
				if (!bEnabled) {
					if (sSectionKey === "Template") {
						 that.supportInfo.addBreakpointAt(iIdx);
					} else if (sSectionKey === "Properties") {
						var aControls = oDataObject[sSectionKey][sKey].__controls;
						if (aControls) {
							for (var i = 0; i < aControls.length; i++) {
								var oControl = aControls[i];
								that._propertyChangeDebugger[oControl.getId() + "__" + sKey] = that.supportInfo._breakAtProperty(sKey);
								oControl.attachEvent("_change", that._propertyChangeDebugger[oControl.getId() + "__" + sKey]);
							}
						}
					} else if (sSectionKey === "Methods") {
						var aControls = oDataObject[sSectionKey][sKey].__controls;
						if (aControls) {
							for (var i = 0; i < aControls.length; i++) {
								var oControl = aControls[i];
								var fn = oControl[sKey];
								that._methodDebugger[oControl.getId() + "__" + sKey + "__fn"] = fn;
								that._methodDebugger[oControl.getId() + "__" + sKey] = that.supportInfo._breakAtMethod(fn);
								oControl[sKey] = that._methodDebugger[oControl.getId() + "__" + sKey];
							}
						}
					}
					oDataObject[sSectionKey][sKey].__enabled = true;
					oObjectViewer.setInfoSelected(sSectionKey, sKey, iInfo, true);
				} else {
					if (sSectionKey === "Template") {
						 that.supportInfo.removeBreakpointAt(iIdx);
					} else if (sSectionKey === "Properties"){
						var aControls = oDataObject[sSectionKey][sKey].__controls;
						if (aControls) {
							for (var i = 0; i < aControls.length; i++) {
								var oControl = aControls[i];
								oControl.detachEvent("_change", that._propertyChangeDebugger[oControl.getId() + "__" + sKey]);
								delete that._propertyChangeDebugger[oControl.getId() + "__" + sKey];
							}
						}
					} else if (sSectionKey === "Methods"){
						var aControls = oDataObject[sSectionKey][sKey].__controls;
						if (aControls) {
							for (var i = 0; i < aControls.length; i++) {
								var oControl = aControls[i];
								oControl[sKey] = that._methodDebugger[oControl.getId() + "__" + sKey + "__fn"];
								delete that._methodDebugger[oControl.getId() + "__" + sKey];
								delete that._methodDebugger[oControl.getId() + "__" + sKey + "__fn"];

							}
						}
					}
					oDataObject[sSectionKey][sKey].__enabled = false;
					oObjectViewer.setInfoSelected(sSectionKey, sKey, iInfo, false);
				}

				if (oDataObject) {
					var mInfos = that.getBreakpointInfos(oDataObject);
					var i = 0;
					if (mInfos.Template) {
						oTree.setInfoSelected(oTree.getSelectedIndex(), i++, mInfos.Template.selected, mInfos.Template.tooltip);
					}
					if (mInfos.Attributes) {
						oTree.setInfoSelected(oTree.getSelectedIndex(), i++, mInfos.Attributes.selected, mInfos.Attributes.tooltip);
					}
					if (mInfos.Properties) {
						oTree.setInfoSelected(oTree.getSelectedIndex(), i++, mInfos.Properties.selected, mInfos.Properties.tooltip);
					}
					if (mInfos.Methods) {
						oTree.setInfoSelected(oTree.getSelectedIndex(), i, mInfos.Methods.selected, mInfos.Methods.tooltip);
					}
				}
			});

			var oDomRef = document.getElementById("selectedcontent_" + iIdx);
			if (oDomRef) {
				oObjectViewer.update(oDomRef);
			}
			this.oObjectViewer = oObjectViewer;
		};

		ViewInfo.prototype._onToggleRealIds = function(oEvent) {
			var oDomRef = oEvent.target;
			if (oDomRef.getAttribute("selected")) {
				oDomRef = oDomRef.parentNode;
			}
			var iIndex = parseInt(oDomRef.getAttribute("idx")),
				oTree = this.aTrees[iIndex];
			if (oTree.toggleIds()) {
				oDomRef.innerHTML = "<span selected=\"false\"></span>Show XML View Ids";
			} else {
				oDomRef.innerHTML = "<span selected=\"true\"></span>Show Real Ids";
			}
		};

		ViewInfo.prototype._onToggleInactive = function(oEvent) {
			var oDomRef = oEvent.target;
			if (oDomRef.getAttribute("selected")) {
				oDomRef = oDomRef.parentNode;
			}
			var iIndex = parseInt(oDomRef.getAttribute("idx")),
				oTree = this.aTrees[iIndex];
			if (oTree.toggleInactive()) {
				oDomRef.innerHTML = "<span selected=\"false\"></span>Hide inactive";
			} else {
				oDomRef.innerHTML = "<span selected=\"true\"></span>Show inactive";
			}
			oEvent.stopPropagation();
		};

		ViewInfo.prototype._onToggleNamespace = function(oEvent) {
			var oDomRef = oEvent.target;
			if (oDomRef.getAttribute("selected")) {
				oDomRef = oDomRef.parentNode;
			}
			var iIndex = parseInt(oDomRef.getAttribute("idx")),
				oTree = this.aTrees[iIndex];
			if (oTree.toggleNS()) {
				oDomRef.innerHTML = "<span selected=\"false\"></span>Hide tag namespace";
			} else {
				oDomRef.innerHTML = "<span selected=\"true\"></span>Show tag namespace";
			}
			oEvent.stopPropagation();
		};

		ViewInfo.prototype._onToggleDebugNodes = function(oEvent) {
			var iIndex = parseInt(oEvent.target.getAttribute("idx")),
				oTree = this.aTrees[iIndex];
			oTree.expandNodesWithSelectedInfo(0);
			oTree.expandNodesWithSelectedInfo(1);
			oTree.expandNodesWithSelectedInfo(2);
		};

		ViewInfo.prototype.resizeHandler = function() {
			var aViews = document.querySelectorAll(".viewxmlheader");
			for (var i = 0; i < aViews.length; i++) {
				var oDomRef = aViews[i];
				var bCollapsed = oDomRef.getAttribute("collapsed") === "true";
				if (!bCollapsed) {
					var iWidth = oDomRef.offsetWidth - 30;
					var iHeight = oDomRef.nextSibling.firstChild.offsetHeight;
					oDomRef._iOldWidth = iWidth;
					oDomRef._iOldHeight = iHeight;
					oDomRef.nextSibling.firstChild.style.width = (iWidth / 3 * 2) + "px";
					oDomRef.nextSibling.lastChild.style.width = (iWidth / 3) + "px";
					oDomRef.nextSibling.lastChild.style.height = (iHeight) + "px";
					oDomRef.nextSibling.lastChild.style.marginTop = (-iHeight) + "px";
					oDomRef.nextSibling.lastChild.style.marginLeft = ((iWidth / 3 * 2) + 20)  + "px";
					oDomRef.nextSibling.lastChild.lastChild.height = (iHeight - 50) + "px";
					oDomRef.nextSibling.lastChild.lastChild.width = "100%";
				}
			}
			if (!this.iInterval) {
				var that = this;
				this.iInterval = window.setInterval(function() {
					var aViews = document.querySelectorAll(".viewxmlheader");
					var oDomRef = aViews[0];
					for (var i = 0; i < aViews.length; i++) {
						var oDomRef = aViews[i];
						var bCollapsed = oDomRef.getAttribute("collapsed") === "true";
						if (!bCollapsed) {
							if (oDomRef._iOldWidth !== oDomRef.offsetWidth - 30 || oDomRef._iOldHeight !== oDomRef.nextSibling.firstChild.offsetHeight) {
								that.resizeHandler();
							}
						}
					}
				},100);
			}
		};

		ViewInfo.prototype._onMainViewInfo = function(oEvent) {
			var oDomRef = oEvent.target,
				sRaise = oDomRef.getAttribute("raise");
			if (sRaise && this[sRaise]) {
				this[sRaise](oEvent);
				oEvent.stopPropagation();
				return;
			}
		};

		ViewInfo.prototype._onToggleViewInfo = function(oEvent) {
			var oDomRef = oEvent.target,
			sRaise = oDomRef.getAttribute("raise");
			if (sRaise && this[sRaise]) {
				this[sRaise](oEvent);
				oEvent.stopPropagation();
				return;
			}
			sRaise = oDomRef.parentNode.getAttribute("raise");
			if (sRaise && this[sRaise]) {
				this[sRaise](oEvent);
				oEvent.stopPropagation();
				return;
			}
			if (!oDomRef.getAttribute("collapsed")) {
				oDomRef = oDomRef.parentNode;
			}
			var bCollapsed = oDomRef.getAttribute("collapsed") === "true";
			if (bCollapsed) {
				oDomRef.setAttribute("collapsed", "false");
				oDomRef.nextSibling.style.display = "block";
				this.resizeHandler();
			} else {
				oDomRef.setAttribute("collapsed", "true");
				oDomRef.nextSibling.style.display = "none";
			}
		};

		ViewInfo.prototype.getValidDebugStackIndices = function(oNode) {
			var aResults = [],
				sIndices = oNode.getAttribute("support:data"),
				aInvalidAttr = ["xmlns","support:data"];
			if (sIndices) {
				var aIndices = sIndices.split(","),
					oSupportInfo = this.supportInfo,
					iLevel = 0;
				for (var i = 0; i < aIndices.length; i++) {
					var iIdx = parseInt(aIndices[i]);
					var oDebugInfo = oSupportInfo.byIndex(iIdx);
					if (!oDebugInfo) {
						continue;
					}
					oDebugInfo.__debugging = oSupportInfo.hasBreakpointAt(iIdx);
					if (oDebugInfo.env) {
						if (oDebugInfo.env.caller === "visitAttributes") {
							for (var n in oDebugInfo.env) {
								if (n === "caller" || n === "info") {
									continue;
								}
								var bValid = true;
								for (var j = 0; j < aInvalidAttr.length; j++) {
									if (oDebugInfo.env[n].name.indexOf(aInvalidAttr[j]) === 0) {
										bValid = false;
										break;
									}
								}
								if (bValid) {
									if (n.indexOf("after") === 0) {
										iLevel--;
									}
									oDebugInfo.__infokey = n + ":" + oDebugInfo.env[n].name;
									oDebugInfo.__level = iLevel;
									oDebugInfo.__infovalue = oDebugInfo.env[n].value;
									if (n.indexOf("before") === 0) {
										iLevel++;
									}
									aResults.push(oDebugInfo);
								}
							}
						} else if (oDebugInfo.env.caller === "getMetadata") {
							for (var n in oDebugInfo.env) {
								if (n === "caller" || n === "info") {
									continue;
								}
								var bValid = true;
								for (var j = 0; j < aInvalidAttr.length; j++) {
									if (oDebugInfo.env[n].name.indexOf(aInvalidAttr[j]) === 0) {
										bValid = false;
										break;
									}
								}
								if (bValid) {
									if (n.indexOf("after") === 0) {
										iLevel--;
									}
									oDebugInfo.__infokey = n + ":" + oDebugInfo.env[n].name;
									oDebugInfo.__level = iLevel;
									oDebugInfo.__infovalue = oDebugInfo.env[n].value;
									aResults.push(oDebugInfo);
									if (n.indexOf("before") === 0) {
										iLevel++;
									}
								}
							}
						} else if (oDebugInfo.env.caller === "getProperty") {
							for (var n in oDebugInfo.env) {
								if (n === "caller" || n === "info") {
									continue;
								}
								var bValid = true;
								for (var j = 0; j < aInvalidAttr.length; j++) {
									if (oDebugInfo.env[n].name.indexOf(aInvalidAttr[j]) === 0) {
										bValid = false;
										break;
									}
								}
								if (bValid) {
									if (n.indexOf("after") === 0) {
										iLevel--;
									}
									oDebugInfo.__infokey = n + ":" + oDebugInfo.env[n].name;
									oDebugInfo.__level = iLevel;
									oDebugInfo.__infovalue = oDebugInfo.env[n].value;
									aResults.push(oDebugInfo);
									if (n.indexOf("before") === 0) {
										iLevel++;
									}
								}
							}
						} else if (oDebugInfo.env.caller === "visitNode") {
							for (var n in oDebugInfo.env) {
								if (n.indexOf("after") === 0) {
									iLevel--;
								}
								oDebugInfo.__infokey = n + ":Node";
								oDebugInfo.__infovalue = oDebugInfo.env[n].name;
								aResults.push(oDebugInfo);
								if (n.indexOf("before") === 0) {
									iLevel++;
								}
							}
						}
					}
				}
			}
			return aResults;
		};

	return ViewInfo;

});