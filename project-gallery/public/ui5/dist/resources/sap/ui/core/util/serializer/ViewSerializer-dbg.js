/*
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(['sap/ui/base/EventProvider', './HTMLViewSerializer', './XMLViewSerializer', "sap/base/assert", "sap/ui/base/DesignTime"],
	function(EventProvider, HTMLViewSerializer, XMLViewSerializer, assert, DesignTime) {
	"use strict";




	/**
	 * View serializer class. Iterates over all controls and serializes all found views by calling the corresponding view type serializer.
	 *
	 * @param {sap.ui.core.Control|sap.ui.core.UIArea} oRootControl the root control to serialize
	 * @param {object} [oWindow=window] the window object. Default is the window object the instance of the serializer is running in.
	 * @param {string} [sDefaultXmlNamespace] defines the default xml namespace
	 *
	 * @class ViewSerializer class.
	 * @extends sap.ui.base.EventProvider
	 * @author SAP SE
	 * @version 1.138.0
	 * @alias sap.ui.core.util.serializer.ViewSerializer
	 * @private
	 * @ui5-restricted sap.watt, com.sap.webide
	 */
	var ViewSerializer = EventProvider.extend("sap.ui.core.util.serializer.ViewSerializer", /** @lends sap.ui.core.util.serializer.ViewSerializer.prototype */
	{
		constructor : function (oRootControl, oWindow, sDefaultXmlNamespace) {
			EventProvider.apply(this);
			this._oRootControl = oRootControl;
			this._oWindow = oWindow || globalThis;
			this._mViews = {};
			this._sDefaultXmlNamespace = sDefaultXmlNamespace;
		}
	});

	/**
	 * Serializes all views into XML.
	 *
	 * @returns {map} the serialized views. The keys are the view name.
	 */
	ViewSerializer.prototype.serializeToXML = function () {
		return this.serialize("XML");
	};

	/**
	 * Serializes all views into HTML.
	 *
	 * @returns {map} the serialized views. The keys are the view name.
	 * @deprecated Since 1.119
	 */
	ViewSerializer.prototype.serializeToHTML = function () {
		return this.serialize("HTML");
	};

	/**
	 * Serializes all views into a given format.
	 * Possible values are XML or HTML.
	 * If left empty the content is left as it was.
	 *
	 * @returns {map} the serialized views. The keys are the view name.
	 */
	ViewSerializer.prototype.serialize = function (sConvertToViewType) {
		this._mViews = {};
		this._sConvertToViewType = sConvertToViewType || undefined;
		return this._serializeRecursive(this._oRootControl);
	};


	ViewSerializer.prototype._getViewType = function(oView) {
		if (!this._sConvertToViewType) {
			// retrieve View classes from the (injected) window

			/**
			 * @deprecated Since 1.119.0
			 */
			if (oView?.isA?.("sap.ui.core.mvc.HTMLView")) {
				return "HTML";
			}

			if (oView?.isA?.("sap.ui.core.mvc.XMLView")) {
				return "XML";
			}
		}
		return this._sConvertToViewType;
	};

	/**
	 * Internal method for recursive serializing
	 *
	 * @param {sap.ui.core.Control|sap.ui.core.UIArea} oControl the control to serialize
	 * @returns {map} the serialized views. The keys are the view name.
	 * @private
	 */
	ViewSerializer.prototype._serializeRecursive = function (oControl) {

		assert(typeof oControl !== "undefined", "The control must not be undefined");

		var UIArea = this._oWindow.sap.ui.require("sap/ui/core/UIArea");
		var ComponentContainer = this._oWindow.sap.ui.require("sap/ui/core/ComponentContainer");

		// serialize view
		if (oControl?.isA?.("sap.ui.core.mvc.View")) {
			var oViewSerializer = this._getViewSerializer(oControl, this._getViewType(oControl));
			if (oViewSerializer) {
				var oViewName = oControl.getViewName() || oControl.getControllerName();
				if (!this._mViews[oViewName]) {
					this._mViews[oViewName] = oViewSerializer.serialize(this._getViewType(oControl));
				}
			}
		}

		if (oControl.getMetadata().getClass() === UIArea) {
			var aContent = oControl.getContent();
			for (var i = 0; i < aContent.length; i++) {
				this._serializeRecursive(aContent[i]);
			}
		} else if (oControl.getMetadata().getClass() === ComponentContainer) {
			this._serializeRecursive(oControl.getComponentInstance().getRootControl());
		} else {
			var mAggregations = oControl.getMetadata().getAllAggregations();
			if (mAggregations) {
				for (var sName in mAggregations) {
					var oAggregation = mAggregations[sName];
					var oValue = oControl[oAggregation._sGetter]();

					if (oValue && oValue.length) {
						for (var i = 0;i < oValue.length;i++) {
							var oObj = oValue[i];
							if (oObj?.isA?.("sap.ui.core.Element")) {
								this._serializeRecursive(oObj);
							}
						}
					} else if (oValue?.isA?.("sap.ui.core.Element")) {
						this._serializeRecursive(oValue);
					}
				}
			}
		}
		return this._mViews;
	};

	/**
	 * Instantiates the view serializer depending on the type of view (XML/HTML).
	 *
	 * @param {sap.ui.core.mvc.View|sap.ui.core.Control|sap.ui.core.UIArea} oView the instance of the view. Needed to determine the type of view serializer.
	 * @returns {sap.ui.core.util.serializer.XMLViewSerializer|sap.ui.core.util.serializer.HTMLViewSerializer} returns the corresponding serializer for the view type. Returns null when control is not a view..
	 * @private
	 */
	ViewSerializer.prototype._getViewSerializer = function (oView, sType) {

		// a function to find the event handler name for an event
		var fnGetEventHandlerName = function (oEvent) {

			// both xml and html view write this ui5 internal property for the serializer
			if (oEvent.fFunction && oEvent.fFunction._sapui_handlerName) {
				var sHandlerName = oEvent.fFunction._sapui_handlerName;

				// double check that the function is on the controller
				var oController = oView.getController();
				if (oController[sHandlerName] || DesignTime.isControllerCodeDeactivated()) {
					return sHandlerName;
				}
			}
			// TODO: ITERARTE OVER HANDLERS AND CHECK THE EVENT FUNCTION
			// NOTE: JQUERY GUID WON'T WORK AS THE GUID WILL BE SAVED AT THE CLOSURED FUNCTION AS WELL
			// WHEN THE FUNCTION IS REUSED FOR SEVERAL HANDLERS WE WILL LOSE THE INFORMATION
			/*for (var sHandler in oController) {
				if (oController[sHandler] === oEvent.fFunction) {
					return sHandler;
				}
			}*/
		};

		// a function to compute the control id
		var fnGetControlId = function (oControl) {
			// Allow specification of desired controlId as changing ids later on is not possible
			//This has to be the view relative ID
			if (oControl._sapui_controlId) {
				return oControl._sapui_controlId;
			}
			return oControl.getId().replace(oView.createId(""), "");
		};

		// create the appropriate view serializer

		/**
		 * @deprecated Since 1.119.0
		 */
		if (sType === "HTML") {
			return new HTMLViewSerializer(
					oView,
					this._oWindow,
					fnGetControlId,
					fnGetEventHandlerName);
		}

		if (sType === "XML") {
			return new XMLViewSerializer(
					oView,
					this._oWindow,
					this._sDefaultXmlNamespace,
					fnGetControlId,
					fnGetEventHandlerName);
		} else {
			var sViewType = (oView) ? oView.constructor : "?";
			throw Error("View type '" + sViewType + "' is not supported for conversion. Only HTML and XML is supported");
		}
	};


	return ViewSerializer;

});