/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.Toolbar.
sap.ui.define([
	'./BarInPageEnabler',
	'./ToolbarLayoutData',
	'./ToolbarSpacer',
	'./library',
	'sap/ui/core/Control',
	'sap/ui/core/Element',
	'sap/ui/core/EnabledPropagator',
	"sap/ui/events/KeyCodes",
	'./ToolbarRenderer',
	"sap/m/Button",
	"sap/ui/thirdparty/jquery",
	"sap/ui/core/library"
],
function(
	BarInPageEnabler,
	ToolbarLayoutData,
	ToolbarSpacer,
	library,
	Control,
	Element,
	EnabledPropagator,
	KeyCodes,
	ToolbarRenderer,
	Button,
	jQuery,
	coreLibrary
) {
	"use strict";

	var ToolbarDesign = library.ToolbarDesign,
		ToolbarStyle = library.ToolbarStyle;

	var MIN_INTERACTIVE_CONTROLS = 2;

	/**
	 * Constructor for a new <code>Toolbar</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Horizontal container most commonly used to display buttons, labels, selects and various
	 * other input controls.
	 *
	 * <h3>Overview</h3>
	 *
	 * By default, the <code>Toolbar</code> items are shrinkable if they have percent-based width
	 * (for example, {@link sap.m.Input} and {@link sap.m.Slider}) or implement the
	 * {@link sap.ui.core.IShrinkable} interface (for example, {@link sap.m.Text} and {@link sap.m.Label}).
	 * This behavior can be overridden by providing {@link sap.m.ToolbarLayoutData} for the <code>Toolbar</code> items.
	 *
	 * <b>Note:</b> It is recommended that you use {@link sap.m.OverflowToolbar} over <code>sap.m.Toolbar</code>,
	 * unless you want to avoid the overflow behavior in favor of shrinking.
	 *
	 * <h3>Usage</h3>
	 *
	 * You can add a visual separator between the preceding and succeeding {@link sap.m.Toolbar} item
	 * with the use of the {@link sap.m.ToolbarSeparator}. The separator is theme dependent and can be
	 * a padding, a margin or a line.
	 *
	 * To add horizontal space between the <code>Toolbar</code> items, use the {@link sap.m.ToolbarSpacer}.
	 * You can define the width of the horizontal space or make it flexible to cover the remaining space
	 * between the <code>Toolbar</code> items (for example, to to push an item to the edge of the <code>Toolbar</code>.
	 *
	 * <b>Note:</b> The {@link sap.m.ToolbarSpacer} is a flex control that is intended to
	 * control its own behavior, thus {@link sap.m.ToolbarLayoutData} is not supported as value for the
	 * <code>layoutData</code> aggregation of {@link sap.m.ToolbarSpacer} and if set it's ignored.
	 *
	 * @see {@link fiori:https://experience.sap.com/fiori-design-web/toolbar-overview/ Toolbar}
	 *
	 * @extends sap.ui.core.Control
	 * @implements sap.ui.core.Toolbar,sap.m.IBar
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.16
	 * @alias sap.m.Toolbar
	 */
	var Toolbar = Control.extend("sap.m.Toolbar", /** @lends sap.m.Toolbar.prototype */ {
		metadata : {

			interfaces : [
				"sap.ui.core.Toolbar",
				"sap.m.IBar"
			],
			library : "sap.m",
			properties : {

				/**
				 * Defines the width of the control.
				 * By default, Toolbar is a block element. If the width is not explicitly set, the control will assume its natural size.
				 */
				width : {type : "sap.ui.core.CSSSize", group : "Appearance", defaultValue : null},

				/**
				 * Indicates that the whole toolbar is clickable. The Press event is fired only if Active is set to true.
				 * Note: This property should be used when there are no interactive controls inside the toolbar and the toolbar itself is meant to be interactive.
				 */
				active : {type : "boolean", group : "Behavior", defaultValue : false},

				/**
				 * Sets the enabled property of all controls defined in the content aggregation.
				 * Note: This property does not apply to the toolbar itself, but rather to its items.
				 */
				enabled : {type : "boolean", group : "Behavior", defaultValue : true},

				/**
				 * Defines the height of the control. By default, the <code>height</code>
				 * property depends on the used theme and the <code>design</code> property.
				 *
				 * <b>Note:</b> It is not recommended to use this property if the
				 * <code>sapMTBHeader-CTX</code> class is used
				 */
				height : {type : "sap.ui.core.CSSSize", group : "Appearance", defaultValue : ''},

				/**
				 * Defines the toolbar design.
				 *
				 * <b>Note:</b> Design settings are theme-dependent. They also determine the default height of the toolbar.
				 * @since 1.16.8
				 */
				design : {type : "sap.m.ToolbarDesign", group : "Appearance", defaultValue : ToolbarDesign.Auto},

				/**
				 * Defines the visual style of the <code>Toolbar</code>.
				 *
				 * <b>Note:</b> The visual styles are theme-dependent.
				 * @since 1.54
				 */
				style : {type : "sap.m.ToolbarStyle", group : "Appearance", defaultValue : ToolbarStyle.Standard},

				/**
				 * Defines the aria-haspopup attribute of the <code>Toolbar</code>. if the active <code>design</code> is true.
				 *
				 * <b>Guidance for choosing appropriate value:</b>
				 * <ul>
				 * <li> We recommend that you use the {@link sap.ui.core.aria.HasPopup} enumeration.</li>
				 * <li> If you use controls based on <code>sap.m.Popover</code> or <code>sap.m.Dialog</code>,
				 * then you must use <code>AriaHasPopup.Dialog</code> (both <code>sap.m.Popover</code> and
				 * <code>sap.m.Dialog</code> have role "dialog" assigned internally).</li>
				 * <li> If you use other controls, or directly <code>sap.ui.core.Popup</code>, you need to check
				 * the container role/type and map the value of <code>ariaHasPopup</code> accordingly.</li>
				 * </ul>
				 *
				 * @since 1.79.0
				 */
				ariaHasPopup : {type: "string", group : "Accessibility", defaultValue : null}
			},
			defaultAggregation : "content",
			aggregations : {

				/**
				 * The content of the toolbar.
				 */
				content : {type : "sap.ui.core.Control", multiple : true, singularName : "content"},

				/**
				 * Hidden button that provides focus dom reference for active toolbar.
				 * @private
				 */
				 _activeButton : {type : "sap.m.Button", multiple: false,  visibility: "hidden"}
			},
			associations : {

				/**
				 * Association to controls / ids which label this control (see WAI-ARIA attribute aria-labelledby).
				 */
				ariaLabelledBy : {type : "sap.ui.core.Control", multiple : true, singularName : "ariaLabelledBy"}
			},
			events : {

				/**
				 * Fired when the user clicks on the toolbar, if the Active property is set to "true".
				 */
				press : {
					parameters : {

						/**
						 * The toolbar item that was pressed
						 */
						srcControl : {type : "sap.ui.core.Control"}
					}
				}
			},
			designtime: "sap/m/designtime/Toolbar.designtime"
		},

		renderer: ToolbarRenderer
	});

	EnabledPropagator.call(Toolbar.prototype);

	// shrinkable class name
	Toolbar.shrinkClass = "sapMTBShrinkItem";

	/*
	 * Checks whether the given width is relative or not
	 *
	 * @static
	 * @protected
	 * @param {string} sWidth
	 * @return {boolean}
	 */
	Toolbar.isRelativeWidth = function(sWidth) {
		return /^([-+]?\d+%|auto|inherit|)$/i.test(sWidth);
	};

	/*
	 * Returns the original width(currently only control's width) via Control ID
	 * TODO: This function is not smart enough to detect DOM width changes
	 * But tracking width changes is also expensive
	 * (last and original width values must be keep in DOM and need update)
	 * For now we only support calling setWidth from the control
	 * And controls return correct width values even default value applied with CSS
	 *
	 * @static
	 * @protected
	 * @param {string} sId Control ID
	 * @return {string} width
	 */
	Toolbar.getOrigWidth = function(sId) {
		var oControl = Element.getElementById(sId);
		if (!oControl || !oControl.getWidth) {
			return "";
		}

		return oControl.getWidth();
	};

	/*
	 * Checks if the given control is shrinkable or not and marks according to second param
	 * Percent widths and text nodes(without fixed width) are shrinkable
	 * Controls that implement IShrinkable interface should shrink
	 * ToolbarSpacer is already shrinkable if it does not have fixed width
	 *
	 * @static
	 * @protected
	 * @param {sap.ui.core.Control} oControl UI5 Control
	 * @param {string} [sShrinkClass] Shrink item class name
	 * @returns {true|false|undefined|Object}
	 */
	Toolbar.checkShrinkable = function(oControl, sShrinkClass) {
		if (oControl.isA("sap.ui.core.HTML")) {
			return;
		}

		if (oControl instanceof ToolbarSpacer) {
			return this.isRelativeWidth(oControl.getWidth());
		}

		// remove old class
		sShrinkClass = sShrinkClass || this.shrinkClass;
		oControl.removeStyleClass(sShrinkClass);

		// ignore the controls has fixed width
		var sWidth = this.getOrigWidth(oControl.getId());
		if (!this.isRelativeWidth(sWidth)) {
			return;
		}

		// check shrinkable via layout data
		var oLayout = oControl.getLayoutData();
		if (oLayout instanceof ToolbarLayoutData) {
			return oLayout.getShrinkable() && oControl.addStyleClass(sShrinkClass);
		}

		// is percent item?
		// does implement shrinkable interface?
		if (sWidth.indexOf("%") > 0 ||
			oControl.getMetadata().isInstanceOf("sap.ui.core.IShrinkable")) {
			return oControl.addStyleClass(sShrinkClass);
		}

		// is text element?
		var oDomRef = oControl.getDomRef();
		if (oDomRef && (oDomRef.firstChild || {}).nodeType == 3) {
			return oControl.addStyleClass(sShrinkClass);
		}
	};

	 /**
	 * Sets the accessibility enablement
	 * @param {string} bEnabled
	 * @returns {sap.m.IBar} this for chaining
	 * @private
	 */
	Toolbar.prototype._setEnableAccessibilty = function (bEnabled) {
		var bFastGroupValue = bEnabled ? "true" : "false",
			sRoleValue = bEnabled ? "toolbar" : "none";

		this.data("sap-ui-fastnavgroup", bFastGroupValue, bEnabled);
		this._setRootAccessibilityRole(sRoleValue);

		return this;
	};

	Toolbar.prototype.enhanceAccessibilityState = function (oElement, mAriaProps) {
		if (oElement === this.getAggregation("_activeButton")) {
			return this.assignAccessibilityState(mAriaProps);
		}
	};

	Toolbar.prototype.getAccessibilityState = function () {
		var aAriaLabelledBy = this.getAriaLabelledBy(),
			bActive = this.getActive();

		return {
			role: !bActive ? this._getAccessibilityRole() : undefined, // active toolbar is rendered with sap.m.Button as native button
			haspopup: bActive ? this.getAriaHasPopup() : undefined,
			labelledby: aAriaLabelledBy.length ? this.getAriaLabelledBy() : this.getTitleId()
		};
	};

	Toolbar.prototype.assignAccessibilityState = function (mAriaProps) {
			if (!this._getAccessibilityRole() && !this.getActive()) {
				// no role and not active -> no aria properties
				return {};
			}

			return Object.assign(mAriaProps, this.getAccessibilityState(mAriaProps));
	};

	Toolbar.prototype.init = function() {
		// define group for F6 handling
		this.data("sap-ui-fastnavgroup", "true", true);

		// content delegate reference
		this._oContentDelegate = {
			onAfterRendering: this._onAfterContentRendering
		};

		this._handleKeyNavigationBound =  this._handleKeyNavigation.bind(this);

	};

	Toolbar.prototype.onAfterRendering = function() {
		this._checkContents();

		//Attach event listened needed for the arrow key navigation
		if (this.getDomRef()) {
			this.getDomRef().removeEventListener("keydown", this._handleKeyNavigationBound);
			this.getDomRef().addEventListener("keydown", this._handleKeyNavigationBound);
		}
	};

	Toolbar.prototype._handleKeyNavigation = function(oEvent) {
		const focusedElement = document.activeElement;
		const toolbarDom = this.getDomRef();
		if (toolbarDom.contains(focusedElement)) {
			if (oEvent.keyCode === KeyCodes.ARROW_RIGHT || oEvent.keyCode === KeyCodes.ARROW_DOWN) {
				this._moveFocus("forward", oEvent);
			} else if (oEvent.keyCode === KeyCodes.ARROW_LEFT || oEvent.keyCode === KeyCodes.ARROW_UP) {
				this._moveFocus("backward", oEvent);
			}
		}
	};

	/**
	 * A custom function to get the active element in the document
	 * without relying on jQuery.is(":focus") selector check
	 * @static
	 * @returns {sap.ui.core.Element|undefined}
	 */
	Toolbar._getActiveElement = () => {
		try {
			var $Act = jQuery(document.activeElement);

			return Element.closestTo($Act[0]);
		} catch (err) {
			//escape eslint check for empty block
		}
	};

	/**
	 * Try to find the parent of the active element assuming it is a child of the toolbar.
	 * If the active element is not a child of the toolbar, return original active element
	 * (in cases like associative toolbar)
	 * @param {sap.ui.core.Element} oActiveElement
	 * @returns {sap.ui.core.Element}
	 */
	Toolbar.prototype._getParent = function(oActiveElement) {
		var originalActiveElement = oActiveElement;

		while (oActiveElement && oActiveElement.getParent() !== this) {
			oActiveElement = oActiveElement.getParent();
		}

		return oActiveElement || originalActiveElement;
	};

	Toolbar.prototype._moveFocus = function(sDirection, oEvent) {
		var aFocusableElements = this._getToolbarInteractiveControls(),
			oActiveElement = Toolbar._getActiveElement(),
			oActiveDomElement = document.activeElement;

		oActiveElement = this._getParent(oActiveElement);

		var iCurrentIndex = aFocusableElements.indexOf(oActiveElement),
			iNextIndex = this._calculateNextIndex(sDirection, iCurrentIndex, aFocusableElements.length),
			bIsFirst = this._isFirst(sDirection, iCurrentIndex),
			bIsLast = this._isLast(sDirection, iCurrentIndex, aFocusableElements);

			if (this._shouldAllowDefaultBehavior(oActiveElement, oEvent)) {
				return;
			}

		// Handle specific behaviour for the input based controls
		if (this._isInputBasedControl(oActiveDomElement, oActiveElement, oEvent)) {
            var bIsAtStart = oActiveDomElement.selectionStart === 0,
                bIsAtEnd = oActiveDomElement.selectionStart === oActiveDomElement.value.length,
                bTextSelected = oActiveDomElement.selectionStart !== oActiveDomElement.selectionEnd;

            if (bTextSelected || (sDirection === "forward" && !bIsAtEnd) || (sDirection === "backward" && !bIsAtStart)) {
                return;
            }
		}

		if (aFocusableElements[iNextIndex] && !bIsFirst && !bIsLast) {
			this._focusElement(aFocusableElements[iNextIndex], oEvent);
		}
	};

	Toolbar.prototype._isInputBasedControl = function(oActiveDomElement) {
		return oActiveDomElement.tagName === "INPUT" && !oActiveDomElement.readOnly;
	};

	Toolbar.prototype._isFirst = function(sDirection, iCurrentIndex) {
		return (iCurrentIndex === 0) && (sDirection === "backward" || sDirection === "up");
	};

	Toolbar.prototype._isLast = function(sDirection, iCurrentIndex, aFocusableElements) {
		return (iCurrentIndex === aFocusableElements.length - 1) && (sDirection === "forward" || sDirection === "down");
	};

	Toolbar.prototype._shouldAllowDefaultBehavior = function(oActiveElement, oEvent) {
		if (!oActiveElement) {
			return false;
		}
		var sActiveElementName = oActiveElement.getMetadata().getName(),
			bIsSelectOrCombobox = ["sap.m.Select", "sap.m.ComboBox"].includes(sActiveElementName),
			bIsUpOrDownArrowKey = [KeyCodes.ARROW_UP, KeyCodes.ARROW_DOWN].includes(oEvent.keyCode),
			bIsBreadcrumbs = sActiveElementName === "sap.m.Breadcrumbs",
			bIsSlider = ["sap.m.Slider", "sap.m.RangeSlider"].includes(sActiveElementName);

		if (bIsUpOrDownArrowKey && bIsSelectOrCombobox || bIsBreadcrumbs || bIsSlider) {
			return true;
		}

		// If the control does not have its own navigation or the conditions are not met, return false
		return false;
	};

	Toolbar.prototype._calculateNextIndex = function(sDirection, iCurrentIndex, length) {
		if (sDirection === "forward") {
			return (iCurrentIndex + 1) % length;
		}

		return (iCurrentIndex - 1 + length) % length;
	};

	Toolbar.prototype._focusElement = function(element, oEvent) {
		element.focus();

		if (document.activeElement.tagName === 'INPUT') {
			document.activeElement.select(); // Optionally select text in input field
		}

		// Prevent the default behavior to avoid any further automatic focus movement
		oEvent.preventDefault();
	};

	Toolbar.prototype.onLayoutDataChange = function() {
		this.invalidate();
	};

	Toolbar.prototype.addContent = function(oControl) {
		this.addAggregation("content", oControl);
		this._onContentInserted(oControl);
		return this;
	};

	Toolbar.prototype.insertContent = function(oControl, iIndex) {
		this.insertAggregation("content", oControl, iIndex);
		this._onContentInserted(oControl);
		return this;
	};

	Toolbar.prototype.removeContent = function(vContent) {
		vContent = this.removeAggregation("content", vContent);
		this._onContentRemoved(vContent);
		return vContent;
	};

	Toolbar.prototype.removeAllContent = function() {
		var aContents = this.removeAllAggregation("content") || [];
		aContents.forEach(this._onContentRemoved, this);
		return aContents;
	};

	// handle tap for active toolbar, do nothing if already handled
	Toolbar.prototype.ontap = function(oEvent) {
		if (this.getActive() && !oEvent.isMarked() || oEvent.srcControl === this._activeButton) {
			oEvent.setMarked();
			this.firePress({
				srcControl : oEvent.srcControl
			});
			this.focus({preventScroll: true});
		}
	};

	// fire press event when enter is hit on the active toolbar
	Toolbar.prototype.onsapenter = function(oEvent) {
		if (this.getActive() && !oEvent.isMarked() || oEvent.srcControl === this._activeButton) {
			oEvent.setMarked();
			this.firePress({
				srcControl : this
			});
		}
	};

	Toolbar.prototype.onsapspace = function(oEvent) {
		// Prevent browser scrolling in case of SPACE key
		if ((!this.getActive() && oEvent.isMarked()) || oEvent.srcControl === this._activeButton) {
			oEvent.preventDefault();
		}
	};

	Toolbar.prototype.onkeyup = function(oEvent){
		if (oEvent.which === KeyCodes.SPACE) {
			this.onsapenter(oEvent);
		}
	};

	// mark to inform active handling is done by toolbar
	Toolbar.prototype.ontouchstart = function(oEvent) {
		this.getActive() && oEvent.setMarked();
	};

	// mark shrinkable contents and render layout data
	// returns shrinkable and flexible content count
	Toolbar.prototype._checkContents = function() {
		this.getContent().forEach(function(oControl) {
			Toolbar.checkShrinkable(oControl);
		});
	};

	// gets called when new control is inserted into content aggregation
	Toolbar.prototype._onContentInserted = function(oControl) {
		if (oControl) {
			oControl.attachEvent("_change", this._onContentPropertyChanged, this);
			oControl.addEventDelegate(this._oContentDelegate, oControl);
		}
	};

	// gets called when a control is removed from content aggregation
	Toolbar.prototype._onContentRemoved = function(oControl) {
		if (oControl) {
			oControl.detachEvent("_change", this._onContentPropertyChanged, this);
			oControl.removeEventDelegate(this._oContentDelegate, oControl);
		}
	};

	Toolbar.prototype.onfocusin = function(oEvent) {
		if (this.getActive()) {
			if (oEvent.target === this.getDomRef()) {
				this._getActiveButton().focus();
			}
		}
	};

	Toolbar.prototype.getFocusDomRef = function() {
		return this.getActive() ? this._getActiveButton().getFocusDomRef() : this.getDomRef();
	};

	Toolbar.prototype.getFocusInfo = function() {
		return {
			id: this._getActiveButton().getId()
		};
	};

	Toolbar.prototype.applyFocusInfo = function(oFocusInfo) {
		var oDomRef = this.getFocusDomRef();
		if (oDomRef) {
			this.focus();
		}
	};

	// gets called after content is (re)rendered
	// here "this" points to the control not to the toolbar
	Toolbar.prototype._onAfterContentRendering = function() {
		var oLayout = this.getLayoutData();
		if (oLayout instanceof ToolbarLayoutData) {
			oLayout.applyProperties();
		}
	};

	// gets called when any content property is changed
	Toolbar.prototype._onContentPropertyChanged = function(oEvent) {
		var oPropName = oEvent.getParameter("name");

		if (oPropName === "visible") {
			this.invalidate();
		}

		if (oPropName != "width") {
			return;
		}

		// check and mark percent widths
		var oControl = oEvent.getSource();
		var bPercent = oControl.getWidth().indexOf("%") > 0;
		oControl.toggleStyleClass(Toolbar.shrinkClass, bPercent);
	};

	Toolbar.prototype._getAccessibilityRole = function () {
		var sRootAccessibilityRole = this._getRootAccessibilityRole(),
			sRole = sRootAccessibilityRole;

		if (this.getActive()) {
			sRole = "button";
		// Custom root accessibility roles (like 'heading' for Dialog and 'group' for FacetFilter are preserved).
		// Also when accessibility is disabled, role "none" is preserved.
		} else if (this._getToolbarInteractiveControlsCount() < MIN_INTERACTIVE_CONTROLS && sRootAccessibilityRole === "toolbar") {
			sRole = "";
		}

		return sRole;
	};

	/**
	 *
	 * @returns {number} Toolbar interactive Controls count
	 * @private
	 */
	Toolbar.prototype._getToolbarInteractiveControlsCount = function () {
		return this._getToolbarInteractiveControls().length;
	};

	/**
	 *
	 * @returns {Array} Toolbar interactive Controls
	 * @private
	 */

	Toolbar.prototype._getToolbarInteractiveControls = function () {
		return this.getContent().filter(function (oControl) {
			return oControl.getVisible()
				&& oControl.isA("sap.m.IToolbarInteractiveControl")
				&& typeof (oControl._getToolbarInteractive) === "function" && oControl._getToolbarInteractive();
		});
	};

	Toolbar.prototype._getActiveButton = function() {
		if (!this._activeButton) {
			this._activeButton = new Button({text: "", id:"sapMTBActiveButton" + this.getId()}).addStyleClass("sapMTBActiveButton");
			this._activeButton.onfocusin = function() {
				this.addStyleClass("sapMTBFocused");
				if (typeof Button.prototype.onfocusin === "function") {
					 Button.prototype.onfocusin.call(this._activeButton, arguments);
				}
			}.bind(this);

			this._activeButton.onfocusout = function() {
				this.removeStyleClass("sapMTBFocused");
				if (typeof Button.prototype.onfocusout === "function") {
					Button.prototype.onfocusout.call(this._activeButton, arguments);
			   }
			}.bind(this);

			this.setAggregation("_activeButton", this._activeButton);
		}

		return this._activeButton;
	};

	Toolbar.prototype.getAccessibilityInfo = function () {
		return {
			children: this.getContent()
		};
	};

	/*
	 * Augment design property setter.
	 * 2nd parameter can be used to define auto design context.
	 * Note: When the second parameter is used, Toolbar does not rerender. This should be done by the setter.
	 *
	 * @param {sap.m.ToolbarDesign} sDesign The design for the Toolbar.
	 * @param {boolean} [bSetAutoDesign] Determines auto design context
	 * @returns {this}
	 */
	Toolbar.prototype.setDesign = function(sDesign, bSetAutoDesign) {
		if (!bSetAutoDesign) {
			return this.setProperty("design", sDesign);
		}

		this._sAutoDesign = this.validateProperty("design", sDesign);
		return this;
	};

	/**
	 * Returns the currently applied design property of the Toolbar.
	 *
	 * @returns {sap.m.ToolbarDesign} The <code>sap.m.ToolbarDesign</code> instance
	 */
	Toolbar.prototype.getActiveDesign = function() {
		var sDesign = this.getDesign();
		if (sDesign != ToolbarDesign.Auto) {
			return sDesign;
		}

		return this._sAutoDesign || sDesign;
	};

	/**
	 * Returns the first sap.m.Title control instance inside the toolbar for the accessibility
	 *
	 * @returns {sap.m.Title|undefined} The <code>sap.m.Title</code> instance or undefined
	 * @since 1.44
	 * @protected
	 */
	Toolbar.prototype.getTitleControl = function() {
		var Title = sap.ui.require("sap/m/Title");
		if (!Title) {
			return;
		}

		var aContent = this.getContent();
		for (var i = 0; i < aContent.length; i++) {
			var oContent = aContent[i];
			if (oContent instanceof Title && oContent.getVisible()) {
				return oContent;
			}
		}
	};

	/**
	 * Returns the first sap.m.Title control id inside the toolbar for the accessibility
	 *
	 * @returns {sap.ui.core.ID} The <code>sap.m.Title</code> ID
	 * @since 1.28
	 * @protected
	 */
	Toolbar.prototype.getTitleId = function() {
		var oTitle = this.getTitleControl();
		return oTitle ? oTitle.getId() : "";
	};

	///////////////////////////
	// Bar in page delegation
	///////////////////////////
	/**
	 * Returns if the bar is sensitive to the container context. Implementation of the IBar interface
	 * @returns {boolean} isContextSensitive
	 * @protected
	 * @function
	 */
	Toolbar.prototype.isContextSensitive = BarInPageEnabler.prototype.isContextSensitive;

	/**
	 * Sets the HTML tag of the root domref
	 * @param {string} sTag
	 * @returns {sap.m.IBar} this for chaining
	 * @protected
	 * @function
	 */
	Toolbar.prototype.setHTMLTag = BarInPageEnabler.prototype.setHTMLTag;

	/**
	 * Gets the HTML tag of the root domref
	 * @returns {string} the HTML-tag
	 * @protected
	 * @function
	 */
	Toolbar.prototype.getHTMLTag = BarInPageEnabler.prototype.getHTMLTag;

	/**
	 * Sets classes and HTML tag according to the context of the page. Possible contexts are header, footer, subheader
	 * @returns {sap.m.IBar} <code>this</code> for chaining
	 * @protected
	 * @function
	 */
	Toolbar.prototype.applyTagAndContextClassFor = BarInPageEnabler.prototype.applyTagAndContextClassFor;

	/**
	 * Sets classes according to the context of the page. Possible contexts are header, footer and subheader.
	 * @returns {sap.m.IBar} <code>this</code> for chaining
	 * @protected
	 * @function
	 */
	Toolbar.prototype._applyContextClassFor  = BarInPageEnabler.prototype._applyContextClassFor;

	/**
	 * Sets HTML tag according to the context of the page. Possible contexts are header, footer and subheader.
	 * @returns {sap.m.IBar} <code>this</code> for chaining
	 * @protected
	 * @function
	 */
	Toolbar.prototype._applyTag  = BarInPageEnabler.prototype._applyTag;

	/**
	 * Get context options of the Page.
	 *
	 * Possible contexts are header, footer, subheader.
	 * @param {string} sContext allowed values are header, footer, subheader.
	 * @returns {object|null}
	 * @private
	 */
	Toolbar.prototype._getContextOptions  = BarInPageEnabler.prototype._getContextOptions;

	/**
	 * Sets accessibility role of the Root HTML element.
	 *
	 * @param {string} sRole AccessibilityRole of the root Element
	 * @returns {sap.m.IBar} <code>this</code> to allow method chaining
	 * @private
	 */
	Toolbar.prototype._setRootAccessibilityRole = BarInPageEnabler.prototype._setRootAccessibilityRole;

	/**
	 * Gets accessibility role of the Root HTML element.
	 *
	 * @returns {string} Accessibility role
	 * @private
	 */
	Toolbar.prototype._getRootAccessibilityRole = BarInPageEnabler.prototype._getRootAccessibilityRole;


    /**
     * Sets accessibility aria-level attribute of the Root HTML element.
     *
     * This is only needed if <code>sap.m.Bar</code> has role="heading"
     * @param {string} sLevel aria-level attribute of the root Element
     * @returns {sap.m.IBar} <code>this</code> to allow method chaining
     * @private
     */
    Toolbar.prototype._setRootAriaLevel = BarInPageEnabler.prototype._setRootAriaLevel;

    /**
     * Gets accessibility aria-level attribute of the Root HTML element.
     *
     * This is only needed if <code>sap.m.Bar</code> has role="heading"
     * @returns {string} aria-level
     * @private
     */
    Toolbar.prototype._getRootAriaLevel = BarInPageEnabler.prototype._getRootAriaLevel;

	return Toolbar;

});
