/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.ObjectAttribute.
sap.ui.define([
	'./library',
	"sap/base/i18n/Localization",
	'sap/ui/core/Control',
	'sap/ui/core/library',
	'sap/m/Text',
	'sap/ui/core/Element',
	"sap/ui/core/Locale",
	'sap/ui/events/KeyCodes',
	'./ObjectAttributeRenderer',
	'sap/base/Log',
	'sap/ui/base/ManagedObjectObserver'
],
function(library, Localization, Control, coreLibrary, Text, Element, Locale, KeyCodes, ObjectAttributeRenderer, Log, ManagedObjectObserver) {
	"use strict";

	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;

	// shortcut for sap.m.EmptyIndicator
	var EmptyIndicatorMode = library.EmptyIndicatorMode;

	// shortcut for sap.ui.core.aria.HasPopup
	var AriaHasPopup = coreLibrary.aria.HasPopup;

	// shortcut for sap.m.ReactiveAreaMode
	var ReactiveAreaMode = library.ReactiveAreaMode;

	/**
	 * Constructor for a new <code>ObjectAttribute</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * The <code>ObjectAttribute</code> control displays a text field that can be normal or active.
	 * The <code>ObjectAttribute</code> fires a <code>press</code> event when the user chooses the active text.
	 *
	 * <b>Note:</b> If property <code>active</code> is set to <code>true</code>, only the value of the
	 * <code>text</code> property is styled and acts as a link. In this case the <code>text</code>
	 * property must also be set, as otherwise there will be no link displayed for the user.
	 * @extends sap.ui.core.Control
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.12
	 * @alias sap.m.ObjectAttribute
	 */
	var ObjectAttribute = Control.extend("sap.m.ObjectAttribute", /** @lends sap.m.ObjectAttribute.prototype */ {
		metadata : {

			library : "sap.m",
			designtime: "sap/m/designtime/ObjectAttribute.designtime",
			properties : {

				/**
				 * Defines the ObjectAttribute title.
				 */
				title : {type : "string", group : "Misc", defaultValue : null},

				/**
				 * Defines the ObjectAttribute text.
				 */
				text : {type : "string", group : "Misc", defaultValue : null},

				/**
				 * Indicates if the <code>ObjectAttribute</code> text is selectable for the user.
				 *
				 * <b>Note:</b> As of version 1.48, only the value of the <code>text</code> property becomes active (styled and acts like a link) as opposed to both the <code>title</code> and <code>text</code> in the previous versions. If you set this property to <code>true</code>, you have to also set the <code>text</code> property.
				 * <b>Note:</b> When <code>active</code> property is set to <code>true</code>, and the text direction of the <code>title</code> or the <code>text</code> does not match the text direction of the application, the <code>textDirection</code> property should be set to ensure correct display.
				 */
				active : {type : "boolean", group : "Misc", defaultValue : null},

				/**
				 * Defines the size of the reactive area of the link:<ul>
				 * <li><code>ReactiveAreaMode.Inline</code> - The link is displayed as part of a sentence.</li>
				 * <li><code>ReactiveAreaMode.Overlay</code> - The link is displayed as an overlay on top of other interactive parts of the page.</li></ul>
				 *
				 * <b>Note:</b>It is designed to make links easier to activate and helps meet the WCAG 2.2 Target Size requirement. It is applicable only for the SAP Horizon themes.
				 * <b>Note:</b>The Reactive area size is sufficiently large to help users avoid accidentally selecting (clicking or tapping) on unintented UI elements.
				 * UI elements positioned over other parts of the page may need an invisible active touch area.
				 * This will ensure that no elements beneath are activated accidentally when the user tries to interact with the overlay element.
				 *
				 * @since 1.133.0
				 */
				reactiveAreaMode : {type : "sap.m.ReactiveAreaMode", group : "Appearance", defaultValue : ReactiveAreaMode.Inline},

				/**
				 * Determines the direction of the text.
				 * Available options for the text direction are LTR (left-to-right), RTL (right-to-left), or Inherit. By default the control inherits the text direction from its parent control.
				 */
				textDirection : {type : "sap.ui.core.TextDirection", group : "Appearance", defaultValue : TextDirection.Inherit},

				/**
				 * Specifies the value of the <code>aria-haspopup</code> attribute
				 *
				 * If the value is <code>None</code>, the attribute will not be rendered. Otherwise it will be rendered with the selected value.
				 *
				 * NOTE: Use this property only when an <code>sap.m.ObjectAttribute</code> instance is active and related to a popover/popup.
				 * The value needs to be equal to the main/root role of the popup - e.g. dialog,
				 * menu or list (examples: if you have dialog -> dialog, if you have menu -> menu; if you have list -> list; if you have dialog containing a list -> dialog).
				 * Do not use it, if you open a standard sap.m.Dialog, MessageBox or other type of modal dialogs.
				 *
				 * @since 1.97.0
				 */
				 ariaHasPopup : {type : "sap.ui.core.aria.HasPopup", group : "Accessibility", defaultValue : AriaHasPopup.None}
			},
			aggregations : {

				/**
				 * When the aggregation is set, it replaces the <code>text</code>, <code>active</code> and <code>textDirection</code> properties. This also ignores the press event. The provided control is displayed as an active link in case it is a sap.m.Link.
				 * <b>Note:</b> It will only allow sap.m.Text and sap.m.Link controls.
				 */
				customContent : {type : "sap.ui.core.Control", multiple : false},

				/**
				 * Text control to display title and text property.
				 */
				_textControl : {type : "sap.ui.core.Control", multiple : false, visibility : "hidden"}
			},
			events : {

				/**
				 * Fires when the user clicks on active text.
				 */
				press : {
					parameters : {

						/**
						 * DOM reference of the ObjectAttribute's text to be used for positioning.
						 */
						domRef : {type : "string"}
					}
				}
			},
			dnd: { draggable: true, droppable: false }
		},

		renderer: ObjectAttributeRenderer
	});

	/**
	 *  Initializes member variables.
	 *
	 * @private
	 */
	ObjectAttribute.prototype.init = function() {
		this.setAggregation('_textControl', new Text());
	};

	ObjectAttribute.prototype.exit = function() {
		if (this._oCustomContentObserver) {
			this._oCustomContentObserver.disconnect();
			this._oCustomContentObserver = null;
		}

		if (this._oCustomContentCloning) {
			this._oCustomContentCloning.destroy();
		}
	};

	ObjectAttribute.prototype.onBeforeRendering = function() {
		var oLink,
			sTitleId = this.getId() + "-title";

		if (this._isClickable() && !this._isSimulatedLink()) {
			oLink = this.getCustomContent();
			oLink.setAriaHasPopup(this.getAriaHasPopup());
			if (!oLink.getAriaLabelledBy().includes(sTitleId)) {
				oLink.addAriaLabelledBy(sTitleId);
			}
		}
	};

	/**
	 * Delivers text control with updated title, text and maxLines properties.
	 *
	 * @private
	 */
	ObjectAttribute.prototype._getUpdatedTextControl = function() {
		var oAttrAggregation = this._oCustomContentCloning || this.getAggregation('_textControl'),
			sTitle = this.getTitle(),
			sText = this.getAggregation('customContent') ? this.getAggregation('customContent').getText() : this.getText(),
			sTextDir = this.getTextDirection(),
			oParent = this.getParent(),
			bPageRTL = Localization.getRTL(),
			iMaxLines,
			bWrap = true,
			oppositeDirectionMarker = '',
			sResult;
		this._bEmptyIndicatorMode = this._isEmptyIndicatorMode();

		if (sTextDir === TextDirection.LTR && bPageRTL) {
			oppositeDirectionMarker = '\u200e';
		}
		if (sTextDir === TextDirection.RTL && !bPageRTL) {
			oppositeDirectionMarker = '\u200f';
		}

		sText = oppositeDirectionMarker + sText + oppositeDirectionMarker;

		if (sTitle) {
			sResult = sTitle;
			if (new Locale(Localization.getLanguageTag()).getLanguage().toLowerCase() === "fr") {
				sResult += " ";
			}
			sResult += ": " + sText;
		} else {
			sResult = sText;
		}

		if (this._bEmptyIndicatorMode) {
			//inner text control is used in order to display properly the empty indicator
			this.getAggregation('_textControl').setEmptyIndicatorMode(EmptyIndicatorMode.On);
		}

		oAttrAggregation.setText(sResult);
		oAttrAggregation.setTextDirection(sTextDir);

		//if attribute is used inside responsive ObjectHeader or in ObjectListItem - only 1 line
		if (oParent && oParent.isA("sap.m.ObjectListItem")) {
			bWrap = false;
			iMaxLines = ObjectAttributeRenderer.MAX_LINES.SINGLE_LINE;
		}

		this._setControlWrapping(oAttrAggregation, bWrap, iMaxLines);

		return oAttrAggregation;
	};

	ObjectAttribute.prototype._isEmptyIndicatorMode = function () {
		var oCustomContent = this.getAggregation('customContent');
		return oCustomContent &&
			oCustomContent.getEmptyIndicatorMode() !== EmptyIndicatorMode.Off &&
			!oCustomContent.getText();
	};

	/**
	 * Sets the appropriate property to the customContent aggregation.
	 *
	 * @private
	 */
	ObjectAttribute.prototype._setControlWrapping = function(oAttrAggregation, bWrap, iMaxLines) {
		if (oAttrAggregation.isA("sap.m.Link")) {
			oAttrAggregation.setWrapping(bWrap);
		}
		if (oAttrAggregation.isA("sap.m.Text")) {
			oAttrAggregation.setMaxLines(iMaxLines);
		}
	};

	/**
	 * @private
	 * @param {object} oEvent The fired event
	 */
	ObjectAttribute.prototype.ontap = function(oEvent) {
		var oTarget = oEvent.target;
		oTarget = oTarget.id ? oTarget : oTarget.parentElement;
		//event should only be fired if the click is on the text (acting like a link)
		if (this._isSimulatedLink() && (oTarget.id === this.getId() + "-text")) {
			this.firePress({
				domRef : this.getDomRef()
			});
		}
	};

	/**
	 * @private
	 * @param {object} oEvent The fired event
	 */
	ObjectAttribute.prototype.onsapenter = function(oEvent) {
		if (this._isSimulatedLink()) {
			this.firePress({
				domRef : this.getDomRef()
			});

			// mark the event that it is handled by the control
			oEvent.setMarked();
		}
	};

	/**
	 * @private
	 * @param {object} oEvent The fired event
	 */
	ObjectAttribute.prototype.onsapspace = function(oEvent) {
		oEvent.preventDefault();
	};

	ObjectAttribute.prototype.onkeyup = function (oEvent) {
		if (oEvent.which === KeyCodes.SPACE) {
			this.onsapenter(oEvent);
		}
	};

	/**
	 * Checks if ObjectAttribute is empty.
	 *
	 * @private
	 * @returns {boolean} true if ObjectAttribute's text is empty or only consists of whitespaces
	 */
	ObjectAttribute.prototype._isEmpty = function() {
		if (this.getAggregation('customContent') && !(this.getAggregation('customContent').isA("sap.m.Link") || this.getAggregation('customContent').isA("sap.m.Text"))) {
			Log.warning("Only sap.m.Link or sap.m.Text are allowed in \"sap.m.ObjectAttribute.customContent\" aggregation");
			return true;
		}

		return !(this.getText().trim() || this.getTitle().trim());
	};

	/**
	 * Called when the control is touched.
	 * @param {object} oEvent The fired event
	 * @private
	 */
	ObjectAttribute.prototype.ontouchstart = function(oEvent) {
		if (this._isSimulatedLink()) {
			// for control who need to know if they should handle events from the ObjectAttribute control
			oEvent.originalEvent._sapui_handledByControl = true;
		}
	};

	/**
	 * Defines to which DOM reference the Popup should be docked.
	 *
	 * @protected
	 * @return {Element} The DOM reference that Popup should dock to
	 */
	ObjectAttribute.prototype.getPopupAnchorDomRef = function() {
		return this.getDomRef("text");
	};

	/**
	 * @see sap.ui.core.Element.prototype.getFocusDomRef
	 * @protected
	 * @override
	 * @returns {Element|null} Returns the DOM Element that should get the focus or <code>null</code>
	 */
	ObjectAttribute.prototype.getFocusDomRef = function() {
		var oDomRef = this.getDomRef();

		if (oDomRef) {
			if (this._isSimulatedLink()) {
				return oDomRef.querySelector(".sapMObjectAttributeText");
			} else if (this._isClickable()) {
				return this.getAggregation("customContent").getDomRef();
			}
		}

		return Element.prototype.getFocusDomRef.apply(this, arguments);
	};

	ObjectAttribute.prototype._isSimulatedLink = function () {
		return (this.getActive() && this.getText() !== "") && !this.getAggregation('customContent');
	};

	ObjectAttribute.prototype.setCustomContent = function(oCustomContent) {
		var oCurrentCustomContent = this.getCustomContent();

		// clone the new aggregation, but first destroy the previous cloning
		if (this._oCustomContentCloning) {
			this._oCustomContentCloning.destroy();
		}
		this._oCustomContentCloning = oCustomContent && oCustomContent.clone();

		if (!this._oCustomContentObserver) {
			this._oCustomContentObserver = new ManagedObjectObserver(function() {
				this.invalidate();
			}.bind(this));
		}

		// do not listen for property changes on the old control
		if (oCurrentCustomContent) {
			this._oCustomContentObserver.unobserve(oCurrentCustomContent);
		}

		// listen on the new one
		oCustomContent && this._oCustomContentObserver.observe(oCustomContent, { properties: true });

		return this.setAggregation('customContent', oCustomContent);
	};

	/**
	 * Returns whether the control can be clicked so in the renderer appropriate attributes can be set (for example tabindex).
	 * @private
	 */
	ObjectAttribute.prototype._isClickable = function() {
		return this.getAggregation('customContent')
			? this.getAggregation('customContent').isA('sap.m.Link')
			: this.getActive() && this.getText() !== "";
	};

	return ObjectAttribute;

});
