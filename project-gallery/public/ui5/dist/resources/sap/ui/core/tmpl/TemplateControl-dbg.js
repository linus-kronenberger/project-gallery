/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.core.tmpl.TemplateControl.
sap.ui.define([
	'sap/ui/core/Control',
	'sap/ui/core/DeclarativeSupport',
	"sap/ui/core/Element",
	'sap/ui/core/UIArea',
	'./DOMElement',
	"./TemplateControlRenderer",
	"./_parsePath",
	"sap/base/strings/capitalize",
	"sap/base/strings/hyphenate",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery",
	'sap/ui/core/library'
],
	function(
		Control,
		DeclarativeSupport,
		Element,
		UIArea,
		DOMElement,
		TemplateControlRenderer,
		parsePath,
		capitalize,
		hyphenate,
		Log,
		jQuery
	) {
	"use strict";



	/**
	 * Constructor for a new tmpl/TemplateControl.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * This is the base class for all template controls. Template controls are declared based on templates.
	 * @extends sap.ui.core.Control
	 * @version 1.138.0
	 *
	 * @public
	 * @since 1.15
	 * @deprecated as of version 1.56. Use an {@link sap.ui.core.mvc.XMLView XMLView} or a {@link topic:e6bb33d076dc4f23be50c082c271b9f0 Typed View} instead.
	 * @alias sap.ui.core.tmpl.TemplateControl
	 */
	var TemplateControl = Control.extend("sap.ui.core.tmpl.TemplateControl", /** @lends sap.ui.core.tmpl.TemplateControl.prototype */ {
		metadata : {

			library : "sap.ui.core",
			properties : {

				/**
				 * The context is a data object. It can be used for default template expressions. A change of the context object leads to a re-rendering whereas a change of a nested property of the context object doesn't. By default the context is an empty object.
				 */
				context : {type : "object", group : "Data", defaultValue : null}
			},
			aggregations : {

				/**
				 * The nested controls of the template control
				 */
				controls : {type : "sap.ui.core.Control", multiple : true, singularName : "control", visibility : "hidden"}
			},
			associations : {

				/**
				 * The template on which the template control is based on.
				 */
				template : {type : "sap.ui.core.tmpl.Template", multiple : false}
			},
			events : {

				/**
				 * Fired when the Template Control has been (re-)rendered and its HTML is present in the DOM.
				 */
				afterRendering : {},

				/**
				 * Fired before this Template Control is re-rendered. Use to unbind event handlers from HTML elements etc.
				 */
				beforeRendering : {}
			}
		},
		renderer: TemplateControlRenderer
	});



	/*
	 * Initialization of the sap.ui.core.tmpl.TemplateControl
	 */
	TemplateControl.prototype.init = function() {

		// list of binding information to cleanup once the
		// control is destroyed or re-rendering happens
		this._aBindingInfos = [];

	};


	/**
	 * checks whether the control is inline or not
	 *
	 * @return {boolean} flag, whether to control is inline or not
	 * @protected
	 */
	TemplateControl.prototype.isInline = function() {
		// in case of inline templates the ID of the UIArea root node is the same
		// like the ID for the current template control (this can only be the case
		// for inline templates)
		var bInline = false,
			oParent = this.getParent();
		if (oParent instanceof UIArea &&
			jQuery(oParent.getRootNode()).attr("id") === this.getId()) {
		  bInline = true;
		}
		return bInline;
	};


	/*
	 * Overridden to remove the old content for inline templates and clean up the
	 * old UIArea which is in the "nirvana" now
	 */
	TemplateControl.prototype.placeAt = function(oRef, oPosition) {
		// in case of placing an inline template somewhere else on the screen
		// we remove the content and destroy the UIArea's content
		// TODO: how to destroy the UIArea itself?
		var bInline = this.isInline();
		var $this = this.$(),
			oUIArea = this.getUIArea();
		Control.prototype.placeAt.apply(this, arguments);
		if (bInline && $this.length === 1) {
			$this.remove();
			oUIArea.destroyContent();
		}
	};

	/**
	 * Returns the instance specific renderer for an anonymous template control.
	 *
	 * @return {function} the instance specific renderer function
	 * @protected
	 */
	TemplateControl.prototype.getTemplateRenderer = function() {
		return this.fnRenderer;
	};


	/**
	 * Sets the instance specific renderer for an anonymous template control.
	 *
	 * @param {function} fnRenderer the instance specific renderer function
	 * @return {this} <code>this</code> to allow method chaining
	 * @protected
	 */
	TemplateControl.prototype.setTemplateRenderer = function(fnRenderer) {
		this.fnRenderer = fnRenderer;
		return this;
	};


	/**
	 * cleanup of the controls and bindings
	 * @private
	 */
	TemplateControl.prototype._cleanup = function() {

		// destroy the controls
		this.destroyAggregation("controls");

		// cleanup the bindings
		this._aBindingInfos.forEach(function(oBindingInfo) {
			var oBinding = oBindingInfo.binding;
			if ( oBinding ) {
				oBinding.detachChange(oBindingInfo.changeHandler);
				oBinding.destroy();
			}
		});

		this._aBindingInfos = [];

	};

	/**
	 * compile the declarative markup
	 * @private
	 */
	TemplateControl.prototype._compile = function() {
		var oTemplate = Element.getElementById(this.getTemplate()),
			bDeclarativeSupport = oTemplate && oTemplate.getDeclarativeSupport();
		if (bDeclarativeSupport) {
			var that = this;
			setTimeout(function() {
				DeclarativeSupport.compile(that.getDomRef());
			});
		}
	};

	/*
	 * cleanup of the controls and bindings
	 */
	TemplateControl.prototype.exit = function() {
		this._cleanup();
	};

	/*
	 * cleanup of the controls and bindings
	 */
	TemplateControl.prototype.onBeforeRendering = function() {
		this.fireBeforeRendering();
		this._cleanup();
	};


	/*
	 * parse nested controls which have been added via markup
	 */
	TemplateControl.prototype.onAfterRendering = function() {
		this.fireAfterRendering();
	};


	/*
	 * clone the fnRenderer
	 */
	TemplateControl.prototype.clone = function() {
		var oClone = Control.prototype.clone.apply(this, arguments);
		oClone.fnRenderer = this.fnRenderer;
		return oClone;
	};


	/*
	 * get notified when the model changes, ...
	 */
	TemplateControl.prototype.updateBindings = function(bUpdateAll, sModelName) {
		Control.prototype.updateBindings.apply(this, arguments);
		// invalidate once the element is rendered
		if (this.getDomRef()) {
			this.invalidate();
		}
	};


	/**
	 * Creates a pseudo binding for a value to get notified once the value
	 * changes to invalidate the control and trigger a re-rendering.
	 *
	 * @param {string} sPath the binding path
	 * @param {string} sModelFunc the name of the model function
	 * @return {any} the value of the path (typically an array)
	 * @private
	 */
	TemplateControl.prototype.bind = function(sPath, sType) {

		// parse the path and create the binding
		var oPathInfo = parsePath(sPath),
			oModel = this.getModel(oPathInfo.model),
			sPath = oPathInfo.path,
			sModelFunc = sType ? "bind" + capitalize(sType) : "bindProperty",
			oBinding = oModel && oModel[sModelFunc](sPath),
			oBindingInfo = {
				binding: oBinding,
				path: oPathInfo.path,
				model: oPathInfo.model
			};

		// attach a change handler (if the binding exists)
		if (oBinding) {
			oBindingInfo.changeHandler = function() {
				Log.debug("TemplateControl#" + this.getId() + ": " + sType + " binding changed for path \"" + sPath + "\"");
				this.invalidate();
			}.bind(this);
			oBinding.attachChange(oBindingInfo.changeHandler);
		}

		// store the binding info for later cleanup
		this._aBindingInfos.push(oBindingInfo);

		// return the external formatted value for the property
		return oBinding;

	};


	/**
	 * Calculates the path by considering the binding context if the path
	 * is a relative path otherwise the incoming path will be returned.
	 *
	 * @param {string} sPath the path
	 * @return {string} the path including the binding context
	 * @private
	 */
	TemplateControl.prototype.calculatePath = function(sPath, sType) {
		var oBindingContext = this.getBindingContext(),
		    sBindingContextPath = oBindingContext && oBindingContext.getPath();
		if (sPath && sBindingContextPath && !sPath.startsWith("/")) {
			if (!sBindingContextPath.endsWith("/")) {
				sBindingContextPath += "/";
			}
			sPath = sBindingContextPath + sPath;
		}
		return sPath;
	};


	/**
	 * Creates a pseudo binding for a property to get notified once the property
	 * changes to invalidate the control and trigger a re-rendering.
	 *
	 * @param {string} sPath the binding path
	 * @return {any} the value of the path
	 * @protected
	 */
	TemplateControl.prototype.bindProp = function(sPath) {
		var oBinding = this.bind(this.calculatePath(sPath), "property");
		return oBinding && oBinding.getExternalValue();
	};


	/**
	 * Creates a pseudo binding for an aggregation to get notified once the property
	 * changes to invalidate the control and trigger a re-rendering.
	 *
	 * @param {string} sPath the binding path
	 * @return {any} the value of the path
	 * @protected
	 */
	TemplateControl.prototype.bindList = function(sPath) {
		var oBinding = this.bind(this.calculatePath(sPath), "list"),
			oModel = oBinding && oBinding.getModel(),
			sPath = oBinding && oBinding.getPath();
		return oBinding && oModel.getProperty(sPath);
	};


	/**
	 * compiles (creates and registers) a new DOM element
	 *
	 * @param {object} mSettings the settings for the new DOM element
	 * @param {string} [sParentPath] the parent path for the DOM element
	 * @param {boolean} [bDoNotAdd] if true, then the control will not be
	 *          added to the _controls aggregation
	 * @return {sap.ui.core.Control} new DOM element instance
	 *
	 * @protected
	 */
	TemplateControl.prototype.createDOMElement = function(mSettings, sParentPath, bDoNotAdd) {
		var oElement = new DOMElement(mSettings);
		if (sParentPath) {
			// set the context for the DOM element
			oElement.bindObject(sParentPath);
		}
		if (!bDoNotAdd) {
			this.addAggregation("controls", oElement);
		}
		return oElement;
	};


	/**
	 * compiles (creates and registers) a new control
	 *
	 * @param {object} mSettings the settings for the new control
	 * @param {string} [sParentPath] the parent path for the control
	 * @param {boolean} [bDoNotAdd] if true, then the control will not be
	 *          added to the _controls aggregation
	 * @param {sap.ui.core.mvc.View} oView
	 * @return {sap.ui.core.Control} new control instance
	 *
	 * @protected
	 */
	TemplateControl.prototype.createControl = function(mSettings, sParentPath, bDoNotAdd, oView) {
		// sap.ui.core.Element.create doesn't work because there is no type
		// conversion for the values done (would be the better approach)
		var mHTMLSettings = {};
		jQuery.each(mSettings, function(sKey, oValue) { // @legacy-relevant: jQuery usage in deprecated code
			mHTMLSettings["data-" + hyphenate(sKey)] = oValue;
		});
		var $control = jQuery("<div></div>", mHTMLSettings);
		var oControl = DeclarativeSupport._createControl($control.get(0), oView);
		if (sParentPath) {
			// set the context for the control
			oControl.bindObject(sParentPath);
		}
		if (!bDoNotAdd) {
			this.addAggregation("controls", oControl);
		}
		return oControl;
	};


	return TemplateControl;

});