/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.ObjectIdentifier.
sap.ui.define([
	'./library',
	'./Link',
	'./Text',
	'sap/ui/core/Control',
	"sap/ui/core/ControlBehavior",
	'sap/ui/core/IconPool',
	'sap/ui/core/InvisibleText',
	"sap/ui/core/Lib",
	'sap/ui/core/library',
	'sap/ui/Device',
	'sap/ui/base/ManagedObject',
	'./ObjectIdentifierRenderer',
	"sap/ui/events/KeyCodes"
],
function(
	library,
	Link,
	Text,
	Control,
	ControlBehavior,
	IconPool,
	InvisibleText,
	Library,
	coreLibrary,
	Device,
	ManagedObject,
	ObjectIdentifierRenderer,
	KeyCodes
) {
	"use strict";



	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;

	// shortcut for sap.m.EmptyIndicator
	var EmptyIndicatorMode = library.EmptyIndicatorMode;

	// shortcut for sap.m.ReactiveAreaMode
	var ReactiveAreaMode = library.ReactiveAreaMode;

	/**
	 * Constructor for a new ObjectIdentifier.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * The ObjectIdentifier is a display control that enables the user to easily identify a specific object. The ObjectIdentifier title is the key identifier of the object and additional text can be used to further distinguish it from other objects.
	 *
	* <b>Note:</b> This control should not be used with {@link sap.m.Label} or in Forms along with {@link sap.m.Label}.
	 * @extends sap.ui.core.Control
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.12
	 * @alias sap.m.ObjectIdentifier
	 * @see {@link fiori:https://experience.sap.com/fiori-design-web/object-display-elements/#-object-status Object Identifier}
	 */
	var ObjectIdentifier = Control.extend("sap.m.ObjectIdentifier", /** @lends sap.m.ObjectIdentifier.prototype */ {
		metadata : {

			library : "sap.m",
			designtime: "sap/m/designtime/ObjectIdentifier.designtime",
			properties : {

				/**
				 * Defines the object title.
				 */
				title : {type : "string", group : "Data", defaultValue : null},

				/**
				 * Defines the object text.
				 */
				text : {type : "string", group : "Data", defaultValue : null},

				/**
				 * Indicates whether or not the notes icon is displayed.
				 * @deprecated as of version 1.24.0. There is no replacement for the moment.
				 */
				badgeNotes : {type : "boolean", group : "Misc", defaultValue : null, deprecated: true},

				/**
				 * Indicates whether or not the address book icon is displayed.
				 * @deprecated as of version 1.24.0. There is no replacement for the moment.
				 */
				badgePeople : {type : "boolean", group : "Misc", defaultValue : null, deprecated: true},

				/**
				 * Indicates whether or not the attachments icon is displayed.
				 * @deprecated as of version 1.24.0. There is no replacement for the moment.
				 */
				badgeAttachments : {type : "boolean", group : "Misc", defaultValue : null, deprecated: true},

				/**
				 * Indicates if the ObjectIdentifier is visible. An invisible ObjectIdentifier is not being rendered.
				 */
				visible : {type : "boolean", group : "Appearance", defaultValue : true},

				/**
				 * Indicates if the ObjectIdentifier's title is clickable.
				 * @since 1.26
				 */
				titleActive : {type : "boolean", group : "Misc", defaultValue : false},

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
				 * Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
				 * @since 1.28.0
				 */
				textDirection : {type : "sap.ui.core.TextDirection", group : "Appearance", defaultValue : TextDirection.Inherit},

				/**
				 * Specifies if an empty indicator should be displayed when there is no text.
				 *
				 * @since 1.89
				 */
				emptyIndicatorMode: { type: "sap.m.EmptyIndicatorMode", group: "Appearance", defaultValue: EmptyIndicatorMode.Off }
			},
			aggregations : {

				/**
				 * Control to display the object title (can be either Text or Link).
				 *
				 * @private
				 */
				_titleControl : {type : "sap.ui.core.Control", multiple : false, visibility : "hidden"},

				/**
				 * Text control to display the object text.
				 *
				 * @private
				 */
				_textControl : {type : "sap.ui.core.Control", multiple : false, visibility : "hidden"}
			},
			events : {

				/**
				 * Fires when the title is active and the user taps/clicks on it.
				 * @since 1.26
				 */
				titlePress : {
					parameters : {

						/**
						 * DOM reference of the object identifier's title.
						 */
						domRef : {type : "object"}
					}
				}
			},
			associations: {
				/**
				 * Association to controls / IDs, which label this control (see WAI-ARIA attribute aria-labelledby).
				 */
				ariaLabelledBy: {type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy"}
			},
			dnd: { draggable: true, droppable: false }
		},

		renderer: ObjectIdentifierRenderer
	});


	/**
	 * Initializes the control
	 *
	 * @private
	 */
	ObjectIdentifier.prototype.init = function() {
		var oLibraryResourceBundle = Library.getResourceBundleFor("sap.m");

		if (ControlBehavior.isAccessibilityEnabled()) {
			ObjectIdentifier.OI_ARIA_ROLE = oLibraryResourceBundle.getText("OI_ARIA_ROLE");
		}
	};

	ObjectIdentifier.prototype.onBeforeRendering = function() {
		var oTitleControl = this._getTitleControl();
		if (oTitleControl.isA("sap.m.Link")) {
			oTitleControl.setProperty("reactiveAreaMode", this.getReactiveAreaMode());
		}
	};

	/**
	 * Called when the control is destroyed.
	 *
	 * @private
	 */
	ObjectIdentifier.prototype.exit = function() {

		if (this._attachmentsIcon) {
			this._attachmentsIcon.destroy();
			this._attachmentsIcon = null;
		}

		if (this._peopleIcon) {
			this._peopleIcon.destroy();
			this._peopleIcon = null;
		}

		if (this._notesIcon) {
			this._notesIcon.destroy();
			this._notesIcon = null;
		}
	};

	/**
	 * Lazy loads attachments icon.
	 * @returns {object} The attachments icon
	 * @private
	 * @deprecated as of version 1.24.0
	 */
	ObjectIdentifier.prototype._getAttachmentsIcon = function() {

		if (!this._attachmentsIcon) {
			this._attachmentsIcon = this._getIcon(IconPool.getIconURI("attachment"), this.getId() + "-attachments");
		}

		return this._attachmentsIcon;
	};

	/**
	 * Lazy loads people icon.
	 * @returns {object} The people icon
	 * @private
	 * @deprecated as of version 1.24.0
	 */
	ObjectIdentifier.prototype._getPeopleIcon = function() {

		if (!this._peopleIcon) {
			this._peopleIcon = this._getIcon(IconPool.getIconURI("group"), this.getId() + "-people");
		}

		return this._peopleIcon;
	};

	/**
	 * Lazy loads notes icon.
	 * @returns {object} The notes icon
	 * @private
	 * @deprecated as of version 1.24.0
	 */
	ObjectIdentifier.prototype._getNotesIcon = function() {

		if (!this._notesIcon ) {
			this._notesIcon  = this._getIcon(IconPool.getIconURI("notes"), this.getId() + "-notes");
		}

		return this._notesIcon;
	};

	/**
	 * Creates icon image.
	 * @param {string} sURI The URL of the icon image
	 * @param {string} sImageId The ID of the icon image
	 * @returns {object} The icon image
	 * @private
	 */
	ObjectIdentifier.prototype._getIcon = function(sURI, sImageId) {

		var sSize = Device.system.phone ? "1em" : "1em";
		var oImage;

		oImage = this._icon || IconPool.createControlByURI({
			src : sURI,
			id : sImageId + "-icon",
			size : sSize,
			useIconTooltip : false
		}, sap.m.Image);

		oImage.setSrc(sURI);

		return oImage;
	};

	/**
	 * Gets the proper control for the title.
	 * @returns {sap.ui.core.Control} The control for the title
	 * @private
	 */
	ObjectIdentifier.prototype._getTitleControl = function() {
		var oTitleControl = this.getAggregation("_titleControl"),
			sId = this.getId(),
			sTitle = ManagedObject.escapeSettingsValue(this.getProperty("title")),
			addAriaLabelledBy;

		if (!oTitleControl) {
			// Lazy initialization
			if (this.getProperty("titleActive")) {
				addAriaLabelledBy = this.getAriaLabelledBy().slice();
				addAriaLabelledBy.push(InvisibleText.getStaticId("sap.m", "OI_ARIA_ROLE"));
				oTitleControl = new Link({
					id : sId + "-link",
					text: sTitle,
					reactiveAreaMode: this.getReactiveAreaMode(),
					//Add a custom hidden role "ObjectIdentifier" with hidden text
					ariaLabelledBy: addAriaLabelledBy
				});
				oTitleControl.addAriaLabelledBy(sId + "-text");
			} else {
				oTitleControl = new Text({
					id : sId + "-txt",
					text: sTitle
				});
			}
			this.setAggregation("_titleControl", oTitleControl, true);
		}

		return oTitleControl;
	};

	/**
	 * Sets title control.
	 *
	 * Possible controls are Link, SmartLink, Text.
	 * @param {sap.ui.core.Control} oTitleControl the control placed as title.
	 * @returns {sap.m.ObjectIdentifier} <code>this</code> for chaining
	 * @private
	 * @ui5-restricted sap.ui.comp
	 */
	ObjectIdentifier.prototype.setTitleControl = function(oTitleControl) {
		this.setAggregation("_titleControl", oTitleControl);

		return this;
	};

	/**
	 * Returns the title control.
	 *
	 * Possible controls are Link, SmartLink, Text.
	 * @returns {sap.ui.core.Control} oTitleControl the control placed as title.
	 * @private
	 * @ui5-restricted sap.ui.comp
	 */
	ObjectIdentifier.prototype.getTitleControl = function() {
		return this._getTitleControl();
	};

	/**
	 * Lazy loads _textControl aggregation.
	 * @returns {sap.ui.core.Control} The control for the text
	 * @private
	 */
	ObjectIdentifier.prototype._getTextControl = function() {

		var oTextControl = this.getAggregation("_textControl");

		if (!oTextControl) {
			oTextControl = new Text({
				text: ManagedObject.escapeSettingsValue(this.getProperty("text"))
			});
			this.setAggregation("_textControl", oTextControl, true);
		}

		oTextControl.setTextDirection(this.getTextDirection());

		return oTextControl;
	};


	/**
	 * Sets the title.
	 * Default value is empty/undefined.
	 * @public
	 * @param {string} sTitle New value for property title
	 * @returns {this} this to allow method chaining
	 */
	ObjectIdentifier.prototype.setTitle = function (sTitle) {
		if (sTitle) {
			this._getTitleControl().setProperty("text", sTitle);
		}

		return this.setProperty("title", sTitle);
	};

	/**
	 * Sets text.
	 * Default value is empty/undefined.
	 * @public
	 * @param {string} sText New value for property text
	 * @returns {this} this to allow method chaining
	 */
	ObjectIdentifier.prototype.setText = function(sText) {
		if (sText) {
			this._getTextControl().setProperty("text", sText);
		}

		return this.setProperty("text", sText);
	};

	/**
	 * Sets property titleActive.
	 * Default value is false.
	 * @public
	 * @param {boolean} bValue new value for property titleActive
	 * @returns {this} this to allow method chaining
	 */
	ObjectIdentifier.prototype.setTitleActive = function(bValue) {
		var bPrevValue = this.getTitleActive();

		this.setProperty("titleActive", bValue);

		if (bPrevValue != bValue) {
			this.destroyAggregation("_titleControl");
			this._getTitleControl();
		}

		return this;
	};

	/**
	 * Function is called when ObjectIdentifier's title is triggered.
	 *
	 * @param {jQuery.Event} oEvent The fired event
	 * @private
	 */
	ObjectIdentifier.prototype._handlePress = function(oEvent) {
		if (!this.getTitleActive()) {
			return;
		}

		const oPressedItem = oEvent.target;
		const oLinkDomRef = this.getTitleControl().getDomRef();
		const bTitlePressed = oPressedItem.parentElement.id === oLinkDomRef.id || oPressedItem.id === oLinkDomRef.id;

		if (bTitlePressed) {
			this.fireTitlePress({
				domRef: oLinkDomRef
			});

			// mark the event that it is handled by the control
			oEvent.setMarked();
		}
	};

	/**
	 * Event handler called when the enter key is pressed.
	 *
	 * @param {jQuery.Event} oEvent The fired event
	 * @private
	 */
	ObjectIdentifier.prototype.onsapenter = function(oEvent) {
		ObjectIdentifier.prototype._handlePress.apply(this, arguments);
	};

	/**
	 * Event handler called when the space key is pressed.
	 *
	 * @param {jQuery.Event} oEvent The fired event
	 * @private
	 */
	ObjectIdentifier.prototype.onkeyup = function(oEvent) {
		if (oEvent && oEvent.which === KeyCodes.SPACE) {
			ObjectIdentifier.prototype._handlePress.apply(this, arguments);
		}
	};

	/**
	 * Event handler called when the title is clicked/taped.
	 *
	 * @param {jQuery.Event} oEvent The fired event
	 * @private
	 */
	ObjectIdentifier.prototype.ontap = function(oEvent) {
		ObjectIdentifier.prototype._handlePress.apply(this, arguments);
	};


	ObjectIdentifier.prototype.addAssociation = function(sAssociationName, sId, bSuppressInvalidate) {
		var oTitle = this.getAggregation("_titleControl");

		if (sAssociationName === "ariaLabelledBy") {
			if (this.getTitleActive() && oTitle instanceof Link) {
				oTitle.addAriaLabelledBy(sId);
			}
		}

		return Control.prototype.addAssociation.apply(this, arguments);
	};


	ObjectIdentifier.prototype.removeAssociation = function(sAssociationName, vObject, bSuppressInvalidate) {
		var oTitle = this.getAggregation("_titleControl");

		if (sAssociationName === "ariaLabelledBy") {
			if (this.getTitleActive() && oTitle instanceof Link) {
				oTitle.removeAssociation("ariaLabelledBy", vObject, true);
			}
		}

		return Control.prototype.removeAssociation.apply(this, arguments);
	};

	/**
	 * @see sap.ui.core.Control#getAccessibilityInfo
	 * @returns {sap.ui.core.AccessibilityInfo} Current accessibility state of the control
	 * @protected
	 */
	ObjectIdentifier.prototype.getAccessibilityInfo = function() {
		// first get accessibility info from the title control, which can be Text or Link
		var oTitleInfo = this.getAggregation("_titleControl")
			? this.getAggregation("_titleControl").getAccessibilityInfo()
			: {
				type: "",
				description: ""
			},
			oType = (ObjectIdentifier.OI_ARIA_ROLE + " " + (oTitleInfo.type || "")).trim();

		// add ObjectIdentifier type to the title type
		if (this.getTitle() || this.getText()) {
			oTitleInfo.type = oType;
		}
		// add ObjectIdentifier text to the description of the title
		oTitleInfo.description = oTitleInfo.description + " " + this.getText();

		// return the modified Object containing all needed information about the control
		return oTitleInfo;
	};

	ObjectIdentifier.prototype._hasTopRow = function() {
		return this.getTitle() || this.getBadgeNotes() || this.getBadgePeople() || this.getBadgeAttachments();
	};

	return ObjectIdentifier;

});
