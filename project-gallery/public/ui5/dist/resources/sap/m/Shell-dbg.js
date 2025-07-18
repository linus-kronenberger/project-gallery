/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.Shell.
sap.ui.define([
	'./library',
	'sap/ui/core/Core',
	'sap/ui/core/Control',
	"sap/ui/core/Lib",
	'sap/ui/core/library',
	"sap/ui/core/Theming",
	'sap/m/Image',
	'sap/m/ShellRenderer',
	"sap/ui/util/Mobile",
	"sap/base/Log",
	"sap/ui/core/theming/Parameters"
],
	function(library, Core, Control, Library, coreLibrary, Theming, Image, ShellRenderer, Mobile, Log, ThemeParameters) {
		"use strict";



		// shortcut for sap.ui.core.TitleLevel
		var TitleLevel = coreLibrary.TitleLevel;



		/**
		 * Constructor for a new Shell.
		 *
		 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
		 * @param {object} [mSettings] Initial settings for the new control
		 *
		 * @class
		 * The Shell control can be used as root element of applications. It can contain an App or a <code>SplitApp</code> control.
		 * The Shell provides some overarching functionality for the overall application and takes care of visual adaptation, such as a frame around the App, on desktop browser platforms.
		 * @extends sap.ui.core.Control
		 * @version 1.138.0
		 *
		 * @constructor
		 * @public
		 * @since 1.12
		 * @alias sap.m.Shell
		 */
		var Shell = Control.extend("sap.m.Shell", /** @lends sap.m.Shell.prototype */ {
			metadata : {

				library : "sap.m",
				properties : {

					/**
					 * Defines the application title, which may or may not be displayed outside the actual application, depending on the available screen size.
					 */
					title : {type : "string", group : "Misc", defaultValue : null},

					/**
					 * Defines the logo to be displayed next to the App when the screen is sufficiently large.
					 *
					 * Note: If property value isn't set, then the logo address is taken from the theme parameters.
					 * For reference please see: {@link sap.ui.core.theming.Parameters}
					 */
					logo : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null},

					/**
					 * Determines whether the Logout button should be displayed. Currently, this only happens on very tall screens (1568px height), otherwise, it is always hidden.
					 */
					showLogout : {type : "boolean", group : "Behavior", defaultValue : true},

					/**
					 * Defines texts, such as the name of the logged-in user, which should be displayed on the right side of the header (if there is enough space to display the header at all - this only happens on very tall screens (1568px height), otherwise, it is always hidden).
					 */
					headerRightText : {type : "string", group : "Data", defaultValue : null},

					/**
					 * Determines whether the width of the content (the aggregated App) should be limited or extended to the full screen width.
					 */
					appWidthLimited : {type : "boolean", group : "Appearance", defaultValue : true},

					/**
					 * Defines the background color of the Shell. If set, this color will override the default background defined by the theme. This should only be set when really required.
					 * Any configured background image will be placed above this colored background.
					 * Use the backgroundRepeat property to define whether this image should be stretched to cover the complete Shell or whether it should be tiled.
					 * @since 1.11.2
					 */
					backgroundColor : {type : "sap.ui.core.CSSColor", group : "Appearance", defaultValue : null},

					/**
					 * Defines the background image of the Shell. If set, this image will override the default background defined by the theme. This should only be set when really required.
					 * This background image will be placed above any color set for the background.
					 * Use the backgroundRepeat property to define whether this image should be stretched to cover the complete Shell or whether it should be tiled.
					 * @since 1.11.2
					 */
					backgroundImage : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null},

					/**
					 * Determines whether the background image (if configured) should be proportionally stretched to cover the whole Shell (false, default) or whether it should be tiled (true).
					 * Note: the image will not be displayed when the <code>sap.m.Shell</code> content is fully overlapping the <code>sap.m.Shell</code> background (e.g. when "appWidthLimited" is set to "false").
					 * @since 1.11.2
					 */
					backgroundRepeat : {type : "boolean", group : "Appearance", defaultValue : false},

					/**
					 * Defines the opacity of the background image. The opacity can be set between 0 (fully transparent) and 1 (fully opaque).
					 * This can be used to improve readability of the Shell content by making the background image partly transparent.
					 * @since 1.11.2
					 */
					backgroundOpacity : {type : "float", group : "Appearance", defaultValue : 1},

					/**
					 * The icon used for the mobile device home screen and the icon to be used for bookmarks by desktop browsers.
					 *
					 * This property should be only set once, and as early as possible. Subsequent calls replace the previous icon settings and may lead to different behavior depending on the browser.
					 *
					 * Different image sizes for device home screen need to be given as PNG images, an ICO file needs to be given as desktop browser bookmark icon (other file formats may not work in all browsers).
					 * The <code>precomposed</code> flag defines whether there is already a glow effect contained in the home screen images (or whether iOS should add such an effect). The given structure could look like this:
					 * {
					 * 'phone':'phone-icon_57x57.png',
					 * 'phone@2':'phone-retina_114x114.png',
					 * 'tablet':'tablet-icon_72x72.png',
					 * 'tablet@2':'tablet-retina_144x144.png',
					 * 'precomposed':true,
					 * 'favicon':'favicon.ico'
					 * }
					 *
					 * See {@link module:sap/ui/util/Mobile.setIcons} for full documentation.
					 *
					 */
					homeIcon : {type : "object", group : "Misc", defaultValue : null},

					/**
					 * Defines the semantic level of the title.
					 *
					 * This information is used by assistive technologies, such as screen readers to create a hierarchical site map for faster navigation.
					 * Depending on this setting an HTML h1-h6 element is used.
					 */
					titleLevel : {type : "sap.ui.core.TitleLevel", group : "Appearance", defaultValue : TitleLevel.H1}
				},
				defaultAggregation : "app",
				aggregations : {

					/**
					 * A Shell contains an App or a SplitApp (they may be wrapped in a View). Other control types are not allowed.
					 */
					app : {type : "sap.ui.core.Control", multiple : false}
				},
				events : {

					/**
					 * Fires when the user presses the logout button/link.
					 */
					logout : {}
				}
			},

			renderer: ShellRenderer
		});

		Shell.prototype._getGlobalLogo = function() {
			return ThemeParameters.get({
				name: ["sapUiGlobalLogo"],
				_restrictedParseUrls: true
			});
		};

		Shell.prototype.init = function() {
			// theme change might change the logo
			Theming.attachApplied(this._onThemeChanged.bind(this));

			Mobile.init({
				statusBar: "default",
				hideBrowser: true
			});
		};

		Shell.prototype._onThemeChanged = function () {
			var $hdr = this.$("hdr"),
					sImgSrc = this._getImageSrc();

				if ($hdr.length && sImgSrc) {
					this._getImage().setSrc(sImgSrc);
				}
		};

		Shell.prototype.onBeforeRendering = function() {
			var sImgSrc = this._getImageSrc();
			if (sImgSrc) {
				this._getImage().setSrc(sImgSrc);
			}
		};

		Shell.prototype.onAfterRendering = function () {
			var ref = this.getDomRef().parentNode;

			// set all parent elements to 100% height this *should* be done by the application in CSS, but people tend to forget it...
			if (ref && !ref._sapui5_heightFixed) {
				ref._sapui5_heightFixed = true;
				while (ref && ref !== document.documentElement) {
					if (ref.getAttribute("data-sap-ui-root-content")) { // some parents (e.g. Unified Shell) do this already
						break;
					}
					if (!ref.style.height) {
						ref.style.height = "100%";
					}
					ref = ref.parentNode;
				}
			}
			this.$("content").css("height", "");
		};

		Shell.prototype.exit = function() {
			if (this.oImg) {
				this.oImg.destroy();
			}
		};

		Shell.prototype.ontap = function(oEvent) {
			if (oEvent.target.className
				&& oEvent.target.className.indexOf /* not available for SVG elements */
				&& oEvent.target.className.indexOf("sapMShellHeaderLogout") > -1) { // logout button clicked
				this.fireLogout();
			}
		};


		// API methods

		Shell.prototype.setTitle = function(sTitle) {
			this.$("hdrTxt").text(sTitle);
			this.setProperty("title", sTitle, true); // no rerendering
			return this;
		};

		Shell.prototype.setHeaderRightText = function(sText) {
			this.setProperty("headerRightText", sText, true); // no rerendering
			if (!sText) {
				sText = "";
			}
			this.$("hdrRightTxt").text(sText).css("display", (sText ? "inline" : "none"));
			return this;
		};

		Shell.prototype.setAppWidthLimited = function(bLimit) {
			this.$().toggleClass("sapMShellAppWidthLimited", bLimit);
			this.setProperty("appWidthLimited", bLimit, true); // no rerendering
			return this;
		};

		Shell.prototype.setBackgroundOpacity = function(fOpacity) {
			if (fOpacity > 1 || fOpacity < 0) {
				Log.warning("Invalid value " + fOpacity + " for Shell.setBackgroundOpacity() ignored. Valid values are: floats between 0 and 1.");
				return this;
			}
			this.$("BG").css("opacity", fOpacity);
			return this.setProperty("backgroundOpacity", fOpacity, true); // no rerendering - live opacity change looks cooler
		};

		/**
		 * Sets the icon used for the mobile device home screen and the icon to be used for bookmarks by desktop browsers.
		 * This property should be only set once, and as early as possible.
		 *
		 * See {@link module:sap/ui/util/Mobile.setIcons} for full documentation.
		 *
		 * @param {Object<string, string>} oIcons Icon given as a JS object holding icon URLs and other settings.
		 * @returns {this} Reference to <code>this</code> for method chaining
		 */
		Shell.prototype.setHomeIcon = function(oIcons) {
			this.setProperty("homeIcon", oIcons, true); // no rerendering
			Mobile.setIcons(oIcons);
			return this;
		};

		Shell.prototype._getImage = function() {
			if (!this.oImg) {
				this.oImg = new Image(this.getId() + "-logo", {
					decorative: false,
					alt: Library.getResourceBundleFor("sap.m").getText("SHELL_ARIA_LOGO")
				});

				this.oImg.addStyleClass("sapMShellLogoImg");
			}

			return this.oImg;
		};

		Shell.prototype._getImageSrc = function() {
			return this.getLogo() ? this.getLogo() : this._getGlobalLogo();
		};

		return Shell;
	});