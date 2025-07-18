/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.PullToRefresh.
sap.ui.define([
	"sap/ui/core/Lib",
	"sap/ui/thirdparty/jquery",
	'./library',
	'sap/ui/core/Control',
	'sap/ui/Device',
	'./PullToRefreshRenderer',
	"sap/ui/events/KeyCodes",
	"sap/base/security/encodeXML",
	"sap/ui/core/InvisibleText",
	"sap/m/BusyIndicator",
	"sap/m/ImageHelper"
],
	function(Library, jQuery, library, Control, Device, PullToRefreshRenderer, KeyCodes, encodeXML, InvisibleText, BusyIndicator, ImageHelper) {
	"use strict";

	/**
	 * Constructor for a new PullToRefresh.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * PullToRefresh control. Put it as the first control in contents of a scroll container or a scrollable page. Do not place it into a page with disabled scrolling.
	 * On touch devices it gets hidden by default and when the user pulls down the page far enough, it gets visible and triggers the "refresh" event.
	 * In non-touch browsers where scrollbars are used for scrolling, it is always visible and triggers the "refresh" event when clicked.
	 *
	 * @see {@link topic:fde40159afce478eb488ee4d0f9ebb99 Pull to Refresh}
	 *
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.9.2
	 * @alias sap.m.PullToRefresh
	 */
	var PullToRefresh = Control.extend("sap.m.PullToRefresh", /** @lends sap.m.PullToRefresh.prototype */ {
		metadata : {

			library : "sap.m",
			properties : {
				/**
				 * Optional description. May be used to inform a user, for example, when the list has been updated last time.
				 */
				description : {type : "string", group : "Misc", defaultValue : null},

				/**
				 * Set to true to display an icon/logo. Icon must be set either in the customIcon property or in the CSS theme for the PullToRefresh control.
				 */
				showIcon : {type : "boolean", group : "Appearance", defaultValue : false},

				/**
				 * Provide a URI to a custom icon image to replace the SAP logo. Large images are scaled down to max 50px height.
				 */
				customIcon : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null},

				/**
				 * By default, this is set to true but then one or more requests are sent trying to get the density perfect version of image if this version of image doesn't exist on the server.
				 *
				 * If bandwidth is the key for the application, set this value to false.
				 */
				iconDensityAware : {type : "boolean", group : "Appearance", defaultValue : true}
			},
			events : {

				/**
				 * Event indicates that the user has requested new data
				 */
				refresh : {}
			}
		},

		renderer: PullToRefreshRenderer
	});

	PullToRefresh.ARIA_F5_REFRESH = "PULL_TO_REFRESH_ARIA_F5";

	PullToRefresh.prototype.init = function(){
		this._bTouchMode = Device.support.touch && !Device.system.combi;
		this._iState = 0; // 0 - normal; 1 - release to refresh; 2 - loading
		this._sAriaF5Text = InvisibleText.getStaticId("sap.m", PullToRefresh.ARIA_F5_REFRESH);
	};

	PullToRefresh.prototype._loadBI = function(){
		// lazy create a Busy indicator to avoid overhead when invisible at start
		if (this.getVisible() && !this._oBusyIndicator) {
			this._oBusyIndicator = new BusyIndicator({
				size: "1.7rem"
			});
			this._oBusyIndicator.setParent(this);
		}
	};

	PullToRefresh.prototype._getAriaDescribedByReferences = function(){
		var sTooltipText = this.getTooltip_AsString(),
			sDescribedBy = this._sAriaF5Text,
			sTooltipId;

		if (sTooltipText) {
			sTooltipId = InvisibleText.getStaticId("sap.m", sTooltipText);
			sDescribedBy += ' ' + sTooltipId;
		}

		return sDescribedBy;
	};

	PullToRefresh.prototype.onBeforeRendering = function(){
		// Check Busy indicator at later point to avoid overhead when initially invisible
		this._loadBI();

		if (this._bTouchMode) {
			jQuery(window).off("resize.sapMP2R", this.calculateTopTrigger);
			var oParent = this.getParent();
			this._oScroller = oParent && oParent.getScrollDelegate ? oParent.getScrollDelegate() : null;

			if (this._oScroller) {
				this._oScroller.setPullDown(this.getVisible() ? this : null);
			}
		}
	};

	PullToRefresh.prototype.calculateTopTrigger = function(){
		this._iTopTrigger = 1;
		// find the scroll container that embeds the PullToRefresh control
		if (this._oDomRef && this._oDomRef.parentNode && this._oDomRef.parentNode.parentNode &&
				this._oDomRef.parentNode.parentNode.offsetHeight < this._oDomRef.offsetHeight * 1.5) {
			// if there is no place to pull to show the image, pull only until the top line of text
			this._iTopTrigger = this.getDomRef("T").offsetTop;
		}
	};

	PullToRefresh.prototype.onAfterRendering = function(){

		this._oDomRef = this.getDomRef();

		if (this._bTouchMode) {
			if (this._oScroller) {
				this._oScroller.refresh();
			}
			if (this.getVisible() && this._oScroller && this._oScroller._bIScroll) {
				// recalculate top pull offset by resize
				jQuery(window).on("resize.sapMP2R", jQuery.proxy(this.calculateTopTrigger, this));
				this.calculateTopTrigger();
			}
		}

	};

	PullToRefresh.prototype.exit = function(){
		if (this._bTouchMode  && this._oScroller && this._oScroller._bIScroll) {
			jQuery(window).off("resize.sapMP2R", this.calculateTopTrigger);
		}
		if (this._oScroller) {
			this._oScroller.setPullDown(null);
			this._oScroller = null;
		}
		if (this._oCustomImage) {
			this._oCustomImage.destroy();
			this._oCustomImage = null;
		}
		if (this._oBusyIndicator) {
			this._oBusyIndicator.destroy();
			this._oBusyIndicator = null;
		}
	};

	// ScrollEnablement callback functions
	PullToRefresh.prototype.doScrollMove = function(){
		//callback for iScroll
		if (!this._oScroller) { return; }

		var domRef = this._oDomRef;

		var _scroller = this._oScroller._scroller;
		if (_scroller.y > -this._iTopTrigger && this._iState < 1 ) {
			this.setState(1);
			_scroller.minScrollY = 0;
		} else if (_scroller.y < -this._iTopTrigger && this._iState === 1) {
			this.setState(0);
			_scroller.minScrollY = -domRef.offsetHeight;
		}
	};

	PullToRefresh.prototype.doPull = function(posY){
		// callback native scrolling, pull
		if (this._bTouchMode && this._iState < 2) {
			// switch pull down state: rotate its arrow
			this.setState(posY >= -1 ? 1 : 0);
		}
	};

	PullToRefresh.prototype.doRefresh = function(){
		this.setState(0);
	};

	PullToRefresh.prototype.doScrollEnd = function(){
		if (this._iState === 1) { // if released when ready - load
			this.setState(2);
			this.fireRefresh();
		}
	};

	/*
	* Set display state: 0 - pull to refresh, 1 - release to refresh, 2 - loading
	* @private
	*/
	PullToRefresh.prototype.setState = function(iState){

		if (this._iState === iState) {
			return;
		}

		this._iState = iState;

		if (!this._oDomRef) {
			return;
		}

		var $this = this.$();
		var $text = $this.find(".sapMPullDownText");
		var oResourceBundle = this._getRB();

		switch (iState) {
			case 0:
				$this.toggleClass("sapMFlip", false).toggleClass("sapMLoading", false);
				$text.html(oResourceBundle.getText(this._bTouchMode ? "PULL2REFRESH_PULLDOWN" : "PULL2REFRESH_REFRESH"));
				$this.removeAttr("aria-live");
				$this.find(".sapMPullDownInfo").html(encodeXML(this.getDescription()));
				break;
			case 1:
				$this.toggleClass("sapMFlip", true);
				$text.html(oResourceBundle.getText("PULL2REFRESH_RELEASE"));
				$this.removeAttr("aria-live");
				break;
			case 2:
				$this.toggleClass("sapMFlip", false).toggleClass("sapMLoading", true);
				this._oBusyIndicator.setVisible(true);
				$text.html(oResourceBundle.getText("PULL2REFRESH_LOADING"));
				$this.attr("aria-live", "assertive");
				$this.find(".sapMPullDownInfo").html(this._bTouchMode ? oResourceBundle.getText("PULL2REFRESH_LOADING_LONG") : "");
				break;
		}
	};

	/*
	* Return a private custom icon image control for internal rendering
	* @private
	*/
	PullToRefresh.prototype.getCustomIconImage = function(){
		var mProperties = {
			src : this.getCustomIcon(),
			densityAware : this.getIconDensityAware(),
			useIconTooltip : false
		};
		var aCssClasses = ['sapMPullDownCIImg'];

		this._oCustomImage = ImageHelper.getImageControl(null, this._oCustomImage, this, mProperties, aCssClasses);

		return this._oCustomImage;
	};


	// mouse version (non-touch)
	PullToRefresh.prototype.onclick = function() {
		if (!this._bTouchMode) {
			this.setState(2);
			this.fireRefresh();
		}
	};

	/**
	 * Handle the key down event for F5, if focused.
	 *
	 * @param {jQuery.Event} event - the keyboard event.
	 * @private
	 */
	 PullToRefresh.prototype.onkeyup = function(event) {
		if (event.which === KeyCodes.SPACE && this._iState === 1) {
			this.setState(2);
			this.fireRefresh();
		}
	};
	/**
	 * Handle the key down event for F5, if focused.
	 *
	 * @param {jQuery.Event} event - the keyboard event.
	 * @private
	 */
	PullToRefresh.prototype.onkeydown = function(event) {
		if (event.which === KeyCodes.F5) {
			this.onclick();
			// do not refresh browser window
			event.stopPropagation();
			event.preventDefault();
		} else if (event.which === KeyCodes.SHIFT) {
			if (this._iState === 1) {
				this.setState(0);
				return;
			}
		}
	};

	/**
	 * Handle the enter key event
	 *
	 * @param {jQuery.Event} oEvent The ENTER keyboard event object
	 * @private
	 */
	PullToRefresh.prototype.onsapenter = function(oEvent) {
		if (this._iState < 1) {
			this.setState(2);
			this.fireRefresh();
		}
	};

	/**
	 * Handle the space key event
	 *
	 * @param {jQuery.Event} oEvent The SPACE keyboard event object
	 * @private
	 */
	PullToRefresh.prototype.onsapspace = function(oEvent) {
		oEvent.preventDefault();

		if (this._iState < 1) {
			this.setState(1);
		}
	};

	// API implementation

	/**
	 * Hides the control and resets it to the normal state. In non-touch environments the control is not hidden.
	 *
	 * @public
	 */
	PullToRefresh.prototype.hide = function(){
		this.setState(0);
		if (this._oScroller) {
			this._oScroller.refresh();
		}
	};

	PullToRefresh.prototype.setVisible = function(bVisible){
		if (this.getVisible() === bVisible) {
			return this;
		}

		if (this._oDomRef && this._oScroller && this._oScroller._oControl) {
			this._oScroller._oControl.invalidate();
		}
		return this.setProperty("visible", bVisible);
	};

	PullToRefresh.prototype._getRB = function(){
		return Library.getResourceBundleFor("sap.m");
	};

	return PullToRefresh;

});