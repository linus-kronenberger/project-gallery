/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.form.FormContainer.
sap.ui.define([
	'sap/ui/core/Element',
	'sap/ui/base/ManagedObjectObserver',
	"sap/ui/core/Lib",
	'sap/ui/core/theming/Parameters',
	'./FormHelper',
	'sap/base/Log'
], function(Element, ManagedObjectObserver, Library, Parameters, FormHelper, Log) {
	"use strict";



	/**
	 * Constructor for a new sap.ui.layout.form.FormContainer.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * A <code>FormContainer</code> represents a group inside a <code>Form</code>. It consists of <code>FormElements</code>.
	 * The rendering of the <code>FormContainer</code> is done by the <code>FormLayout</code> assigned to the <code>Form</code>.
	 * @extends sap.ui.core.Element
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.16.0
	 * @alias sap.ui.layout.form.FormContainer
	 */
	var FormContainer = Element.extend("sap.ui.layout.form.FormContainer", /** @lends sap.ui.layout.form.FormContainer.prototype */ { metadata : {

		library : "sap.ui.layout",
		properties : {

			/**
			 * Container is expanded.
			 *
			 * <b>Note:</b> This property only works if <code>expandable</code> is set to <code>true</code>.
			 */
			expanded : {type : "boolean", group : "Misc", defaultValue : true},

			/**
			 * Defines if the <code>FormContainer</code> is expandable.
			 *
			 * <b>Note:</b> The expander icon will only be shown if a <code>title</code> is set for the <code>FormContainer</code>.
			 */
			expandable : {type : "boolean", group : "Misc", defaultValue : false},

			/**
			 * If set to <code>false</code>, the <code>FormContainer</code> is not rendered.
			 */
			visible : {type : "boolean", group : "Misc", defaultValue : true},

			/**
			 * Internal property for the <code>editable</code> state of the internal <code>FormContainer</code>.
			 */
			_editable: {
				type: "boolean",
				group: "Misc",
				defaultValue: false,
				visibility: "hidden"
			}
		},
		defaultAggregation : "formElements",
		aggregations : {

			/**
			 * The <code>FormElements</code> contain the content (labels and fields) of the <code>FormContainers</code>.
			 */
			formElements : {type : "sap.ui.layout.form.FormElement", multiple : true, singularName : "formElement"},

			/**
			 * Title of the <code>FormContainer</code>. Can either be a <code>Title</code> element or a string.
			 * If a <code>Title</code> element is used, the style of the title can be set.
			 *
			 * <b>Note:</b> If a <code>Toolbar</code> is used, the <code>Title</code> is ignored.
			 *
			 * <b>Note:</b> If the title is provided as a string, the title is rendered with a theme-dependent default level.
			 * As the <code>Form</code> control cannot know the structure of the page, this might not fit the page structure.
			 * In this case provide the title using a <code>Title</code> element and set its {@link sap.ui.core.Title#setLevel level} to the needed value.
			 */
			title : {type : "sap.ui.core.Title", altTypes : ["string"], multiple : false},

			/**
			 * Toolbar of the <code>FormContainer</code>.
			 *
			 * <b>Note:</b> If a <code>Toolbar</code> is used, the <code>Title</code> is ignored.
			 * If a title is needed inside the <code>Toolbar</code> it must be added at content to the <code>Toolbar</code>.
			 * In this case add the <code>Title</code> to the <code>ariaLabelledBy</code> association.
			 * Use the right title level to meet the visual requirements. This might be theme-dependent.
			 * @since 1.36.0
			 */
			toolbar : {type : "sap.ui.core.Toolbar", multiple : false},

			/*
			 * Internal Expand button
			 */
			_expandButton : {type : "sap.ui.core.Control", multiple : false, visibility: "hidden"}
		},
		associations: {

			/**
			 * Association to controls / IDs that label this control (see WAI-ARIA attribute <code>aria-labelledby</code>).
			 *
			 * <b>Note:</b> This attribute is only rendered if the <code>FormContainer</code> has it's own
			 * DOM representation in the used <code>FormLayout</code>.
			 *
			 * <b>Note:</b> If there is more than one <code>FormContainers</code>, every <code>FormContainer</code> needs to have some title or label
			 * (at least for screen reader support).
			 * If no <code>Title</code> is set, a label or title needs to be assigned using the <code>ariaLabelledBy</code> association.
			 * @since 1.36.0
			 */
			ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
		},
		designtime: "sap/ui/layout/designtime/form/FormContainer.designtime"
	}});

	FormContainer.prototype.init = function(){

		this._oInitPromise = FormHelper.init(); // check for used library and request needed controls


		this._rb = Library.getResourceBundleFor("sap.ui.layout");

		this._oObserver = new ManagedObjectObserver(this._observeChanges.bind(this));

		this._oObserver.observe(this, {
			properties: ["expanded", "expandable"],
			aggregations: ["formElements"]
		});

	};

	FormContainer.prototype.exit = function(){

		if (this._oExpandButton) {
			delete this._oExpandButton;
		}
		this._rb = undefined;

		this._oObserver.disconnect();
		this._oObserver = undefined;

	};

	function _expandableChanged(bExpandable){

		if (bExpandable) {
			if (!this._oExpandButton) {
				if (this._oInitPromise) {
					// module needs to be loaded -> create Button async
					this._oInitPromise.then(function () {
						delete this._oInitPromise; // not longer needed as resolved
						_expandButtonCreated.call(this, FormHelper.createButton(this.getId() + "--Exp", _handleExpButtonPress, this));
					}.bind(this));
				} else {
					_expandButtonCreated.call(this, FormHelper.createButton(this.getId() + "--Exp", _handleExpButtonPress, this));
				}
			} else {
				_setExpanderIcon.call(this);
			}
		}

	}

	function _expandButtonCreated(oButton) {

		if (!this._bIsBeingDestroyed) {
			this._oExpandButton = oButton;
			this.setAggregation("_expandButton", this._oExpandButton); // invalidate because this could happen after Form is already rendered
			_setExpanderIcon.call(this);
		}

	}

	function _expandedChanged(bExpanded){

		_setExpanderIcon.call(this);

		var oForm = this.getParent();
		if (oForm && oForm.toggleContainerExpanded) {
			oForm.toggleContainerExpanded(this);
		}

	}

	FormContainer.prototype.setToolbar = function(oToolbar) {

		const oOldToolbar = this.getToolbar();

		this.setAggregation("toolbar", oToolbar); // set Toolbar synchronously as later on only the design might be changed (set it first to check validity)

		// for sap.m.Toolbar Auto-design must be set to transparent
		if (this._oInitPromise) {
			// module needs to be loaded -> create Button async
			this._oInitPromise.then(function () {
				delete this._oInitPromise; // not longer needed as resolved
				oToolbar = FormHelper.setToolbar(oToolbar, oOldToolbar); // Toolbar is only changes, so no late set is needed.
			}.bind(this));
		} else {
			oToolbar = FormHelper.setToolbar(oToolbar, oOldToolbar);
		}

		return this;

	};

	/*
	 * If onAfterRendering of a field is processed the Form (layout) might need to change it.
	 */
	FormContainer.prototype.contentOnAfterRendering = function(oFormElement, oControl){

		// call function of parent (if assigned)
		var oParent = this.getParent();
		if (oParent && oParent.contentOnAfterRendering) {
			oParent.contentOnAfterRendering( oFormElement, oControl);
		}

	};

	/*
	 * If LayoutData changed on control this may need changes on the layout. So bubble to the form
	 */
	FormContainer.prototype.onLayoutDataChange = function(oEvent){

		// call function of parent (if assigned)
		var oParent = this.getParent();
		if (oParent && oParent.onLayoutDataChange) {
			oParent.onLayoutDataChange(oEvent);
		}

	};

	/*
	 * Checks if properties are fine
	 * Expander only visible if title is set -> otherwise give warning
	 * @return 0 = no problem, 1 = warning, 2 = error
	 * @private
	 */
	FormContainer.prototype._checkProperties = function(){

		var iReturn = 0;

		if (this.getExpandable() && (!this.getTitle() || this.getToolbar())) {
			Log.warning("Expander only displayed if title is set", this.getId(), "FormContainer");
			iReturn = 1;
		}

		return iReturn;

	};

	/**
	 * As Elements must not have a DOM reference it is not sure if one exists
	 * If the FormContainer has a DOM representation this function returns it,
	 * independent from the ID of this DOM element
	 * @return {Element|null} The Element's DOM representation or null
	 * @private
	 */
	FormContainer.prototype.getRenderedDomRef = function(){

		var that = this;
		var oForm = this.getParent();

		if (oForm && oForm.getContainerRenderedDomRef) {
			return oForm.getContainerRenderedDomRef(that);
		} else  {
			return null;
		}

	};

	/**
	 * As Elements must not have a DOM reference it is not sure if one exists
	 * If the FormElement has a DOM representation this function returns it,
	 * independent from the ID of this DOM element
	 * @param {sap.ui.layout.form.FormElement} oElement FormElement
	 * @return {Element|null} The Element's DOM representation or null
	 * @private
	 */
	FormContainer.prototype.getElementRenderedDomRef = function(oElement){

		var oForm = this.getParent();

		if (oForm && oForm.getElementRenderedDomRef) {
			return oForm.getElementRenderedDomRef(oElement);
		} else  {
			return null;
		}

	};

	/**
	 * Provides an array of all visible <code>FormElement</code> elements
	 * that are assigned to the <code>FormContainer</code>
	 * @return {sap.ui.layout.form.FormElement[]} Array of visible <code>FormElement</code>
	 * @private
	 */
	FormContainer.prototype.getVisibleFormElements = function() {

		var aElements = this.getFormElements();
		var aVisibleElements = [];
		for ( var i = 0; i < aElements.length; i++) {
			var oElement = aElements[i];
			if (oElement.isVisible()) {
				aVisibleElements.push(oElement);
			}
		}

		return aVisibleElements;

	};

	/**
	 * Sets the editable state of the <code>FormContainer</code>.
	 *
	 * This must only be called from the <code>Form</code>.
	 *
	 * Labels inside of a <code>Form</code> must be invalidated if <code>editable</code> changed on <code>Form</code>.
	 *
	 * @param {boolean} bEditable Editable state of the <code>Form</code>
	 * @protected
	 * @restricted sap.ui.layout.form.Form
	 * @since 1.74.0
	 */
	FormContainer.prototype._setEditable = function(bEditable) {

		var bOldEditable = this.getProperty("_editable");
		this.setProperty("_editable", bEditable, true); // do not invalidate whole FormContainer

		if (bEditable !== bOldEditable) {
			var aFormElements = this.getFormElements();

			for (var i = 0; i < aFormElements.length; i++) {
				var oFormElement = aFormElements[i];
				oFormElement._setEditable(bEditable);
			}
		}

	};

	/**
	 * Determines if the <code>FormContainer</code> is visible or not. Per default it
	 * just returns the value of the <code>visible</code> property.
	 * But this might be overwritten by inherited elements.
	 *
	 * For rendering by <code>FormLayouts</code> this function has to be used instead of
	 * <code>getVisible</code>.
	 *
	 * @returns {boolean} If true, the <code>FormContainer</code> is visible, otherwise not
	 * @public
	 */
	FormContainer.prototype.isVisible = function(){

		return this.getVisible();

	};

	FormContainer.prototype.onThemeChanged = function() {
		_setExpanderIcon.call(this);
	};

	function _getIconUrl(sParamName) {
		return Parameters.get({
			name: [sParamName],
			_restrictedParseUrls: true
		});
	}

	function _setExpanderIcon(){

		if (!this._oExpandButton) {
			return;
		}

		var sIcon, sIconHovered, sText, sTooltip;

		if (this.getExpanded()) {
			sIcon = _getIconUrl('_sap_ui_layout_Form_FormContainerColImageURL');
			sIconHovered = _getIconUrl('_sap_ui_layout_Form_FormContainerColImageDownURL');
			sText = "-";
			sTooltip = this._rb.getText("FORM_COLLAPSE");
		} else {
			sIcon = _getIconUrl('_sap_ui_layout_Form_FormContainerExpImageURL');
			sIconHovered = _getIconUrl('_sap_ui_layout_Form_FormContainerExpImageDownURL');
			sText = "+";
			sTooltip = this._rb.getText("FORM_EXPAND");
		}

		if (sIcon) {
			sText = "";
		}

		FormHelper.setButtonContent(this._oExpandButton, sText, sTooltip, sIcon, sIconHovered);

	}

	function _handleExpButtonPress(oEvent){

		this.setExpanded(!this.getExpanded());

	}

	/*
	 * handles change of FormContainer
	 * @private
	 */
	FormContainer.prototype._observeChanges = function(oChanges){

		if (oChanges.name == "formElements") {
			_formElementChanged.call(this, oChanges.mutation, oChanges.child);
		} else if (oChanges.name == "expanded") {
			_expandedChanged.call(this, oChanges.current);
		} else if (oChanges.name == "expandable") {
			_expandableChanged.call(this, oChanges.current);
		}

	};

	function _formElementChanged(sMutation, oFormElement) {

		if (sMutation === "insert") {
			var bEditable = this.getProperty("_editable");
			oFormElement._setEditable(bEditable);
		}

	}

	return FormContainer;

});