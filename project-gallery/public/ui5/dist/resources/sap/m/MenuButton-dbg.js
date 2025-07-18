/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.MenuButton.
sap.ui.define([
	'./library',
	'sap/ui/core/Control',
	'./Button',
	'./SplitButton',
	'sap/ui/Device',
	"sap/ui/core/Element",
	'sap/ui/core/EnabledPropagator',
	'sap/ui/core/library',
	'sap/ui/core/Popup',
	'sap/ui/core/LabelEnablement',
	"./MenuButtonRenderer",
	"sap/ui/events/KeyCodes"
], function(
	library,
	Control,
	Button,
	SplitButton,
	Device,
	Element,
	EnabledPropagator,
	coreLibrary,
	Popup,
	LabelEnablement,
	MenuButtonRenderer,
	KeyCodes
) {
		"use strict";

		// Shortcut for sap.m.MenuButtonMode
		var MenuButtonMode = library.MenuButtonMode;

		// Shortcut for sap.ui.core.TextDirection
		var TextDirection = coreLibrary.TextDirection;

		// Shortcut for sap.m.ButtonType
		var ButtonType = library.ButtonType;

		// Shortcut for sap.ui.core.Popup.Dock
		var Dock = Popup.Dock;

		// Properties which shouldn't be applied on inner Button or SplitButton control since they don't have such properties
		var aNoneForwardableProps = ["buttonMode", "useDefaultActionOnly", "width", "menuPosition"];

		/**
		 * Constructor for a new MenuButton.
		 *
		 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
		 * @param {object} [mSettings] Initial settings for the new control
		 *
		 * @class
		 * The <code>sap.m.MenuButton</code> control enables the user to show a hierarchical menu.
		 * @extends sap.ui.core.Control
		 *
		 * @author SAP SE
		 * @version 1.138.0
		 *
		 * @constructor
		 * @public
		 * @alias sap.m.MenuButton
		 * @see {@link fiori:https://experience.sap.com/fiori-design-web/menu-button/ Menu Button}
		 */
		var MenuButton = Control.extend("sap.m.MenuButton", /** @lends sap.m.MenuButton.prototype */ {
			metadata : {
				interfaces : [
					"sap.m.IToolbarInteractiveControl"
				],
				library : "sap.m",
				properties : {
					/**
					 * Defines the text of the <code>MenuButton</code>.
					 * <br/><b>Note:</b> In <code>Split</code> <code>buttonMode</code> with <code>useDefaultActionOnly</code>
					 * set to <code>false</code>, the text is changed to display the last selected item's text,
					 * while in <code>Regular</code> <code>buttonMode</code> the text stays unchanged.
					 */
					text : {type : "string", group : "Misc", defaultValue : null},

					/**
					 * Defines the type of the <code>MenuButton</code> (for example, Default, Accept, Reject, Back, etc.)
					 *
					 * <b>Note:</b> Not all existing types are valid for the control. See {@link sap.m.ButtonType}
					 * documentation.
					 */
					type : {type : "sap.m.ButtonType", group : "Appearance", defaultValue : ButtonType.Default},

					/**
					 * Defines the width of the <code>MenuButton</code>.
					 */
					width : {type : "sap.ui.core.CSSSize", group : "Misc", defaultValue : null},

					/**
					 * Boolean property to enable the control (default is <code>true</code>).
					 * <br/><b>Note:</b> Depending on custom settings, the buttons that are disabled have other colors than the enabled ones.
					 */
					enabled : {type : "boolean", group : "Behavior", defaultValue : true},

					/**
					 * Defines the icon to be displayed as a graphical element within the button.
					 * It can be an image or an icon from the icon font.
					 *
					 * Note: If only an icon (without text) is provided when <code>buttonMode</code> is set to <code>Split</code>,
					 * please provide icons for all menu items. Otherwise the action button will be displayed with no icon or text
					 * after item selection since there is not enough space for a text.
					 */
					icon : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null},

					/**
					 * The source property of an alternative icon for the active (pressed) state of the button.
					 * Both active and default icon properties should be defined and of the same type - image or icon font.
					 * If the <code>icon</code> property is not set or has a different type, the active icon is not displayed.
					 */
					activeIcon : {type : "sap.ui.core.URI", group : "Misc", defaultValue : null},

					/**
					 * When set to <code>true</code> (default), one or more requests are sent trying to get the
					 * density perfect version of image if this version of image doesn't exist on the server.
					 * If only one version of image is provided, set this value to <code>false</code> to
					 * avoid the attempt of fetching density perfect image.
					 */
					iconDensityAware : {type : "boolean", group : "Misc", defaultValue : true},

					/**
					 * Specifies the element's text directionality with enumerated options.
					 * By default, the control inherits text direction from the DOM.
					 */
					textDirection : {type : "sap.ui.core.TextDirection", group : "Appearance", defaultValue : TextDirection.Inherit},

					/**
					 * Defines whether the <code>MenuButton</code> is set to <code>Regular</code> or <code>Split</code> mode.
					 */
					buttonMode : { type : "sap.m.MenuButtonMode", group : "Misc", defaultValue : MenuButtonMode.Regular },

					/**
					 * Specifies the position of the popup menu with enumerated options.
					 * By default, the control opens the menu at its bottom left side.
					 *
					 * <b>Note:</b> In the case that the menu has no space to show itself in the view port
					 * of the current window it tries to open itself to
					 * the inverted direction.
					 *
					 * @since 1.56.0
					 */
					menuPosition : {type : "sap.ui.core.Popup.Dock", group : "Misc", defaultValue : Dock.BeginBottom},

					/**
					 * Controls whether the default action handler is invoked always or it is invoked only until a menu item is selected.
					 * Usable only if <code>buttonMode</code> is set to <code>Split</code>.
					 */
					useDefaultActionOnly : { type : "boolean", group : "Behavior", defaultValue: false }
				},
				aggregations: {
					/**
					 * Defines the menu that opens for this button.
					 */
					menu: { type: "sap.m.Menu", multiple: false, singularName: "menu" },

					/**
					 * Internal aggregation that contains the button part.
					 */
					_button: { type: "sap.ui.core.Control", multiple: false, visibility: "hidden" }
				},
				associations : {

					/**
					 * Association to controls / ids which describe this control (see WAI-ARIA attribute aria-describedby).
					 */
					ariaDescribedBy: {type: "sap.ui.core.Control", multiple: true, singularName: "ariaDescribedBy"},

					/**
					 * Association to controls / ids which label this control (see WAI-ARIA attribute aria-labelledby).
					 */
					ariaLabelledBy: {type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy"}
				},
				events: {
					/**
					 * Fired when the <code>buttonMode</code> is set to <code>Split</code> and the user presses the main button
					 * unless <code>useDefaultActionOnly</code> is set to <code>false</code> and another action
					 * from the menu has been selected previously.
					 */
					defaultAction: {},

					/**
					 * In <code>Regular</code> button mode – fires when the user presses the button.
					 * Alternatively, if the <code>buttonMode</code> is set to <code>Split</code> - fires when the user presses the arrow button.
					 *
					 * @since 1.94.0
					 */
					beforeMenuOpen: {}
				},
				defaultAggregation : "menu",
				designtime: "sap/m/designtime/MenuButton.designtime",
				dnd: { draggable: true, droppable: false }
			},

			renderer: MenuButtonRenderer
		});

		EnabledPropagator.call(MenuButton.prototype);

		/**
		 * Initializes the control.
		 * @public
		 */
		MenuButton.prototype.init = function() {
			this._initButtonControl();
		};

		/**
		 * Called from parent if the control is destroyed.
		 * @private
		 */
		MenuButton.prototype.exit = function() {
			if (this._sDefaultText) {
				this._sDefaultText = null;
			}
			if (this._sDefaultIcon) {
				this._sDefaultIcon = null;
			}
			if (this._lastActionItemId) {
				this._lastActionItemId = null;
			}

			if (this.getMenu()) {
				this.getMenu().detachClosed(this._menuClosed, this);
			}
		};

		MenuButton.prototype.onBeforeRendering = function() {
			if (!this._sDefaultText) {
				this._sDefaultText = this.getText();
			}
			if (!this._sDefaultIcon) {
				this._sDefaultIcon = this.getIcon();
			}

			this._updateButtonControl();
			this._attachMenuEvents();

		};

		/**
		 * Gets the text button control DOM Element.
		 * @returns {Element} The Element's DOM Element
		 * @private
		 */
		MenuButton.prototype._getTextBtnContentDomRef = function() {
			return this._getButtonControl()._getTextButton().getDomRef("content");
		};

		MenuButton.prototype.onAfterRendering = function() {
			if (this._activeButton) {
				this._activeButton.$().attr("aria-expanded", "false");
				this._activeButton = null;
			}
		};

		/**
		 * Sets the <code>buttonMode</code> of the control.
		 * @param {sap.m.MenuButtonMode} sMode The new button mode
		 * @returns {this} This instance
		 * @public
		 */
		MenuButton.prototype.setButtonMode = function(sMode) {
			var sTooltip = this.getTooltip(),
				oButtonControl,
				oButtonProperties;

			Control.prototype.setProperty.call(this, "buttonMode", sMode, true);
			this._getButtonControl().destroy();
			this._initButtonControl();

			oButtonControl = this._getButtonControl();
			oButtonProperties = oButtonControl.getMetadata().getAllProperties();

			//update all properties
			for (var key in this.mProperties) {
				if (this.mProperties.hasOwnProperty(key) && aNoneForwardableProps.indexOf(key) < 0 && oButtonProperties.hasOwnProperty(key)) {
					oButtonControl.setProperty(key, this.mProperties[key], true);
				}
			}
			//and tooltip aggregation
			if (sTooltip) {
				oButtonControl.setTooltip(sTooltip);
			}

			//update the text only
			if (!this._isSplitButton() && this._sDefaultText) {
				this.setText(this._sDefaultText);
			} else if (!this.getUseDefaultActionOnly() && this._getLastSelectedItem()) {
				this.setText(Element.getElementById(this._getLastSelectedItem()).getText());
			}

			if (!this._isSplitButton() && this._sDefaultIcon) {
				this.setIcon(this._sDefaultIcon);
			} else if (!this.getUseDefaultActionOnly() && this._getLastSelectedItem()) {
				this.setIcon(Element.getElementById(this._getLastSelectedItem()).getIcon());
			}

			this.invalidate();

			return this;
		};

		/**
		 * Creates the button part of a <code>MenuButton</code> in regular mode.
		 * @returns {object} The created <code>Button</code>
		 * @private
		 */
		MenuButton.prototype._initButton = function() {
			var oBtn = new Button(this.getId() + "-internalBtn", {
				width: "100%",
				ariaHasPopup: coreLibrary.aria.HasPopup.Menu
			});
			oBtn.attachPress(this._handleButtonPress, this);
			oBtn.onkeydown = this.handleKeydown;
			return oBtn;
		};

		/**
		 * Creates the button part of a <code>MenuButton</code> in split mode.
		 * @returns {object} The created <code>SplitButton</code>
		 * @private
		 */
		MenuButton.prototype._initSplitButton = function() {
			var oBtn = new SplitButton(this.getId() + "-internalSplitBtn", {
				width: "100%"
			});
			oBtn.attachPress(this._handleActionPress, this);
			oBtn.attachArrowPress(this._handleButtonPress, this);
			oBtn._getArrowButton().onkeydown = this.handleKeydown;
			return oBtn;
		};

		/**
		 * Creates the button part of a <code>MenuButton</code>.
		 * @private
		 */
		MenuButton.prototype._initButtonControl = function() {
			var oBtn;

			if (this._isSplitButton()) {
				oBtn = this._initSplitButton();
			} else {
				oBtn = this._initButton();
			}

			this.setAggregation("_button", oBtn, true);
		};

		MenuButton.prototype._updateButtonControl = function() {
			this._getButtonControl().setText(this.getText());
		};

		/**
		 * Gets the button part of a <code>MenuButton</code>.
		 * @private
		 * @returns {sap.m.Button | sap.m.SplitButton} the Button control
		 */
		MenuButton.prototype._getButtonControl = function() {
			return this.getAggregation("_button");
		};

		/**
		 * Handles the <code>buttonPress</code> event and opens the menu.
		 * @param {boolean} oEvent event object
		 * @private
		 */
		MenuButton.prototype._handleButtonPress = function(oEvent) {
			var oMenu = this.getMenu();

			this.fireBeforeMenuOpen();

			if (!oMenu) {
				return;
			}

			if (oMenu.isOpen() && !oEvent.getParameter("keyboard")) {
				oMenu.close();
				this._bPopupOpen = false;
				return;
			}

			if (!oMenu.getTitle()) {
				oMenu.setTitle(this.getText());
			}

			var aParam = [this, oEvent.getParameter("keyboard")];

			// adjust the positioning of the Menu Popover to align with MenuButton, because of padding around inner button
			var oPopover = oMenu._getPopover();

			oPopover && oPopover.setOffsetX(1).setOffsetY(-3);

			oMenu.openBy.apply(oMenu, aParam);

			if (this.getMenu()) {
				this._bPopupOpen = true;
			}

			this._writeAriaAttributes();

			if (this._isSplitButton() && !Device.system.phone) {
				this._getButtonControl().setArrowState(true);
			}
		};

		MenuButton.prototype._handleActionPress = function() {
			var sLastSelectedItemId = this._getLastSelectedItem(),
				oLastSelectedItem;
			if (!this.getUseDefaultActionOnly() && sLastSelectedItemId) {
				oLastSelectedItem = Element.getElementById(sLastSelectedItemId);
				this.getMenu().fireItemSelected({ item: oLastSelectedItem });
			} else {
				this.fireDefaultAction();
			}
		};

		MenuButton.prototype._menuClosed = function() {
			var oButtonControl = this._getButtonControl(),
				bOpeningMenuButton = oButtonControl,
				oMenu = this.getMenu(),
				oPopover = oMenu && oMenu._getPopover();

			if (this._isSplitButton()) {
				oButtonControl.setArrowState(false);
				bOpeningMenuButton = oButtonControl._getArrowButton();
			}

			if (oPopover && !oPopover.isOpen()) {
				this._bPopupOpen = false;
			}

			bOpeningMenuButton.$().removeAttr("aria-controls");
			bOpeningMenuButton.$().attr("aria-expanded", "false");
		};

		MenuButton.prototype._menuItemSelected = function(oEvent) {
			var oMenuItem = oEvent.getParameter("item");

			this.fireEvent("_menuItemSelected", { item: oMenuItem }); // needed for controls that listen to interaction events from within the control (e.g. for sap.m.OverflowToolbar)
			this._bPopupOpen = false;

			if (
				!this._isSplitButton() ||
				this.getUseDefaultActionOnly() ||
				!oMenuItem
			) {
				return;
			}

			this._lastActionItemId = oMenuItem.getId();
			!!this._sDefaultText && this.setText(oMenuItem.getText());
			!!this._sDefaultIcon && this.setIcon(oMenuItem.getIcon());
		};

		/**
		 * Gets the last selected menu item, which can be used
		 * to trigger the same default action on <code>MenuItem</code> press.
		 * @returns {string} The last selected item's ID
		 * @private
		 */
		MenuButton.prototype._getLastSelectedItem = function() {
			return this._lastActionItemId;
		};

		MenuButton.prototype._attachMenuEvents = function() {
			if (this.getMenu()) {
				this.getMenu().attachClosed(this._menuClosed, this);
				this.getMenu().attachItemSelected(this._menuItemSelected, this);
			}
		};

		MenuButton.prototype._isSplitButton = function() {
			return this.getButtonMode() === MenuButtonMode.Split;
		};

		/**
		 * Overriding the setProperty method in order to keep in sync internal aggregations properties.
		 * @override
		 * @param {string} sPropertyName The name of the property being changed
		 * @param {object} vValue The new value
		 * @param {boolean} bSuppressInvalidate Flag indicating of re-rendering should be suppressed
		 * @returns {object} this Instance for chaining.
		 */
		MenuButton.prototype.setProperty = function(sPropertyName, vValue, bSuppressInvalidate) {
			// Several button type property values are not allowed
			function isForbiddenType(sType) {
				var aTypes = [ButtonType.Up, ButtonType.Back, ButtonType.Unstyled];
				return aTypes.indexOf(sType) !== -1;
			}

			if (sPropertyName === "type" && isForbiddenType(vValue)) {
				return this;
			}

			if (sPropertyName === 'text') {
				this._sDefaultText = vValue;
			}

			// For certain properties, propagate the new value to the inner button
			switch (sPropertyName) {
				case 'activeIcon':
				case 'iconDensityAware':
				case 'textDirection':
				case 'visible':
				case 'enabled':
					this._getButtonControl().setProperty(sPropertyName, vValue);
					break;
			}

			return Control.prototype.setProperty.apply(this, arguments);
		};

		/**
		 * Sets the tooltip for the <code>MenuButton</code>.
		 * Can either be an instance of a TooltipBase subclass or a simple string.
		 * @param {sap.ui.core.TooltipBase} vTooltip The tooltip that should be shown.
		 * @returns {*} this instance
		 * @public
		 */
		MenuButton.prototype.setTooltip = function(vTooltip) {
			this._getButtonControl().setTooltip(vTooltip);
			return Control.prototype.setTooltip.apply(this, arguments);
		};

		/*
		 * Override setter because the parent control has placed custom logic in it and all changes need to be propagated
		 * to the internal button aggregation.
		 * @param {string} sValue The text of the sap.m.MenuButton
		 * @return {this} This instance for chaining
		 */
		MenuButton.prototype.setText = function (sValue) {
			Control.prototype.setProperty.call(this, 'text', sValue);
			this._getButtonControl().setText(sValue);
			return this;
		};

		/*
		 * Override setter because the parent control has placed custom logic in it and all changes need to be propagated
		 * to the internal button aggregation.
		 * @param {string} sValue`
		 * @return {this} This instance for chaining
		 */
		MenuButton.prototype.setType = function (sValue) {
			Control.prototype.setProperty.call(this, 'type', sValue);
			this._getButtonControl().setType(sValue);
			return this;
		};

		/*
		 * Override setter because the parent control has placed custom logic in it and all changes need to be propagated
		 * to the internal button aggregation.
		 * @param {string} vValue
		 * @return {this} This instance for chaining
		 */
		MenuButton.prototype.setIcon = function (vValue) {
			Control.prototype.setProperty.call(this, 'icon', vValue);
			this._getButtonControl().setIcon(vValue);
			return this;
		};

		/*
		 * Overrides the setter in order to propagate the value to the inner button instance.
		 *
		 * @param {string} sAriaLabelledBy the passed value
		 * @override
		 * @return {this} This instance for chaining
		 */
		MenuButton.prototype.addAriaLabelledBy = function(sAriaLabelledBy) {
			this.getAggregation("_button").addAssociation("ariaLabelledBy", sAriaLabelledBy);
			return Control.prototype.addAssociation.call(this, "ariaLabelledBy", sAriaLabelledBy);
		};

		/*
		 * Overrides the setter in order to propagate the value to the inner button instance.
		 *
		 * @param {string} sAriaDescribedBy the passed value
		 * @override
		 * @return {this} This instance for chaining
		 */
		MenuButton.prototype.addAriaDescribedBy = function(sAriaDescribedBy) {
			this.getAggregation("_button").addAssociation("ariaDescribedBy", sAriaDescribedBy);
			return Control.prototype.addAssociation.call(this, "ariaDescribedBy", sAriaDescribedBy);
		};

		/*
		 * Overrides the setter in order to propagate the value to the inner button instance.
		 *
		 * @param {string} sAriaLabelledBy the passed value
		 * @override
		 * @returns {string|null} ID of the removed control
		 */
		MenuButton.prototype.removeAriaLabelledBy = function(sAriaLabelledBy) {
			this.getAggregation("_button").removeAssociation("ariaLabelledBy", sAriaLabelledBy);
			return Control.prototype.removeAssociation.call(this, "ariaLabelledBy", sAriaLabelledBy);
		};

		/*
		 * Overrides the setter in order to propagate the value to the inner button instance.
		 *
		 * @param {string} sAriaDescribedBy the passed value to be removed
		 * @override
		 * @returns {string|null} ID of the removed control
		 */
		MenuButton.prototype.removeAriaDescribedBy = function(sAriaDescribedBy) {
			this.getAggregation("_button").removeAssociation("ariaDescribedBy", sAriaDescribedBy);
			return Control.prototype.removeAssociation.call(this, "ariaDescribedBy", sAriaDescribedBy);
		};

		/*
		 * Overrides the setter in order to propagate the value to the inner button instance.
		 *
		 * @param {string} sAriaLabelledBy the passed value to be removed
		 * @override
		 * @returns {string[]} IDs of the removed controls
		 */
		MenuButton.prototype.removeAllAriaLabelledBy = function(sAriaLabelledBy) {
			this.getAggregation("_button").removeAllAssociation("ariaLabelledBy");
			return Control.prototype.removeAllAssociation.call(this, "ariaLabelledBy");
		};

		/*
		 * Overrides the setter in order to propagate the value to the inner button instance.
		 *
		 * @override
		 * @returns {string[]} IDs of the removed controls
		 */
		MenuButton.prototype.removeAllAriaDescribedBy = function() {
			this.getAggregation("_button").removeAllAssociation("ariaDescribedBy");
			return Control.prototype.removeAllAssociation.call(this, "ariaDescribedBy");
		};

		MenuButton.prototype.getFocusDomRef = function() {
			return this._getButtonControl().getDomRef();
		};

		MenuButton.prototype.onsapup = function(oEvent) {
			this.openMenuByKeyboard();
			// If there is a different behavior defined in the parent container for the same event,
			// then use only the defined behavior in the MenuButton.
			// The same applies for 'sapdown', 'sapupmodifiers' and 'sapdownmodifiers' events as well.
			oEvent.stopPropagation();
		};

		MenuButton.prototype.onsapdown = function(oEvent) {
			this.openMenuByKeyboard();
			oEvent.stopPropagation();
		};

		MenuButton.prototype.onsapupmodifiers = function(oEvent) {
			this.openMenuByKeyboard();
			oEvent.stopPropagation();
		};

		MenuButton.prototype.onsapdownmodifiers = function(oEvent) {
			this.openMenuByKeyboard();
			oEvent.stopPropagation();
		};

		//F4
		MenuButton.prototype.onsapshow = function(oEvent) {
			this.openMenuByKeyboard();
			!!oEvent && oEvent.preventDefault();
		};

		MenuButton.prototype.ontouchstart = function() {
			const oMenu = this.getMenu(),
				oPopover = oMenu && oMenu._getPopover();
			this._bPopupOpen = oMenu && oPopover && oPopover.isOpen();
		};

		MenuButton.prototype.handleKeydown = function(oEvent) {
			if ((oEvent.keyCode === KeyCodes.ENTER || oEvent.keyCode === KeyCodes.TAB) && this._bPopupOpen) {
				this.getMenu().close();
				this._bPopupOpen = false;
			}

			Button.prototype.onkeydown.call(this, oEvent);
		};

		MenuButton.prototype.openMenuByKeyboard = function() {
			if (!this._isSplitButton()) {
				this._handleButtonPress(Object.create(null, {
						getParameter: {
							value: function() {
								return true;
							}
						}
					}));
			}
		};

		MenuButton.prototype._writeAriaAttributes = function() {
			var oButtonControl = this._getButtonControl(),
				oOpeningMenuButton = this._isSplitButton() ? oButtonControl._getArrowButton() : oButtonControl,
				oMenu = this.getMenu();

			if (oMenu) {
				oOpeningMenuButton.$().attr("aria-controls", oMenu.getDomRefId());
				oOpeningMenuButton.$().attr("aria-expanded", "true");
			}
		};

		/**
		 * Required by the {@link sap.m.IToolbarInteractiveControl} interface.
		 * Determines if the Control is interactive.
		 *
		 * @returns {boolean} If it is an interactive Control
		 *
		 * @private
		 * @ui5-restricted sap.m.OverflowToolBar, sap.m.Toolbar
		 */
		MenuButton.prototype._getToolbarInteractive = function () {
			return true;
		};

		/**
		 * Returns the DOMNode Id to be used for the "labelFor" attribute of the label.
		 *
		 * By default, this is the Id of the control itself.
		 *
		 * @return {string} Id to be used for the <code>labelFor</code>
		 * @public
		 */
		MenuButton.prototype.getIdForLabel = function () {
			return this.getId() + "-internalBtn";
		};

		/**
		 * Ensures that MenuButton's internal button will have a reference back to the labels, by which
		 * the MenuButton is labelled
		 *
		 * @returns {this} For chaining
		 * @private
		 */
		MenuButton.prototype._ensureBackwardsReference = function () {
			var oInternalButton = this._getButtonControl(),
				aInternalButtonAriaLabelledBy = oInternalButton.getAriaLabelledBy(),
				aReferencingLabels = LabelEnablement.getReferencingLabels(this);

			aReferencingLabels.forEach(function (sLabelId) {
				if (aInternalButtonAriaLabelledBy && aInternalButtonAriaLabelledBy.indexOf(sLabelId) === -1) {
					oInternalButton.addAriaLabelledBy(sLabelId);
				}
			});

			return this;
		};

		return MenuButton;
	});