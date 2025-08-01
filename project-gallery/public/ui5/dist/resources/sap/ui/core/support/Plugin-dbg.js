/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.support.Plugin
sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/thirdparty/jquery",
	"sap/base/util/uid",
	"sap/m/MessageBox",
	"sap/ui/core/Lib"
],
	function(BaseObject, jQuery, uid, MessageBox, Library) {
	"use strict";

	/**
	 * Creates an instance of sap.ui.core.support.Plugin.
	 * @class This class represents a plugin for the support tool functionality of UI5. This class is internal and all its functions must not be used by an application.
	 *
	 * @abstract
	 * @extends sap.ui.base.Object
	 * @version 1.138.0
	 * @private
	 * @ui5-restricted
	 * @alias sap.ui.core.support.Plugin
	 */
	var Plugin = BaseObject.extend("sap.ui.core.support.Plugin", {
		constructor : function(sId, sTitle, oStub) {
			BaseObject.apply(this);
			this._id = sId ? sId : uid();
			this._title = sTitle ? sTitle : "";
			this._bActive = false;
			this._aEventIds = [];
			this._bIsToolPlugin = oStub.isToolStub();
			this._oStub = oStub;
		}
	});


	/**
	 * Initialization function called each time the support mode is started
	 * (diagnostics popup is opened).
	 * For Plugins that are for diagnostics tool window and application window,
	 * the init method is called twice, with the <code>oSupportStub</code>
	 *
	 * @param {sap.ui.core.support.Support} oSupportStub the support stub
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.init = function(oSupportStub){
		for (var i = 0; i < this._aEventIds.length; i++) {
			var fnHandler = this["on" + this._aEventIds[i]];
			if (typeof fnHandler === "function") {
				oSupportStub.attachEvent(this._aEventIds[i], fnHandler, this);
			}
		}
		this._bActive = true;
	};


	/**
	 * Finalization function called each time the support mode is ended
	 * (support popup is closed).
	 *
	 * @param {sap.ui.core.support.Support} oSupportStub the support stub
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.exit = function(oSupportStub){
		for (var i = 0; i < this._aEventIds.length; i++) {
			var fnHandler = this["on" + this._aEventIds[i]];
			if (typeof fnHandler === "function") {
				oSupportStub.detachEvent(this._aEventIds[i], fnHandler, this);
			}
		}
		this._bActive = false;
	};


	/**
	 * Returns the id of this plugin instance.
	 *
	 * @return {string} the id
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.getId = function(){
		return this._id;
	};


	/**
	 * Returns the title of this plugin instance.
	 *
	 * @return {string} the title
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.getTitle = function(){
		return this._title;
	};

	/**
	 * Returns whether a plugin instance can run in the diagnostics tool window, default is <code>true</code>.
	 * Plugins that are <b>only</b> available on the application window should return <code>false</code> and overwrite
	 * the method for this matter.
	 *
	 * The method is also used in a static manner (called on the prototype) and therefore must not rely on
	 * any instance specific members.
	 *
	 * @see sap.ui.core.support.Support.StubType.TOOL
	 * @see sap.ui.core.support.Plugin.prototype.init
	 *
	 * @return {boolean} whether this plugin instance can run in the tool window
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.isToolPlugin = function(){
		return true;
	};

	/**
	 * Returns whether this plugin instance can run in the application window, default is <code>true</code>.
	 * Plugins that are <b>only</b> available on the diagnostics tool window should return <code>false</code> and overwrite
	 * the method for this matter.
	 *
	 * The method is also used in a static manner (called on the prototype) and therefore must not rely on
	 * any instance specific members.
	 *
	 * @see sap.ui.core.support.Support.StubType.APP
	 * @see sap.ui.core.support.Plugin.prototype.init
	 *
	 * @return {boolean} whether this plugin instance can run in the application window
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.isAppPlugin = function(){
		return true;
	};

	/**
	 * Returns true if the plugin instance currently runs in tool window, otherwise false
	 *
	 * @see sap.ui.core.support.Plugin.prototype.isToolPlugin
	 * @see sap.ui.core.support.Plugin.prototype.isAppPlugin
	 *
	 *
	 * @return {boolean} true if the plugin instance runs in the tool window, otherwise false
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.runsAsToolPlugin = function(){
		return this._bIsToolPlugin;
	};


	/**
	 * Returns the DOM node that represents this plugin wrapped as jQuery object.
	 *
	 * If an ID suffix is given, the ID of this Element is concatenated with the suffix
	 * (separated by a single dash) and the DOM node with that compound ID will be wrapped by jQuery.
	 * This matches the naming convention for named inner DOM nodes of a plugin.
	 *
	 * If no suffix is given and if no DOM exists, a DIV with the ID of this plugin will be created
	 * and appended to the support popup content section (identified by class .sapUiSupportCntnt).
	 *
	 * @param {string} [sSuffix] ID suffix to get a jQuery object for
	 * @return {jQuery} The jQuery wrapped plugin's DOM reference
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.$ = function(sSuffix){
		if (this.isToolPlugin()) {
			var jRef = jQuery(document.getElementById(sSuffix ? this.getId() + "-" + sSuffix : this.getId()));
			if (jRef.length == 0 && !sSuffix) {
				jRef = jQuery("<div></div>", {id:this.getId()});
				jRef.appendTo(jQuery(".sapUiSupportCntnt"));
			}
			return jRef;
		}
		return new jQuery();
	};

	/**
	 * Returns a specific DOM element from the DOM tree of this plugin.
	 *
	 * If the parameter <code>sSuffixOrSelector</code> is omitted or nullish,
	 * then the root of the plugin's DOM tree is returned. If a non-empty string is given that
	 * qualifies as an identifier, the child element with the ID this.getId() + "-" + sSuffixOrSelector is returned.
	 * Any other string is interpreted as a selector and the first element matching that selector is returned.
	 *
	 * If this is the application-side of the plugin (stub), then undefined is returned.
	 * @param {string} [sSuffixOrSelector] ID suffix or selector describing the element to retrieve
	 * @returns {HTMLElement|null} The DOM element
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.dom = function(sSuffixOrSelector) {
		if (this.isToolPlugin()) {
			var oDomRef = document.getElementById(this.getId());
			if ( sSuffixOrSelector == null ) {
				return oDomRef;
			}
			if ( /^[\w-]+$/.test(sSuffixOrSelector) ) {
				return document.getElementById(this.getId() + "-" + sSuffixOrSelector);
			}
			return oDomRef && oDomRef.querySelector(sSuffixOrSelector);
		}
		return null;
	};

	/**
	 * Adds the given stylesheet to the Support Tool's HTML page.
	 *
	 * A &lt;link&gt; tag will be added to the head of the HTML page, referring to the given
	 * CSS resource. The URL of the resource is determined from the given resource name
	 * by calling {@link sap.ui.require.toUrl}.
	 *
	 * A plugin should call this method only when it is {@link #runsAsToolPlugin running inside the tool window}.
	 *
	 * @param {string} sCssResourcePath Resource name of a CSS file, but without the '.css' extension
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.addStylesheet = function(sCssResourcePath) {
		if (!sCssResourcePath) {
			return;
		}
		var sPath = sap.ui.require.toUrl(sCssResourcePath + ".css"),
			oCssDomLink = document.createElement("link");
		oCssDomLink.setAttribute("rel", "stylesheet");
		oCssDomLink.setAttribute("type", "text/css");
		oCssDomLink.setAttribute("href", sPath);
		var oHead = document.getElementsByTagName('head')[0];
		oHead.appendChild(oCssDomLink);
	};

	/**
	 * Returns whether the plugin is currently active or not.
	 *
	 * @return {boolean} whether the plugin is currently active or not
	 * @private
	 * @ui5-restricted
	 */
	Plugin.prototype.isActive = function(){
		return this._bActive;
	};

	Plugin.prototype.confirmReload = function (fnConfirmCb) {
		MessageBox.confirm(this._getText("TechInfo.ReloadApp.ConfirmMessage"), {
			title: this._getText("TechInfo.DebugSources.ConfirmTitle"),
			onClose: function (oAction) {
				if (oAction === MessageBox.Action.OK) {
					fnConfirmCb();
				}
			}
		});
	};

	Plugin.prototype._getText = function (sKey, aParameters) {
		return Library.getResourceBundleFor("sap.ui.core").getText(sKey, aParameters);
	};

	return Plugin;

});