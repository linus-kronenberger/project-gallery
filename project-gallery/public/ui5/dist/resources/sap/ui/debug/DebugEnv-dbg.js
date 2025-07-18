/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// A core plugin that bundles debug features and connects with an embedding testsuite
sap.ui.define('sap/ui/debug/DebugEnv', [
	"sap/base/config",
	"sap/base/i18n/Localization",
	"sap/ui/base/Interface",
	"./ControlTree",
	"./LogViewer",
	"./PropertyList",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery",
	"sap/ui/core/Supportability",
	"sap/ui/core/Rendering"
], function(
	BaseConfig,
	Localization,
	Interface,
	ControlTree,
	LogViewer,
	PropertyList,
	Log,
	jQuery,
	Supportability,
	Rendering
) {
	"use strict";


	/**
	 * Creates an instance of the class <code>sap.ui.debug.DebugEnv</code>
	 *
	 * @class Central Class for the Debug Environment
	 *
	 * @author Martin Schaus, Frank Weigel
	 * @version 1.138.0
	 * @private
	 * @alias sap.ui.debug.DebugEnv
	 * @deprecated As of Version 1.120
	 */
	var DebugEnv = function() {
	};

	/**
	 * Will be invoked by <code>sap.ui.core.Core</code> to notify the plugin to start.
	 *
	 * @param {sap.ui.core.Core} oCore reference to the Core
	 * @param {boolean} [bOnInit] whether the hook is called during core initialization
	 * @public
	 */
	DebugEnv.prototype.startPlugin = function(oCore, bOnInit) {

		this.oCore = oCore;
		this.oWindow = window;

		/**
		 * Whether the debugenv should run embedded in application page (true) or in testsuite (false).
		 * @private
		 */
		try {
			this.bRunsEmbedded = typeof window.top.testfwk === "undefined"; // window || !top.frames["sap-ui-TraceWindow"];

			Log.info("Starting DebugEnv plugin (" + (this.bRunsEmbedded ? "embedded" : "testsuite") + ")");

			// initialize only if running in testsuite or when debug views are not disabled via URL parameter
			if (!this.bRunsEmbedded || Supportability.isControlInspectorEnabled()) {
				this.init(bOnInit);
			}
			if (!this.bRunsEmbedded || BaseConfig.get({ name: "sapUiTrace", type: BaseConfig.Type.Boolean })) {
				this.initLogger(Log, bOnInit);
			}
		} catch (oException) {
			Log.warning("DebugEnv plugin can not be started outside the Testsuite.");
		}
	};

	/**
	 * Will be invoked by <code>sap.ui.core.Core</code> to notify the plugin to start
	 * @public
	 */
	DebugEnv.prototype.stopPlugin = function() {
		Log.info("Stopping DebugEnv plugin.");
		this.oCore = null;
	};

	/**
	 * Initializes the ControlTreeView and PropertyListView of the <code>sap.ui.debug.DebugEnv</code>
	 * @private
	 */
	DebugEnv.prototype.init = function(bOnInit) {
		this.oControlTreeWindow = this.bRunsEmbedded ? this.oWindow : (top.document.getElementById("sap-ui-ControlTreeWindow") || top.frames["sap-ui-ControlTreeWindow"] || top);
		this.oPropertyListWindow = this.bRunsEmbedded ? this.oWindow : (top.document.getElementById("sap-ui-PropertyListWindow") || top.frames["sap-ui-PropertyListWindow"] || top);

		var bRtl = Localization.getRTL();

		/* TODO enable switch to testsuite
		if ( this.bRunsEmbedded ) {
			var div = this.oWindow.document.createElement("DIV");
			div.style.position = "absolute";
			div.style.right = '202px';
			div.style.top = '1px';
			div.style.width = '32px';
			div.style.height = '32px';
			div.style.border = '1px solid black';
			div.style.backgroundColor = 'blue';
			div.style.backgroundImage = "url(" + sap.ui.global.resourceRoot + "testsuite/images/full.png)";
			div.style.zIndex = 5;
			div.style.opacity = '0.2';
			jQuery(div).on("click",function(evt) {
				alert("click!");
			});
			/ *
			jQuery(div).on("mouseover",function(evt) {
				alert("click!");
			});
			jQuery(div).on("mouseout",function(evt) {
				alert("click!");
			}); * /
			this.oWindow.document.body.appendChild(div);
		}
		*/

		var oControlTreeRoot = (this.oControlTreeWindow.document || this.oControlTreeWindow).querySelector("#sap-ui-ControlTreeRoot"),
			oPropertyWindowRoot = (this.oPropertyListWindow.document || this.oPropertyListWindow).querySelector("#sap-ui-PropertyWindowRoot");

		if ( !oControlTreeRoot ) {
			oControlTreeRoot = this.oControlTreeWindow.document.createElement("DIV");
			oControlTreeRoot.setAttribute("id", "sap-ui-ControlTreeRoot");
			oControlTreeRoot.setAttribute("tabindex", -1);
			oControlTreeRoot.style.position = "absolute";
			oControlTreeRoot.style.fontFamily = "Arial";
			oControlTreeRoot.style.fontSize = "8pt";
			oControlTreeRoot.style.backgroundColor = "white";
			oControlTreeRoot.style.color = "black";
			oControlTreeRoot.style.border = "1px solid gray";
			oControlTreeRoot.style.overflow = "auto";
			oControlTreeRoot.style.zIndex = "999999";
			oControlTreeRoot.style.top = "1px";
			if (bRtl) {
				oControlTreeRoot.style.left = "1px";
			} else {
				oControlTreeRoot.style.right = "1px";
			}
			oControlTreeRoot.style.height = "49%";
			oControlTreeRoot.style.width = "200px";
			this.oControlTreeWindow.document.body.appendChild(oControlTreeRoot);
		} else {
			oControlTreeRoot.innerHTML = "";
		}
		this.oControlTreeRoot = oControlTreeRoot;

		if ( !oPropertyWindowRoot ) {
			oPropertyWindowRoot = this.oPropertyListWindow.document.createElement("DIV");
			oPropertyWindowRoot.setAttribute("id", "sap-ui-PropertyWindowRoot");
			oPropertyWindowRoot.setAttribute("tabindex", -1);
			oPropertyWindowRoot.style.position = "absolute";
			oPropertyWindowRoot.style.fontFamily = "Arial";
			oPropertyWindowRoot.style.fontSize = "8pt";
			oPropertyWindowRoot.style.backgroundColor = "white";
			oPropertyWindowRoot.style.color = "black";
			oPropertyWindowRoot.style.border = "1px solid gray";
			oPropertyWindowRoot.style.overflow = "auto";
			oPropertyWindowRoot.style.zIndex = "99999";
			oPropertyWindowRoot.style.width = "196px";
			oPropertyWindowRoot.style.height = "49%";
			if (bRtl) {
				oPropertyWindowRoot.style.left = "1px";
			} else {
				oPropertyWindowRoot.style.right = "1px";
			}
			oPropertyWindowRoot.style.bottom = "1px";
			this.oPropertyListWindow.document.body.appendChild(oPropertyWindowRoot);
		} else {
			oPropertyWindowRoot.innerHTML = "";
		}
		this.oPropertyWindowRoot = oPropertyWindowRoot;

		this.oControlTree = new ControlTree(this.oCore, this.oWindow, oControlTreeRoot, this.bRunsEmbedded);
		this.oPropertyList = new PropertyList(this.oCore, this.oWindow, oPropertyWindowRoot);
		this.oControlTree.attachEvent(ControlTree.M_EVENTS.SELECT, this.oPropertyList.update,
				this.oPropertyList);
		if ( !bOnInit ) {
			this.oControlTree.renderDelayed();
		}

		/**
		 * The block below is not needed because it only did a cleanup
		 * before the page was closed. This should not be necessary.
		 * Nevertheless we leave the coding here and only deprecate it,
		 * in order to keep the BFCache behavior stable.
		 * Removing the 'unload' handler could potentially activate
		 * the BFCache and cause a different behavior in browser versions
		 * where the 'unload' handler is still supported.
		 * Therefore we only removed the not needed cleanup coding
		 * but still attach a noop to ensure this handler would still
		 * invalidate the BFCache.
		 * @deprecated as of 1.119
		 */
		window.addEventListener("unload", () => {});
	};

	/**
	 * Initializes the LogViewer of the <code>sap.ui.debug.DebugEnv</code>
	 * @private
	 */
	DebugEnv.prototype.initLogger = function(oLogger, bOnInit) {
		this.oLogger = oLogger;
		this.oLogger.setLogEntriesLimit(Infinity);
		if ( !this.bRunsEmbedded ) {
			// attach test suite log viewer to our Log
			this.oTraceWindow = top.document.getElementById("sap-ui-TraceWindow");
			if ( this.oTraceWindow ) {
				this.oTraceViewer = top.oLogViewer = new LogViewer(this.oTraceWindow, 'sap-ui-TraceWindowRoot');
			} else {
				this.oTraceWindow = top.frames["sap-ui-TraceWindow"];
				this.oTraceViewer = this.oTraceWindow.oLogViewer = new LogViewer(this.oTraceWindow, 'sap-ui-TraceWindowRoot');
			}
			this.oTraceViewer.sLogEntryClassPrefix = "lvl"; // enforce use of CSS instead of DOM styles
			this.oTraceViewer.lock();
		} else {
			// create an embedded log viewer
			this.oTraceWindow = this.oWindow;
			this.oTraceViewer = new LogViewer(this.oTraceWindow, 'sap-ui-TraceWindowRoot');
		}
		this.oLogger.addLogListener(this.oTraceViewer);

		// When debug.js is injected (testsuite), it is not initialized during Core.init() but later.
		// In Chrome the startPlugin happens after rendering, therefore the first 'UIUpdated' is missed.
		// To compensate this, we register for both, the UIUpdated and for a timer (if we are not called during Core.init)
		// Whatever happens first.
		// TODO should be part of core
		Rendering.attachUIUpdated(this.enableLogViewer, this);
		if ( !bOnInit ) {
			var that = this;
			this.oTimer = setTimeout(function() {
				that.enableLogViewer();
			}, 0);
		}
	};

	DebugEnv.prototype.enableLogViewer = function() {
		// clear timeout (necessary in case we have been notified via attachUIUpdated)
		if ( this.oTimer ) {
			clearTimeout(this.oTimer);
			this.oTimer = undefined;
		}
		// clear listener (necessary to avoid multiple calls and in case we are called via timer)
		Rendering.detachUIUpdated(this.enableLogViewer, this);

		// real action: enable the LogViewer
		if ( this.oTraceViewer) {
			this.oTraceViewer.unlock();
		}
	};

	/**
	 * Whether the DebugEnv is running embedded in app page or not (which then means running in a test suite)
	 */
	DebugEnv.prototype.isRunningEmbedded = function() {
		return this.bRunsEmbedded;
	};

	/**
	 * Whether the ControlTree is visible
	 */
	DebugEnv.prototype.isControlTreeShown = function() {
		return jQuery(this.oControlTreeRoot).css("visibility") === "visible" || jQuery(this.oControlTreeRoot).css("visibility") === "inherit";
	};

	/**
	 * Will be called to show the ControlTree
	 */
	DebugEnv.prototype.showControlTree = function() {
		if (!this.oControlTreeRoot) {
			this.init(false);
		}
		jQuery(this.oControlTreeRoot).css("visibility", "visible");
	};

	/**
	 * Will be called to hide the ControlTree
	 */
	DebugEnv.prototype.hideControlTree = function() {
		jQuery(this.oControlTreeRoot).css("visibility", "hidden");
	};

	/**
	 * Whether the LogViewer is shown
	 */
	DebugEnv.prototype.isTraceWindowShown = function() {
		var oLogViewer = this.oTraceWindow && this.oTraceWindow.document.getElementById('sap-ui-TraceWindowRoot');
		return oLogViewer && (jQuery(oLogViewer).css("visibility") === "visible" || jQuery(oLogViewer).css("visibility") === "inherit");
	};

	/**
	 * Will be called to show the TraceWindow
	 */
	DebugEnv.prototype.showTraceWindow = function() {
		if ( !this.oTraceWindow ) {
			this.initLogger(Log, false);
		}
		var oLogViewer = this.oTraceWindow && this.oTraceWindow.document.getElementById('sap-ui-TraceWindowRoot');
		if ( oLogViewer ) {
			jQuery(oLogViewer).css("visibility", "visible");
		}
	};

	/**
	 * Will be called to hide the TraceWindow
	 */
	DebugEnv.prototype.hideTraceWindow = function() {
		var oLogViewer = this.oTraceWindow && this.oTraceWindow.document.getElementById('sap-ui-TraceWindowRoot');
		if ( oLogViewer ) {
			jQuery(oLogViewer).css("visibility", "hidden");
		}
	};

	/**
	 * Will be called to show the PropertyList
	 */
	DebugEnv.prototype.isPropertyListShown = function() {
		return jQuery(this.oPropertyWindowRoot).css("visibility") === "visible" || jQuery(this.oPropertyWindowRoot).css("visibility") === "inherit";
	};

	/**
	 * Will be called to show the PropertyList
	 */
	DebugEnv.prototype.showPropertyList = function() {
		if (!this.oPropertyWindowRoot) {
			this.init(false);
		}
		jQuery(this.oPropertyWindowRoot).css("visibility", "visible");
	};

	/**
	 * Will be called to hide the PropertyList
	 */
	DebugEnv.prototype.hidePropertyList = function() {
		jQuery(this.oPropertyWindowRoot).css("visibility", "hidden");
	};

	/**
	 * Create the <code>sap.ui.debug.DebugEnv</code> plugin and register
	 * it within the <code>sap.ui.core.Core</code>.
	 */
	(function(){
		var oThis = new DebugEnv();
		sap.ui.getCore().registerPlugin(oThis);
		var oInterface = new Interface(oThis, ["isRunningEmbedded", "isControlTreeShown", "showControlTree", "hideControlTree", "isTraceWindowShown", "showTraceWindow", "hideTraceWindow", "isPropertyListShown", "showPropertyList", "hidePropertyList"]);
		DebugEnv.getInstance = function() {
			return oInterface;
		};
	}());

	return DebugEnv;

}, /* bExport= */ true);
