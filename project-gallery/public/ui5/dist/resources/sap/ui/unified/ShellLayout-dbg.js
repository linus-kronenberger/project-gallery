/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.unified.ShellLayout.
sap.ui.define([
	"sap/base/i18n/Localization",
	'sap/ui/Device',
	'sap/ui/core/Control',
	"sap/ui/core/ControlBehavior",
	'sap/ui/core/Popup',
	"sap/ui/core/RenderManager",
	'sap/ui/core/theming/Parameters',
	'./SplitContainer',
	'./library',
	'./ShellLayoutRenderer',
	'sap/ui/dom/containsOrEquals',
	'sap/base/Log',
	"sap/ui/thirdparty/jquery",
	"sap/ui/core/Configuration",
	// jQuery Plugin "firstFocusableDomRef"
	'sap/ui/dom/jquery/Focusable'
], function(
	Localization,
	Device,
	Control,
	ControlBehavior,
	Popup,
	RenderManager,
	Parameters,
	SplitContainer,
	library,
	ShellLayoutRenderer,
	containsOrEquals,
	Log,
	jQuery,
	Configuration
) {
	"use strict";



	/**
	 * Constructor for a new ShellLayout.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * The shell layout is the base for the shell control which is meant as root control (full-screen) of an application.
	 * It was build as root control of the Fiori Launchpad application and provides the basic capabilities
	 * for this purpose. Do not use this control within applications which run inside the Fiori Lauchpad and
	 * do not use it for other scenarios than the root control usecase.
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.25.0
	 * @alias sap.ui.unified.ShellLayout
	 * @deprecated As of version 1.44.0, the concept has been discarded.
	 */
	var ShellLayout = Control.extend("sap.ui.unified.ShellLayout", /** @lends sap.ui.unified.ShellLayout.prototype */ { metadata : {

		library : "sap.ui.unified",
		deprecated: true,
		properties : {

			/**
			 * Shows / Hides the side pane.
			 */
			showPane : {type : "boolean", group : "Appearance", defaultValue : false},

			/**
			 * Whether the header can be hidden (manually or automatically). This feature is only available when touch events are supported.
			 */
			headerHiding : {type : "boolean", group : "Appearance", defaultValue : false},

			/**
			 * If set to false, no header (and no items, search, ...) is shown.
			 */
			headerVisible : {type : "boolean", group : "Appearance", defaultValue : true}
		},
		defaultAggregation : "content",
		aggregations : {

			/**
			 * The content to appear in the main canvas.
			 */
			content : {type : "sap.ui.core.Control", multiple : true, singularName : "content", forwarding: {idSuffix: "-container", aggregation: "content"}},

			/**
			 * The content to appear in the pane area.
			 */
			paneContent : {type : "sap.ui.core.Control", multiple : true, singularName : "paneContent", forwarding: {idSuffix: "-container", aggregation: "secondaryContent"}},

			/**
			 * The control to appear in the header area.
			 */
			header : {type : "sap.ui.core.Control", multiple : false},

			/**
			 * Private storage for the internal split container for the canvas.
			 */
			canvasSplitContainer : {type : "sap.ui.unified.SplitContainer", multiple : false, visibility : "hidden"},

			/**
			 * Private storage for the internal split container for the curtain.
			 */
			curtainSplitContainer : {type : "sap.ui.unified.SplitContainer", multiple : false, visibility : "hidden"}
		}
	}, renderer: ShellLayoutRenderer});


	ShellLayout._SIDEPANE_WIDTH_PHONE = 208;
	ShellLayout._SIDEPANE_WIDTH_TABLET = 208;
	ShellLayout._SIDEPANE_WIDTH_DESKTOP = 240;
	ShellLayout._HEADER_ALWAYS_VISIBLE = true; /*Whether header hiding is technically possible (touch enabled)*/
	ShellLayout._HEADER_AUTO_CLOSE = true;
	ShellLayout._HEADER_TOUCH_TRESHOLD = 15;
	if (Device.browser.chrome && Device.browser.version < 36) {
		//see https://groups.google.com/a/chromium.org/forum/#!topic/input-dev/Ru9xjSsvLHw --> chrome://flags/#touch-scrolling-mode
		ShellLayout._HEADER_TOUCH_TRESHOLD = 10;
	}

	ShellLayout.prototype.init = function(){
		this._rtl = Localization.getRTL();
		this._animation = Configuration.getAnimation();
		this._showHeader = true;
		this._showCurtain = false;
		this._iHeaderHidingDelay = 3000; /*Currently hidden but maybe a property later (see getter and setter below)*/
		this._useStrongBG = false;

		this._cont = new SplitContainer(this.getId() + "-container");
		this._cont._bRootContent = true; // see e.g. sap.m.App#onAfterRendering
		if (ControlBehavior.isAccessibilityEnabled()) {
			var that = this;
			this._cont.addEventDelegate({
				onAfterRendering : function() {
					that._cont.$("canvas").attr("role", "main");
					that._cont.$("pane").attr("role", "complementary");
				}
			});
		}
		this.setAggregation("canvasSplitContainer", this._cont, true);

		this._curtCont = new SplitContainer(this.getId() + "-curt-container");
		this._curtCont._bRootContent = true; // see e.g. sap.m.App#onAfterRendering
		this.setAggregation("curtainSplitContainer", this._curtCont, true);

		this._setSidePaneWidth();

		Device.media.attachHandler(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD);
		Device.resize.attachHandler(this._handleResizeChange, this);
	};

	ShellLayout.prototype.exit = function(){
		Device.media.detachHandler(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD);
		Device.resize.detachHandler(this._handleResizeChange, this);

		delete this._cont; //Destroy of child controls done via aggregation handling
		delete this._curtCont;
	};

	ShellLayout.prototype.onAfterRendering = function(){
		var that = this;

		function headerFocus(oBrowserEvent){
			var oEvent = jQuery.event.fix(oBrowserEvent);
			if (containsOrEquals(that.getDomRef("hdr"), oEvent.target)) {
				that._timedHideHeader(oEvent.type === "focus");
			}
		}

		if (window.addEventListener && !ShellLayout._HEADER_ALWAYS_VISIBLE) {
			var oHdr = this.getDomRef("hdr");
			oHdr.addEventListener("focus", headerFocus, true);
			oHdr.addEventListener("blur", headerFocus, true);
		}

		this._refreshAfterRendering();
	};

	ShellLayout.prototype.onThemeChanged = function(){
		this._refreshAfterRendering();
	};

	ShellLayout.prototype.onfocusin = function(oEvent) {
		var sId = this.getId();

		if (oEvent.target.id === sId + "-curt-focusDummyOut" && this.$("hdrcntnt").firstFocusableDomRef()) {
			// Jump back to shell when you reach the end of the curtain
			this.$("hdrcntnt").firstFocusableDomRef().focus();
		} else if (oEvent.target.id === sId + "-main-focusDummyOut" && this.$("curtcntnt").firstFocusableDomRef()) {
			// Jump to the curtain if it is open (can only reached by tabbing back when curtain is open)
			this.$("curtcntnt").firstFocusableDomRef().focus();
		}
	};

	(function(){

		function _updateHeader(oShell){
			if (oShell._startY === undefined || oShell._currY === undefined) {
				return;
			}

			var yMove = oShell._currY - oShell._startY;
			if (Math.abs(yMove) > ShellLayout._HEADER_TOUCH_TRESHOLD) {
				oShell._doShowHeader(yMove > 0);
				oShell._startY = oShell._currY;
			}
		}

		if (Device.support.touch) {

			ShellLayout._HEADER_ALWAYS_VISIBLE = false;

			ShellLayout.prototype.ontouchstart = function(oEvent){
				this._startY = oEvent.touches[0].pageY;
				if (this._startY > 2 * 48) { /*Only when touch starts "nearby" the header*/
					this._startY = undefined;
				}
				this._currY = this._startY;
			};

			ShellLayout.prototype.ontouchend = function(oEvent){
				_updateHeader(this);
				this._startY = undefined;
				this._currY = undefined;
			};

			ShellLayout.prototype.ontouchcancel = ShellLayout.prototype.ontouchend;

			ShellLayout.prototype.ontouchmove = function(oEvent){
				this._currY = oEvent.touches[0].pageY;
				_updateHeader(this);
			};

		}

	})();


	//***************** API / Overridden generated API *****************

	ShellLayout.prototype.setHeaderHiding = function(bEnabled){
		bEnabled = !!bEnabled;
		return this._mod(function(bRendered){
			return this.setProperty("headerHiding", bEnabled, bRendered);
		}, function(){
			this._doShowHeader(!bEnabled ? true : this._showHeader);
		});
	};

	/*Not public, Maybe API later*/
	ShellLayout.prototype.setHeaderHidingDelay = function(iDelay){
		this._iHeaderHidingDelay = iDelay;
		return this;
	};

	/*Not public, Maybe API later*/
	ShellLayout.prototype.getHeaderHidingDelay = function(){
		return this._iHeaderHidingDelay;
	};

	ShellLayout.prototype.getShowPane = function(){
		return this._cont.getShowSecondaryContent();
	};

	ShellLayout.prototype.setShowPane = function(bShowPane){
		this._cont.setShowSecondaryContent(bShowPane);
		this.setProperty("showPane", !!bShowPane, true);
		return this;
	};

	/*Not public, deprecated*/
	ShellLayout.prototype.setShowCurtainPane = function(bShowPane){
		this._curtCont.setShowSecondaryContent(bShowPane);
		return this;
	};

	/*Not public, deprecated*/
	ShellLayout.prototype.getShowCurtainPane = function(){
		return this._curtCont.getShowSecondaryContent();
	};

	ShellLayout.prototype.setHeaderVisible = function(bHeaderVisible){
		bHeaderVisible = !!bHeaderVisible;
		this.setProperty("headerVisible", bHeaderVisible, true);
		this.$().toggleClass("sapUiUfdShellNoHead", !bHeaderVisible);
		return this;
	};

	/*Not public, deprecated*/
	ShellLayout.prototype.setShowCurtain = function(bShowCurtain){
		bShowCurtain = !!bShowCurtain;

		return this._mod(function(bRendered){
			this._showCurtain = bShowCurtain;
			return this;
		}, function(){
			this.$("main-focusDummyOut").attr("tabindex", bShowCurtain ? 0 : -1);
			this.$().toggleClass("sapUiUfdShellCurtainHidden", !bShowCurtain).toggleClass("sapUiUfdShellCurtainVisible", bShowCurtain);

			if (bShowCurtain) {
				var zIndex = Popup.getNextZIndex();
				this.$("curt").css("z-index", zIndex + 1);
				this.$("hdr").css("z-index", zIndex + 3);
				this.$("brand").css("z-index", zIndex + 7);
				this.$().toggleClass("sapUiUfdShellCurtainClosed", false);
			}

			this._timedCurtainClosed(bShowCurtain);

			this._doShowHeader(true);
		});
	};

	/*Not public, deprecated*/
	ShellLayout.prototype.getShowCurtain = function(){
		return this._showCurtain;
	};


	ShellLayout.prototype.setHeader = function(oHeader) {
		this.setAggregation("header", oHeader, true);
		oHeader = this.getHeader();
		if (this.getDomRef()) {
			if (!oHeader) {
				this.$("hdrcntnt").html("");
			} else {
				var rm = new RenderManager().getInterface();
				rm.renderControl(oHeader);
				rm.flush(this.getDomRef("hdrcntnt"));
				rm.destroy();
			}
		}
		return this;
	};
	ShellLayout.prototype.destroyHeader = function() {
		this.destroyAggregation("header", true);
		this.$("hdrcntnt").html("");
		return this;
	};


	/*Not public, deprecated*/
	ShellLayout.prototype.getCurtainContent = function() {
		return this._curtCont.getContent();
	};
	ShellLayout.prototype.insertCurtainContent = function(oContent, iIndex) {
		this._curtCont.insertContent(oContent, iIndex);
		return this;
	};
	ShellLayout.prototype.addCurtainContent = function(oContent) {
		this._curtCont.addContent(oContent);
		return this;
	};
	ShellLayout.prototype.removeCurtainContent = function(vIndex) {
		return this._curtCont.removeContent(vIndex);
	};
	ShellLayout.prototype.removeAllCurtainContent = function() {
		return this._curtCont.removeAllContent();
	};
	ShellLayout.prototype.destroyCurtainContent = function() {
		this._curtCont.destroyContent();
		return this;
	};
	ShellLayout.prototype.indexOfCurtainContent = function(oContent) {
		return this._curtCont.indexOfCurtainContent(oContent);
	};


	/*Not public, deprecated*/
	ShellLayout.prototype.getCurtainPaneContent = function() {
		return this._curtCont.getSecondaryContent();
	};
	ShellLayout.prototype.insertCurtainPaneContent = function(oContent, iIndex) {
		this._curtCont.insertSecondaryContent(oContent, iIndex);
		return this;
	};
	ShellLayout.prototype.addCurtainPaneContent = function(oContent) {
		this._curtCont.addSecondaryContent(oContent);
		return this;
	};
	ShellLayout.prototype.removeCurtainPaneContent = function(vIndex) {
		return this._curtCont.removeSecondaryContent(vIndex);
	};
	ShellLayout.prototype.removeAllCurtainPaneContent = function() {
		return this._curtCont.removeAllSecondaryContent();
	};
	ShellLayout.prototype.destroyCurtainPaneContent = function() {
		this._curtCont.destroySecondaryContent();
		return this;
	};
	ShellLayout.prototype.indexOfCurtainPaneContent = function(oContent) {
		return this._curtCont.indexOfSecondaryContent(oContent);
	};


	/*Restricted API for Launchpad to set a Strong BG style*/
	ShellLayout.prototype._setStrongBackground = function(bUseStongBG){
		this._useStrongBG = !!bUseStongBG;
		this.$("strgbg").toggleClass("sapUiStrongBackgroundColor", this._useStrongBG);
	};


	//***************** Private Helpers *****************

	ShellLayout.prototype._mod = function(fMod, oDoIfRendered){
		var bRendered = !!this.getDomRef();
		var res = fMod.apply(this, [bRendered]);
		if (bRendered && oDoIfRendered) {
			if (oDoIfRendered instanceof library._ContentRenderer) {
				oDoIfRendered.render();
			} else {
				oDoIfRendered.apply(this);
			}
		}
		return res;
	};

	ShellLayout.prototype._doShowHeader = function(bShow){
		var bWasVisible = this._showHeader;
		this._showHeader = this._isHeaderHidingActive() ? !!bShow : true;

		this.$().toggleClass("sapUiUfdShellHeadHidden", !this._showHeader).toggleClass("sapUiUfdShellHeadVisible", this._showHeader);

		if (this._showHeader) {
			this._timedHideHeader();
		}

		if (bWasVisible != this._showHeader && this._isHeaderHidingActive()){
			setTimeout(function(){
				try {
					var oResizeEvent = document.createEvent("UIEvents");
					oResizeEvent.initUIEvent("resize", true, false, window, 0);
					window.dispatchEvent(oResizeEvent);
				} catch (e) {
					Log.error(e);
				}
			}, 500);
		}
	};

	ShellLayout.prototype._timedHideHeader = function(bClearOnly){
		if (this._headerHidingTimer) {
			clearTimeout(this._headerHidingTimer);
			this._headerHidingTimer = null;
		}

		if (bClearOnly || !ShellLayout._HEADER_AUTO_CLOSE || !this._isHeaderHidingActive() || this._iHeaderHidingDelay <= 0) {
			return;
		}

		this._headerHidingTimer = setTimeout(function(){
			if (this._isHeaderHidingActive() && this._iHeaderHidingDelay > 0 && !containsOrEquals(this.getDomRef("hdr"), document.activeElement)) {
				this._doShowHeader(false);
			}
		}.bind(this), this._iHeaderHidingDelay);
	};

	ShellLayout.prototype._timedCurtainClosed = function(bClearOnly){
		if (this._curtainClosedTimer) {
			clearTimeout(this._curtainClosedTimer);
			this._curtainClosedTimer = null;
		}

		if (bClearOnly) {
			return;
		}

		var duration = parseInt(Parameters.get("_sap_ui_unified_ShellLayout_AnimDuration"));
		if (!this._animation) {
			duration = 0;
		}

		this._curtainClosedTimer = setTimeout(function(){
			this._curtainClosedTimer = null;
			this.$("curt").css("z-index", "");
			this.$("hdr").css("z-index", "");
			this.$("brand").css("z-index", "");
			this.$().toggleClass("sapUiUfdShellCurtainClosed", true);
		}.bind(this), duration);
	};

	ShellLayout.prototype._isHeaderHidingActive = function(){
		// Not active if no touch, the curtain is open or the hiding is deactivated via API
		if (ShellLayout._HEADER_ALWAYS_VISIBLE || this.getShowCurtain() || !this.getHeaderHiding() || library._iNumberOfOpenedShellOverlays > 0 || !this.getHeaderVisible()) {
			return false;
		}
		return true;
	};

//	ShellLayout.prototype._refreshCSSWorkaround = function() {
//		if (!Device.browser.webkit || !Device.support.touch) {
//			return;
//		}
//
//		if (this._cssWorkaroundTimer) {
//			clearTimeout(this._cssWorkaroundTimer);
//			this._cssWorkaroundTimer = null;
//		}
//		this.$("css").remove();
//
//		this._cssWorkaroundTimer = setTimeout(function(){
//			this._cssWorkaroundTimer = null;
//			Log.debug("sap.ui.unified.ShellLayout: CSS Workaround applied.");
//			jQuery("head").append("<link type='text/css' rel='stylesheet' id='" + this.getId() + "-css' href='data:text/css;base64,LnNhcFVpVWZkU2hlbGxDaHJvbWVSZXBhaW50e291dGxpbmUtY29sb3I6aW5pdGlhbDt9'>");
//			this._cssWorkaroundTimer = setTimeout(function(){
//				this.$("css").remove();
//			}.bind(this), 100);
//		}.bind(this), 10);
//	};

	ShellLayout.prototype._setSidePaneWidth = function(sRange){
		if (!sRange) {
			sRange = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
		}

		var w = ShellLayout["_SIDEPANE_WIDTH_" + sRange.toUpperCase()] + "px";
		this._cont.setSecondaryContentSize(w);
		this._curtCont.setSecondaryContentSize(w);
	};

	ShellLayout.prototype._handleMediaChange = function(mParams){
		if (!this.getDomRef()) {
			return false;
		}

		this._setSidePaneWidth(mParams.name);
	};

	ShellLayout.prototype._handleResizeChange = function(mParams){
		//Nothing to do here, maybe in subclass
	};

	ShellLayout.prototype._refreshAfterRendering = function(){
		var oDom = this.getDomRef();

		if (!oDom) {
			return false;
		}

		//this._repaint(oDom);
		this._timedHideHeader();

		return true;
	};

//	ShellLayout.prototype._repaint = function(oDom){
//		if (Device.browser.webkit) {
//			var display = oDom.style.display;
//			oDom.style.display = "none";
//			oDom.offsetHeight;
//			oDom.style.display = display;
//
//			this._refreshCSSWorkaround();
//		}
//	};

	//Needed by sap.ui.unified.ShellOverlay
	ShellLayout.prototype._getSearchWidth = function(){
		return -1;
	};

	return ShellLayout;

});