/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["./library", "./Core", "sap/ui/base/ManagedObject", "sap/base/Log", "sap/ui/core/StaticArea"],
	function (coreLibrary, Core, ManagedObject, Log, StaticArea) {
		"use strict";

		var oInstance;

		var InvisibleMessageMode = coreLibrary.InvisibleMessageMode;

		/**
		 * @class
		 *
		 * The InvisibleMessage provides a way to programmatically expose dynamic content changes in a way
		 * that can be announced by screen readers.
		 *
		 * <h3>Overview</h3>
		 * This class is a singleton. The class instance can be retrieved via the static method
		 * {@link sap.ui.core.InvisibleMessage.getInstance}.
		 *
		 * <b>Note:</b> According to the ARIA standard, live regions should be presented and should be empty.
		 * To enhance accessibility, it is recommended to instantiate <code>InvisibleMessage</code> via
		 * <code>sap.ui.core.InvisibleMessage.getInstance()</code> as early as possible in the application logic.
		 * For example, during Component initialization, main Controller initialization, after Core initialization, etc.
		 * Once instantiated, use the <code>announce</code> method to specify the text that has to be announced by the screen reader
		 * and set the live region’s mode.
		 *
		 * <b>Note:</b> Ensure that the <code>announce</code> method is called after the DOM is ready, to guarantee its
		 * intended effect. Calling it before the DOM is ready may result in no announcement being made.
		 *
		 * @extends sap.ui.base.ManagedObject
		 *
		 * @author SAP SE
		 * @version 1.138.0
		 * @hideconstructor
		 * @public
		 * @since 1.78
		 * @alias sap.ui.core.InvisibleMessage
		 */

		var InvisibleMessage = ManagedObject.extend("sap.ui.core.InvisibleMessage", /** @lends sap.ui.core.InvisibleMessage.prototype */ {

			constructor: function () {
				ManagedObject.apply(this, arguments);
				if (oInstance) {
					Log.warning('This is a singleton, therefore you are not able to create another instance of this class.');

					return oInstance;
				}

				oInstance = this;
			}
		});

		/**
		 * Returns the instance of the class.
		 * @return {sap.ui.core.InvisibleMessage} oInstance
		 * @static
		 * @public
		 */
		InvisibleMessage.getInstance = function () {
			if (!oInstance) {
				oInstance = new InvisibleMessage("__invisiblemessage", {});
			}

			return oInstance;
		};

		InvisibleMessage.prototype.init = function () {
			var oStatic = StaticArea.getDomRef();

			if (!oStatic) {
				// Make sure StaticArea is rendered before manipulating the DOM.
				Core.ready(() => {
					this._insertInstances();
				});
			} else {
				this._insertInstances();
			}
		};

		/**
		 * Inserts the string into the respective span, depending on the mode provided.
		 *
		 * @param {string} sText String to be announced by the screen reader.
		 * @param {sap.ui.core.InvisibleMessageMode} sMode The mode to be inserted in the aria-live attribute.
		 * @public
		 */
		InvisibleMessage.prototype.announce = function (sText, sMode) {
			var oStatic = StaticArea.getDomRef(),
				oPoliteMarkup = oStatic.querySelector(".sapUiInvisibleMessagePolite"),
				oAssertiveMarkup = oStatic.querySelector(".sapUiInvisibleMessageAssertive");

			if (!oPoliteMarkup || !oAssertiveMarkup) {
				return;
			}

			var oNode = sMode === InvisibleMessageMode.Assertive ? oAssertiveMarkup : oPoliteMarkup;

			// Set textContent to empty string in order to trigger screen reader's announce.
			oNode.textContent = "";
			oNode.textContent = sText;

			if (sMode !== InvisibleMessageMode.Assertive && sMode !== InvisibleMessageMode.Polite) {
				Log.info(
					'You have entered an invalid mode. Valid values are: ' + '"Polite" ' + 'and "Assertive".'
					+ ' The framework will automatically set the mode to "Polite".');
			}

			// clear the span in order to avoid reading it out while in JAWS reading node
			setTimeout(function () {
				// ensure that we clear the text node only if no announce is made in the meantime
				if (oNode.textContent === sText) {
					oNode.textContent = "";
				}
			}, 3000);
		};

		/**
		 * @return {string} Returns the span to be rendered for the polite instance.
		 * @private
		 * @function
		 */
		InvisibleMessage.prototype.getPoliteInstance = function () {
			var sId = this.getId();
			return '<span id="' + sId + '-polite' + '" data-sap-ui="' + sId + '-polite' +
				'" class="sapUiInvisibleMessagePolite" role="status" aria-live="polite">' +
				'</span>';
		};

		/**
		 * @return {string} Returns the span to be rendered for the assertive instance.
		 * @private
		 * @function
		 */
		InvisibleMessage.prototype.getAssertiveInstance = function () {
			var sId = this.getId();
			return '<span id="' + sId + '-assertive' + '" data-sap-ui="' + sId + '-assertive' +
				'" class="sapUiInvisibleMessageAssertive" role="status" aria-live="assertive">' +
				'</span>';
		};

		/**
		 * @private
		 * @function
		 */
		InvisibleMessage.prototype._insertInstances = function () {
			var oStatic = StaticArea.getDomRef();

			oStatic.insertAdjacentHTML("beforeend", this.getPoliteInstance());
			oStatic.insertAdjacentHTML("beforeend", this.getAssertiveInstance());
		};

		return InvisibleMessage;

	});