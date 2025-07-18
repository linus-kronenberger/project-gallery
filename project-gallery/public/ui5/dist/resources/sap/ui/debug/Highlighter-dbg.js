/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides a helper that can highlight a given control
sap.ui.define('sap/ui/debug/Highlighter', [
	"sap/ui/thirdparty/jquery",
	"sap/base/util/uid",
	"sap/ui/dom/jquery/rect" // jQuery Plugin "rect"
	],
	function(jQuery, uid) {
	"use strict";


	/**
	 * Creates a new highlighter object without displaying it.
	 *
	 * The DOM node is not created until the first call to method {@link #highlight}.
	 *
	 * @param {string} [sId] id that is used by the new highlighter
	 * @param {boolean} [bFilled] whether the box of the highlighter is partially opaque (20%), defaults to false
	 * @param {string} [sColor] the CSS color of the border and the box (defaults to blue)
	 * @param {int} [iBorderWidth] the width of the border
	 *
	 * @class Helper class to display a colored rectangle around and above a given DOM node
	 * @author Frank Weigel
	 * @since 0.8.7
	 * @public
	 * @alias sap.ui.debug.Highlighter
	 */
	var Highlighter = function(sId, bFilled, sColor, iBorderWidth) {
		this.sId = sId || uid();
		this.bFilled = (bFilled == true);
		this.sColor = sColor || 'blue';
		if ( isNaN(iBorderWidth ) ) {
			this.iBorderWidth = 2;
		} else if ( iBorderWidth <= 0 ) {
			this.iBorderWidth = 0;
		} else {
			this.iBorderWidth = iBorderWidth;
		}
	};

	/**
	 * Shows a rectangle/box that surrounds the given DomRef.
	 *
	 * If this is the first call to {@link #highlight} for this instance, then
	 * a DOM node for the highlighter is created in the same document as the given <code>oDomRef</code>.
	 *
	 * <b>Note:</b> As the DOM node is reused across multiple calls, the highlighter must only be used
	 * within a single document.
	 */
	Highlighter.prototype.highlight = function(oDomRef) {
		if (!oDomRef || !oDomRef.parentNode) {
			return;
		}

		var oHighlightRect = (this.sId ? window.document.getElementById(this.sId) : null);
		if (!oHighlightRect) {
			oHighlightRect = oDomRef.ownerDocument.createElement("div");
			oHighlightRect.setAttribute("id", this.sId);
			oHighlightRect.style.position = "absolute";
			oHighlightRect.style.border = this.iBorderWidth + "px solid " + this.sColor;
			oHighlightRect.style.display = "none";
			oHighlightRect.style.margin = "0px";
			oHighlightRect.style.padding = "0px";
			if ( this.bFilled ) {
				var oFiller = oDomRef.ownerDocument.createElement("div");
				oFiller.textContent = "\u00a0";
				oFiller.style.backgroundColor = this.sColor;
				oFiller.style.opacity = "0.2";
				oFiller.style.height = "100%";
				oFiller.style.width = "100%";
				oHighlightRect.appendChild(oFiller);
			}
			oDomRef.ownerDocument.body.appendChild(oHighlightRect);
		}
		var oRect = jQuery(oDomRef).rect();
		oHighlightRect.style.top = (oRect.top - this.iBorderWidth) + "px";
		oHighlightRect.style.left = (oRect.left - this.iBorderWidth) + "px";
		oHighlightRect.style.width = (oRect.width) + "px";
		oHighlightRect.style.height = (oRect.height) + "px";
		oHighlightRect.style.display = "block";
	};

	/**
	 * Hides the rectangle/box if it is currently shown.
	 */
	Highlighter.prototype.hide = function() {
		var oHighlightRect = (this.sId ? window.document.getElementById(this.sId) : null);
		if (!oHighlightRect) {
			return;
		}
		oHighlightRect.style.display = "none";
	};

	return Highlighter;

}, /* bExport= */ true);