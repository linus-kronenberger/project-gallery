/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.DynamicSideContent.
sap.ui.define([
	"sap/ui/core/RenderManager",
	'sap/ui/thirdparty/jquery',
	'sap/ui/core/Control',
	'sap/ui/core/ResizeHandler',
	'sap/ui/core/delegate/ScrollEnablement',
	'sap/ui/layout/library',
	'./DynamicSideContentRenderer'
],
	function(RenderManager, jQuery, Control, ResizeHandler, ScrollEnablement, library, DynamicSideContentRenderer) {
		"use strict";

		// shortcut for sap.ui.layout.SideContentPosition
		var SideContentPosition = library.SideContentPosition;

		// shortcut for sap.ui.layout.SideContentFallDown
		var SideContentFallDown = library.SideContentFallDown;

		// shortcut for sap.ui.layout.SideContentVisibility
		var SideContentVisibility = library.SideContentVisibility;

		/**
		 * Constructor for a new <code>DynamicSideContent</code>.
		 *
		 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
		 * @param {object} [mSettings] Initial settings for the new control
		 *
		 * @class
		 * Layout control that allows additional (side) content to be displayed dynamically.
		 *
		 * <h3>Overview</h3>
		 *
		 * <code>DynamicSideContent</code> is a layout control that allows additional content
		 * to be displayed in a way that flexibly adapts to different screen sizes. The side
		 * content appears in a container next to or directly below the main content
		 * (it doesn't overlay). When the side content is triggered, the main content becomes
		 * narrower (if appearing side-by-side). The side content contains a separate scrollbar
		 * when appearing next to the main content.
		 *
		 * <h3>Usage</h3>
		 *
		 * <i>When to use?</i>
		 *
		 * Use this control if you want to display relevant information that is not critical
		 * for users to complete a task. Users should have access to all the key functions and
		 * critical information in the app even if they do not see the side content. This is
		 * important because on smaller screen sizes it may be difficult to display the side
		 * content in a way that is easily accessible for the user.
		 *
		 * <i>When not to use?</i>
		 *
		 * Don't use it if you want to display navigation or critical information that prevents
		 * users from completing a task when they have no access to the side content.
		 *
		 * <h3>Responsive Behavior</h3>
		 *
		 * Screen width > 1440 px
		 *
		 * <ul><li>Main vs. side content ratio is 75 vs. 25 percent (with a minimum of 320px
		 * each).</li>
		 * <li>If the application defines a trigger, the side content can be hidden.</li></ul>
		 *
		 * Screen width <= 1440 px and > 720px
		 *
		 * <ul><li>Main vs. side content ratio is 66.666 vs. 33.333 percent (with a minimum of
		 * 320px each). If the side content width falls below 320 px, it automatically slides
		 * under the main content, unless the app development team specifies that it should
		 * disappear.</li></ul>
		 *
		 * Screen width <= 720 px (for example on a mobile device)
		 *
		 * <ul><li>In this case, the side content automatically disappears from the screen (unless
		 * specified to stay under the content) and can be triggered from a pre-set trigger
		 * (specified within the app). When the side content is triggered, it replaces the
		 * main content. We recommend that you always place the trigger for the side content
		 * in the same location, such as in the app footer.</li></ul>
		 *
		 * A special case, allows for comparison mode between the main and side content. In
		 * this case, the screen is split into 50:50 percent for main vs. side content. The
		 * responsive behavior of the equal split is the same as in the standard view - the
		 * side content disappears on screen widths of less than 720 px and can only be
		 * viewed by triggering it.
		 *
		 * <b>Note:</b> If there is a control that has property <code>sticky</code> inside the
		 * <code>DynamicSideContent</code> the stickiness of that control will not work.
		 * <code>DynamicSideContent</code> has the overflow: auto style definition and this prevents
		 * the sticky elements of the inside controls from becoming fixed at the top of the viewport.
		 * This applies for example to {@link sap.m.Table} and {@link sap.m.PlanningCalendar}.
		 *
		 * @extends sap.ui.core.Control
		 *
		 * @author SAP SE
		 * @version 1.138.0
		 *
		 * @constructor
		 * @public
		 * @since 1.30
		 * @alias sap.ui.layout.DynamicSideContent
		 * @see {@link fiori:https://experience.sap.com/fiori-design-web/dynamic-side-content/ Dynamic Side Content}
		 */
		var DynamicSideContent = Control.extend("sap.ui.layout.DynamicSideContent", /** @lends sap.ui.layout.DynamicSideContent.prototype */ {
			metadata : {
				library : "sap.ui.layout",
				properties : {

					/**
					 * Determines whether the side content is visible or hidden.
					 *
					 * <b>Note:</b> If both <code>showSideContent</code> and <code>showMainContent</code> properties are set to <code>true</code>,
					 * use the <code>toggle</code> method for showing the side content on phone.
					 */
					showSideContent : {type : "boolean", group : "Appearance", defaultValue : true},

					 /**
					 * Determines whether the main content is visible or hidden.
					 */
					showMainContent : {type : "boolean", group : "Appearance", defaultValue : true},

					/**
					 * Determines on which breakpoints the side content is visible.
					 */
					sideContentVisibility : {type : "sap.ui.layout.SideContentVisibility", group : "Appearance", defaultValue : SideContentVisibility.ShowAboveS},

					/**
					 * Determines on which breakpoints the side content falls down below the main content.
					 */
					sideContentFallDown : {type : "sap.ui.layout.SideContentFallDown", group : "Appearance", defaultValue : SideContentFallDown.OnMinimumWidth},

					/**
					 * Sets the width of the side content for M breakpoint (screen width <= 1024 px and > 720px).
					 *
					 * Setting value to this property overrides the default width of the side content container in M breakpoint,
					 * except when an <code>equalSplit</code> property is set. The width of the main content container is calculated
					 * respectively.
					 *
					 * @since 1.121
					 */
					sideContentWidthM : {type : "sap.ui.core.CSSSize", group : "Appearance", defaultValue : null},

					/**
					 * Sets the width of the side content for L breakpoint (screen width <= 1440 px and > 1024px).
					 *
					 * Setting value to this property overrides the default width of the side content container in L breakpoint,
					 * except when an <code>equalSplit</code> property is set. The width of the main content container is calculated
					 * respectively.
					 *
					 * @since 1.121
					 */
					sideContentWidthL : {type : "sap.ui.core.CSSSize", group : "Appearance", defaultValue : null},

					/**
					 * Sets the width of the side content for XL breakpoint (screen width > 1440 px).
					 *
					 * Setting value to this property overrides the default width of the side content container in XL breakpoint,
					 * except when an <code>equalSplit</code> property is set. The width of the main content container is calculated
					 * respectively.
					 *
					 * @since 1.121
					 */
					sideContentWidthXL : {type : "sap.ui.core.CSSSize", group : "Appearance", defaultValue : null},

					/**
					 * Defines whether the control is in equal split mode. In this mode, the side and the main content take 50:50 percent
					 * of the container on all screen sizes except for phone, where the main and side contents are switching visibility
					 * using the toggle method.
					 *
					 * <b>Note:</b> setting this property overrides values set in <code>sideContentWidthM, sideContentWidthL, sideContentWidthXL</code>.
					 */
					equalSplit : {type : "boolean", group : "Appearance", defaultValue : false},

					/**
					 * If set to <code>true</code>, then not the media Query (device screen size) but the size of the container, surrounding the control,
					 * defines the current range.
					 */
					containerQuery : {type : "boolean", group : "Behavior", defaultValue : false},

					/**
					 * Determines whether the side content is on the left or on the right side of the main content.
					 * @since 1.36
					 */
					sideContentPosition : {type : "sap.ui.layout.SideContentPosition", group : "Appearance", defaultValue : SideContentPosition.End},

					/**
					 * Defiles the main content span size
					 */
					mcSpan: { type: "int", defaultValue: 0, visibility: "hidden" },

					/**
					 * Defines the side content span size
					 */
					scSpan: { type: "int", defaultValue: 0, visibility: "hidden" }
				},
				defaultAggregation : "mainContent",
				events : {
					/**
					 * Fires when the current breakpoint has been changed.
					 * @since 1.32
					 */
					breakpointChanged : {
						parameters : {
							currentBreakpoint : {type : "string"}
						}
					}
				},
				aggregations : {

					/**
					 * Main content controls.
					 */
					mainContent : {type: "sap.ui.core.Control", multiple:  true},

					/**
					 * Side content controls.
					 */
					sideContent : {type: "sap.ui.core.Control", multiple:  true}
				},
				designTime: "sap/ui/layout/designtime/DynamicSideContent.designtime",
				dnd: { draggable: false, droppable: true }
			},

			renderer: DynamicSideContentRenderer
		});

		var	S = "S",
			M = "M",
			L = "L",
			XL = "XL",
			HIDDEN_CLASS = "sapUiHidden",
			SPAN_SIZE_12_CLASS = "sapUiDSCSpan12",
			MC_FIXED_CLASS = "sapUiDSCMCFixed",
			SC_FIXED_CLASS = "sapUiDSCSCFixed",
			SPAN_SIZE_3 = 3,
			SPAN_SIZE_4 = 4,
			SPAN_SIZE_6 = 6,
			SPAN_SIZE_8 = 8,
			SPAN_SIZE_9 = 9,
			SPAN_SIZE_12 = 12,
			INVALID_BREAKPOINT_ERROR_MSG = "Invalid Breakpoint. Expected: S, M, L or XL",
			SC_GRID_CELL_SELECTOR = "SCGridCell",
			MC_GRID_CELL_SELECTOR = "MCGridCell",
			S_M_BREAKPOINT = 720,
			M_L_BREAKPOINT = 1024,
			L_XL_BREAKPOINT = 1440;

		/**
		 * Sets the sideContentVisibility property.
		 * @param {sap.ui.layout.SideContentVisibility} sVisibility Determines on which breakpoints the side content is visible.
		 * @param {boolean} bSuppressVisualUpdate Determines if the visual state is updated
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @override
		 * @public
		 */
		DynamicSideContent.prototype.setSideContentVisibility = function (sVisibility, bSuppressVisualUpdate) {
			this.setProperty("sideContentVisibility", sVisibility, true);

			if (!bSuppressVisualUpdate && this.$().length) {
				this._setResizeData(this.getCurrentBreakpoint());
				this._changeGridState();
			}
			return this;
		};

		/**
		 * Sets the showSideContent property.
		 * @param {boolean} bVisible Determines if the side content part is visible
		 * @param {boolean} bSuppressVisualUpdate Determines if the visual state is updated
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @override
		 * @public
		 */
		DynamicSideContent.prototype.setShowSideContent = function (bVisible, bSuppressVisualUpdate) {
			if (bVisible === this.getShowSideContent()) {
				return this;
			}

			this.setProperty("showSideContent", bVisible, true);
			this._SCVisible = bVisible;
			if (!bSuppressVisualUpdate && this.$().length) {
				this._setResizeData(this.getCurrentBreakpoint(), this.getEqualSplit());
				if (this._currentBreakpoint === S) {
					this._MCVisible = true;
				}
				this._changeGridState();
			}
			return this;
		};

		/**
		 * Sets the showMainContent property.
		 * @param {boolean} bVisible Determines if the main content part is visible
		 * @param {boolean} bSuppressVisualUpdate Determines if the visual state is updated
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @override
		 * @public
		 */
		DynamicSideContent.prototype.setShowMainContent = function (bVisible, bSuppressVisualUpdate) {
			if (bVisible === this.getShowMainContent()) {
				return this;
			}

			this.setProperty("showMainContent", bVisible, true);
			this._MCVisible = bVisible;
			if (!bSuppressVisualUpdate && this.$().length) {
				this._setResizeData(this.getCurrentBreakpoint(), this.getEqualSplit());
				if (this._currentBreakpoint === S) {
					this._SCVisible = true;
				}
				this._changeGridState();
			}
			return this;
		};

		/**
		 * Checks if the side content is visible.
		 * @returns {boolean} Side content visibility state
		 * @public
		 */
		DynamicSideContent.prototype.isSideContentVisible = function () {
			if (this._currentBreakpoint === S) {
				return this._SCVisible && this.getProperty("showSideContent");
			} else {
				return this.getProperty("showSideContent");
			}
		};

		/**
		 * Checks if the main content is visible.
		 * @returns {boolean} Main content visibility state
		 * @public
		 */
		DynamicSideContent.prototype.isMainContentVisible = function () {
			if (this._currentBreakpoint === S) {
				return this._MCVisible && this.getProperty("showMainContent");
			} else {
				return this.getProperty("showMainContent");
			}
		};

		/**
		 * Sets or unsets the page in equalSplit mode.
		 * @param {boolean}[bState] Determines if the page is set to equalSplit mode
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @override
		 * @public
		 */
		DynamicSideContent.prototype.setEqualSplit = function (bState) {
			this._MCVisible = true;
			this._SCVisible = true;
			this.setProperty("equalSplit", bState, true);
			if (this._currentBreakpoint) {
				this._setResizeData(this._currentBreakpoint, bState);
				this._changeGridState();
			}
			return this;
		};

		/**
		 * Adds a control to the side content area.
		 * Only the side content part in the aggregation is re-rendered.
		 * @param {sap.ui.core.Control} oControl Object to be added in the aggregation
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @override
		 * @public
		 */
		DynamicSideContent.prototype.addSideContent = function (oControl) {
			this.addAggregation("sideContent", oControl, true);
			// Rerender only the part of the control that is changed
			this._rerenderControl(this.getAggregation("sideContent"), this.$(SC_GRID_CELL_SELECTOR));
			return this;
		};

		/**
		 * Adds a control to the main content area.
		 * Only the main content part in the aggregation is re-rendered.
		 * @param {sap.ui.core.Control} oControl Object to be added in the aggregation
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @override
		 * @public
		 */
		DynamicSideContent.prototype.addMainContent = function (oControl) {
			this.addAggregation("mainContent", oControl, true);
			// Rerender only the part of the control that is changed
			this._rerenderControl(this.getAggregation("mainContent"), this.$(MC_GRID_CELL_SELECTOR));
			return this;
		};

		/**
		 * Used for the toggle button functionality.
		 * When the control is on a phone screen size only, one control area is visible.
		 * This helper method is used to implement a button/switch for changing
		 * between the main and side content areas.
		 * Only works if the current breakpoint is "S".
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @public
		 */
		DynamicSideContent.prototype.toggle = function () {
			if (this._currentBreakpoint === S) {

				if (!this.getProperty("showMainContent")) {
					this.setShowMainContent(true, true);
					this._MCVisible = false;
				}
				if (!this.getProperty("showSideContent")) {
					this.setShowSideContent(true, true);
					this._SCVisible = false;
				}

				if (this._MCVisible && !this._SCVisible) {
					this._SCVisible = true;
					this._MCVisible = false;
				} else if (!this._MCVisible && this._SCVisible) {
					this._MCVisible = true;
					this._SCVisible = false;
				}

				this._changeGridState();
			}
			return this;
		};

		/**
		 * Returns the breakpoint for the current state of the control.
		 *
		 * If the control is not rendered yet, this method will return <code>undefined</code>,
		 * as current break point calculation is based on the parent container width.
		 * @returns {string} currentBreakpoint
		 * @public
		 */
		DynamicSideContent.prototype.getCurrentBreakpoint = function () {
			return this._currentBreakpoint;
		};

		/**
		 * Function is called before the control is rendered.
		 * @private
		 * @override
		 */
		DynamicSideContent.prototype.onBeforeRendering = function () {
			this._detachContainerResizeListener();

			this._SCVisible = (this._SCVisible === undefined) ? this.getProperty("showSideContent") : this._SCVisible;
			this._MCVisible = (this._MCVisible === undefined) ? this.getProperty("showMainContent") : this._MCVisible;

			if (!this.getContainerQuery()) {
				this._iWindowWidth = jQuery(window).width();
				this._setBreakpointFromWidth(this._iWindowWidth);
				this._setResizeData(this._currentBreakpoint, this.getEqualSplit());
			}
		};

		/**
		 * Function is called after the control is rendered.
		 * @private
		 * @override
		 */
		DynamicSideContent.prototype.onAfterRendering = function () {
			if (this.getContainerQuery()) {
				this._attachContainerResizeListener();
				this._adjustToScreenSize();
			} else {
				var that = this;
				jQuery(window).on("resize", function() {
					that._adjustToScreenSize();
				});
			}
			this._changeGridState();
			this._initScrolling();
		};

		DynamicSideContent.prototype.onThemeChanged = function () {
			if (this.getContainerQuery()) {
				this._adjustToScreenSize();
			}
		};

		/**
		 * Function is called when exiting the control.
		 * @private
		 */
		DynamicSideContent.prototype.exit = function () {
			this._detachContainerResizeListener();

			if (this._oSCScroller) {
				this._oSCScroller.destroy();
				this._oSCScroller = null;
			}

			if (this._oMCScroller) {
				this._oMCScroller.destroy();
				this._oMCScroller = null;
			}
		};

		/**
		 * Returns a scroll helper object used to handle scrolling.
		 * @public
		 * @param {sap.ui.core.Control} oControl The control instance that requested the scroll helper
		 * @returns {sap.ui.core.delegate.ScrollEnablement} The scroll helper instance
		 * @since 1.78
		 */
		DynamicSideContent.prototype.getScrollDelegate = function (oControl) {
			var oContainerOfDSC = this.getParent(),
				oControlParent = oControl.getParent(),
				sParentAggregation = oControl.sParentAggregationName,
				bMCVisible = this.getShowMainContent() && this._MCVisible,
				bSCVisible = this.getShowSideContent() && this._SCVisible;

			// Find aggregation in which effectively is placed the oControl even if it is not directly placed in main or side content
			while (oControlParent && oControlParent.getId() !== this.getId()) {
				sParentAggregation = oControlParent.sParentAggregationName;
				oControlParent = oControlParent.getParent();
			}

			// for cases with main and side content - one above the other - use the scroll delegate of the parent container
			// otherwise use the scroll delegate of the container where the control is placed

			if (!oControl) {
				return;
			} else if ((sParentAggregation === "sideContent" && !bSCVisible) || (sParentAggregation === "mainContent" && !bMCVisible)) {
				return;
			} else if (!this._isContentOnFullHeight(sParentAggregation)) {
				while (oContainerOfDSC && (!oContainerOfDSC.getScrollDelegate || !oContainerOfDSC.getScrollDelegate())) {
					oContainerOfDSC = oContainerOfDSC.getParent();
				}
				if (oContainerOfDSC) {
					return oContainerOfDSC.getScrollDelegate();
				}
			}

			this._initScrolling();

			if (this._oMCScroller && this._oSCScroller) {
				while (oControl && oControl.getId() !== this.getId()) {
					if (oControl.sParentAggregationName === "mainContent" && bMCVisible) {
						return this._oMCScroller;
					}
					if (oControl.sParentAggregationName === "sideContent" && bSCVisible) {
						return this._oSCScroller;
					}
					oControl = oControl.getParent();
				}
			}

			return;
		};

		/**
		 * Determines whether the provided content aggregation (main or side) takes full height of the DynamicSideContent.
		 * @private
		 * @param {string} sContentName The name of the content aggregation
		 * @returns {boolean} whether the content aggregation takes the full height
		 */
		DynamicSideContent.prototype._isContentOnFullHeight = function(sContentName) {
			var	bMCVisible = this.getShowMainContent() && this._MCVisible,
				bSCVisible = this.getShowSideContent() && this._SCVisible,
				mcSpan = this.getProperty("mcSpan"),
				scSpan = this.getProperty("scSpan"),
				bMainContentOnFullHeight = (sContentName === "mainContent" && bMCVisible && ((mcSpan === SPAN_SIZE_12 && !bSCVisible) || mcSpan !== SPAN_SIZE_12)),
				bSideContentOnFullHeight = (sContentName === "sideContent" && bSCVisible && ((scSpan === SPAN_SIZE_12 && !bMCVisible) || scSpan !== SPAN_SIZE_12));

			return bMainContentOnFullHeight || bSideContentOnFullHeight;
		};

		/**
		 * Re-renders only part of the control that is changed.
		 * @param {object} aControls Array containing the passed aggregation controls
		 * @param {object} $domElement DOM reference of the control to be re-rendered
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @private
		 */
		DynamicSideContent.prototype._rerenderControl = function (aControls, $domElement) {
			if (this.getDomRef()) {
				var oRm = new RenderManager().getInterface();
				this.getRenderer().renderControls(oRm, aControls);
				oRm.flush($domElement[0]);
				oRm.destroy();
			}
			return this;
		};

		/**
		 * Initializes scroll for side and main content.
		 * @private
		 */
		DynamicSideContent.prototype._initScrolling = function () {
			var sControlId = this.getId(),
				sSideContentId = sControlId + "-" + SC_GRID_CELL_SELECTOR,
				sMainContentId = sControlId + "-" + MC_GRID_CELL_SELECTOR;

			if (!this._oSCScroller && !this._oMCScroller) {
				this._oSCScroller = new ScrollEnablement(this, null, {
					scrollContainerId: sSideContentId,
					horizontal: false,
					vertical: true
				});
				this._oMCScroller = new ScrollEnablement(this, null, {
					scrollContainerId: sMainContentId,
					horizontal: false,
					vertical: true
				});
			}
		};

		/**
		 * Attaches event listener for the needed breakpoints to the container.
		 * @private
		 */
		DynamicSideContent.prototype._attachContainerResizeListener = function () {
			// Ensure that the resize listener will be attached to the control,
			// after rendering handler is executed and DOM reference adjustments are all done
			setTimeout(function() {
				this._sContainerResizeListener = ResizeHandler.register(this, this._adjustToScreenSize.bind(this));
			}.bind(this), 0);
		};

		/**
		 * Detaches event listener for the needed breakpoints to the container.
		 * @private
		 */
		DynamicSideContent.prototype._detachContainerResizeListener = function () {
			if (this._sContainerResizeListener) {
				ResizeHandler.deregister(this._sContainerResizeListener);
				this._sContainerResizeListener = null;
			}
		};

		/**
		 * Gets the current breakpoint, related to the width, which is passed to the method.
		 * @private
		 * @param {int} iWidth The parent container width
		 * @returns {string} Breakpoint corresponding to the width passed
		 */
		DynamicSideContent.prototype._getBreakPointFromWidth = function (iWidth) {
			if (iWidth <= S_M_BREAKPOINT && this._currentBreakpoint !== S) {
				return S;
			} else if ((iWidth > S_M_BREAKPOINT) && (iWidth <= M_L_BREAKPOINT) && this._currentBreakpoint !== M) {
				return M;
			} else if ((iWidth > M_L_BREAKPOINT) && (iWidth <= L_XL_BREAKPOINT) && this._currentBreakpoint !== L) {
				return L;
			} else if (iWidth > L_XL_BREAKPOINT && this._currentBreakpoint !== XL) {
				return XL;
			}

			return this._currentBreakpoint;
		};


		/**
		 * Sets the current breakpoint, related to the width, which is passed to the method.
		 * @private
		 * @param {int} iWidth is the parent container width
		 */
		DynamicSideContent.prototype._setBreakpointFromWidth = function (iWidth) {
			var sNewBreakpoint = this._getBreakPointFromWidth(iWidth),
				sCurrentBreakpoint = this.getCurrentBreakpoint();

			this._currentBreakpoint = sNewBreakpoint;

			if (sCurrentBreakpoint !== undefined) {
				sNewBreakpoint !== sCurrentBreakpoint && this.fireBreakpointChanged({currentBreakpoint : this._currentBreakpoint});
			}
		};

		/**
		 * Handles the screen size breakpoints.
		 * @private
		 */
		DynamicSideContent.prototype._adjustToScreenSize = function () {
			if (this.getContainerQuery()){
				this._iWindowWidth = this.$().parent().width();
			} else {
				this._iWindowWidth = jQuery(window).width();
			}

			this._setResizeData(this._getBreakPointFromWidth(this._iWindowWidth), this.getEqualSplit());
			this._changeGridState();
			this._setBreakpointFromWidth(this._iWindowWidth);
		};

		/**
		 * Returns object with data about the size of the main and the side content, based on the screen breakpoint and
		 * control mode.
		 * @param {string} sSizeName Possible values S, M, L, XL
		 * @param {boolean} bComparison Checks if the page is in equalSplit mode
		 * @returns {this} Reference to <code>this</code> for method chaining
		 * @private
		 */
		DynamicSideContent.prototype._setResizeData = function (sSizeName, bComparison) {
			var sideContentVisibility = this.getSideContentVisibility(),
				sideContentFallDown = this.getSideContentFallDown();

			if (!bComparison) {
				// Normal mode
				switch (sSizeName) {
					case S:
						this._setSpanSize(SPAN_SIZE_12, SPAN_SIZE_12);
						if (this.getProperty("showSideContent") && this.getProperty("showMainContent") && this._MCVisible) {
							this._SCVisible = sideContentVisibility === SideContentVisibility.AlwaysShow;
						}
						this._bFixedSideContent = false;
						break;
					case M:
						var iSideContentWidth = Math.ceil((33.333 / 100) * this._iWindowWidth);
						if (sideContentFallDown === SideContentFallDown.BelowL ||
							sideContentFallDown === SideContentFallDown.BelowXL ||
							(iSideContentWidth <= 320 && sideContentFallDown === SideContentFallDown.OnMinimumWidth)) {
							this._setSpanSize(SPAN_SIZE_12, SPAN_SIZE_12);
							this._bFixedSideContent = false;
						} else {
							this._setSpanSize(SPAN_SIZE_4, SPAN_SIZE_8);
							this._bFixedSideContent = true;
						}
						this._SCVisible = sideContentVisibility === SideContentVisibility.ShowAboveS ||
							sideContentVisibility === SideContentVisibility.AlwaysShow;

						this._MCVisible = true;
						break;
					case L:
						if (sideContentFallDown === SideContentFallDown.BelowXL) {
							this._setSpanSize(SPAN_SIZE_12, SPAN_SIZE_12);
						} else {
							this._setSpanSize(SPAN_SIZE_4, SPAN_SIZE_8);
						}
						this._SCVisible = sideContentVisibility === SideContentVisibility.ShowAboveS ||
							sideContentVisibility === SideContentVisibility.ShowAboveM ||
							sideContentVisibility === SideContentVisibility.AlwaysShow;
						this._MCVisible = true;
						this._bFixedSideContent = false;
						break;
					case XL:
						this._setSpanSize(SPAN_SIZE_3, SPAN_SIZE_9);
						this._SCVisible = sideContentVisibility !== SideContentVisibility.NeverShow;
						this._MCVisible = true;
						this._bFixedSideContent = false;
						break;
					default:
						throw new Error(INVALID_BREAKPOINT_ERROR_MSG);
				}
			} else {
				// Equal split mode
				switch (sSizeName) {
					case S:
						this._setSpanSize(SPAN_SIZE_12, SPAN_SIZE_12);
						this._SCVisible = false;
						break;
					default:
						this._setSpanSize(SPAN_SIZE_6, SPAN_SIZE_6);
						this._SCVisible = true;
						this._MCVisible = true;
				}
				this._bFixedSideContent = false;
			}

			return this;
		};

		/**
		 * Determines if the control sets height, based on the control state.
		 * @private
		 * @returns {boolean} If the control sets height
		 */
		DynamicSideContent.prototype._shouldSetHeight = function () {
			var bSameLine,
				bBothVisible,
				bOnlyScVisible,
				bOnlyMcVisible,
				bOneVisible,
				bFixedSC,
				bSCNeverShow;

			bSameLine = (this.getProperty("scSpan") + this.getProperty("mcSpan")) === SPAN_SIZE_12;
			bBothVisible = this._MCVisible && this._SCVisible;

			bOnlyScVisible = !this._MCVisible && this._SCVisible;
			bOnlyMcVisible = this._MCVisible && !this._SCVisible;
			bOneVisible = bOnlyScVisible || bOnlyMcVisible;

			bFixedSC = this._fixedSideContent;
			bSCNeverShow = this.getSideContentVisibility() === SideContentVisibility.NeverShow;

			return ((bSameLine && bBothVisible) || bOneVisible || bFixedSC || bSCNeverShow);
		};

		/** Gets the width (if any) for the current breakpoint
		 * @private
		 * @returns {string} width for the current breakpoint, or empty string if there is no such defined
		 */
		DynamicSideContent.prototype._getSideContentWidth = function() {
			var sWidth,
				sBreakpoint = this.getCurrentBreakpoint();

			switch (sBreakpoint) {
				case M:
						sWidth = this.getSideContentWidthM();
						break;
				case L:
						sWidth = this.getSideContentWidthL();
						break;
				case XL:
						sWidth = this.getSideContentWidthXL();
						break;
				default:
						sWidth = "";
			}

			return sWidth;
		};

		/**
		 * Changes the state of the grid without re-rendering the control.
		 * Shows and hides the main and side content.
		 * @private
		 */
		DynamicSideContent.prototype._changeGridState = function () {
			var $sideContent = this.$(SC_GRID_CELL_SELECTOR),
				$mainContent = this.$(MC_GRID_CELL_SELECTOR),
				bMainContentVisibleProperty = this.getProperty("showMainContent"),
				bSideContentVisibleProperty = this.getProperty("showSideContent"),
				bFloat = this._shouldSetHeight(),
				sSideContentWidth = this._getSideContentWidth();

			if (this._bFixedSideContent && !sSideContentWidth) {
				$sideContent.removeClass().addClass(SC_FIXED_CLASS);
				$mainContent.removeClass().addClass(MC_FIXED_CLASS);
			} else {
				$sideContent.removeClass(SC_FIXED_CLASS);
				$mainContent.removeClass(MC_FIXED_CLASS);
			}

			if (this._SCVisible && this._MCVisible && bSideContentVisibleProperty && bMainContentVisibleProperty) {
				if (!this._bFixedSideContent && (!sSideContentWidth || this.getEqualSplit())) {
					$mainContent.removeClass().addClass("sapUiDSCSpan" + this.getProperty("mcSpan"));
					$sideContent.removeClass().addClass("sapUiDSCSpan" + this.getProperty("scSpan"));
				}
				$mainContent.removeClass(HIDDEN_CLASS);
				$sideContent.removeClass(HIDDEN_CLASS);
				$sideContent.css(this._getSideContentStyles(bFloat));
				$mainContent.css(this._getMainContentStyles(bFloat));
			} else if (!this._SCVisible && !this._MCVisible) {
				$mainContent.addClass(HIDDEN_CLASS);
				$sideContent.addClass(HIDDEN_CLASS);
			} else if ((this._MCVisible && bMainContentVisibleProperty) || (!bMainContentVisibleProperty && !bSideContentVisibleProperty)) {
				$mainContent.removeClass().addClass(SPAN_SIZE_12_CLASS).css("width", "");
				$sideContent.addClass(HIDDEN_CLASS);
			} else if (this._SCVisible && bSideContentVisibleProperty) {
				$sideContent.removeClass().addClass(SPAN_SIZE_12_CLASS).css("width", "");
				$mainContent.addClass(HIDDEN_CLASS);
			}

			$mainContent.addClass("sapUiDSCM");
			$sideContent.addClass("sapUiDSCS");
		};

		DynamicSideContent.prototype._getMainContentStyles = function(bFloat) {
			var sSideContentWidth = this._getSideContentWidth();
			return {
				"width": sSideContentWidth && bFloat && !this.getEqualSplit() ? "calc(100% - " + sSideContentWidth + ")" : "",
				"float": bFloat ? "left" : "none",
				"height": bFloat ? "100%" : "auto"
			};
		};

		DynamicSideContent.prototype._getSideContentStyles = function(bFloat) {
			var sSideContentWidth = this._getSideContentWidth();
			return {
				"width": sSideContentWidth && bFloat && !this.getEqualSplit() ? sSideContentWidth : "",
				"float": bFloat ? "left" : "none",
				"height": bFloat ? "100%" : "auto"
			};
		};

		/**
		 * Sets the main and side content span size.
		 * @param {int} iScSpan Side content span size
		 * @param {int} iMcSpan Main content span size
		 * @private
		 */
		DynamicSideContent.prototype._setSpanSize = function (iScSpan, iMcSpan) {
			this.setProperty("scSpan", iScSpan);
			this.setProperty("mcSpan", iMcSpan);
		};

		return DynamicSideContent;
	});
