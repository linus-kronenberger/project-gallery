/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * SemanticPage base classes
 *
 * @namespace
 * @name sap.m.semantic
 *
 */

// Provides class sap.m.semantic.ShareMenu
sap.ui.define([
	'sap/ui/base/Object',
	'sap/ui/base/ManagedObjectObserver',
	'sap/m/library',
	"sap/ui/core/Lib",
	'sap/ui/core/library',
	'sap/m/Button',
	'sap/m/OverflowToolbarLayoutData',
	'sap/ui/core/IconPool',
	'sap/m/OverflowToolbarButton',
	"sap/base/Log"
],
	function(BaseObject, ManagedObjectObserver, library, Library, coreLibrary, Button, OverflowToolbarLayoutData, IconPool, OverflowToolbarButton, Log) {
	"use strict";

	// shortcut for sap.m.OverflowToolbarPriority
	var OverflowToolbarPriority = library.OverflowToolbarPriority;

	// shortcut for sap.ui.core.aria.HasPopup
	var AriaHasPopup = coreLibrary.aria.HasPopup;

	/**
	 * Constructor for an sap.m.semantic.ShareMenu.
	 *
	 * @class
	 * Encapsulates the functionality of a ShareMenu control.
	 * ShareMenu is a special menu that is represented by (1) an actionSheet with the menu items and (2) a button that opens the actionSheet.
	 * If the menu has only one item, then that item appears in place of the button that opens the actionSheet.
	 *
	 * @version 1.138.0
	 * @private
	 * @since 1.30.0
	 * @alias sap.m.semantic.ShareMenu
	 */
	var ShareMenu = BaseObject.extend("sap.m.semantic.ShareMenu", {

		constructor : function(oActionSheet) {
			if (!oActionSheet) {
				Log.error("missing argumment: constructor expects an actionsheet reference", this);
				return;
			}

			this._oActionSheet = oActionSheet;
			this._oContentObserver = new ManagedObjectObserver(this._updateShareBtnVisibility.bind(this));

			this._setMode(ShareMenu._Mode.initial);
		},

		getInterface: function() {
			return this; // no facade
		}

	});

	/*
	 * static member
	 */
	ShareMenu._Mode = {
		/**
		 * In "inital" mode, the menu is empty and hidden;
		 */
		initial: "initial",
		/**
		 * In "button" mode, the menu consists of a single button, that represents the only menu-item
		 */
		button: "button",
		/**
		 * In "actionSheet" mode, the menu consists of (1) an actionSheet containing all of the menu items and (2) a dedicated button that only opens the actionSheet.
		 */
		actionSheet: "actionSheet"
	};

	/**
	 * Getter for the shareMenu button
	 * The functionality of this button depends on the ShareMenu mode:
	 * (1) In actionSheet mode, it opens the menu
	 * (2) In "button" mode (i.e. when the menu has a single menu-item) it represents the only menu-item
	 *
	 * @returns {sap.m.Button} the base button
	 */
	ShareMenu.prototype.getBaseButton = function () {
		return this._oBaseButton;
	};

	ShareMenu.prototype.getAggregation = function (sName) {
		if (sName === "content") {
			return this.getContent();
		}
	};

	ShareMenu.prototype.addAggregation = function (sName, oButton, bSuppressInvalidate) {
		if (sName === "content") {
			return this.addContent(oButton, bSuppressInvalidate);
		}
	};

	ShareMenu.prototype.insertAggregation = function (sName, oButton, iIndex, bSuppressInvalidate) {
		if (sName === "content") {
			return this.insertContent(oButton, iIndex, bSuppressInvalidate);
		}
	};

	ShareMenu.prototype.indexOfAggregation = function (sName, oButton) {
		if (sName === "content") {
			return this.indexOfContent(oButton);
		}
	};

	ShareMenu.prototype.removeAggregation = function (sName, oButton, bSuppressInvalidate) {
		if (sName === "content") {
			return this.removeContent(oButton, bSuppressInvalidate);
		}
	};

	ShareMenu.prototype.removeAllAggregation = function (sName, bSuppressInvalidate) {
		if (sName === "content") {
			return this.removeAllContent(bSuppressInvalidate);
		}
	};

	/**
	 * Getter for the items of this menu
	 *
	 * @returns {Array} an array of controls that comprise the menu-items
	 */
	ShareMenu.prototype.getContent = function () {
		var sMode = this._getMode();

		if (sMode === ShareMenu._Mode.initial) {
			return [];
		} else if (sMode === ShareMenu._Mode.button) {
			return [this._oBaseButton];
		} else {
			return this._oActionSheet.getAggregation("buttons") || [];
		}
	};

	/**
	 * Adds an item to this menu
	 *
	 * @param {sap.m.Button} oButton - the new button to be added
	 * @param {boolean} bSuppressInvalidate - if true, the menu as well as the added child are not marked as changed
	 * @return {this} Returns <code>this</code> to allow method chaining
	 */
	ShareMenu.prototype.addContent = function (oButton, bSuppressInvalidate) {
		var sMode = this._getMode();

		this._observeButton(oButton);

		if (sMode === ShareMenu._Mode.initial) {
			this._setMode(ShareMenu._Mode.button, bSuppressInvalidate, oButton);
			return this;
		}

		if (sMode === ShareMenu._Mode.button) {
			this._setMode(ShareMenu._Mode.actionSheet, bSuppressInvalidate);
		}

		this._preProcessOverflowToolbarButton(oButton);
		this._oActionSheet.addButton(oButton, bSuppressInvalidate);
		this._updateShareBtnVisibility();
		return this;
	};

	/**
	 * Inserts an item to this menu
	 *
	 * @param {sap.m.Button} oButton - the new button to be inserted
	 * @param {number} iIndex - the insert index
	 * @param {boolean} bSuppressInvalidate - if true, the menu as well as the inserted child are not marked as changed
	 * @return {this} Returns <code>this</code> to allow method chaining
	 */
	ShareMenu.prototype.insertContent = function (oButton, iIndex, bSuppressInvalidate) {
		var sMode = this._getMode();

		this._observeButton(oButton);

		if (sMode === ShareMenu._Mode.initial) {
			this._setMode(ShareMenu._Mode.button, bSuppressInvalidate, oButton);
			return this;
		}

		if (sMode === ShareMenu._Mode.button) {
			this._setMode(ShareMenu._Mode.actionSheet, bSuppressInvalidate);
		}

		this._preProcessOverflowToolbarButton(oButton);
		this._oActionSheet.insertButton(oButton, iIndex, bSuppressInvalidate);
		this._updateShareBtnVisibility();
		return this;
	};

	/**
	 * Provides the 0-based item-index of given menu-item
	 *
	 * @param {sap.m.Button} oButton - the menu-item
	 * @returns {number} the item-index
	 */
	ShareMenu.prototype.indexOfContent = function (oButton) {
		if ((this._getMode() === ShareMenu._Mode.button) && (oButton === this._oBaseButton)) {
			return 0;
		}

		if (this._getMode() === ShareMenu._Mode.actionSheet) {
			return this._oActionSheet.indexOfAggregation("buttons", oButton);
		}
		return -1;
	};

	/**
	 * Removes the given item from the menu
	 *
	 * @param {sap.m.Button} oButton - the button to be removed
	 * @param {boolean} bSuppressInvalidate - if true, the menu as well as the inserted child are not marked as changed
	 * @return {sap.m.Button} - the removed button
	 */
	ShareMenu.prototype.removeContent = function (oButton, bSuppressInvalidate) {
		var result, sMode = this._getMode();

		if (sMode === ShareMenu._Mode.actionSheet) {
			result = this._oActionSheet.removeButton(oButton, bSuppressInvalidate);
			this._postProcessOverflowToolbarButton(oButton);
			this._unobserveButton(oButton);
			if (result) {
				if (this._oActionSheet.getAggregation("buttons").length === 1) {
					this._setMode(ShareMenu._Mode.button, bSuppressInvalidate);
				}
			}
			this._updateShareBtnVisibility();
			return result;
		}

		if (sMode === ShareMenu._Mode.button) {
			var oLastButton = this._oBaseButton;
			this._setMode(ShareMenu._Mode.initial, bSuppressInvalidate);
			return oLastButton;
		}

		return result;
	};

	/**
	 * Removes all of the items of the menu
	 *
	 * @param {boolean} bSuppressInvalidate - if true, the menu as well as the inserted child are not marked as changed
	 * @return {array} - an array of the removed buttons
	 */
	ShareMenu.prototype.removeAllContent = function (bSuppressInvalidate) {
		var result;
		if (this._getMode() === ShareMenu._Mode.actionSheet) {
			result = this._oActionSheet.removeAllButtons(bSuppressInvalidate);
			result.forEach(function(oButton){
				this._postProcessOverflowToolbarButton(oButton);
				this._unobserveButton(oButton);
			}, this);
			this._updateShareBtnVisibility();

		} else if (this._getMode() === ShareMenu._Mode.button) {
			result = [this._oBaseButton];
		}

		this._setMode(ShareMenu._Mode.initial, bSuppressInvalidate);
		return result;
	};

	/**
	 * Destroys the controls used internally for this menu
	 *
	 * @param {boolean} bSuppressInvalidate - if true, the menu as well as the inserted child are not marked as changed
	 */
	ShareMenu.prototype.destroy = function(bSuppressInvalidate) {
		this._oActionSheet.destroy(bSuppressInvalidate);

		if (this._oShareMenuBtn) {
			this._oShareMenuBtn.destroy(bSuppressInvalidate);
			this._oShareMenuBtn = null;
		}

		if (this._oContentObserver) {
			this._oContentObserver.disconnect();
			this._oContentObserver = null;
		}
	};

	/**
	 * Sets a new button as a base button for this menu
	 * The base button is part of the shareMenu and its functionality is dependent on the shareMenu mode:
	 * (1) In actionSheet mode, it opens the menu
	 * (2) In "button" mode (i.e. when the menu has a single menu-item) it represents the only menu-item
	 *
	 * @param {sap.m.Button} oButton - the new base button
	 * @param {boolean} bSuppressInvalidate - if true, the menu as well as the inserted child are not marked as changed
	 * @return {this} Returns <code>this</code> to allow method chaining
	 */
	ShareMenu.prototype._setBaseButton = function (oButton, bSuppressInvalidate) {
		if (this._oBaseButton === oButton) {
			return this;
		}
		var oOldBaseButton = this._oBaseButton;
		this._oBaseButton = oButton;

		if (oOldBaseButton) {
			//update parent aggregation
			var oParent = oOldBaseButton.getParent(),
					sParentAggregationName = oOldBaseButton.sParentAggregationName;
			if (oParent) {
				oParent.removeAggregation(sParentAggregationName, oOldBaseButton, bSuppressInvalidate);
				oParent.addAggregation(sParentAggregationName, this._oBaseButton, bSuppressInvalidate);
			}
		}
		return this;
	};

	/**
	 * Getter for the current menu mode
	 * @returns {string} an item of the ShareMenu._Mode type
	 * @private
	 */
	ShareMenu.prototype._getMode = function () {
		return this._mode;
	};

	/**
	 * Sets a new ShareMenu mode
	 * @param {sap.m.semantic.ShareMenu._Mode} sMode - the new mode
	 * @param {boolean} bSuppressInvalidate - flag to suppress control invalidation upon change
	 * @param oBaseButton - when the new mode is ShareMenu._Mode.button, a reference to that button
	 *
	 * @return {this} Returns <code>this</code> to allow method chaining
	 */
	ShareMenu.prototype._setMode = function (sMode, bSuppressInvalidate, oBaseButton) {

		if (!ShareMenu._Mode[sMode]) {
			Log.error("unknown shareMenu mode " + sMode, this);
			return this;
		}

		if (this._mode === sMode) {
			return this;
		}

		if (ShareMenu._Mode.initial === sMode) {
			this._setBaseButton(this._getShareMenuButton().applySettings({visible: false}));
			this._mode = ShareMenu._Mode.initial;
			return this;
		}

		if (sMode === ShareMenu._Mode.button) {
			if (this._mode === ShareMenu._Mode.initial) {
				this._setBaseButton(oBaseButton);

			} else if (this._mode === ShareMenu._Mode.actionSheet) {
				var oLastButton = this._oActionSheet.getAggregation("buttons")[0];
				this._oActionSheet.removeButton(oLastButton, bSuppressInvalidate);
				this._postProcessOverflowToolbarButton(oLastButton);
				this._setBaseButton(oLastButton);
			}

			this._mode = ShareMenu._Mode.button;
			return this;
		}

		if (sMode === ShareMenu._Mode.actionSheet) {
			var oOldBaseButton = this._oBaseButton;
			this._setBaseButton(this._getShareMenuButton().applySettings({visible: true}));
			if (oOldBaseButton) {
				this._preProcessOverflowToolbarButton(oOldBaseButton);
				this._oActionSheet.addButton(oOldBaseButton, bSuppressInvalidate);
			}
			this._mode = ShareMenu._Mode.actionSheet;
		}
		return this;
	};

	/**
	 * Creates the standard "share" button that will be used for opening the menu in "actionSheet" mode
	 * @returns {sap.m.Button}
	 * @private
	 */
	ShareMenu.prototype._getShareMenuButton = function() {

		if (!this._oShareMenuBtn) {

			var that = this;

			this._oShareMenuBtn = new Button(this._oActionSheet.getParent().getId() + "-shareButton", {
				ariaHasPopup: AriaHasPopup.Menu,
				icon: IconPool.getIconURI("action"),
				tooltip: Library.getResourceBundleFor("sap.m").getText("SEMANTIC_CONTROL_ACTION_SHARE"),
				layoutData: new OverflowToolbarLayoutData({
					priority: OverflowToolbarPriority.NeverOverflow
				}),
				press: function () {
					that._oActionSheet.openBy(that._oShareMenuBtn);
				}
			});
		}

		return this._oShareMenuBtn;
	};

	/**
	* Retrieves the visible items of this menu.
	*
	* @returns {Array} an array of the visible menu items
	*/
	ShareMenu.prototype._getVisibleContent = function () {
		return this.getContent().filter(function(oButton) {
			return oButton.getVisible();
		});
	};

	/**
	* Updates the share menu button visibility
	* in respect to the hare menu content count and visibility.
	*
	* If there is a single item - that button is the base button.
	* If there are two or more share menu buttons:
	* (a) at least one visible button - the share menu button is visible.
	* (b) no visible buttons - the share menu button is hidden.
	*
	* @returns {Array} an array of the visible menu items
	*/
	ShareMenu.prototype._updateShareBtnVisibility = function () {
		var aVisibleContent = this._getVisibleContent(),
			bToggle = aVisibleContent.length > 0;

		this._getShareMenuButton().setVisible(bToggle);
	};

	/**
	 * This function is run before adding a button to the action sheet
	 * If the button is OverflowToolbarButton, it is made to show icon+text
	 * @param oButton
	 * @private
	 */
	ShareMenu.prototype._preProcessOverflowToolbarButton = function(oButton) {
		if (oButton instanceof OverflowToolbarButton) {
			oButton._bInOverflow = true;
		}
	};

	/**
	 * This function is run after a button has been removed from the action sheet
	 * If the button is OverflowToolbarButton, it is made to only show an icon
	 * @param oButton
	 * @private
	 */
	ShareMenu.prototype._postProcessOverflowToolbarButton = function(oButton) {
		if (oButton instanceof OverflowToolbarButton) {
			delete oButton._bInOverflow;
		}
	};

	/**
	* Starts observing the <code>visible</code> property.
	*
	* @param {sap.m.Button} oButton
	*/
	ShareMenu.prototype._observeButton = function(oButton) {
		this._oContentObserver.observe(oButton, {
			properties: ["visible"]
		});
	};

	/**
	* Stops observing the <code>visible</code> property.
	*/
	ShareMenu.prototype._unobserveButton = function(oButton) {
		this._oContentObserver.unobserve(oButton, {
			properties: ["visible"]
		});
	};

	return ShareMenu;

});