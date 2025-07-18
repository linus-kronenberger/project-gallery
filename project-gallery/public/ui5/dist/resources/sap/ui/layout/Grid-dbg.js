/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.Grid.
sap.ui.define([
	'sap/ui/core/Control',
	'./library',
	'sap/ui/Device',
	'sap/ui/core/ResizeHandler',
	'sap/ui/base/ManagedObjectObserver',
	"./GridRenderer",
	"sap/ui/thirdparty/jquery"
],
	function(
		Control,
		library,
		Device,
		ResizeHandler,
		ManagedObjectObserver,
		GridRenderer,
		jQuery
	) {
	"use strict";



	/**
	 * Constructor for a new <code>Grid</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * A layout control which positions its child controls in a 12 column flow layout.
	 *
	 * The <code>Grid</code> control's children can be specified to take on a variable
	 * amount of columns depending on available screen size. With this control it is possible
	 * to achieve flexible layouts and line-breaks for extra large-, large-, medium- and
	 * small-sized screens, such as large desktop, desktop, tablet, and mobile.
	 *
	 * The <code>Grid</code> control's width can be percentage- or pixel-based and the spacing between
	 * its columns can be set to various predefined values.
	 *
	 * <b>Notes:</b>
	 * <ul>
	 * <li>The visibility of the child control does not affect the horizontal space it
	 * occupies, meaning that even if the control is not visible, its horizontal space
	 * still exists, even if it is empty.</li>
	 * <li> If it gets wider, the content of the columns is designed to overflow outside
	 * of its dimensions. An additional <code>sapUiRespGridOverflowHidden</code> CSS class
	 * should be added to the control in order to hide the overflowing part of it.</li>
	 * </ul>
	 *
	 * @see {@link fiori:https://experience.sap.com/fiori-design-web/grid-layout/#responsive-grid Grid}
	 *
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.15.0
	 * @see {@link topic:43ae317cf39640a88bc8be979d2671df Grid}
	 * @see {@link topic:32d4b9c2b981425dbc374d3e9d5d0c2e Grid Controls}
	 * @alias sap.ui.layout.Grid
	 */
	var Grid = Control.extend("sap.ui.layout.Grid", /** @lends sap.ui.layout.Grid.prototype */ {
		metadata : {

			library : "sap.ui.layout",
			properties : {

				/**
				 * Optional. Defines the width of the <code>Grid</code>. If not specified, then 100%.
				 */
				width : {type : "sap.ui.core.CSSSize", group : "Dimension", defaultValue : '100%'},

				/**
				 * Optional. Defines the vertical spacing between the rows in the <code>Grid</code>.
				 * In rem, allowed values are 0, 0.5, 1 and 2.
				 */
				vSpacing : {type : "float", group : "Dimension", defaultValue : 1},

				/**
				 * Optional. Defines the horizontal spacing between the content in the <code>Grid</code>.
				 * In rem, allowed values are 0, 0.5 , 1 or 2.
				 */
				hSpacing : {type : "float", group : "Dimension", defaultValue : 1},

				/**
				 * Optional. Defines the position of the <code>Grid</code> in the window or surrounding container.
				 */
				position : {type : "sap.ui.layout.GridPosition", group : "Dimension", defaultValue : "Left"},

				/**
				 * Optional. A string type that represents the span values of the <code>Grid</code> for
				 * large, medium and small screens. Allowed values are separated by space with case insensitive Letters XL, L, M or S followed
				 * by number of columns from 1 to 12 that the container has to take, for example, <code>L2 M4 S6</code>,
				 * <code>M12</code>, <code>s10</code> or <code>l4 m4</code>.
				 *
				 * <b>Note:</b> The parameters must be provided in the order <large medium small>.
				 */
				defaultSpan : {type : "sap.ui.layout.GridSpan", group : "Behavior", defaultValue : "XL3 L3 M6 S12"},

				/**
				 * Optional. Defines default for the whole Grid numbers of empty columns before the current span begins.
				 * It can be defined for large, medium and small screens. Allowed values are separated by space with case insensitive Letters XL,
				 * L, M or S followed by number of columns from 0 to 11 that the container has to take, for example,
				 * <code>L2 M4 S6</code>, <code>M11</code>, <code>s10</code> or <code>l4 m4</code>.
				 *
				 * <b>Note:</b> The parameters must be provided in the order <large medium small>.
				 */
				defaultIndent : {type : "sap.ui.layout.GridIndent", group : "Behavior", defaultValue : "XL0 L0 M0 S0"},

				/**
				 * If set to <code>true</code>, the current range (large, medium or small) is defined by the size of the
				 * container surrounding the <code>Grid</code> instead of the device screen size (media Query).
				 */
				containerQuery : {type : "boolean", group : "Behavior", defaultValue : false}
			},
			defaultAggregation : "content",
			aggregations : {

				/**
				 * Controls that are placed into Grid layout.
				 */
				content : {type : "sap.ui.core.Control", multiple : true, singularName : "content"}
			},
			associations: {

				/**
				 * Association to controls / IDs that label this control (see WAI-ARIA attribute <code>aria-labelledby</code>).
				 * @since 1.48.7
				 */
				ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
			},
			designtime: "sap/ui/layout/designtime/Grid.designtime"
		},

		renderer: GridRenderer
	});

	(function() {

		Grid.prototype.init = function() {
			/**
			 * @deprecated As of version 1.120
			 */
			(() => {
				// Library specific class
				var sClass = library.GridHelper.getLibrarySpecificClass();
				if (sClass) {
					this.addStyleClass(sClass);
				}
			})();

			this._iBreakPointTablet = Device.media._predefinedRangeSets[Device.media.RANGESETS.SAP_STANDARD_EXTENDED].points[0];
			this._iBreakPointDesktop = Device.media._predefinedRangeSets[Device.media.RANGESETS.SAP_STANDARD_EXTENDED].points[1];
			this._iBreakPointLargeDesktop = Device.media._predefinedRangeSets[Device.media.RANGESETS.SAP_STANDARD_EXTENDED].points[2];

			// Backward compatibility - if no any settings for XL - the settings for L are used
			this._indentXLChanged = false;
			this._spanXLChanged = false;

			this._oObserver = new ManagedObjectObserver(Grid.prototype._observeChanges.bind(this));
			this._oObserver.observe(this, {
				aggregations: ["content"]
			});
		};

		/**
		 * Used for after-rendering initialization.
		 *
		 * @private
		 */
		Grid.prototype.onAfterRendering = function() {
			if (this.getContainerQuery()) {
				this._sContainerResizeListener = ResizeHandler.register(this, jQuery.proxy(this._onParentResize, this));
				this._onParentResize();
			} else {
				this._attachMediaContainerWidthChange(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD_EXTENDED);
			}
		};

		Grid.prototype.onBeforeRendering = function() {
			// Cleanup resize event registration before re-rendering
			this._cleanup();
		};

		Grid.prototype.exit = function() {
			// Cleanup resize event registration on exit
			this._cleanup();

			if (this._oObserver) {
				this._oObserver.disconnect();
				this._oObserver = null;
			}
		};

		/**
		 * Clean up the control.
		 *
		 * @private
		 */
		Grid.prototype._cleanup = function() {
			// Cleanup resize event registration
			if (this._sContainerResizeListener) {
				ResizeHandler.deregister(this._sContainerResizeListener);
				this._sContainerResizeListener = null;
			}

			// Device Media Change handler
			this._detachMediaContainerWidthChange(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD_EXTENDED);
		};

		Grid.prototype._observeVisibility = function (oControl) {
			this._oObserver.observe(oControl, {
				properties: ["visible"]
			});
		};

		Grid.prototype._unobserveVisibility = function (oControl) {
			this._oObserver.unobserve(oControl, {
				properties: ["visible"]
			});
		};

		Grid.prototype._observeChanges = function (oChanges) {
			var oObject = oChanges.object,
				sChangeName = oChanges.name,
				sMutationName = oChanges.mutation,
				oChild = oChanges.child;

			if (oObject === this) {
				if (sMutationName === "insert") {
					this._observeVisibility(oChild);
				} else if (sMutationName === "remove") {
					this._unobserveVisibility(oChild);
				}
			} else if (sChangeName === "visible") {
				// We need to get the grid's internal spans, because they are responsible for the margin
				// indexOf is used, because when an element is hidden, a placeholder is rendered rather than that specific element.
				// Because we do not have that element in the DOM, we access it's container through the grid.
				// Children array consists of DOM refs, not jQuery objects, so we need to convert them.
				var iElementIndex = this.getContent().indexOf(oObject);
				jQuery(this.$().children()[iElementIndex]).toggleClass("sapUiRespGridSpanInvisible", !oChanges.current);
			}
		};

		Grid.prototype._handleMediaChange  = function(oParams) {
			this._toggleClass(oParams.name);
		};

		Grid.prototype._setBreakPointTablet = function( breakPoint) {
			this._iBreakPointTablet = breakPoint;
		};

		Grid.prototype._setBreakPointDesktop = function( breakPoint) {
			this._iBreakPointDesktop = breakPoint;
		};

		Grid.prototype._setBreakPointLargeDesktop = function( breakPoint) {
			this._iBreakPointLargeDesktop = breakPoint;
		};

		Grid.prototype.setDefaultIndent = function( sDefaultIndent) {
			if (/XL/gi.test(sDefaultIndent)) {
				this._setIndentXLChanged(true);
			}
			return this.setProperty("defaultIndent", sDefaultIndent);
		};

		Grid.prototype._setIndentXLChanged = function( bChanged) {
			this._indentXLChanged = bChanged;
		};

		Grid.prototype._getIndentXLChanged = function() {
			return this._indentXLChanged;
		};


		Grid.prototype.setDefaultSpan = function( sDefaultSpan) {
			if (/XL/gi.test(sDefaultSpan)) {
				this._setSpanXLChanged(true);
			}
			return this.setProperty("defaultSpan", sDefaultSpan);
		};

		Grid.prototype._setSpanXLChanged = function( bChanged) {
			this._spanXLChanged = bChanged;
		};

		Grid.prototype._getSpanXLChanged = function() {
			return this._spanXLChanged;
		};

		Grid.prototype._onParentResize = function() {
			var oDomRef = this.getDomRef();
			// Prove if Dom reference exist, and if not - clean up the references.
			if (!oDomRef) {
				this._cleanup();
				return;
			}

			if (!jQuery(oDomRef).is(":visible")) {
				return;
			}

			var iCntWidth = oDomRef.clientWidth;
			if (iCntWidth <= this._iBreakPointTablet) {
				this._toggleClass("Phone");
			} else if ((iCntWidth > this._iBreakPointTablet) && (iCntWidth <= this._iBreakPointDesktop)) {
				this._toggleClass("Tablet");
			} else if ((iCntWidth > this._iBreakPointDesktop) && (iCntWidth <= this._iBreakPointLargeDesktop)) {
				this._toggleClass("Desktop");
			} else {
				this._toggleClass("LargeDesktop");
			}
		};


		Grid.prototype._toggleClass = function(sMedia) {
			var $DomRef = this.$();
			if (!$DomRef) {
				return;
			}

			if ($DomRef.hasClass("sapUiRespGridMedia-Std-" + sMedia)) {
				return;
			}

			$DomRef.toggleClass("sapUiRespGridMedia-Std-" + sMedia, true);
			if (sMedia === "Phone") {
				$DomRef.toggleClass("sapUiRespGridMedia-Std-Desktop", false).toggleClass("sapUiRespGridMedia-Std-Tablet", false).toggleClass("sapUiRespGridMedia-Std-LargeDesktop", false);
			} else if (sMedia === "Tablet") {
				$DomRef.toggleClass("sapUiRespGridMedia-Std-Desktop", false).toggleClass("sapUiRespGridMedia-Std-Phone", false).toggleClass("sapUiRespGridMedia-Std-LargeDesktop", false);
			} else if (sMedia === "LargeDesktop") {
				$DomRef.toggleClass("sapUiRespGridMedia-Std-Desktop", false).toggleClass("sapUiRespGridMedia-Std-Phone", false).toggleClass("sapUiRespGridMedia-Std-Tablet", false);
			} else {
				$DomRef.toggleClass("sapUiRespGridMedia-Std-Phone", false).toggleClass("sapUiRespGridMedia-Std-Tablet", false).toggleClass("sapUiRespGridMedia-Std-LargeDesktop", false);
			}

			this.fireEvent("mediaChanged", {media: sMedia});
		};


		/*
		 * Get span information for the Control
		 * @param {sap.ui.core.Control} Control instance
		 * @return {Object} Grid layout data
		 * @private
		 */
		Grid.prototype._getLayoutDataForControl = function(oControl) {
			var oLayoutData = oControl.getLayoutData();

			if (!oLayoutData) {
				return undefined;
			} else if (oLayoutData.isA("sap.ui.layout.GridData")) {
				return oLayoutData;
			} else if (oLayoutData.isA("sap.ui.core.VariantLayoutData")) {
				// multiple LayoutData available - search here
				var aLayoutData = oLayoutData.getMultipleLayoutData();
				for ( var i = 0; i < aLayoutData.length; i++) {
					var oLayoutData2 = aLayoutData[i];
					if (oLayoutData2 && oLayoutData2.isA("sap.ui.layout.GridData")) {
						return oLayoutData2;
					}
				}
			}
		};

		/*
		 * If LayoutData is changed on one inner control, the whole grid needs to re-render
		 * because it may influence other rows and columns
		 */
		Grid.prototype.onLayoutDataChange = function(oEvent){
			if (this.getDomRef()) {
				// only if already rendered
				this.invalidate();
			}
		};

		/**
		 * Gets the role used for accessibility.
		 * Set by the Form control if Grid represents a FormContainer
		 * @return {string} sRole accessibility role
		 * @since 1.28.0
		 * @private
		 */
		Grid.prototype._getAccessibleRole = function() {
			return null;
		};

		/**
		 * Returns the <code>Grid</code> accessibility information.
		 * @see sap.ui.core.Control#getAccessibilityInfo
		 * @protected
		 * @returns {object} The <code>Grid</code> accessibility information
		 */
		Grid.prototype.getAccessibilityInfo = function() {
			return {
				children: this.getContent().filter(function(oContent) {
					return oContent.$().is(':visible');
				})
			};
		};

	}());


	return Grid;

});