/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.ResponsiveFlowLayout.
sap.ui.define([
	"sap/base/i18n/Localization",
	'sap/ui/core/Control',
	"sap/ui/core/RenderManager",
	'sap/ui/core/ResizeHandler',
	'./library',
	'./ResponsiveFlowLayoutData',
	'./ResponsiveFlowLayoutRenderer',
	'sap/ui/thirdparty/jquery',
	// jQuery Plugin "rect"
	'sap/ui/dom/jquery/rect'
],
	function(
		Localization,
		Control,
		RenderManager,
		ResizeHandler,
		library,
		ResponsiveFlowLayoutData,
		ResponsiveFlowLayoutRenderer,
		jQuery
	) {
	"use strict";



	/**
	 * Constructor for a new ResponsiveFlowLayout.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * This is a layout where several controls can be added. These controls are blown up to fit in an entire row. If the window resizes, the controls are moved between the rows and resized again.
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.16.0
	 * @alias sap.ui.layout.ResponsiveFlowLayout
	 */
	var ResponsiveFlowLayout = Control.extend("sap.ui.layout.ResponsiveFlowLayout", /** @lends sap.ui.layout.ResponsiveFlowLayout.prototype */ {
		metadata : {

			library : "sap.ui.layout",
			properties : {

				/**
				 * If set to false, all added controls will keep their width, or otherwise, the controls will be stretched to the possible width of a row.
				 */
				responsive : {type : "boolean", group : "Misc", defaultValue : true}
			},
			defaultAggregation : "content",
			aggregations : {

				/**
				 * Added content that should be positioned. Every content item should have a ResponsiveFlowLayoutData attached, or otherwise, the default values are used.
				 */
				content : {type : "sap.ui.core.Control", multiple : true, singularName : "content"}
			},
			associations: {

				/**
				 * Association to controls / IDs that label this control (see WAI-ARIA attribute <code>aria-labelledby</code>).
				 * @since 1.48.7
				 */
				ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
			}
		},

		renderer: ResponsiveFlowLayoutRenderer
	});


	(function() {
		ResponsiveFlowLayout.prototype.init = function() {
			this._rows = [];

			this._bIsRegistered = false;
			this._proxyComputeWidths = computeWidths.bind(this);

			this._iRowCounter = 0;
		};
		ResponsiveFlowLayout.prototype.exit = function() {
			delete this._rows;

			if (this._IntervalCall) {
				clearTimeout(this._IntervalCall);
				this._IntervalCall = undefined;
			}

			if (this._resizeHandlerComputeWidthsID) {
				ResizeHandler.deregister(this._resizeHandlerComputeWidthsID);
			}
			delete this._resizeHandlerComputeWidthsID;
			delete this._proxyComputeWidths;

			if (this.oRm) {
				this.oRm.destroy();
				delete this.oRm;
			}

			delete this._$DomRef;
			delete this._oDomRef;

			delete this._iRowCounter;
		};

		var updateRows = function(oThis) {
			var aControls = oThis.getContent();
			var aRows = [];
			var iRow = -1;
			var oItem = {}, oLast = {};
			var sId = "";
			var oLD;
			var minWidth = 0, weight = 0, length = 0;
			var bBreak = false, bMargin = false, bLinebreakable = false;

			for (var i = 0; i < aControls.length; i++) {
				// use default values -> are overwritten if LayoutData exists
				minWidth = ResponsiveFlowLayoutData.MIN_WIDTH;
				weight = ResponsiveFlowLayoutData.WEIGHT;
				bBreak = ResponsiveFlowLayoutData.LINEBREAK;
				bMargin = ResponsiveFlowLayoutData.MARGIN;
				bLinebreakable = ResponsiveFlowLayoutData.LINEBREAKABLE;

				// set the values of the layout data if available
				oLD = _getLayoutDataForControl(aControls[i]);
				if (oLD instanceof ResponsiveFlowLayoutData) {
					bBreak = oLD.getLinebreak();
					minWidth = oLD.getMinWidth();
					weight = oLD.getWeight();
					bMargin = oLD.getMargin();
					bLinebreakable = oLD.getLinebreakable();
				}

				if (iRow < 0 || bBreak) {
					/*
					 * if first run OR current control should cause a line break, the
					 * control will be placed in a new row
					 */
					iRow++;
					aRows.push({
						height : -1,
						cont : []
					});
				}

				length = aRows[iRow].cont.length;
				sId = aControls[i].getId() + "-cont" + iRow + "_" + length;
				oItem = {
					minWidth : minWidth,
					weight : weight,
					linebreakable : bLinebreakable,
					// since the margin of the element is used outside of it
					// becomes padding
					padding : bMargin,
					control : aControls[i],
					id : sId,
					breakWith : []
				};

				// check if item has been pushed -> needed if no element was found that
				// is allowed to be wrapped into a new line
				var bPushed = false;
				if (!bLinebreakable) {
					// if an element mustn't break -> find any previous element that
					// is allowed to do wrapping
					for (var br = length; br > 0; br--) {
						oLast = aRows[iRow].cont[br - 1];
						if (oLast.linebreakable) {
							oLast.breakWith.push(oItem);
							bPushed = true;
							break;
						}
					}
				}

				if (!bPushed) {
					aRows[iRow].cont.push(oItem);
				}

			}

			oThis._rows = aRows;
		};

		var getCurrentWrapping = function(oRow, $Row, oThis) {
			var r = [];
			var lastOffsetLeft = 10000000;
			var currentRow = -1;

			var fnCurrentWrapping = function(j) {
				var $cont = jQuery(document.getElementById(oRow.cont[j].id));
				if ($cont.length > 0) {
					var offset = $cont[0].offsetLeft;
					if (lastOffsetLeft >= offset) {
						r.push({
							cont : []
						});
						currentRow++;
					}
					lastOffsetLeft = offset;
					r[currentRow].cont.push(oRow.cont[j]);
				}
			};

			// Find out the "rows" within a row
			if (Localization.getRTL()) {
				// for RTL-mode the elements have to be checked the other way round
				for (var i = oRow.cont.length - 1; i >= 0; i--) {
					fnCurrentWrapping(i);
				}
			} else {
				for (var i = 0; i < oRow.cont.length; i++) {
					fnCurrentWrapping(i);
				}
			}

			return r;
		};

		/**
		 * Returns the target wrapping.
		 * @param {object} oRow The corresponding row of possible controls
		 * @param {int} iWidth The width of the row in pixels
		 * @returns {array} The target wrapping
		 *
		 */
		var getTargetWrapping = function(oRow, iWidth) {
			/*
			 * initiating all required variables to increase speed and memory
			 * efficiency
			 */
			var r = [];
			var currentRow = -1;
			var currentWidth = 0;
			var totalWeight = 0;
			var indexLinebreak = 0;
			var w1 = 0, w2 = 0;
			var j = 0, k = 0;

			// Find out the "rows" within a row
			for (j = 0; j < oRow.cont.length; j++) {
				currentWidth = 0;
				totalWeight = 0;
				for (k = indexLinebreak; k <= j; k++) {
					totalWeight = totalWeight + oRow.cont[k].weight;
				}
				for (k = indexLinebreak; k <= j; k++) {
					w1 = iWidth / totalWeight * oRow.cont[k].weight;
					w1 = Math.floor(w1);

					w2 = oRow.cont[k].minWidth;

					currentWidth += Math.max(w1, w2);
				}

				if (currentRow == -1 || currentWidth > iWidth) {
					r.push({
						cont : []
					});
					if (currentRow !== -1) {
						/*
						 * if this is NOT the first run -> all coming iterations
						 * needn't to start from '0' since the calculation of a new
						 * row has begun
						 */
						indexLinebreak = j;
					}
					currentRow++;
				}
				r[currentRow].cont.push(oRow.cont[j]);
			}
			return r;
		};

		var checkWrappingDiff = function(wrap1, wrap2) {
			if (wrap1.length != wrap2.length) {
				return true;
			}

			for (var i = 0; i < wrap1.length; i++) {
				if (wrap1[i].cont.length != wrap2[i].cont.length) {
					return true;
				}
			}

			return false;
		};

		/**
		 * Creates the corresponding content of the targeted wrapping and pushes it
		 * to the RenderManager instance.
		 *
		 * @param {object}
		 *            [oTargetWrapping] The targeted wrapping (may differ
		 *            from current wrapping)
		 * @param {int}
		 *            [iWidth] The available inner width of the row
		 * @private
		 */
		ResponsiveFlowLayout.prototype.renderContent = function(oTargetWrapping, iWidth) {
			var r = oTargetWrapping,
				iRowProcWidth = 0,
				aWidths = [],
				i = 0, ii = 0, j = 0, jj = 0,
				totalWeight = 0,
				iProcWidth = 0,
				oCont,
				tWeight = 0, tMinWidth = 0,
				aBreakWidths = [],
				aClasses = [],
				sId = this.getId(),
				sHeaderId = "",
				oRm = this._getRenderManager();

			for (i = 0; i < r.length; i++) {
				/*
				 * reset all corresponding values for each row
				 */
				iProcWidth = 0;
				aWidths.length = 0;
				iRowProcWidth = 100; // subtract the used values from a whole row
				aClasses.length = 0;

				aClasses.push("sapUiRFLRow");
				if (r[i].cont.length <= 1) {
					aClasses.push("sapUiRFLCompleteRow");
				}
				var sRowId = sId + "-row" + this._iRowCounter;
				var oStyles = {};
				oRm.writeHeader(sRowId, oStyles, aClasses);

				totalWeight = 0;
				for (ii = 0; ii < r[i].cont.length; ii++) {
					totalWeight += r[i].cont[ii].weight;
				}

				for (j = 0; j < r[i].cont.length; j++) {
					oCont = r[i].cont[j];
					tWeight = 0;
					tMinWidth = 0;

					if (oCont.breakWith.length > 0) {
						tWeight = oCont.weight;
						tMinWidth = oCont.minWidth;
						for (var br = 0; br < oCont.breakWith.length; br++) {
							tWeight += oCont.breakWith[br].weight;
							tMinWidth += oCont.breakWith[br].minWidth;
						}
					}

					/*
					 * Render Container
					 */
					sHeaderId = r[i].cont[j].id;
					aClasses.length = 0;
					// clear all other values from the object
					oStyles = {
						// the unit "px" is added below to be able to calculate with
						// the value of min-width
						"min-width" : oCont.breakWith.length > 0 ? tMinWidth : oCont.minWidth
					};

					iProcWidth = 100 / totalWeight * oCont.weight;
					var iProcMinWidth = oStyles["min-width"] / iWidth * 100;
					// round the values BEFORE they are used for the percentage value
					// because if the un-rounded values don't need the percentage
					// value
					// of the min-width, the percentage value of the calculated width
					// might be lower
					// after it is floored.
					var iPMinWidth = Math.ceil(iProcMinWidth);
					var iPWidth = Math.floor(iProcWidth);
					if (iPWidth !== 100 && iPMinWidth > iPWidth) {
						// if the percentage of the element's width will lead
						// into a too small element, use the corresponding
						// percentage value of the min-width
						iProcWidth = iPMinWidth;
					} else {
						iProcWidth = iPWidth;
					}

					// check how many percentage points are still left. If there
					// are less available than calculated, just use the rest of
					// the row
					iProcWidth = iRowProcWidth < iProcWidth ? iRowProcWidth : iProcWidth;

					iRowProcWidth -= iProcWidth;
					aWidths.push(iProcWidth);

					// if possible, percentage amount is not 0% and this is the
					// last item
					if (iRowProcWidth > 0 && j === (r[i].cont.length - 1)) {
						iProcWidth += iRowProcWidth;
					}

					aClasses.push("sapUiRFLContainer");
					oStyles["width"] = iProcWidth + "%";
					oStyles["min-width"] = oStyles["min-width"] + "px";
					oRm.writeHeader(sHeaderId, oStyles, aClasses);

					/*
					 * content rendering (render control)
					 */
					aClasses.length = 0;
					aClasses.push("sapUiRFLContainerContent");
					if (oCont.breakWith.length > 0) {
						aClasses.push("sapUiRFLMultiContainerContent");
					}
					if (oCont.padding) {
						aClasses.push("sapUiRFLPaddingClass");
					}

					var sClass = this._addContentClass(oCont.control, j);
					if (sClass) {
						aClasses.push(sClass);
					}

					oStyles = {};
					oRm.writeHeader("", oStyles, aClasses);

					/*
					 * Render all following elements into same container if there
					 * are any that should wrap together with container. Otherwise, simply
					 * render the control.
					 */
					if (oCont.breakWith.length > 0) {
						/*
						 * Render first element of wrap-together-group
						 */
						sHeaderId = r[i].cont[j].id + "-multi0";
						aClasses.length = 0;
						oStyles = {
							"min-width" : tMinWidth + "px"
						};
						// set width of first element
						var percW = 100 / tWeight * oCont.weight;
						percW = Math.floor(percW);
						aBreakWidths.push(percW);

						aClasses.push("sapUiRFLMultiContent");
						oStyles["width"] = percW + "%";

						if (r[i].cont[j].padding) {
							aClasses.push("sapUiRFLPaddingClass");
						}
						oRm.writeHeader(sHeaderId, oStyles, aClasses);

						// total percentage for all elements
						var tPercentage = percW;

						oRm.renderControl(oCont.control);
						oRm.close("div");

						/*
						 * Render all following elements that should wrap with the
						 * trailing one
						 */
						for (jj = 0; jj < oCont.breakWith.length; jj++) {
							sHeaderId = oCont.breakWith[jj].id + '-multi' + (jj + 1);
							aClasses.length = 0;
							oStyles = {
								"min-width" : oCont.breakWith[jj].minWidth + "px"
							};

							percW = 100 / tWeight * oCont.breakWith[jj].weight;
							percW = Math.floor(percW);

							aBreakWidths.push(percW);
							tPercentage += percW;

							// if percentage is not 100% and this is the last
							// item
							if (tPercentage < 100 && jj === (oCont.breakWith.length - 1)) {
								percW += 100 - tPercentage;
							}

							aClasses.push("sapUiRFLMultiContent");
							oStyles["width"] = percW + "%";

							if (oCont.breakWith[jj].padding) {
								aClasses.push("sapUiRFLPaddingClass");
							}
							oRm.writeHeader(sHeaderId, oStyles, aClasses);

							oRm.renderControl(oCont.breakWith[jj].control);
							oRm.close("div");
						}
					} else {
						oRm.renderControl(oCont.control);
					}
					oRm.close("div"); // content

					oRm.close("div"); // container
				}
				oRm.close("div"); // row

				this._iRowCounter++;
			}
		};

		var computeWidths = function() {
			this._iRowCounter = 0;

			this._oDomRef = this.getDomRef();
			if (this._oDomRef) {
				var sId = this.getId();
				var iInnerWidth = jQuery(this._oDomRef).width(); //width without the padding
				var bRender = false;

				if (this._rows) {
					for (var i = 0; i < this._rows.length; i++) {
						var $Row = jQuery(document.getElementById(sId + "-row" + i));

						var oTargetWrapping = getTargetWrapping(this._rows[i], iInnerWidth);
						var oCurrentWrapping = getCurrentWrapping(this._rows[i], $Row, this);

						// render if wrapping differs
						bRender = checkWrappingDiff(oCurrentWrapping, oTargetWrapping);

						// if the width/height changed so the sizes need to be
						// recalculated
						var oRowRect = this._getElementRect($Row);
						var oPrevRect = this._rows[i].oRect;

						if (oRowRect && oPrevRect) {
							bRender = bRender || (oRowRect.width !== oPrevRect.width) && (oRowRect.height !== oPrevRect.height);
						}

						if (this._bLayoutDataChanged || bRender) {
							this._oDomRef.innerHTML = "";

							// reset this to be clean for next check interval
							this._bLayoutDataChanged = false;
							this.renderContent(oTargetWrapping, iInnerWidth);
						}
					}

					if (this._oDomRef.innerHTML === "") {
						this._getRenderManager().flush(this._oDomRef);

						for (var i = 0; i < this._rows.length; i++) {
							var oTmpRect = this._getElementRect(jQuery(document.getElementById(sId + "-row" + i)));
							this._rows[i].oRect = oTmpRect;
						}
					}
				}
			}
		};

		/**
		 * Handles the internal event onBeforeRendering.
		 * Before all controls are rendered, the internal structure of the rows needs to be updated.
		 *
		 */
		ResponsiveFlowLayout.prototype.onBeforeRendering = function() {
			// update the internal structure of the rows
			updateRows(this);
		};

		/**
		 * Handles the internal event onAfterRendering.
		 * If the layout should be responsive, it is necessary to fix the width of the content
		 * items to correspond to the width of the layout.
		 */
		ResponsiveFlowLayout.prototype.onAfterRendering = function() {
			this._oDomRef = this.getDomRef();
			this._$DomRef = jQuery(this._oDomRef);

			this._proxyComputeWidths();

			if (this.getResponsive()) {
				if (!this._resizeHandlerComputeWidthsID) {
					// Trigger rerendering when the control is resized so width recalculations
					// are handled in the on after rendering hook the same way as the initial width calculations.
					this._resizeHandlerComputeWidthsID = ResizeHandler.register(this, this._proxyComputeWidths.bind(this));
				}
			}
		};

		ResponsiveFlowLayout.prototype.onThemeChanged = function(oEvent) {
			if (oEvent.type === "LayoutDataChange") {
				this._bLayoutDataChanged = true;
			}
			if (this.getResponsive() && !this._resizeHandlerComputeWidthsID) {
				// Trigger rerendering when the control is resized so width recalculations
				// are handled in the on after rendering hook the same way as the initial width calculations.
				this._resizeHandlerComputeWidthsID = ResizeHandler.register(this, this._proxyComputeWidths.bind(this));
			}

			updateRows(this);
			this._proxyComputeWidths();
		};

		ResponsiveFlowLayout.prototype.setResponsive = function(bResponsive) {
			Control.prototype.setProperty.call(this, "responsive", bResponsive);
			if (bResponsive && !this._resizeHandlerComputeWidthsID) {
				// Trigger rerendering when the control is resized so width recalculations
				// are handled in the on after rendering hook the same way as the initial width calculations.
				this._resizeHandlerComputeWidthsID = ResizeHandler.register(this, this._proxyComputeWidths.bind(this));
			} else if (this._resizeHandlerComputeWidthsID) {
				if (this._resizeHandlerComputeWidthsID) {
					ResizeHandler.deregister(this._resizeHandlerComputeWidthsID);
					delete this._resizeHandlerComputeWidthsID;
				}
			}
			return this;
		};

		/**
		 * If any LayoutData was changed, the same logic should be applied as in onThemeChanged.
		 */
		ResponsiveFlowLayout.prototype.onLayoutDataChange = ResponsiveFlowLayout.prototype.onThemeChanged;

		var _getLayoutDataForControl = function(oControl) {
			var oLayoutData = oControl.getLayoutData();

			if (!oLayoutData) {
				return undefined;
			} else if (oLayoutData instanceof ResponsiveFlowLayoutData) {
				return oLayoutData;
			} else if (oLayoutData.getMetadata().getName() == "sap.ui.core.VariantLayoutData") {
				// multiple LayoutData available - search here
				var aLayoutData = oLayoutData.getMultipleLayoutData();
				for (var i = 0; i < aLayoutData.length; i++) {
					var oLayoutData2 = aLayoutData[i];
					if (oLayoutData2 instanceof ResponsiveFlowLayoutData) {
						return oLayoutData2;
					}
				}
			}
		};

		/**
		 * Adds content.
		 * This function needs to be overridden to prevent any rendering while some
		 * content is still being added.
		 *
		 * @param {sap.ui.core.Control}
		 *            oContent The content that should be added to the layout
		 * @public
		 */
		ResponsiveFlowLayout.prototype.addContent = function(oContent) {
			if (oContent && this._IntervalCall) {
				clearTimeout(this._IntervalCall);
				this._IntervalCall = undefined;
			}
			this.addAggregation("content", oContent);
			return this;
		};

		/**
		 * Inserts content.
		 * This function needs to be overridden to prevent any rendering while some
		 * content is still being added.
		 *
		 * @param {sap.ui.core.Control}
		 *            oContent The content that should be inserted to the layout
		 * @param {int}
		 *            iIndex The index where the content should be inserted into
		 * @public
		 */
		ResponsiveFlowLayout.prototype.insertContent = function(oContent, iIndex) {
			if (oContent && this._IntervalCall) {
				clearTimeout(this._IntervalCall);
				this._IntervalCall = undefined;
			}
			this.insertAggregation("content", oContent, iIndex);
			return this;
		};

		/**
		 * Removes content.
		 * This function needs to be overridden to prevent any rendering while some
		 * content is still being added.
		 *
		 * @param {int|sap.ui.core.ID|sap.ui.core.Control} oContent The content that should be removed from the layout
		 * @public
		 */
		ResponsiveFlowLayout.prototype.removeContent = function(oContent) {
			if (oContent && this._IntervalCall) {
				clearTimeout(this._IntervalCall);
				this._IntervalCall = undefined;
			}
			this.removeAggregation("content", oContent);
		};

		/**
		 * Gets the role used for accessibility.
		 * Set by the Form control if ResponsiveFlowLayout represents a FormContainer.
		 * @return {string} sRole Accessibility role
		 * @since 1.28.0
		 * @private
		 */
		ResponsiveFlowLayout.prototype._getAccessibleRole = function() {

			return null;

		};

		/**
		 * Sets a class at the content container
		 * Set by the Form control if ResponsiveFlowLayout represents a FormElement.
		 * @return {string} sClass CSS class
		 * @since 1.28.22
		 * @private
		 */
		ResponsiveFlowLayout.prototype._addContentClass = function(oControl, iIndex) {

			return null;

		};

		/**
		 * Returns a rectangle describing the current visual positioning of 1st DOM in the collection.
		 * The difference with the function rect() in sap/ui/dom/jquery/rect.js is that the height and width are cut to the
		 * 1st digit after the decimal separator and this is consistent across all browsers.
		 * @param {object} oElement The jQuery collection to check
		 * @returns {object|null} Object with properties top, left, width and height or null if no such element
		 * @private
		 */
		ResponsiveFlowLayout.prototype._getElementRect = function (oElement) {
			var oRect = oElement && oElement.rect();

			if (oRect) {
				oRect.height = oRect.height.toFixed(1);
				oRect.width = oRect.width.toFixed(1);
			}
			return oRect;
		};

		/**
		 * Lazily obtains custom version of render manager
		 * @private
		 * @returns {sap.ui.core.RenderManager} instance of render manager.
		 * Note: the instance is also available as <code>this.oRm</code>
		 */
		ResponsiveFlowLayout.prototype._getRenderManager = function () {
			if (!this.oRm) {
				this.oRm = new RenderManager().getInterface();
				this.oRm.writeHeader = function(sId, oStyles, aClasses) {
					this.openStart("div", sId);

					if (oStyles) {
						for ( var key in oStyles) {
							if (key === "width" && oStyles[key] === "100%") {
								this.class("sapUiRFLFullLength");
							}
							this.style(key, oStyles[key]);
						}
					}
					for (var i = 0; i < aClasses.length; i++) {
						this.class(aClasses[i]);
					}

					this.openEnd();
				};
			}
			return this.oRm;
		};

	}());

	return ResponsiveFlowLayout;

});