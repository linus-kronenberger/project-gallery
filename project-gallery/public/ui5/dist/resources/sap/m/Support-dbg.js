/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/ui/thirdparty/jquery",
	"sap/ui/Device",
	"sap/base/security/encodeXML",
	"sap/base/util/isPlainObject"
],
	function(
		jQuery,
		Device,
		encodeXML,
		isPlainObject
	) {
		"use strict";

		// Load these dependencies later to avoid circular dependencies of type
		// library -> Support -> Button -> library
		var Button, Dialog, Label, Panel, Toolbar, MessageToast, HTML, mLibrary;

		/**
		 * <pre>
		 * <code>sap.m.Support</code> shows the technical information for SAPUI5 Mobile Applications.
		 * This technical information includes:
		 *    * SAPUI5 Version
		 *    * User Agent
		 *    * Configurations (Bootstrap and Computed)
		 *    * URI parameters
		 *    * All loaded module names
		 *
		 * In order to show the device information, the user must follow the following gestures.
		 *    1 - Hold two fingers for 3 seconds minimum.
		 *    2 - Tab with a third finger while holding the first two fingers.
		 *
		 * NOTE: This class is internal and all its functions must not be used by an application
		 *
		 * Enable Support:
		 * --------------------------------------------------
		 * //import
		 * sap.ui.require("sap/m/Support", function (Support) {
		 *   // Support is initialized and is listening for fingers gestures combination
		 * });
		 *
		 * //By default after require, support is enabled but implicitly we can call
		 * Support.on();
		 *
		 * Disable Support:
		 * --------------------------------------------------
		 * Support.off();
		 * </pre>
		 *
		 * @author SAP SE
		 * @since 1.11.0
		 *
		 * @static
		 * @protected
		 * @name sap.m.Support
		 */
		var Support = (function ($, document) {

			var dialog, startTime, isEventRegistered, lastTouchUID,
				timeDiff = 0,
				minHoldTime = 3000, // 3s(3000ms) two-finger hold time
				holdFingersNumber = 2, // two-fingers hold
				maxFingersAllowed = 3, // two-fingers hold + 1-finger tab
				releasedFingersNumber = 1,
				oData = {},
				e2eTraceConst = {
					btnStart: "startE2ETrace",
					selLevel: "logLevelE2ETrace",
					taContent: "outputE2ETrace",
					infoText: "Ent-to-End trace is running in the background." +
					" Navigate to the URL that you would like to trace." +
					" The result of the trace will be shown in dialog after the trace is terminated.",
					infoDuration: 5000 // 5 sec.
				},
				controlIDs = {
					dvLoadedLibs: "LoadedLibs",
					dvLoadedModules: "LoadedModules"
				};

			// copied from core
			function line(buffer, right, border, label, content) {
				buffer.push("<tr class='sapUiSelectable'><td class='sapUiSupportTechInfoBorder sapUiSelectable'><label class='sapUiSupportLabel sapUiSelectable'>", encodeXML(label), "</label><br>");
				var ctnt = content;
				if (typeof content === "function") {
					ctnt = content(buffer) || "";
				}
				buffer.push(encodeXML(ctnt));
				buffer.push("</td></tr>");
			}

			// copied from core
			function multiline(buffer, right, border, label, content) {
				line(buffer, right, border, label, function (buffer) {
					buffer.push("<table class='sapMSupportTable' border='0' cellspacing='5' cellpadding='5' width='100%'><tbody>");
					jQuery.each(content, function (i, v) {
						var val = "";
						if (v !== undefined && v !== null) {
							if (typeof (v) == "string" || typeof (v) == "boolean" || (Array.isArray(v) && v.length == 1)) {
								val = v;
							} else if (Array.isArray(v) || isPlainObject(v)) {
								val = JSON.stringify(v);
							}
						}
						line(buffer, false, false, i, "" + val);
					});
					buffer.push("</tbody></table>");
				});
			}

			// copied from core
			function getTechnicalContent(oFrameworkInformation) {
				oData = {
					version: oFrameworkInformation.commonInformation.version,
					build: oFrameworkInformation.commonInformation.buildTime,
					change: oFrameworkInformation.commonInformation.lastChange,
					useragent: oFrameworkInformation.commonInformation.userAgent,
					docmode: oFrameworkInformation.commonInformation.documentMode,
					debug: oFrameworkInformation.commonInformation.debugMode,
					bootconfig: oFrameworkInformation.configurationBootstrap,
					config: oFrameworkInformation.configurationComputed,
					loadedlibs: oFrameworkInformation.loadedLibraries,
					modules: oFrameworkInformation.loadedModules,
					uriparams: oFrameworkInformation.URLParameters,
					appurl: oFrameworkInformation.commonInformation.applicationHREF
				};

				var html = ["<table class='sapUiSelectable' border='0' cellspacing='5' cellpadding='5' width='100%'><tbody class='sapUiSelectable'>"];
				line(html, true, true, "SAPUI5 Version", function (buffer) {
					buffer.push(oData.version, " (built at ", oData.build, ", last change ", oData.change, ")");
				});
				line(html, true, true, "User Agent", function (buffer) {
					buffer.push(oData.useragent, (oData.docmode ? ", Document Mode '" + oData.docmode + "'" : ""));
				});
				line(html, true, true, "Debug Sources", function (buffer) {
					buffer.push((oData.debug ? "ON" : "OFF"));
				});
				line(html, true, true, "Application", oData.appurl);
				multiline(html, true, true, "Configuration (bootstrap)", oData.bootconfig);
				multiline(html, true, true, "Configuration (computed)", oData.config);
				multiline(html, true, true, "URI Parameters", oData.uriparams);
				// e2e trace section
				line(html, true, true, "End-to-End Trace", function (buffer) {
					buffer.push("<label class='sapUiSupportLabel'>Trace Level:</label>",
						"<select id='" + buildControlId(e2eTraceConst.selLevel) + "' class='sapUiSupportTxtFld' >",
						"<option value='low'>LOW</option>",
						"<option value='medium' selected>MEDIUM</option>",
						"<option value='high'>HIGH</option>",
						"</select>"
					);
					buffer.push("<button id='" + buildControlId(e2eTraceConst.btnStart) + "' class='sapUiSupportBtn'>Start</button>");
					buffer.push("<div class='sapUiSupportDiv'>");
					buffer.push("<label class='sapUiSupportLabel'>XML Output:</label>");
					buffer.push("<textarea id='" + buildControlId(e2eTraceConst.taContent) + "' class='sapUiSupportTxtArea sapUiSelectable' readonly ></textarea>");
					buffer.push("</div>");
				});

				line(html, true, true, "Loaded Libraries", function (buffer) {
					buffer.push("<ul class='sapUiSelectable'>");
					jQuery.each(oData.loadedlibs, function (i, v) {
						if (v && (typeof (v) === "string" || typeof (v) === "boolean")) {
							buffer.push("<li class='sapUiSelectable'>", i + " " + v, "</li>");
						}
					});
					buffer.push("</ul>");
				});

				line(html, true, true, "Loaded Modules", function (buffer) {
					buffer.push("<div class='sapUiSupportDiv sapUiSelectable' id='" + buildControlId(controlIDs.dvLoadedModules) + "'></div>");
				});

				html.push("</tbody></table>");

				return new HTML({
					content: html.join("").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")
				});
			}

			function buildControlId(controlId) {
				return dialog.getId() + "-" + controlId;
			}

			function fillPanelContent(panelId, arContent) {

				var panelHeader = "Modules";
				var libsCount = 0, arDivContent = [];

				libsCount = arContent.length;
				jQuery.each(arContent.sort(), function (i, module) {
					arDivContent.push(new Label({text: " - " + module}).addStyleClass("sapUiSupportPnlLbl"));
				});

				// insert content into div placeholders
				var objPanel = new Panel({
					expandable: true,
					expanded: false,
					headerToolbar: new Toolbar({
						design: mLibrary.ToolbarDesign.Transparent,
						content: [new Label({
							text: panelHeader + " (" + libsCount + ")",
							design: mLibrary.LabelDesign.Bold
						})]
					}),
					content: arDivContent
				});

				objPanel.placeAt(buildControlId(panelId), "only");
			}

			// setup dialog elements and bind some events
			function setupDialog(E2eTraceLib) {
				// setup e2e values as log level and content
				if (dialog.traceXml) {
					dialog.$(e2eTraceConst.taContent).text(dialog.traceXml);
				}
				if (dialog.e2eLogLevel) {
					dialog.$(e2eTraceConst.selLevel).val(dialog.e2eLogLevel);
				}

				fillPanelContent(controlIDs.dvLoadedModules, oData.modules);


				// bind button Start event
				dialog.$(e2eTraceConst.btnStart).one("tap", function () {

					dialog.e2eLogLevel = dialog.$(e2eTraceConst.selLevel).val();
					dialog.$(e2eTraceConst.btnStart).addClass("sapUiSupportRunningTrace").text("Running...");
					dialog.traceXml = "";
					dialog.$(e2eTraceConst.taContent).text("");

					E2eTraceLib.start(dialog.e2eLogLevel, function (traceXml) {
						dialog.traceXml = traceXml;
					});

					// show info message about the E2E trace activation
					MessageToast.show(e2eTraceConst.infoText, {duration: e2eTraceConst.infoDuration});

					//close the dialog, but keep it for later use
					dialog.close();
				});
			}

			// get or create dialog instance and return
			function getDialog() {
				if (dialog) {
					return dialog;
				}

				dialog = new Dialog({
					title: "Technical Information",
					horizontalScrolling: true,
					verticalScrolling: true,
					stretch: Device.system.phone,
					buttons: [
						new Button({
							text: "Close",
							press: function () {
								dialog.close();
							}
						})
					],
					afterOpen: function () {
						Support.off();
					},
					afterClose: function () {
						Support.on();
					}
				}).addStyleClass("sapMSupport");

				return dialog;
			}

			//function is triggered when a touch is detected
			function onTouchStart(oEvent) {
				if (oEvent.touches) {
					var currentTouches = oEvent.touches.length;

					if (currentTouches > maxFingersAllowed) {
						document.removeEventListener('touchend', onTouchEnd);
						return;
					}

					switch (currentTouches) {

						case holdFingersNumber:
							startTime = Date.now();
							document.addEventListener('touchend', onTouchEnd);
							break;

						case maxFingersAllowed:
							if (startTime) {
								timeDiff = Date.now() - startTime;
								lastTouchUID = oEvent.touches[currentTouches - 1].identifier;
							}
							break;
					}
				}
			}

			//function is triggered when a touch is removed e.g. the user’s finger is removed from the touchscreen.
			function onTouchEnd(oEvent) {
				document.removeEventListener('touchend', onTouchEnd);

				// Check if two fingers are holded for 3 seconds or more and after that it`s tapped with a third finger
				if (timeDiff > minHoldTime
					&& (oEvent.touches.length === holdFingersNumber)
					&& oEvent.changedTouches.length === releasedFingersNumber
					&& oEvent.changedTouches[0].identifier === lastTouchUID) {

					timeDiff = 0;
					startTime = 0;
					show();
				}
			}

			function show() {
				sap.ui.require([
					"sap/ui/core/support/ToolsAPI",
					"sap/ui/core/support/trace/E2eTraceLib",
					"sap/ui/core/HTML",
					"sap/m/library",
					"sap/m/Button",
					"sap/m/Dialog",
					"sap/m/Label",
					"sap/m/Panel",
					"sap/m/Toolbar",
					"sap/m/MessageToast"
				], function (ToolsAPI, E2eTraceLib, _HTML, _mLibrary, _Button, _Dialog, _Label, _Panel, _Toolbar, _MessageToast) {
					HTML = _HTML;
					mLibrary = _mLibrary;
					Button = _Button;
					Dialog = _Dialog;
					Label = _Label;
					Panel = _Panel;
					Toolbar = _Toolbar;
					MessageToast = _MessageToast;

					var container = getDialog();
					container.removeAllAggregation("content");
					container.addAggregation("content", getTechnicalContent(ToolsAPI.getFrameworkInformation()));

					dialog.open();
					setupDialog(E2eTraceLib);
				});
			}

			return ({
				/**
				 * Enables support.
				 *
				 * @returns {this} this to allow method chaining
				 * @protected
				 * @name sap.m.Support.on
				 * @function
				 */
				on: function () {
					if (!isEventRegistered && "ontouchstart" in document) {
						isEventRegistered = true;
						document.addEventListener("touchstart", onTouchStart);
					}
					return this;
				},

				/**
				 * Disables support.
				 *
				 * @returns {this} this to allow method chaining
				 * @protected
				 * @name sap.m.Support.off
				 * @function
				 */
				off: function () {
					if (isEventRegistered) {
						isEventRegistered = false;
						document.removeEventListener("touchstart", onTouchStart);
					}
					return this;
				},

				open: function () {
					show();
				},

				/**
				 * Returns if event is registered or not.
				 *
				 * @returns {boolean}
				 * @protected
				 * @name sap.m.Support.isEventRegistered
				 * @function
				 */
				isEventRegistered: function () {
					return isEventRegistered;
				}
			}).on();

		}(jQuery, document));


		return Support;
	}, /* bExport= */ true);