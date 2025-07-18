/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Device and Feature Detection API: Provides information about the used browser / device and cross platform support for certain events
 * like media queries, orientation change or resizing.
 *
 * This API is independent from any other part of the UI5 framework. This allows it to be loaded beforehand, if it is needed, to create the UI5 bootstrap
 * dynamically depending on the capabilities of the browser or device.
 *
 * @version 1.138.0
 * @namespace
 * @name sap.ui.Device
 * @public
 */

// Introduce namespace if it does not yet exist
// ui5lint-disable no-globals
if (typeof window.sap !== "object" && typeof window.sap !== "function") {
	window.sap = {};
}
if (typeof window.sap.ui !== "object") {
	window.sap.ui = {};
}
// ui5lint-enable no-globals

(function() {
	"use strict";

	// Skip initialization if API is already available
	// ui5lint-disable no-globals
	if (typeof window.sap.ui.Device === "object" || typeof window.sap.ui.Device === "function") {
		var apiVersion = "1.138.0";
		window.sap.ui.Device._checkAPIVersion(apiVersion);
		return;
	}
	// ui5lint-enable no-globals

	var Device = {};

	////-------------------------- Logging -------------------------------------
	/* since we cannot use the logging from sap/base/Log.js, we need to come up with a separate
	 * solution for the device API
	 */

	var FATAL = 0,
		ERROR = 1,
		WARNING = 2,
		INFO = 3,
		DEBUG = 4,
		TRACE = 5;

	var DeviceLogger = function() {
		// helper function for date formatting
		function pad0(i, w) {
			return ("000" + String(i)).slice(-w);
		}
		this.defaultComponent = 'DEVICE';
		this.sWindowName = (window.top == window) ? "" : "[" + window.location.pathname.split('/').slice(-1)[0] + "] ";
		// Creates a new log entry depending on its level and component.
		this.log = function(iLevel, sMessage, sComponent) {
			sComponent = sComponent || this.defaultComponent || '';
			var oNow = new Date(),
				oLogEntry = {
					time: pad0(oNow.getHours(), 2) + ":" + pad0(oNow.getMinutes(), 2) + ":" + pad0(oNow.getSeconds(), 2),
					date: pad0(oNow.getFullYear(), 4) + "-" + pad0(oNow.getMonth() + 1, 2) + "-" + pad0(oNow.getDate(), 2),
					timestamp: oNow.getTime(),
					level: iLevel,
					message: sMessage || "",
					component: sComponent || ""
				};
			/*eslint-disable no-console */
			if (window.console) { // in FF, console might not exist; it might even disappear
				var logText = oLogEntry.date + " " + oLogEntry.time + " " + this.sWindowName + oLogEntry.message + " - " + oLogEntry.component;
				switch (iLevel) {
					case FATAL:
					case ERROR:
						console.error(logText);
						break;
					case WARNING:
						console.warn(logText);
						break;
					case INFO:
						console.info ? console.info(logText) : console.log(logText);
						break; // info not available in iOS simulator
					case DEBUG:
						console.debug(logText);
						break;
					case TRACE:
						console.trace(logText);
						break;
				}
			}
			/*eslint-enable no-console */
			return oLogEntry;
		};
	};
	// instantiate new logger
	var oLogger = new DeviceLogger();
	oLogger.log(INFO, "Device API logging initialized");


	//******** Version Check ********

	//Only used internal to make clear when Device API is loaded in wrong version
	Device._checkAPIVersion = function(sVersion) {
		var v = "1.138.0";
		if (v != sVersion) {
			oLogger.log(WARNING, "Device API version differs: " + v + " <-> " + sVersion);
		}
	};


	//******** Event Management ******** (see Event Provider)

	var mEventRegistry = {};

	function attachEvent(sEventId, fnFunction, oListener) {
		if (!mEventRegistry[sEventId]) {
			mEventRegistry[sEventId] = [];
		}
		mEventRegistry[sEventId].push({
			oListener: oListener,
			fFunction: fnFunction
		});
	}

	function detachEvent(sEventId, fnFunction, oListener) {
		var aEventListeners = mEventRegistry[sEventId];

		if (!aEventListeners) {
			return this;
		}

		for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
			if (aEventListeners[i].fFunction === fnFunction && aEventListeners[i].oListener === oListener) {
				aEventListeners.splice(i, 1);
				break;
			}
		}
		if (aEventListeners.length == 0) {
			delete mEventRegistry[sEventId];
		}
	}

	function fireEvent(sEventId, mParameters) {
		var aEventListeners = mEventRegistry[sEventId];
		var oInfo;
		if (aEventListeners) {
			aEventListeners = aEventListeners.slice();
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				oInfo = aEventListeners[i];
				oInfo.fFunction.call(oInfo.oListener || window, mParameters);
			}
		}
	}

	var oReducedNavigator;
	var setDefaultNavigator = function () {
		oReducedNavigator = {
			userAgent: window.navigator.userAgent,
			userAgentData: window.navigator.userAgentData,
			platform: window.navigator.platform
		};
		// Only add property standalone in case navigator has this property
		if (window.navigator.hasOwnProperty("standalone")) {
			oReducedNavigator.standalone = window.navigator.standalone;
		}
	};
	setDefaultNavigator();
	//******** OS Detection ********

	/**
	 * Contains information about the operating system of the Device.
	 *
	 * @namespace
	 * @name sap.ui.Device.os
	 * @public
	 */
	/**
	 * Enumeration containing the names of known operating systems.
	 *
	 * @namespace
	 * @name sap.ui.Device.os.OS
	 * @public
	 */
	/**
	 * The name of the operating system.
	 *
	 * @see sap.ui.Device.os.OS
	 * @name sap.ui.Device.os.name
	 * @type string
	 * @public
	 */
	/**
	 * The version of the operating system as <code>string</code>.
	 *
	 * Might be empty if no version can reliably be determined.
	 *
	 * **Note:** The property <code>versionStr</code> may not contain the correct version
	 * for Windows 11 onwards, depending on the point in time, the property is accessed
	 * or the browser's capability to provide the version.
	 * In this case the <code>versionStr</code> property may contain <code>10</code>.
	 *
	 * @name sap.ui.Device.os.versionStr
	 * @type string
	 * @public
	 */
	/**
	 * The version of the operating system as <code>float</code>.
	 *
	 * Might be <code>-1</code> if no version can reliably be determined.
	 *
	 * **Note:** The property <code>version</code> may not contain the correct version
	 * for Windows 11 onwards, depending on the point in time, the property is accessed
	 * or the browser's capability to provide the version.
	 * In this case the <code>version</code> property may contain <code>10</code>.
	 *
	 * @name sap.ui.Device.os.version
	 * @type float
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a Windows operating system is used.
	 *
	 * @name sap.ui.Device.os.windows
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a Linux operating system is used.
	 *
	 * @name sap.ui.Device.os.linux
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a Mac operating system is used.
	 *
	 * <b>Note:</b> An iPad using Safari browser, which is requesting desktop sites, is also recognized as Macintosh.
	 *
	 * @name sap.ui.Device.os.macintosh
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, an iOS operating system is used.
	 *
	 * @name sap.ui.Device.os.ios
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, an Android operating system is used.
	 *
	 * @name sap.ui.Device.os.android
	 * @type boolean
	 * @public
	 */
	/**
	 * Windows operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.WINDOWS
	 * @public
	 */
	/**
	 * MAC operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.MACINTOSH
	 * @public
	 */
	/**
	 * Linux operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.LINUX
	 * @public
	 */
	/**
	 * iOS operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.IOS
	 * @public
	 */
	/**
	 * Android operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.ANDROID
	 * @public
	 */

	var OS = {
		"WINDOWS": "win",
		"MACINTOSH": "mac",
		"LINUX": "linux",
		"IOS": "iOS",
		"ANDROID": "Android"
	};
	let oPlatform;

	function getOS() { // may return null!!

		var userAgent = oReducedNavigator.userAgent;

		var rPlatform, // regular expression for platform
			aMatches;

		function getDesktopOS() {
			var sPlatform = oReducedNavigator.platform;
			if (sPlatform.indexOf("Win") != -1) {
				// userAgent in windows 7 contains: windows NT 6.1
				// userAgent in windows 8 contains: windows NT 6.2 or higher
				// userAgent since windows 10: Windows NT 10[...]
				var rVersion = /Windows NT (\d+).(\d)/i;
				var uaResult = userAgent.match(rVersion);
				var sVersionStr = "";
				// Using Lighthouse tool within chrome on windows does not provide a valid userAgent
				// navigator.platform is 'Win' but navigator.userAgent indicates macOS
				if (uaResult) {
					if (uaResult[1] == "6") {
						if (uaResult[2] == 1) {
							sVersionStr = "7";
						} else if (uaResult[2] > 1) {
							sVersionStr = "8";
						}
					} else {
						sVersionStr = uaResult[1];
					}
				}
				return {
					"name": OS.WINDOWS,
					"versionStr": sVersionStr
				};
			} else if (sPlatform.indexOf("Mac") != -1) {
				return {
					"name": OS.MACINTOSH,
					"versionStr": ""
				};
			} else if (sPlatform.indexOf("Linux") != -1) {
				return {
					"name": OS.LINUX,
					"versionStr": ""
				};
			}
			oLogger.log(INFO, "OS detection returned no result");
			return null;
		}

		rPlatform = /\(([a-zA-Z ]+);\s(?:[U]?[;]?)([\D]+)((?:[\d._]*))(?:.*[\)][^\d]*)([\d.]*)\s/;
		aMatches = userAgent.match(rPlatform);
		if (aMatches) {
			var rAppleDevices = /iPhone|iPad|iPod/;
			if (aMatches[0].match(rAppleDevices)) {
				aMatches[3] = aMatches[3].replace(/_/g, ".");
				//result[1] contains info of devices
				return ({
					"name": OS.IOS,
					"versionStr": aMatches[3]
				});
			} else if (aMatches[2].match(/Android/)) {
				aMatches[2] = aMatches[2].replace(/\s/g, "");
				return ({
					"name": OS.ANDROID,
					"versionStr": aMatches[3]
				});
			}
		}

		//Firefox on Android
		rPlatform = /\((Android)[\s]?([\d][.\d]*)?;.*Firefox\/[\d][.\d]*/;
		aMatches = userAgent.match(rPlatform);
		if (aMatches) {
			return ({
				"name": OS.ANDROID,
				"versionStr": aMatches.length == 3 ? aMatches[2] : ""
			});
		}

		// Desktop
		return getDesktopOS();
	}

	function setOS() {
		Device.os = getOS() || {};
		Device.os.OS = OS;
		Device.os.version = Device.os.versionStr ? parseFloat(Device.os.versionStr) : -1;

		if (Device.os.name) {
			for (var name in OS) {
				if (OS[name] === Device.os.name) {
					Device.os[name.toLowerCase()] = true;
				}
			}
		}

		/**
		 * Provides the operating system version of the Device using browser client hints.
		 * In case the browser does not support client hints, the versionStr detected from the userAgent is returned.
		 * @returns {Promise<float>} A promise that resolves with the version of the operating system as <code>string</code>.
		 * @ui5-restricted sap.ui.core
		 */
		Device.os.getPlatformInfo = function () {
			if (oPlatform || !oReducedNavigator.userAgentData) {
				return Promise.resolve(Device.os);
			}
			return oReducedNavigator.userAgentData.getHighEntropyValues(["platformVersion"]).then((oClientHints) => {
				oPlatform = {
					OS,
					version: parseFloat(oClientHints.platformVersion),
					versionStr: oClientHints.platformVersion,
					name: oClientHints.platform,
					getPlatformInfo: () => Promise.resolve(Device.os)
				};

				if (oClientHints.platform === "macOS") {
					oPlatform.name = "MACINTOSH";
				} else if (oClientHints.platform === "Windows") {
					// Map windows version according to
					// https://learn.microsoft.com/en-us/microsoft-edge/web-platform/how-to-detect-win11#detecting-specific-windows-versions
					if (oPlatform.version >= 13) {
						oPlatform.versionStr = "11";
						oPlatform.version = 11;
					} else if (oPlatform.version > 0) {
						oPlatform.versionStr = "10";
						oPlatform.version = 10;
					} else {
						oPlatform.versionStr = Device.os.versionStr;
						oPlatform.version = Device.os.version;
					}
				}
				oPlatform[oPlatform.name.toLowerCase()] = true;
				oPlatform.name = OS[oPlatform.name.toUpperCase()];

				Device.os = oPlatform;
				return Device.os;
			});
		};
	}
	setOS();

	//******** Browser Detection ********

	/**
	 * Contains information about the used browser.
	 *
	 * @namespace
	 * @name sap.ui.Device.browser
	 * @public
	 */

	/**
	 * Enumeration containing the names of known browsers.
	 *
	 * @namespace
	 * @name sap.ui.Device.browser.BROWSER
	 * @public
	 */

	/**
	 * The name of the browser.
	 *
	 * @see sap.ui.Device.browser.BROWSER
	 * @name sap.ui.Device.browser.name
	 * @type string
	 * @public
	 */
	/**
	 * The name of the browser for reporting use cases.
	 *
	 * @see sap.ui.Device.browser.BROWSER
	 * @name sap.ui.Device.browser.reportingName
	 * @type string
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	/**
	 * The version of the browser as <code>string</code>.
	 *
	 * Might be empty if no version can be determined.
	 *
	 * @name sap.ui.Device.browser.versionStr
	 * @type string
	 * @public
	 */
	/**
	 * The version of the browser as <code>float</code>.
	 *
	 * Might be <code>-1</code> if no version can be determined.
	 *
	 * @name sap.ui.Device.browser.version
	 * @type float
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the mobile variant of the browser is used or
	 * a tablet or phone device is detected.
	 *
	 * <b>Note:</b> This information might not be available for all browsers.
	 * <b>Note:</b> The flag is also set to <code>true</code> for any touch device,
	 * including laptops with touchscreen monitor.
	 * For more information, see the documentation for {@link sap.ui.Device.system.combi} devices.
	 *
	 * @name sap.ui.Device.browser.mobile
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the Mozilla Firefox browser is used.
	 *
	 * @name sap.ui.Device.browser.firefox
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a browser that is based on the Chromium browser
	 * project is used, such as the Google Chrome browser or the Microsoft Edge (Chromium) browser.
	 *
	 * @name sap.ui.Device.browser.chrome
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the Apple Safari browser is used.
	 *
	 * <b>Note:</b>
	 * This flag is also <code>true</code> when the standalone (fullscreen) mode or webview is used on iOS devices.
	 * Please also note the flags {@link sap.ui.Device.browser.fullscreen} and {@link sap.ui.Device.browser.webview}.
	 *
	 * @name sap.ui.Device.browser.safari
	 * @type boolean
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, a browser featuring a Webkit engine is used.
	 *
	 * <b>Note:</b>
	 * This flag is also <code>true</code> when the used browser was based on the Webkit engine, but
	 * uses another rendering engine in the meantime. For example the Chrome browser started from version 28 and above
	 * uses the Blink rendering engine.
	 *
	 * @name sap.ui.Device.browser.webkit
	 * @type boolean
	 * @since 1.20.0
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, a browser featuring a Blink rendering engine is used.
	 *
	 * @name sap.ui.Device.browser.blink
	 * @type boolean
	 * @since 1.56.0
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, the Safari browser runs in standalone fullscreen mode on iOS.
	 *
	 * <b>Note:</b> This flag is only available if the Safari browser was detected. There might be slight
	 * differences in behavior and detection, e.g. regarding the availability of {@link sap.ui.Device.browser.version}.
	 *
	 * @name sap.ui.Device.browser.fullscreen
	 * @type boolean
	 * @since 1.31.0
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the Safari browser runs in webview mode on iOS.
	 *
	 * <b>Note:</b> Since iOS 11 it is no longer reliably possible to detect whether an application runs in <code>webview</code>.
	 * The flag is <code>true</code> if the browser's user agent contains 'SAPFioriClient'. Applications
	 * using WKWebView have the possibility to customize the user agent, and to explicitly add this information.
	 *
	 * @name sap.ui.Device.browser.webview
	 * @deprecated as of version 1.98.
	 * @type boolean
	 * @since 1.31.0
	 * @public
	 */
	/**
	 * The version of the used Webkit engine, if available.
	 *
	 * @see sap.ui.Device.browser.webkit
	 * @name sap.ui.Device.browser.webkitVersion
	 * @type string
	 * @since 1.20.0
	 * @private
	 */
	/**
	 * If this flag is set to <code>true</code>, a browser featuring a Mozilla engine is used.
	 *
	 * @name sap.ui.Device.browser.mozilla
	 * @type boolean
	 * @since 1.20.0
	 * @public
	 */
	/**
	 * Firefox browser name.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.FIREFOX
	 * @public
	 */
	/**
	 * Chrome browser name, used for Google Chrome browser and Microsoft Edge (Chromium) browser.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.CHROME
	 * @public
	 */
	/**
	 * Safari browser name.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.SAFARI
	 * @public
	 */
	/**
	 * Android stock browser name.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.ANDROID
	 * @public
	 */
	/**
	 * Edge stock browser name.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.EDGE
	 * @private
	 * @ui5-restricted sap.ui.core
	 */

	const BROWSER = {
		"EDGE": "ed",
		"FIREFOX": "ff",
		"CHROME": "cr",
		"SAFARI": "sf",
		"ANDROID": "an"
	};

	function getBrowser() {
		var sUserAgent = oReducedNavigator.userAgent,
			sLowerCaseUserAgent = sUserAgent.toLowerCase();

		/*!
		 * Taken from jQuery JavaScript Library v1.7.1
		 * http://jquery.com/
		 *
		 * Copyright 2011, John Resig
		 * Dual licensed under the MIT or GPL Version 2 licenses.
		 * http://jquery.org/license
		 *
		 * Includes Sizzle.js
		 * http://sizzlejs.com/
		 * Copyright 2011, The Dojo Foundation
		 * Released under the MIT, BSD, and GPL Licenses.
		 *
		 * Date: Mon Nov 21 21:11:03 2011 -0500
		 */
		function calcBrowser() {
			var rwebkit = /(webkit)[ \/]([\w.]+)/;
			var rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;

			var browserMatch = rwebkit.exec(sLowerCaseUserAgent) ||
				sLowerCaseUserAgent.indexOf("compatible") < 0 && rmozilla.exec(sLowerCaseUserAgent) || [];

			var oRes = {
				browser: browserMatch[1] || "",
				version: browserMatch[2] || "0"
			};
			oRes[oRes.browser] = true;
			return oRes;
		}

		var oBrowser = calcBrowser();

		// jQuery checks for user agent strings. We differentiate between browsers
		var oExpMobile;
		var oResult;
		var fVersion;
		if (oBrowser.mozilla) {
			oExpMobile = /Mobile/;
			if (sUserAgent.match(/Firefox\/(\d+\.\d+)/)) {
				fVersion = parseFloat(RegExp.$1);
				oResult = {
					name: BROWSER.FIREFOX,
					versionStr: "" + fVersion,
					version: fVersion,
					mozilla: true,
					mobile: oExpMobile.test(sUserAgent),
					reportingName: BROWSER.FIREFOX
				};
			} else {
				// unknown mozilla browser
				oResult = {
					mobile: oExpMobile.test(sUserAgent),
					mozilla: true,
					version: -1
				};
			}
		} else if (oBrowser.webkit) {
			// webkit version is needed for calculation if the mobile android device is a tablet (calculation of other mobile devices work without)
			var regExpWebkitVersion = sLowerCaseUserAgent.match(/webkit[\/]([\d.]+)/);
			var webkitVersion;
			if (regExpWebkitVersion) {
				webkitVersion = regExpWebkitVersion[1];
			}
			oExpMobile = /Mobile/;
			var aChromeMatch = sUserAgent.match(/(Chrome|CriOS)\/(\d+\.\d+).\d+/);
			var aEdgeMatch = sUserAgent.match(/(Edg)\/(\d+\.\d+).\d+/);
			var aFirefoxMatch = sUserAgent.match(/FxiOS\/(\d+\.\d+)/);
			var aAndroidMatch = sUserAgent.match(/Android .+ Version\/(\d+\.\d+)/);
			let sReportingName;

			if (aChromeMatch || aFirefoxMatch || aAndroidMatch) {
				var sName, sVersion, bMobile;
				if (aChromeMatch) {
					sName = BROWSER.CHROME;
					bMobile = oExpMobile.test(sUserAgent);
					sVersion = parseFloat(aChromeMatch[2]);
					sReportingName = aEdgeMatch ? BROWSER.EDGE : BROWSER.CHROME;
				} else if (aFirefoxMatch) {
					sName = sReportingName = BROWSER.FIREFOX;
					bMobile = true;
					sVersion = parseFloat(aFirefoxMatch[1]);
				} else if (aAndroidMatch) {
					sName = sReportingName = BROWSER.ANDROID;
					bMobile = oExpMobile.test(sUserAgent);
					sVersion = parseFloat(aAndroidMatch[1]);
				}

				oResult = {
					name: sName,
					mobile: bMobile,
					versionStr: "" + sVersion,
					version: sVersion,
					webkit: true,
					webkitVersion: webkitVersion,
					reportingName: sReportingName
				};
			} else { // Safari might have an issue with sUserAgent.match(...); thus changing
				var oExp = /Version\/(\d+\.\d+).*Safari/;
				if (oExp.test(sUserAgent) || /iPhone|iPad|iPod/.test(sUserAgent)) {
					var bStandalone = oReducedNavigator.standalone;
					oResult =  {
						name: BROWSER.SAFARI,
						fullscreen: bStandalone === undefined ? false : bStandalone,
						/**
						 * @deprecated as of version 1.98
						 */
						webview: /SAPFioriClient/.test(sUserAgent),
						mobile: oExpMobile.test(sUserAgent),
						webkit: true,
						webkitVersion: webkitVersion,
						reportingName: BROWSER.SAFARI
					};
					var aParts = oExp.exec(sUserAgent);
					if (aParts) {
						fVersion = parseFloat(aParts[1]);
						oResult.versionStr = "" + fVersion;
						oResult.version = fVersion;
					} else {
						oResult.version = -1;
					}
				} else { // other webkit based browser
					oResult = {
						mobile: oExpMobile.test(sUserAgent),
						webkit: true,
						webkitVersion: webkitVersion,
						version: -1
					};
				}
			}
		} else {
			oResult = {
				name: "",
				versionStr: "",
				version: -1,
				mobile: false,
				reportingName: ""
			};
		}

		// Check for Blink rendering engine (https://stackoverflow.com/questions/20655470/how-to-detect-blink-in-chrome)
		if ((oBrowser.chrome || window.Intl && window.Intl.v8BreakIterator) && 'CSS' in window) {
			oResult.blink = true;
		}

		return oResult;
	}

	function setBrowser() {
		Device.browser = getBrowser();
		Device.browser.BROWSER = BROWSER;

		if (Device.browser.name) {
			for (var b in BROWSER) {
				if (BROWSER[b] === Device.browser.name) {
					Device.browser[b.toLowerCase()] = true;
				}
			}
		}
	}
	setBrowser();




	//******** Support Detection ********

	/**
	 * Contains information about detected capabilities of the used browser or Device.
	 *
	 * @namespace
	 * @name sap.ui.Device.support
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, the used browser supports touch events.
	 *
	 * <b>Note:</b> This flag indicates whether the used browser supports touch events or not.
	 * This does not necessarily mean that the used device has a touchable screen.
	 * <b>Note:</b> This flag also affects other {@link sap.ui.Device} properties.
	 * For more information, see the documentation for {@link sap.ui.Device.browser.mobile} and
	 * {@link sap.ui.Device.system.combi} devices.
	 *
	 * @name sap.ui.Device.support.touch
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser supports pointer events.
	 *
	 * @name sap.ui.Device.support.pointer
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser natively supports media queries via JavaScript.
	 *
	 * <b>Note:</b> The {@link sap.ui.Device.media media queries API} of the device API can also be used when there is no native support.
	 *
	 * @name sap.ui.Device.support.matchmedia
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser natively supports events of media queries via JavaScript.
	 *
	 * <b>Note:</b> The {@link sap.ui.Device.media media queries API} of the device API can also be used when there is no native support.
	 *
	 * @name sap.ui.Device.support.matchmedialistener
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser natively supports the <code>orientationchange</code> event.
	 *
	 * <b>Note:</b> The {@link sap.ui.Device.orientation orientation event} of the device API can also be used when there is no native support.
	 *
	 * @name sap.ui.Device.support.orientation
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device has a display with a high resolution.
	 *
	 * @name sap.ui.Device.support.retina
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser supports web sockets.
	 *
	 * @name sap.ui.Device.support.websocket
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser supports the <code>placeholder</code> attribute on <code>input</code> elements.
	 *
	 * @name sap.ui.Device.support.input.placeholder
	 * @type boolean
	 * @public
	 */

	Device.support = {};

	/**
	 * 1. Maybe better to but this on Device.browser because there are cases that a browser can touch but a device can't!
	 * 2. Chrome 70 removes the 'ontouchstart' from window for device with and without touch screen. Therefore we need to
	 * use maxTouchPoints to check whether the device support touch interaction
	 * 3. FF 52 fires touch events (touch start) when tapping, but the support is only detectable with "window.TouchEvent".
	 * This is also the recommended way of detecting touch feature support, according to the Chrome Developers
	 * (https://www.chromestatus.com/feature/4764225348042752).
	*/
	var detectTouch = function () {
		return !!(('ontouchstart' in window)
			|| (window.navigator.maxTouchPoints > 0)
			|| (window.DocumentTouch && document instanceof window.DocumentTouch)
			|| (window.TouchEvent && Device.browser.firefox));
	};

	Device.support.touch = detectTouch();

	Device.support.pointer = !!window.PointerEvent;

	Device.support.matchmedia = true;
	Device.support.matchmedialistener = true;

	Device.support.orientation = !!("orientation" in window && "onorientationchange" in window);

	Device.support.retina = (window.retina || window.devicePixelRatio >= 2);

	Device.support.websocket = ('WebSocket' in window);

	Device.support.input = {};
	Device.support.input.placeholder = ('placeholder' in document.createElement("input"));

	//******** Match Media ********

	/**
	 * Event API for screen width changes.
	 *
	 * This API is based on media queries but can also be used if media queries are not natively supported by the used browser.
	 * In this case, the behavior of media queries is simulated by this API.
	 *
	 * There are several predefined {@link sap.ui.Device.media.RANGESETS range sets} available. Each of them defines a
	 * set of intervals for the screen width (from small to large). Whenever the screen width changes and the current screen width is in
	 * a different interval to the one before the change, the registered event handlers for the range set are called.
	 *
	 * If needed, it is also possible to define a custom set of intervals.
	 *
	 * The following example shows a typical use case:
	 * <pre>
	 * function sizeChanged(mParams) {
	 *     switch(mParams.name) {
	 *         case "Phone":
	 *             // Do what is needed for a little screen
	 *             break;
	 *         case "Tablet":
	 *             // Do what is needed for a medium sized screen
	 *             break;
	 *         case "Desktop":
	 *             // Do what is needed for a large screen
	 *     }
	 * }
	 *
	 * // Register an event handler to changes of the screen size
	 * sap.ui.Device.media.attachHandler(sizeChanged, null, sap.ui.Device.media.RANGESETS.SAP_STANDARD);
	 * // Do some initialization work based on the current size
	 * sizeChanged(sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD));
	 * </pre>
	 *
	 * @namespace
	 * @name sap.ui.Device.media
	 * @public
	 */
	Device.media = {};

	/**
	 * Enumeration containing the names and settings of predefined screen width media query range sets.
	 *
	 * @namespace
	 * @name sap.ui.Device.media.RANGESETS
	 * @public
	 */

	/**
	 * A 3-step range set (S-L).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"S"</code>: For screens smaller than 520 pixels.</li>
	 * <li><code>"M"</code>: For screens greater than or equal to 520 pixels and smaller than 960 pixels.</li>
	 * <li><code>"L"</code>: For screens greater than or equal to 960 pixels.</li>
	 * </ul>
	 *
	 * To use this range set, you must initialize it explicitly ({@link sap.ui.Device.media.initRangeSet}).
	 *
	 * If this range set is initialized, a CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-3Step-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_3STEPS
	 * @type string
	 * @public
	 */
	/**
	 * A 4-step range set (S-XL).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"S"</code>: For screens smaller than 520 pixels.</li>
	 * <li><code>"M"</code>: For screens greater than or equal to 520 pixels and smaller than 760 pixels.</li>
	 * <li><code>"L"</code>: For screens greater than or equal to 760 pixels and smaller than 960 pixels.</li>
	 * <li><code>"XL"</code>: For screens greater than or equal to 960 pixels.</li>
	 * </ul>
	 *
	 * To use this range set, you must initialize it explicitly ({@link sap.ui.Device.media.initRangeSet}).
	 *
	 * If this range set is initialized, a CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-4Step-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_4STEPS
	 * @type string
	 * @public
	 */
	/**
	 * A 6-step range set (XS-XXL).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"XS"</code>: For screens smaller than 241 pixels.</li>
	 * <li><code>"S"</code>: For screens greater than or equal to 241 pixels and smaller than 400 pixels.</li>
	 * <li><code>"M"</code>: For screens greater than or equal to 400 pixels and smaller than 541 pixels.</li>
	 * <li><code>"L"</code>: For screens greater than or equal to 541 pixels and smaller than 768 pixels.</li>
	 * <li><code>"XL"</code>: For screens greater than or equal to 768 pixels and smaller than 960 pixels.</li>
	 * <li><code>"XXL"</code>: For screens greater than or equal to 960 pixels.</li>
	 * </ul>
	 *
	 * To use this range set, you must initialize it explicitly ({@link sap.ui.Device.media.initRangeSet}).
	 *
	 * If this range set is initialized, a CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-6Step-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_6STEPS
	 * @type string
	 * @public
	 */
	/**
	 * A 3-step range set (Phone, Tablet, Desktop).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"Phone"</code>: For screens smaller than 600 pixels.</li>
	 * <li><code>"Tablet"</code>: For screens greater than or equal to 600 pixels and smaller than 1024 pixels.</li>
	 * <li><code>"Desktop"</code>: For screens greater than or equal to 1024 pixels.</li>
	 * </ul>
	 *
	 * This range set is initialized by default. An initialization via {@link sap.ui.Device.media.initRangeSet} is not needed.
	 *
	 * A CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-Std-<i>NAME_OF_THE_INTERVAL</i></code>.
	 * Furthermore there are 5 additional CSS classes to hide elements based on the width of the screen:
	 * <ul>
	 * <li><code>sapUiHideOnPhone</code>: Will be hidden if the screen has 600px or less</li>
	 * <li><code>sapUiHideOnTablet</code>: Will be hidden if the screen has more than 600px and less than 1023px</li>
	 * <li><code>sapUiHideOnDesktop</code>: Will be hidden if the screen is larger than 1024px</li>
	 * <li><code>sapUiVisibleOnlyOnPhone</code>: Will be visible only if the screen has less than 600px</li>
	 * <li><code>sapUiVisibleOnlyOnTablet</code>: Will be visible only if the screen has 600px or more but less than 1024px</li>
	 * <li><code>sapUiVisibleOnlyOnDesktop</code>: Will be visible only if the screen has 1024px or more</li>
	 * </ul>
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_STANDARD
	 * @type string
	 * @public
	 */

	/**
	 * A 4-step range set (Phone, Tablet, Desktop, LargeDesktop).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"Phone"</code>: For screens smaller than 600 pixels.</li>
	 * <li><code>"Tablet"</code>: For screens greater than or equal to 600 pixels and smaller than 1024 pixels.</li>
	 * <li><code>"Desktop"</code>: For screens greater than or equal to 1024 pixels and smaller than 1440 pixels.</li>
	 * <li><code>"LargeDesktop"</code>: For screens greater than or equal to 1440 pixels.</li>
	 * </ul>
	 *
	 * This range set is initialized by default. An initialization via {@link sap.ui.Device.media.initRangeSet} is not needed.
	 *
	 * A CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-StdExt-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_STANDARD_EXTENDED
	 * @type string
	 * @public
	 */

	var RANGESETS = {
		"SAP_3STEPS": "3Step",
		"SAP_4STEPS": "4Step",
		"SAP_6STEPS": "6Step",
		"SAP_STANDARD": "Std",
		"SAP_STANDARD_EXTENDED": "StdExt"
	};
	Device.media.RANGESETS = RANGESETS;
	Device.media._predefinedRangeSets = {};
	Device.media._predefinedRangeSets[RANGESETS.SAP_3STEPS] = {
		points: [520, 960],
		unit: "px",
		name: RANGESETS.SAP_3STEPS,
		names: ["S", "M", "L"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_4STEPS] = {
		points: [520, 760, 960],
		unit: "px",
		name: RANGESETS.SAP_4STEPS,
		names: ["S", "M", "L", "XL"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_6STEPS] = {
		points: [241, 400, 541, 768, 960],
		unit: "px",
		name: RANGESETS.SAP_6STEPS,
		names: ["XS", "S", "M", "L", "XL", "XXL"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_STANDARD] = {
		points: [600, 1024],
		unit: "px",
		name: RANGESETS.SAP_STANDARD,
		names: ["Phone", "Tablet", "Desktop"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_STANDARD_EXTENDED] = {
		points: [600, 1024, 1440],
		unit: "px",
		name: RANGESETS.SAP_STANDARD_EXTENDED,
		names: ["Phone", "Tablet", "Desktop", "LargeDesktop"]
	};
	var _defaultRangeSet = RANGESETS.SAP_STANDARD;
	var iMediaTimeout = Device.support.matchmedialistener ? 0 : 100;
	var oQuerySets = {};
	var iMediaCurrentWidth = null;

	function getQuery(iFrom, iTo, iUnit) {
		iUnit = iUnit || "px";
		var sQuery = "all";
		if (iFrom > 0) {
			sQuery = sQuery + " and (min-width:" + iFrom + iUnit + ")";
		}
		if (iTo > 0) {
			sQuery = sQuery + " and (max-width:" + iTo + iUnit + ")";
		}
		return sQuery;
	}

	function handleChange(sName) {
		if (!Device.support.matchmedialistener && iMediaCurrentWidth == windowSize()[0]) {
			return; //Skip unnecessary resize events
		}

		if (oQuerySets[sName].timer) {
			clearTimeout(oQuerySets[sName].timer);
			oQuerySets[sName].timer = null;
		}

		oQuerySets[sName].timer = setTimeout(function() {
			var mParams = checkQueries(sName, false);
			if (mParams) {
				fireEvent("media_" + sName, mParams);
			}
		}, iMediaTimeout);
	}

	function checkQueries(sName, bInfoOnly, fnMatches) {
		function getRangeInfo(sSetName, iRangeIdx) {
			var q = oQuerySets[sSetName].queries[iRangeIdx];
			var info = {
				from: q.from,
				unit: oQuerySets[sSetName].unit
			};
			if (q.to >= 0) {
				info.to = q.to;
			}
			if (oQuerySets[sSetName].names) {
				info.name = oQuerySets[sSetName].names[iRangeIdx];
			}
			return info;
		}

		fnMatches = fnMatches || Device.media.matches;
		if (oQuerySets[sName]) {
			var aQueries = oQuerySets[sName].queries;
			var info = null;
			for (var i = 0, len = aQueries.length; i < len; i++) {
				var q = aQueries[i];
				if ((q != oQuerySets[sName].currentquery || bInfoOnly) && fnMatches(q.from, q.to, oQuerySets[sName].unit)) {
					if (!bInfoOnly) {
						oQuerySets[sName].currentquery = q;
					}
					if (!oQuerySets[sName].noClasses && oQuerySets[sName].names && !bInfoOnly) {
						refreshCSSClasses(sName, oQuerySets[sName].names[i]);
					}
					info = getRangeInfo(sName, i);
				}
			}

			return info;
		}
		oLogger.log(WARNING, "No queryset with name " + sName + " found", 'DEVICE.MEDIA');
		return null;
	}

	function refreshCSSClasses(sSetName, sRangeName, bRemove) {
		var sClassPrefix = "sapUiMedia-" + sSetName + "-";
		changeRootCSSClass(sClassPrefix + sRangeName, bRemove, sClassPrefix);
	}

	function changeRootCSSClass(sClassName, bRemove, sPrefix) {
		var oRoot = document.documentElement;
		if (oRoot.className.length == 0) {
			if (!bRemove) {
				oRoot.className = sClassName;
			}
		} else {
			var aCurrentClasses = oRoot.className.split(" ");
			var sNewClasses = "";
			for (var i = 0; i < aCurrentClasses.length; i++) {
				if ((sPrefix && aCurrentClasses[i].indexOf(sPrefix) != 0) || (!sPrefix && aCurrentClasses[i] != sClassName)) {
					sNewClasses = sNewClasses + aCurrentClasses[i] + " ";
				}
			}
			if (!bRemove) {
				sNewClasses = sNewClasses + sClassName;
			}
			oRoot.className = sNewClasses;
		}
	}

	function windowSize() {

		return [window.innerWidth, window.innerHeight];
	}

	function matchLegacyBySize(iFrom, iTo, sUnit, iSize) {
		function convertToPx(iValue, sUnit) {
			if (sUnit === "em" || sUnit === "rem") {
				var fnGetStyle = window.getComputedStyle || function(e) {
					return e.currentStyle;
				};
				var iFontSize = fnGetStyle(document.documentElement).fontSize;
				var iFactor = (iFontSize && iFontSize.indexOf("px") >= 0) ? parseFloat(iFontSize, 10) : 16;
				return iValue * iFactor;
			}
			return iValue;
		}

		iFrom = convertToPx(iFrom, sUnit);
		iTo = convertToPx(iTo, sUnit);

		var width = iSize[0];
		var a = iFrom < 0 || iFrom <= width;
		var b = iTo < 0 || width <= iTo;
		return a && b;
	}

	function matchLegacy(iFrom, iTo, sUnit) {
		return matchLegacyBySize(iFrom, iTo, sUnit, windowSize());
	}

	function match(iFrom, iTo, sUnit) {
		var oQuery = getQuery(iFrom, iTo, sUnit);
		var mm = window.matchMedia(oQuery); //FF returns null when running within an iframe with display:none
		return mm && mm.matches;
	}

	Device.media.matches = Device.support.matchmedia ? match : matchLegacy;

	/**
	 * Registers the given event handler to change events of the screen width based on the range set with the specified name.
	 *
	 * The event is fired whenever the screen width changes and the current screen width is in
	 * a different interval of the given range set than before the width change.
	 *
	 * The event handler is called with a single argument: a map <code>mParams</code> which provides the following information
	 * about the entered interval:
	 * <ul>
	 * <li><code>mParams.from</code>: The start value (inclusive) of the entered interval as a number</li>
	 * <li><code>mParams.to</code>: The end value (exclusive) range of the entered interval as a number or undefined for the last interval (infinity)</li>
	 * <li><code>mParams.unit</code>: The unit used for the values above, e.g. <code>"px"</code></li>
	 * <li><code>mParams.name</code>: The name of the entered interval, if available</li>
	 * </ul>
	 *
	 * @param {function({from: number, to: number, unit: string, name: string | undefined})}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the <code>window</code> instance. A map with information
	 *                       about the entered range set is provided as a single argument to the handler (see details above).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the <code>window</code>.
	 * @param {string}
	 *            [sName] The name of the range set to listen to. The range set must be initialized beforehand
	 *                  ({@link sap.ui.Device.media.initRangeSet}). If no name is provided, the
	 *                  {@link sap.ui.Device.media.RANGESETS.SAP_STANDARD default range set} is used.
	 *
	 * @name sap.ui.Device.media.attachHandler
	 * @function
	 * @public
	 */
	Device.media.attachHandler = function(fnFunction, oListener, sName) {
		var name = sName || _defaultRangeSet;
		attachEvent("media_" + name, fnFunction, oListener);
	};

	/**
	 * Removes a previously attached event handler from the change events of the screen width.
	 *
	 * The passed parameters must match those used for registration with {@link #.attachHandler} beforehand.
	 *
	 * @param {function}
	 *            fnFunction The handler function to detach from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 * @param {string}
	 *            [sName] The name of the range set to listen to. If no name is provided, the
	 *                   {@link sap.ui.Device.media.RANGESETS.SAP_STANDARD default range set} is used.
	 *
	 * @name sap.ui.Device.media.detachHandler
	 * @function
	 * @public
	 */
	Device.media.detachHandler = function(fnFunction, oListener, sName) {
		var name = sName || _defaultRangeSet;
		detachEvent("media_" + name, fnFunction, oListener);
	};

	/**
	 * Initializes a screen width media query range set.
	 *
	 * This initialization step makes the range set ready to be used for one of the other functions in namespace <code>sap.ui.Device.media</code>.
	 * The most important {@link sap.ui.Device.media.RANGESETS predefined range sets} are initialized automatically.
	 *
	 * To make a not yet initialized {@link sap.ui.Device.media.RANGESETS predefined range set} ready to be used, call this function with the
	 * name of the range set to be initialized:
	 * <pre>
	 * sap.ui.Device.media.initRangeSet(sap.ui.Device.media.RANGESETS.SAP_3STEPS);
	 * </pre>
	 *
	 * Alternatively it is possible to define custom range sets as shown in the following example:
	 * <pre>
	 * sap.ui.Device.media.initRangeSet("MyRangeSet", [200, 400], "px", ["Small", "Medium", "Large"]);
	 * </pre>
	 * This example defines the following named ranges:
	 * <ul>
	 * <li><code>"Small"</code>: For screens smaller than 200 pixels.</li>
	 * <li><code>"Medium"</code>: For screens greater than or equal to 200 pixels and smaller than 400 pixels.</li>
	 * <li><code>"Large"</code>: For screens greater than or equal to 400 pixels.</li>
	 * </ul>
	 * The range names are optional. If they are specified a CSS class (e.g. <code>sapUiMedia-MyRangeSet-Small</code>) is also
	 * added to the document root depending on the current active range. This can be suppressed via parameter <code>bSuppressClasses</code>.
	 *
	 * @param {string}
	 *             sName The name of the range set to be initialized - either a {@link sap.ui.Device.media.RANGESETS predefined} or custom one.
	 *                   The name must be a valid id and consist only of letters and numeric digits.
	 * @param {int[]}
	 *             [aRangeBorders] The range borders
	 * @param {string}
	 *             [sUnit] The unit which should be used for the values given in <code>aRangeBorders</code>.
	 *                     The allowed values are <code>"px"</code> (default), <code>"em"</code> or <code>"rem"</code>
	 * @param {string[]}
	 *             [aRangeNames] The names of the ranges. The names must be a valid id and consist only of letters and digits. If names
	 *             are specified, CSS classes are also added to the document root as described above. This behavior can be
	 *             switched off explicitly by using <code>bSuppressClasses</code>. <b>Note:</b> <code>aRangeBorders</code> with <code>n</code> entries
	 *             define <code>n+1</code> ranges. Therefore <code>n+1</code> names must be provided.
	 * @param {boolean}
	 *             [bSuppressClasses] Whether or not writing of CSS classes to the document root should be suppressed when
	 *             <code>aRangeNames</code> are provided
	 *
	 * @name sap.ui.Device.media.initRangeSet
	 * @function
	 * @public
	 */
	Device.media.initRangeSet = function(sName, aRangeBorders, sUnit, aRangeNames, bSuppressClasses) {
		//TODO Do some Assertions and parameter checking
		var oConfig;
		if (!sName) {
			oConfig = Device.media._predefinedRangeSets[_defaultRangeSet];
		} else if (sName && Device.media._predefinedRangeSets[sName]) {
			oConfig = Device.media._predefinedRangeSets[sName];
		} else {
			oConfig = {
				name: sName,
				unit: (sUnit || "px").toLowerCase(),
				points: aRangeBorders || [],
				names: aRangeNames,
				noClasses: !!bSuppressClasses
			};
		}

		if (Device.media.hasRangeSet(oConfig.name)) {
			oLogger.log(INFO, "Range set " + oConfig.name + " has already been initialized", 'DEVICE.MEDIA');
			return;
		}

		sName = oConfig.name;
		oConfig.queries = [];
		oConfig.timer = null;
		oConfig.currentquery = null;
		oConfig.listener = function() {
			return handleChange(sName);
		};

		var from, to, query;
		var aPoints = oConfig.points;
		for (var i = 0, len = aPoints.length; i <= len; i++) {
			from = (i == 0) ? 0 : aPoints[i - 1];
			to = (i == aPoints.length) ? -1 : aPoints[i];
			query = getQuery(from, to, oConfig.unit);
			oConfig.queries.push({
				query: query,
				from: from,
				to: to
			});
		}

		if (oConfig.names && oConfig.names.length != oConfig.queries.length) {
			oConfig.names = null;
		}

		oQuerySets[oConfig.name] = oConfig;

		oConfig.queries.forEach(function(oQuery) {
			oQuery.media = window.matchMedia(oQuery.query);
			if (oQuery.media.addEventListener) {
				oQuery.media.addEventListener("change", oConfig.listener);
			} else { // Safari 13 and older only supports deprecated MediaQueryList.addListener
				oQuery.media.addListener(oConfig.listener);
			}
		});

		oConfig.listener();
	};

	/**
	 * Returns information about the current active range of the range set with the given name.
	 *
	 * If the optional parameter <code>iWidth</code> is given, the active range will be determined for that width,
	 * otherwise it is determined for the current window size.
	 *
	 * @param {string} sName The name of the range set. The range set must be initialized beforehand ({@link sap.ui.Device.media.initRangeSet})
	 * @param {int} [iWidth] An optional width, based on which the range should be determined;
	 *             If <code>iWidth</code> is not a number, the window size will be used.
	 * @returns {{from: number, to: number, unit: string, name: string | undefined}} Information about the current active interval of the range set. The returned object has the same structure as the argument of the event handlers ({@link sap.ui.Device.media.attachHandler})
	 *
	 * @name sap.ui.Device.media.getCurrentRange
	 * @function
	 * @public
	 */
	Device.media.getCurrentRange = function(sName, iWidth) {
		if (!Device.media.hasRangeSet(sName)) {
			return null;
		}
		return checkQueries(sName, true, isNaN(iWidth) ? null : function(from, to, unit) {
			return matchLegacyBySize(from, to, unit, [iWidth, 0]);
		});
	};

	/**
	 * Returns <code>true</code> if a range set with the given name is already initialized.
	 *
	 * @param {string} sName The name of the range set.
	 *
	 * @name sap.ui.Device.media.hasRangeSet
	 * @return {boolean} Returns <code>true</code> if a range set with the given name is already initialized
	 * @function
	 * @public
	 */
	Device.media.hasRangeSet = function(sName) {
		return sName && !!oQuerySets[sName];
	};

	/**
	 * Removes a previously initialized range set and detaches all registered handlers.
	 *
	 * Only custom range sets can be removed via this function. Initialized predefined range sets
	 * ({@link sap.ui.Device.media.RANGESETS}) cannot be removed.
	 *
	 * @param {string} sName The name of the range set which should be removed.
	 *
	 * @name sap.ui.Device.media.removeRangeSet
	 * @function
	 * @protected
	 */
	Device.media.removeRangeSet = function(sName) {
		if (!Device.media.hasRangeSet(sName)) {
			oLogger.log(INFO, "RangeSet " + sName + " not found, thus could not be removed.", 'DEVICE.MEDIA');
			return;
		}

		for (var x in RANGESETS) {
			if (sName === RANGESETS[x]) {
				oLogger.log(WARNING, "Cannot remove default rangeset - no action taken.", 'DEVICE.MEDIA');
				return;
			}
		}

		var oConfig = oQuerySets[sName];
		var queries = oConfig.queries;
		for (var i = 0; i < queries.length; i++) {
			if (queries[i].media.removeEventListener) {
				queries[i].media.removeEventListener("change", oConfig.listener);
			} else { // Safari 13 and older only supports deprecated MediaQueryList.removeListener
				queries[i].media.removeListener(oConfig.listener);
			}
		}

		refreshCSSClasses(sName, "", true);
		delete mEventRegistry["media_" + sName];
		delete oQuerySets[sName];
	};

	//******** System Detection ********

	/**
	 * Provides a basic categorization of the used device based on various indicators.
	 *
	 * These indicators are, for example, the support of touch events, the used operating system, and the user agent of the browser.
	 *
	 * <b>Note:</b> There is no easy way to precisely determine the used device from the information provided by the browser. We therefore rely especially on the user agent.
     * In combination with given device capabilities, it is therefore possible that multiple flags are set to <code>true</code>.
     * This is mostly the case for desktop devices with touch capability, and for mobile devices requesting web pages as desktop pages.
	 *
	 * @namespace
	 * @name sap.ui.Device.system
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a tablet.
	 *
	 * Furthermore, a CSS class <code>sap-tablet</code> is added to the document root element.
	 *
	 * <b>Note:</b> This flag is also <code>true</code> for some browsers running on desktop devices. See the documentation for {@link sap.ui.Device.system.combi} devices.
	 * You can use the following logic to ensure that the current device is a tablet device:
	 *
	 * <pre>
	 * if(sap.ui.Device.system.tablet && !sap.ui.Device.system.desktop){
	 *	...tablet related commands...
	 * }
	 * </pre>
	 *
	 * @name sap.ui.Device.system.tablet
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a phone.
	 *
	 * Furthermore, a CSS class <code>sap-phone</code> is added to the document root element.
	 *
	 * <b>Note:</b> In case a phone requests a web page as a "Desktop Page", it is possible
	 * that all properties except <code>Device.system.phone</code> are set to <code>true</code>.
	 * In this case it is not possible to differentiate between tablet and phone relying on the user agent.
	 *
	 * @name sap.ui.Device.system.phone
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a desktop system.
	 *
	 * Furthermore, a CSS class <code>sap-desktop</code> is added to the document root element.
	 *
	 * <b>Note:</b> This flag is by default also true for Safari on iPads running on iOS 13 or higher.
	 * The end user can change this behavior by disabling "Request Desktop Website -> All websites" within the iOS settings.
	 * See also the documentation for {@link sap.ui.Device.system.combi} devices.
	 *
	 * @name sap.ui.Device.system.desktop
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a combination of a desktop system and tablet.
	 *
	 * Furthermore, a CSS class <code>sap-combi</code> is added to the document root element.
	 *
	 * <b>Note:</b> This property is set to <code>true</code> only when both a desktop and a mobile device is detected.
	 *
	 * @name sap.ui.Device.system.combi
	 * @type boolean
	 * @public
	 */
	/**
	 * Enumeration containing the names of known types of the devices.
	 *
	 * @namespace
	 * @name sap.ui.Device.system.SYSTEMTYPE
	 * @private
	 */

	var SYSTEMTYPE = {
		"TABLET": "tablet",
		"PHONE": "phone",
		"DESKTOP": "desktop",
		"COMBI": "combi"
	};

	Device.system = {};

	function getSystem(customUA) {
		var bTabletDetected = !!isTablet(customUA);

		var oSystem = {};
		oSystem.tablet = bTabletDetected;
		oSystem.phone = Device.support.touch && !bTabletDetected;
		oSystem.desktop = !!((!oSystem.tablet && !oSystem.phone) || Device.os.windows || Device.os.linux || Device.os.macintosh);
		oSystem.combi = oSystem.desktop && oSystem.tablet;
		oSystem.SYSTEMTYPE = SYSTEMTYPE;

		for (var type in SYSTEMTYPE) {
			changeRootCSSClass("sap-" + SYSTEMTYPE[type], !oSystem[SYSTEMTYPE[type]]);
		}
		return oSystem;
	}

	function isTablet() {
		var sUserAgent = oReducedNavigator.userAgent;
		if (Device.os.ios) {
			return /ipad/i.test(sUserAgent);
		} else if (Device.os.windows || Device.os.macintosh || Device.os.linux) {
			// For iOS:
			// With iOS 13 the string 'iPad' was removed from the user agent string through a browser setting, which is applied on all sites by default:
			// "Request Desktop Website -> All websites" (for more infos see: https://forums.developer.apple.com/thread/119186).
			// Therefore the OS is detected as MACINTOSH instead of iOS and the device is a tablet if the Device.support.touch is true.
			// For Android:
			// At least some devices (e.g. Samsung Galaxy S20 and Samsung Galaxy Tab S7) can't be recognized as Android device in case they request a page
			// as desktop page. In this case the userAgent does not contain any information regarding the real OS and we detect the device as linux OS
			// deriving from navigator.platform. Therefore we decided to handle this behaviour similar to iOS.
			return Device.support.touch;
		} else {
			//in real mobile device
			if (Device.support.touch) { // eslint-disable-line no-lonely-if
				return Device.browser.chrome && Device.os.android && !/Mobile Safari\/[.0-9]+/.test(sUserAgent);
			} else {
				// This simple android phone detection can be used here because this is the mobile emulation mode in desktop browser
				var bAndroidPhone = (/(?=android)(?=.*mobile)/i.test(sUserAgent));
				// in desktop browser, it's detected as tablet when Android emulation and it's not an Android phone
				return Device.os.android && !bAndroidPhone;
			}
		}
	}

	function setSystem() {
		Device.system = getSystem();
		if (Device.system.tablet || Device.system.phone) {
			Device.browser.mobile = true;
		}
	}
	setSystem();

	//******** Orientation Detection ********

	/**
	 * Common API for orientation change notifications across all platforms.
	 *
	 * For browsers or devices that do not provide native support for orientation change events
	 * the API simulates them based on the ratio of the document's width and height.
	 *
	 * @namespace
	 * @name sap.ui.Device.orientation
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the screen is currently in portrait mode (the height is greater than the width).
	 *
	 * @name sap.ui.Device.orientation.portrait
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the screen is currently in landscape mode (the width is greater than the height).
	 *
	 * @name sap.ui.Device.orientation.landscape
	 * @type boolean
	 * @public
	 */

	Device.orientation = {};

	/**
	 * Common API for document window size change notifications across all platforms.
	 *
	 * @namespace
	 * @name sap.ui.Device.resize
	 * @public
	 */
	/**
	 * The current height of the document's window in pixels.
	 *
	 * @name sap.ui.Device.resize.height
	 * @type int
	 * @public
	 */
	/**
	 * The current width of the document's window in pixels.
	 *
	 * @name sap.ui.Device.resize.width
	 * @type int
	 * @public
	 */

	Device.resize = {};

	/**
	 * Registers the given event handler to orientation change events of the document's window.
	 *
	 * The event is fired whenever the screen orientation changes and the width of the document's window
	 * becomes greater than its height or the other way round.
	 *
	 * The event handler is called with a single argument: a map <code>mParams</code> which provides the following information:
	 * <ul>
	 * <li><code>mParams.landscape</code>: If this flag is set to <code>true</code>, the screen is currently in landscape mode, otherwise in portrait mode.</li>
	 * </ul>
	 *
	 * @param {function}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the <code>window</code> instance. A map with information
	 *                       about the orientation is provided as a single argument to the handler (see details above).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the <code>window</code>.
	 *
	 * @name sap.ui.Device.orientation.attachHandler
	 * @function
	 * @public
	 */
	Device.orientation.attachHandler = function(fnFunction, oListener) {
		attachEvent("orientation", fnFunction, oListener);
	};

	/**
	 * Registers the given event handler to resize change events of the document's window.
	 *
	 * The event is fired whenever the document's window size changes.
	 *
	 * The event handler is called with a single argument: a map <code>mParams</code> which provides the following information:
	 * <ul>
	 * <li><code>mParams.height</code>: The height of the document's window in pixels.</li>
	 * <li><code>mParams.width</code>: The width of the document's window in pixels.</li>
	 * </ul>
	 *
	 * @param {function}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the <code>window</code> instance. A map with information
	 *                       about the size is provided as a single argument to the handler (see details above).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the <code>window</code>.
	 *
	 * @name sap.ui.Device.resize.attachHandler
	 * @function
	 * @public
	 */
	Device.resize.attachHandler = function(fnFunction, oListener) {
		attachEvent("resize", fnFunction, oListener);
	};

	/**
	 * Removes a previously attached event handler from the orientation change events.
	 *
	 * The passed parameters must match those used for registration with {@link #.attachHandler} beforehand.
	 *
	 * @param {function}
	 *            fnFunction The handler function to detach from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 *
	 * @name sap.ui.Device.orientation.detachHandler
	 * @function
	 * @public
	 */
	Device.orientation.detachHandler = function(fnFunction, oListener) {
		detachEvent("orientation", fnFunction, oListener);
	};

	/**
	 * Removes a previously attached event handler from the resize events.
	 *
	 * The passed parameters must match those used for registration with {@link #.attachHandler} beforehand.
	 *
	 * @param {function}
	 *            fnFunction The handler function to detach from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 *
	 * @name sap.ui.Device.resize.detachHandler
	 * @function
	 * @public
	 */
	Device.resize.detachHandler = function(fnFunction, oListener) {
		detachEvent("resize", fnFunction, oListener);
	};

	function setOrientationInfo(oInfo) {
		oInfo.landscape = isLandscape(true);
		oInfo.portrait = !oInfo.landscape;
	}

	function handleOrientationChange() {
		setOrientationInfo(Device.orientation);
		fireEvent("orientation", {
			landscape: Device.orientation.landscape
		});
	}

	/**
	 * Updates the current size values (height/width).
	 *
	 * @name sap.ui.Device.resize._update
	 * @function
	 * @private
	 */
	var handleResizeChange = Device.resize._update = function() {
		setResizeInfo(Device.resize);
		fireEvent("resize", {
			height: Device.resize.height,
			width: Device.resize.width
		});
	};

	function setResizeInfo(oInfo) {
		oInfo.width = windowSize()[0];
		oInfo.height = windowSize()[1];
	}

	function handleOrientationResizeChange() {
		var wasL = Device.orientation.landscape;
		var isL = isLandscape();
		if (wasL != isL) {
			handleOrientationChange();
		}
		//throttle resize events because most browsers throw one or more resize events per pixel
		//for every resize event inside the period from 150ms (starting from the first resize event),
		//we only fire one resize event after this period
		if (!iResizeTimeout) {
			iResizeTimeout = window.setTimeout(handleResizeTimeout, 150);
		}
	}

	function handleResizeTimeout() {
		handleResizeChange();
		iResizeTimeout = null;
	}

	var bOrientationchange = false;
	var bResize = false;
	var iOrientationTimeout;
	var iResizeTimeout;
	var iClearFlagTimeout;
	var iWindowHeightOld = windowSize()[1];
	var iWindowWidthOld = windowSize()[0];
	var bKeyboardOpen = false;
	var iLastResizeTime;
	var rInputTagRegex = /INPUT|TEXTAREA|SELECT/;
	// On iPhone with iOS version 7.0.x and on iPad with iOS version 7.x (tested with all versions below 7.1.1), there's an invalid resize event fired
	// when changing the orientation while keyboard is shown.
	var bSkipFirstResize = Device.os.ios && Device.browser.name === "sf" &&
		((Device.system.phone && Device.os.version >= 7 && Device.os.version < 7.1) || (Device.system.tablet && Device.os.version >= 7));

	function isLandscape(bFromOrientationChange) {
		if (Device.support.touch && Device.support.orientation && Device.os.android) {
			//if on screen keyboard is open and the call of this method is from orientation change listener, reverse the last value.
			//this is because when keyboard opens on android device, the height can be less than the width even in portrait mode.
			if (bKeyboardOpen && bFromOrientationChange) {
				return !Device.orientation.landscape;
			}
			if (bKeyboardOpen) { //when keyboard opens, the last orientation change value will be returned.
				return Device.orientation.landscape;
			}
		} else if (Device.support.matchmedia && Device.support.orientation) { //most desktop browsers and windows phone/tablet which not support orientationchange
			return !!window.matchMedia("(orientation: landscape)").matches;
		}
		//otherwise compare the width and height of window
		var size = windowSize();
		return size[0] > size[1];
	}

	function handleMobileOrientationResizeChange(evt) {
		if (evt.type == "resize") {
			// suppress the first invalid resize event fired before orientationchange event while keyboard is open on iPhone 7.0.x
			// because this event has wrong size infos
			if (bSkipFirstResize && rInputTagRegex.test(document.activeElement.tagName) && !bOrientationchange) {
				return;
			}

			var iWindowHeightNew = windowSize()[1];
			var iWindowWidthNew = windowSize()[0];
			var iTime = new Date().getTime();
			//skip multiple resize events by only one orientationchange
			if (iWindowHeightNew === iWindowHeightOld && iWindowWidthNew === iWindowWidthOld) {
				return;
			}
			bResize = true;
			//on mobile devices opening the keyboard on some devices leads to a resize event
			//in this case only the height changes, not the width
			if ((iWindowHeightOld != iWindowHeightNew) && (iWindowWidthOld == iWindowWidthNew)) {
				//Asus Transformer tablet fires two resize events when orientation changes while keyboard is open.
				//Between these two events, only the height changes. The check of if keyboard is open has to be skipped because
				//it may be judged as keyboard closed but the keyboard is still open which will affect the orientation detection
				if (!iLastResizeTime || (iTime - iLastResizeTime > 300)) {
					bKeyboardOpen = (iWindowHeightNew < iWindowHeightOld);
				}
				handleResizeChange();
			} else {
				iWindowWidthOld = iWindowWidthNew;
			}
			iLastResizeTime = iTime;
			iWindowHeightOld = iWindowHeightNew;

			if (iClearFlagTimeout) {
				window.clearTimeout(iClearFlagTimeout);
				iClearFlagTimeout = null;
			}
			//Some Android build-in browser fires a resize event after the viewport is applied.
			//This resize event has to be dismissed otherwise when the next orientationchange event happens,
			//a UI5 resize event will be fired with the wrong window size.
			iClearFlagTimeout = window.setTimeout(clearFlags, 1200);
		} else if (evt.type == "orientationchange") {
			bOrientationchange = true;
		}

		if (iOrientationTimeout) {
			clearTimeout(iOrientationTimeout);
			iOrientationTimeout = null;
		}
		iOrientationTimeout = window.setTimeout(handleMobileTimeout, 50);
	}

	function handleMobileTimeout() {
		// with ios split view, the browser fires only resize event and no orientationchange when changing the size of a split view
		// therefore the following if needs to be adapted with additional check of iPad with version greater or equal 9 (splitview was introduced with iOS 9)
		if (bResize && (bOrientationchange || (Device.system.tablet && Device.os.ios && Device.os.version >= 9))) {
			handleOrientationChange();
			handleResizeChange();
			bOrientationchange = false;
			bResize = false;
			if (iClearFlagTimeout) {
				window.clearTimeout(iClearFlagTimeout);
				iClearFlagTimeout = null;
			}
		}
		iOrientationTimeout = null;
	}

	function clearFlags() {
		bOrientationchange = false;
		bResize = false;
		iClearFlagTimeout = null;
	}

	//********************************************************

	setResizeInfo(Device.resize);
	setOrientationInfo(Device.orientation);

	// Add API to global namespace
	// ui5lint-disable-next-line no-globals
	window.sap.ui.Device = Device;

	// Add handler for orientationchange and resize after initialization of Device API
	if (Device.support.touch && Device.support.orientation) {
		// logic for mobile devices which support orientationchange (like ios, android)
		window.addEventListener("resize", handleMobileOrientationResizeChange, false);
		window.addEventListener("orientationchange", handleMobileOrientationResizeChange, false);
	} else {
		// desktop browsers and windows phone/tablet which not support orientationchange
		window.addEventListener("resize", handleOrientationResizeChange, false);
	}

	//Always initialize the default media range set
	Device.media.initRangeSet();
	Device.media.initRangeSet(RANGESETS["SAP_STANDARD_EXTENDED"]);

	// Only for test purposes
	Device._setCustomNavigator = function (oCustomNavigator, bTouch) {
		// Reset to device capabilities in case no custom navigator is given
		if (!oCustomNavigator) {
			Device.support.touch = detectTouch();
			setDefaultNavigator();
		} else {
			Device.support.touch = bTouch;
			oReducedNavigator = Object.assign(oReducedNavigator, oCustomNavigator);
			// In case no client hints are provided we don't add it to the reduced navigator
			// to simulate browser without client hints API
			if (!oCustomNavigator.userAgentData) {
				delete oReducedNavigator.userAgentData;
			}
		}
		oPlatform = undefined;

		setOS();
		setBrowser();
		setSystem();
	};

	// define module if API is available
	if (sap.ui.define) {
		sap.ui.define("sap/ui/Device", [], function() {
			return Device;
		});
	}

}());
