/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.layout.FixFlex.
sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/core/EnabledPropagator",
	"sap/ui/core/ResizeHandler",
	"sap/ui/core/delegate/ScrollEnablement",
	"./FixFlexRenderer",
	"sap/ui/layout/library"
], function(
	Control,
	EnabledPropagator,
	ResizeHandler,
	ScrollEnablement,
	FixFlexRenderer
) {
	"use strict";

	/**
	 * Constructor for a new FixFlex.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * A layout container with a fixed and a flexible part.
	 * <h3>Overview</h3>
	 * The FixFlex control builds the container for a layout with a fixed and a flexible part. The flexible container adapts its size to the fix container.
	 * <h4>Guidelines:</h4>
	 * <ul>
	 * <li>The fix container can hold any number of controls, while the flexible container can hold only one</li>
	 * <li>In order for the FixFlex to stretch properly, the parent element, in which the control is placed, needs to have a specified height or needs to have an absolute position.</li>
	 * <li>Avoid nesting FixFlex in other flexbox-based layout controls ({@link sap.ui.layout.FixFlex FixFlex}, {@link sap.m.FlexBox FlexBox}, Hbox, Vbox). Otherwise, contents may be not accessible or multiple scrollbars can appear.</li>
	 * </ul>
	 * <h3>Structure</h3>
	 * The behavior of the FixFlex is controlled by the following properties:
	 * <ul>
	 * <li><code>fixContentSize</code> - The width/height of the fix part of the control</li>
	 * <li><code>fixFirst</code> - The ordering of the fix and flex part</li>
	 * <li><code>minFlexSize</code> - Scrolling inside the flex part, if its contents are large</li>
	 * <li><code>vertical</code> - Alignment of the FixFlex control</li>
	 * </ul>
	 * <h3>Responsive Behavior</h3>
	 * <ul>
	 * <li>If the child control of the flex or the fix container has width/height bigger than the container itself, the child control will be cropped in the view.</li>
	 * <li>If minFlexSize is set, then a scrollbar is shown in the flexible part, depending on the <code>vertical</code> property.</li>
	 * </ul>
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.25.0
	 * @alias sap.ui.layout.FixFlex
	 */
	var FixFlex = Control.extend("sap.ui.layout.FixFlex", /** @lends sap.ui.layout.FixFlex.prototype */ {
		metadata: {

			library: "sap.ui.layout",
			properties: {

				/**
				 * Determines the direction of the layout of child elements. True for vertical and false for horizontal layout.
				 */
				vertical: {type: "boolean", group: "Appearance", defaultValue: true},

				/**
				 * Determines whether the fixed-size area should be on the beginning/top ( if the value is "true") or end/bottom ( if the value is "false").
				 */
				fixFirst: {type: "boolean", group: "Misc", defaultValue: true},

				/**
				 * Determines the height (if the vertical property is "true") or the width (if the vertical property is "false") of the fixed area. If left at the default value "auto", the fixed-size area will be as large as its content. In this case the content cannot use percentage sizes.
				 */
				fixContentSize: {type: "sap.ui.core.CSSSize", group: "Dimension", defaultValue: "auto"},

				/**
				 * Enables scrolling inside the flexible part. The given size is calculated in "px". If the child control in the flexible part is larger than the available flexible size on the screen and if the available size for the flexible part is smaller or equal to the minFlexSize value, the scroll will be for the entire FixFlex control.
				 *
				 * @since 1.29
				 */
				minFlexSize: {type: "int", defaultValue: 0}
			},
			aggregations: {

				/**
				 * Controls in the fixed part of the layout.
				 */
				fixContent: {type: "sap.ui.core.Control", multiple: true, singularName: "fixContent"},

				/**
				 * Control in the stretching part of the layout.
				 */
				flexContent: {type: "sap.ui.core.Control", multiple: false}
			},
			designtime: "sap/ui/layout/designtime/FixFlex.designtime",
			dnd: { draggable: false, droppable: true }
		},

		renderer: FixFlexRenderer
	});

	EnabledPropagator.call(FixFlex.prototype);

	/**
	 * Initializes the control.
	 * @private
	 */
	FixFlex.prototype.init = function () {
		this._scroller = new ScrollEnablement(this, null, {
			scrollContainerId : this.getId()
		});

		this._innerScroller = new ScrollEnablement(this, this.getId() + "-FlexibleContainer", {
			scrollContainerId: this.getId() + "-Flexible"
		});
	};

	/**
	 * Clears the control dependencies.
	 * @private
	 */
	FixFlex.prototype.exit = function () {
		this._deregisterControl();

		if (this._scroller) {
			this._scroller.destroy();
			this._scroller = null;
		}

		if (this._innerScroller) {
			this._innerScroller.destroy();
			this._innerScroller = null;
		}
	};

	/**
	 * Called before the control is rendered.
	 * @private
	 */
	FixFlex.prototype.onBeforeRendering = function () {
		this._deregisterControl();

		this._scroller.setVertical(false);
		this._scroller.setHorizontal(false);

		var bScrolling = this.getMinFlexSize() !== 0;
		this._innerScroller.setVertical(bScrolling);
		this._innerScroller.setHorizontal(bScrolling);
	};

	/**
	 * Called after the control is rendered.
	 * @private
	 */
	FixFlex.prototype.onAfterRendering = function () {
		// Add handler for FixFlex scrolling option
		if (this.getMinFlexSize() !== 0) {
			this.sResizeListenerFixFlexScroll = ResizeHandler.register(this.getDomRef(), this._changeScrolling.bind(this));
			this.sResizeListenerFixFlexScrollFlexPart = ResizeHandler.register(this.getDomRef("Fixed"), this._changeScrolling.bind(this));

			var flexibleContainerChildDomRef = this.getDomRef("FlexibleContainer").firstChild;
			if (flexibleContainerChildDomRef) {
				this.sResizeListenerFixFlexContainerScroll = ResizeHandler.register(flexibleContainerChildDomRef, this._changeFlexibleContainerScroll.bind(this));
			}

			this._changeScrolling();
		}
	};

	/**
	 * Returns the sap.ui.core.delegate.ScrollEnablement delegate which is used with this control.
	 * @returns {sap.ui.core.delegate.ScrollEnablement}
	 * @private
	 */
	FixFlex.prototype.getScrollDelegate = function () {
		return this._innerScroller;
	};

	/**
	 * Deregister the control
	 *
	 * @private
	 */
	FixFlex.prototype._deregisterControl = function () {
		// Deregister resize event for FixFlex scrolling
		if (this.sResizeListenerFixFlexScroll) {
			ResizeHandler.deregister(this.sResizeListenerFixFlexScroll);
			this.sResizeListenerFixFlexScroll = null;
		}

		// Deregister resize event for FixFlex scrolling for Flex part
		if (this.sResizeListenerFixFlexScrollFlexPart) {
			ResizeHandler.deregister(this.sResizeListenerFixFlexScrollFlexPart);
			this.sResizeListenerFixFlexScrollFlexPart = null;
		}

		// Deregister resize event for FixFlex flexible container scrolling
		if (this.sResizeListenerFixFlexContainerScroll) {
			ResizeHandler.deregister(this.sResizeListenerFixFlexContainerScroll);
			this.sResizeListenerFixFlexContainerScroll = null;
		}
	};

	/**
	 * Change FixFlex scrolling position
	 * @private
	 */
	FixFlex.prototype._changeScrolling = function () {
		var iFlexSize,
			sDirection,
			$this = this.$(),
			iMinFlexSize = this.getMinFlexSize(),
			bIsVertical = this.getVertical();

		if (bIsVertical) {
			iFlexSize = this.$().height() - this.$("Fixed").height();
			sDirection = "height";
		} else {
			iFlexSize = this.$().width() - this.$("Fixed").width();
			sDirection = "width";
		}

		// Add scrolling for entire FixFlex
		if (iFlexSize <= parseInt(this.getMinFlexSize())) {
			$this.addClass("sapUiFixFlexScrolling");
			$this.removeClass("sapUiFixFlexInnerScrolling");

			if (bIsVertical) {
				this._scroller.setVertical(true);
				this._innerScroller.setVertical(false);
			} else {
				this._scroller.setHorizontal(true);
				this._innerScroller.setHorizontal(false);
			}

			// BCP Incident-ID: 1570246771
			if (this.$("FlexibleContainer").children().height() > iMinFlexSize) {
				this.$("Flexible").attr("style", "min-" + sDirection + ":" + iMinFlexSize + "px");
			} else {
				// If the child control is smaller than the content,
				// the flexible part need to have set height/width, else the child control can"t resize to max
				this.$("Flexible").attr("style", sDirection + ":" + iMinFlexSize + "px");
			}

		} else { // Add scrolling inside Flexible container

			$this.addClass("sapUiFixFlexInnerScrolling");
			$this.removeClass("sapUiFixFlexScrolling");
			if (bIsVertical) {
				this._scroller.setVertical(false);
				this._innerScroller.setVertical(true);

			} else {
				this._scroller.setHorizontal(false);
				this._innerScroller.setHorizontal(true);
			}

			this._changeFlexibleContainerScroll();

			this.$("Flexible").removeAttr("style");
		}
	};

	/**
	 * Change flexible container scroll
	 * @private
	 */
	FixFlex.prototype._changeFlexibleContainerScroll = function () {
		var $flexibleContainer = this.$("FlexibleContainer"),
			containerHeight = $flexibleContainer.height(),
			childrenHeight = $flexibleContainer.children().height();

		if (containerHeight == childrenHeight){
			return;
		}

		if (containerHeight > childrenHeight) {
			$flexibleContainer.removeClass('sapUiFixFlexFlexibleContainerGrowing');
		} else {
			$flexibleContainer.addClass('sapUiFixFlexFlexibleContainerGrowing');
		}
	};

	return FixFlex;
});