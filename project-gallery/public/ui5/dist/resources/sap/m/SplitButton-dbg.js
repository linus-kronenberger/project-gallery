/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.SplitButton.
sap.ui.define([
	'./library',
	'sap/ui/core/Control',
	'./Button',
	'./ButtonRenderer',
	'sap/ui/core/EnabledPropagator',
	'sap/ui/core/IconPool',
	"sap/ui/core/Lib",
	'sap/ui/core/library',
	'./SplitButtonRenderer',
	"sap/ui/events/KeyCodes"
],
function(
	library,
	Control,
	Button,
	ButtonRenderer,
	EnabledPropagator,
	IconPool,
	Library,
	coreLibrary,
	SplitButtonRenderer,
	KeyCodes
) {
		"use strict";

		// shortcut for sap.ui.core.TextDirection
		var TextDirection = coreLibrary.TextDirection;

		// shortcut for sap.m.ButtonType
		var ButtonType = library.ButtonType;

		/**
		 * Constructor for a new <code>SplitButton</code>.
		 *
		 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
		 * @param {object} [mSettings] Initial settings for the new control
		 *
		 * @class
		 * Enables users to trigger actions. For the button UI, you can define some text or an icon, or both.
		 * @extends sap.ui.core.Control
		 *
		 * @author SAP SE
		 * @version 1.138.0
		 *
		 * @constructor
		 * @private
		 * @ui5-restricted sap.m.MenuButton,sap.ui.richtexteditor.ToolbarWrapper
		 * @alias sap.m.SplitButton
		 */
		var SplitButton = Control.extend("sap.m.SplitButton", /** @lends sap.m.SplitButton.prototype */ {
			metadata : {

				interfaces : [
					"sap.m.IOverflowToolbarContent",
					"sap.m.IToolbarInteractiveControl"
				],
				library : "sap.m",
				properties : {

					/**
					 * Define the text of the button.
					 */
					text : {type : "string", group : "Misc", defaultValue : null},

					/**
					 * Defines the type of the button (for example, Default, Accept, Reject, Transparent).
					 * Values <code>Back</code>, <code>Up</code> and <code>Unstyled</code> are ignored.
					 */
					type : {type : "sap.m.ButtonType", group : "Appearance", defaultValue : ButtonType.Default},

					/**
					 * Defines the width of the button.
					 */
					width : {type : "sap.ui.core.CSSSize", group : "Misc", defaultValue : null},

					/**
					 * Boolean property to enable the control (default is <code>true</code>).
					 * <b>Note:</b> Depending on custom settings, the buttons that are disabled have other colors than the enabled ones.
					 */
					enabled : {type : "boolean", group : "Behavior", defaultValue : true},

					/**
					 * Defines the icon to be displayed as graphical element within the button.
					 * This can be an image or an icon from the icon font.
					 */
					icon : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null},

					/**
					 * The source property of an alternative icon for the active (pressed) state of the button.
					 * Both active and default icon properties should be defined and of the same type - image or icon font.
					 * If the <code>icon</code> property is not set or has a different type, the active icon is not displayed.
					 */
					activeIcon : {type : "sap.ui.core.URI", group : "Misc", defaultValue : null},

					/**
					 * When set to <code>true</code (default), one or more requests are sent trying to get
					 * the density perfect version of image if this version of image doesn't exist on the server.
					 * If only one version of image is provided, set this value to <code>false</code> to
					 * avoid the attempt of fetching density perfect image.
					 */
					iconDensityAware : {type : "boolean", group : "Misc", defaultValue : true},

					/**
					 * This property specifies the element's text directionality with enumerated options.
					 * By default, the control inherits text direction from the DOM.
					 */
					textDirection : {type : "sap.ui.core.TextDirection", group : "Appearance", defaultValue : TextDirection.Inherit}
				},
				aggregations: {
					_textButton: { type: "sap.m.Button", multiple: false, visibility: "hidden" },
					_arrowButton: { type: "sap.m.Button", multiple: false, visibility: "hidden" }
				},
				associations : {

					/**
					 * Association to controls / IDs, which describe this control (see WAI-ARIA attribute aria-describedby).
					 */
					ariaDescribedBy : {type : "sap.ui.core.Control", multiple : true, singularName : "ariaDescribedBy"},

					/**
					 * Association to controls / IDs, which label this control (see WAI-ARIA attribute aria-labelledby).
					 */
					ariaLabelledBy : {type : "sap.ui.core.Control", multiple : true, singularName : "ariaLabelledBy"}
				},
				events : {
					/**
					 * Fired when the user clicks on the control.
					 */
					press : {},

					/**
					 * Fired when the arrow button is pressed.
					 */
					arrowPress : {
					}
				}
			},

			renderer: SplitButtonRenderer
		});

		EnabledPropagator.call(SplitButton.prototype);

		SplitButton.prototype.onAfterRendering = function() {
			var $textButtonRef = this._getTextButton().$(),
				$arrowButtonRef = this._getArrowButton().$();

			$textButtonRef.attr("tabindex", "-1");
			$arrowButtonRef.attr("tabindex", "-1");
			if (this.getTooltip()) {
				$textButtonRef.removeAttr("title");
			}
			$textButtonRef.removeAttr("aria-describedby");
			$arrowButtonRef.removeAttr("aria-describedby");
		};

		SplitButton.prototype._handleAction = function(oEvent) {
			if (oEvent.getSource().hasStyleClass("sapMSBArrow")) {
				this.fireArrowPress({
					keyboard: oEvent.getParameter("keyboard")
				});
			} else {
				this.firePress({
					keyboard: oEvent.getParameter("keyboard")
				});
			}
		};


		/**
		 * Sets the arrow state to down or not down.
		 * @param {boolean} bIsDown Is the arrow down
		 * @public
		 */
		SplitButton.prototype.setArrowState = function(bIsDown) {
			var oArrow = this.getAggregation("_arrowButton");

			if (!oArrow) {
				return;
			}

			if (bIsDown) {
				oArrow.$().addClass('sapMSBActive');
			} else {
				oArrow.$().removeClass('sapMSBActive');
			}
		};

		SplitButton.prototype._getTextButton = function() {
			var oCtrl = this.getAggregation("_textButton");

			if (!oCtrl) {
				oCtrl = new Button({
					id: this.getId() + "-textButton",
					width: '100%',
					icon: this.getIcon(),
					text: this.getText(),
					press: this._handleAction.bind(this)
				}).addStyleClass('sapMSBText');

				this.setAggregation("_textButton", oCtrl);
			}

			return oCtrl;
		};

		SplitButton.prototype._getArrowButton = function() {
			var oCtrl = this.getAggregation("_arrowButton");

			if (!oCtrl) {
				oCtrl = new Button({
					id: this.getId() + "-arrowButton",
					icon: "sap-icon://slim-arrow-down",
					press: this._handleAction.bind(this),
					tooltip: Library.getResourceBundleFor("sap.m").getText("SPLIT_BUTTON_ARROW_TOOLTIP"),
					ariaHasPopup: coreLibrary.aria.HasPopup.Menu
				}).addStyleClass("sapMSBArrow");
				this.setAggregation("_arrowButton", oCtrl);
			}

			return oCtrl;
		};

		SplitButton.prototype.setProperty = function(sPropertyName, oValue, bSuppressInvalidate) {
			if (sPropertyName === "type"
				&& (oValue === ButtonType.Up
				|| oValue === ButtonType.Back
				|| oValue === ButtonType.Unstyled)) {
				return this;
			}

			var oResult = Control.prototype.setProperty.apply(this, arguments);

			if (sPropertyName === "activeIcon"
				|| sPropertyName === "iconDensityAware"
				|| sPropertyName === "textDirection") {
				Button.prototype.setProperty.apply(this._getTextButton(), arguments);
			} else if (sPropertyName === "text"
				|| sPropertyName === "type"
				|| sPropertyName === "icon") {
				var sSetterName = "set" + _fnCapitalize(sPropertyName);

				Button.prototype[sSetterName].call(this._getTextButton(), oValue);

				if (sPropertyName === "type") {
					Button.prototype[sSetterName].call(this._getArrowButton(), oValue);
				}
			}

			return oResult;
		};

		function _fnCapitalize(sText) {
			return sText.charAt(0).toUpperCase() + sText.slice(1);
		}

		SplitButton.prototype.onkeydown = function(oEvent) {
			if (oEvent.which === KeyCodes.SPACE) {
				oEvent.preventDefault();
			}

			this._getTextButton().onkeydown(oEvent);
		};

		SplitButton.prototype.onkeyup = function(oEvent) {
			this._getTextButton().onkeyup(oEvent);
		};

		SplitButton.prototype.onsapup = function(oEvent) {
			this._getArrowButton().firePress({keyboard: true});
		};

		SplitButton.prototype.onsapdown = function(oEvent) {
			this._getArrowButton().firePress({keyboard: true});
		};

		SplitButton.prototype.onsapupmodifiers = function(oEvent) {
			this._getArrowButton().firePress({keyboard: true});
		};

		SplitButton.prototype.onsapdownmodifiers = function(oEvent) {
			this._getArrowButton().firePress({keyboard: true});
		};

		//F4
		SplitButton.prototype.onsapshow = function(oEvent) {
			this._getArrowButton().firePress();
			oEvent.preventDefault();
		};

		/**
		 * @private
		 * @returns {*}
		 */
		SplitButton.prototype.getButtonTypeAriaLabelId = function() {
			var sButtonType = this._getTextButton().getType();
			return ButtonRenderer.getButtonTypeAriaLabelId(sButtonType);
		};

		SplitButton.prototype.getTitleAttributeValue = function() {
			var sTooltip = this.getTooltip_AsString(),
				oIconInfo = IconPool.getIconInfo(this.getIcon()),
				sResult;

			if (sTooltip || (oIconInfo && oIconInfo.text && !this.getText())) {
				sResult = sTooltip || oIconInfo.text;
			}

			return sResult;
		};

		/**
		 * Required by the {@link sap.m.IOverflowToolbarContent} interface.
		 */
		SplitButton.prototype.getOverflowToolbarConfig = function() {
			var oConfig = {
				canOverflow: true,
				propsUnrelatedToSize: ["enabled", "type", "icon", "activeIcon"],
				autoCloseEvents: ["press"]
			};


			return oConfig;
		};

	/**
	 * Determines if it is interactive Control
	 *
	 * @private
	 * @returns {boolean} If it is an interactive Control
	 */
	SplitButton.prototype._getToolbarInteractive = function () {
		return true;
	};


		return SplitButton;
	});
