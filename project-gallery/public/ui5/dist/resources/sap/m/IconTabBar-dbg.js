/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.IconTabBar.
sap.ui.define([
	'./library',
	'sap/ui/core/Control',
	'./IconTabBarRenderer',
	'./IconTabHeader',
	"sap/ui/core/RenderManager",
	"sap/ui/core/util/ResponsivePaddingsEnablement",
	"sap/ui/thirdparty/jquery"
],
	function(library, Control, IconTabBarRenderer, IconTabHeader, RenderManager, ResponsivePaddingsEnablement, jQuery) {
	"use strict";

	// shortcut for sap.m.IconTabHeaderMode
	var IconTabHeaderMode = library.IconTabHeaderMode;

	// shortcut for sap.m.BackgroundDesign
	var BackgroundDesign = library.BackgroundDesign;

	// shortcut for sap.m.IconTabDensityMode
	var IconTabDensityMode = library.IconTabDensityMode;

	// shortcut for sap.m.TabsOverflowMode
	var TabsOverflowMode = library.TabsOverflowMode;

	/**
	 * Constructor for a new IconTabBar.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * The IconTabBar represents a collection of tabs with associated content.
	 * <h3>Overview</h3>
	 * The IconTabBar can be used for navigation within an object, or as a filter. Different types of IconTabBar are used based on the contents.
	 * <ul>
	 * <li>Filter - There is only one main content for all tabs. The main content can be filtered, based on the selected tab.</li>
	 * <li>Normal tab bar - The contents of each tab are independent from each other.</li>
	 * <li>Combination of the above - There can be both filtered and independent contents.</li>
	 * </ul>
	 * <h3>Structure</h3>
	 * The IconTabBar can hold two types of entities {@link sap.m.IconTabFilter sap.m.IconTabFilter} and {@link sap.m.IconTabSeparator sap.m.IconTabSeparator}
	 *
	 * The IconTabFilter holds all information on an item - text, icon and count.
	 *
	 * The IconTabSeparator holds an icon that can be used to show a process that runs from item to item.
	 *<h3>Usage</h3>
	 *<h4>Text only</h4>
	 *Uses text labels as tabs with optional counter
	 *<ul>
	 *<li>Used when there are no suitable icons for all items.</li>
	 *<li>Used when longer labels are needed.</li>
	 *<li>If <code>headerMode</code> property is set to <code>Inline</code> the text and the count are displayed in one line.</li>
	 *<li><code>UpperCase</code> is disabled.</li>
	 *<li>Use title case.</li>
	 *</ul>
	 *<h4>Icon Tabs</h4>
	 *Round tabs with optional counter and label
	 *<ul>
	 *<li>Used when there are unique icons for all items.</li>
	 *<li>Only shorter labels are possible.</li>
	 *<li>Provide labels for all icons or for none. Do not mix these.</li>
	 *</ul>
	 *<h4>Tabs as filters</h4>
	 *Tabs with filtered content from the same set of items
	 *<ul>
	 *<li>Provide an <i>"All"</i> tab to show all items without filtering.</li>
	 *<li>Use counters to show the number of items in each filter.</li>
	 *</ul>
	 *<h4>Tabs as process steps</h4>
	 *Tabs show a single step in a process
	 *<ul>
	 *<li>Use an arrow (e.g. triple-chevron) as a separator to connect the steps.</li>
	 *<li>Use counters to show the number of items in each filter.</li>
	 *</ul>
	 *<h3>Hierarchies</h3>
	 * Multiple sub tabs could be placed underneath one main tab. Nesting allows deeper hierarchies with indentations to indicate the level of each nested tab.
	 * When a tab has both sub tabs and own content its click area is split to allow the user to display the content or alternatively to expand/collapse the list of sub tabs.
	 *<h3>Responsive Behavior</h3>
	 *<ul>
	 *<li>Text-only tabs are never truncated.</li>
	 *<li>Use the <code>expandable</code> property to specify whether users can collapse the tab container (default = true).</li>
	 *<li>On desktop, tabs can be dragged and dropped (property <code>enableTabReordering</code>).</li>
	 *<li>If you have a large number of tabs, only the tabs that can fit on screen will be visible. All other tabs that can't fit on the screen are available in an overflow tab "More".</li>
	 *</ul>
	 * When using the <code>sap.m.IconTabBar</code> in SAP Quartz and Horizon themes, the breakpoints and layout paddings could be determined by the Icon Tab Bar's width. To enable this concept and add responsive paddings to an element of the Icon Tab Bar control, you have to add the following classes depending on your use case: <code>sapUiResponsivePadding--header</code>, <code>sapUiResponsivePadding--content</code>.
	 * @extends sap.ui.core.Control
	 * @implements sap.m.ObjectHeaderContainer, sap.f.IDynamicPageStickyContent
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @public
	 * @alias sap.m.IconTabBar
	 * @see {@link fiori:https://experience.sap.com/fiori-design-web/icontabbar/ Icon Tab Bar}
	 */
	var IconTabBar = Control.extend("sap.m.IconTabBar", /** @lends sap.m.IconTabBar.prototype */ {
		metadata : {

			interfaces : [
				"sap.m.ObjectHeaderContainer",
				"sap.f.IDynamicPageStickyContent"
			],
			library : "sap.m",
			properties : {

				/**
				 * Defines whether the current selection should be visualized.
				 * @deprecated As of 1.15.0.
				 * Regarding to changes of this control this property is not needed anymore.
				 */
				showSelection : {type : "boolean", group : "Misc", defaultValue : true, deprecated: true},

				/**
				 * Defines if the tabs are collapsible and expandable.
				 * @since 1.15.0
				 */
				expandable : {type : "boolean", group : "Misc", defaultValue : true},

				/**
				 * Indicates if the actual tab content is expanded or not.
				 * @since 1.15.0
				 */
				expanded : {type : "boolean", group : "Misc", defaultValue : true},

				/**
				 * Key of the selected tab item.
				 *
				 * If the key has no corresponding aggregated item, no changes will apply.
				 * If duplicate keys exists the first item matching the key is used.
				 * @since 1.15.0
				 */
				selectedKey : {type : "string", group : "Data", defaultValue : null},

				/**
				 * Determines whether the text of the icon tab filter (not the count) is displayed in uppercase.
				 * @since 1.22
				 */
				upperCase : {type : "boolean", group : "Appearance", defaultValue : false},

				/**
				 * Determines whether the IconTabBar height is stretched to the maximum possible height
				 * of its parent container. As a prerequisite, the height of the parent container must be
				 * defined as a fixed value.
				 *
				 * @since 1.26
				 */
				stretchContentHeight : {type : "boolean", group : "Appearance", defaultValue : false},

				/**
				 * Determines whether the IconTabBar content fits to the full area.
				 * The paddings are removed if it's set to false.
				 *
				 * @since 1.26
				 */
				applyContentPadding : {type : "boolean", group : "Appearance", defaultValue : true},

				/**
				 * Specifies the background color of the IconTabBar.
				 *
				 * Depending on the theme, you can change the state of
				 * the background color to "Solid", "Translucent", or "Transparent".
				 * Default is "Solid".
				 * @since 1.26
				 */
				backgroundDesign : {type : "sap.m.BackgroundDesign", group : "Appearance", defaultValue : BackgroundDesign.Solid},

				/**
				 * Specifies the header mode.
				 *
				 * @since 1.40
				 */
				headerMode : {type : "sap.m.IconTabHeaderMode", group : "Appearance", defaultValue : IconTabHeaderMode.Standard},

				/**
				 * Specifies if the overflow select list is displayed.
				 *
				 * The overflow select list represents a list, where all tab filters are displayed,
				 * so the user can select specific tab filter easier.
				 * @since 1.42
				 * @deprecated As of version 1.77, the concept has been discarded. All tab filters that don't fit in the header, will be displayed in overflow menu.
				 */
				showOverflowSelectList : {type : "boolean", group : "Appearance", defaultValue : false, deprecated: true},

				/**
				 * Specifies the background color of the header.
				 *
				 * Depending on the theme, you can change the state of the background color to "Solid", "Translucent", or "Transparent".
				 * <b>Note:</b> In SAP Belize Deep (sap_belize_plus) theme this property should be set to "Solid".
				 * @since 1.44
				 */
				headerBackgroundDesign : {type : "sap.m.BackgroundDesign", group : "Appearance", defaultValue : BackgroundDesign.Solid},

				/**
				 * Specifies whether tab reordering is enabled. Relevant only for desktop devices.
				 * The {@link sap.m.IconTabSeparator sap.m.IconTabSeparator} cannot be dragged and dropped
				 * Items can be moved around {@link sap.m.IconTabSeparator sap.m.IconTabSeparator}
				 * Reordering is enabled via keyboard using <code>Ctrl</code> + arrow keys (Windows) and <code>Control</code> + arrow keys (Mac OS)
				 * @since 1.46
				 */
				enableTabReordering : {type : "boolean", group : "Behavior", defaultValue : false},

				/**
				 * Specifies the allowed level of tabs nesting within one another using drag and drop.
				 * Default value is 0 which means nesting via interaction is not allowed. Maximum value is 100.
				 * This property allows nesting via user interaction only, and does not restrict adding items
				 * to the <code>items</code> aggregation of {@link sap.m.IconTabFilter sap.m.IconTabFilter}.
				 * @since 1.79
				 */
				maxNestingLevel: { type: "int", group : "Behavior", defaultValue: 0},

				/**
				 * Specifies the visual density mode of the tabs.
				 *
				 * The values that can be applied are <code>Cozy</code>, <code>Compact</code> and <code>Inherit</code>.
				 * <code>Cozy</code> and <code>Compact</code> render the control in one of these modes independent of the global density settings.
				 * The <code>Inherit</code> value follows the global density settings which are applied.
				 * For compatibility reasons, the default value is <code>Cozy</code>.
				 * @since 1.56
				 */
				tabDensityMode : {type : "sap.m.IconTabDensityMode", group : "Appearance", defaultValue : IconTabDensityMode.Cozy},

				/**
				 * Specifies optional texts for the screen reader.
				 *
				 * The given object can contain the following keys:
				 * <code>headerLabel</code> - text to serve as a label for the header,
				 * <code>headerDescription</code> - text to serve as a description for the header.
				 * @since 1.78
				 */
				ariaTexts : {type : "object", group : "Accessibility", defaultValue : null},

				/**
				 * Specifies the overflow mode of the header.
				 *
				 * The default <code>End</code> mode shows as many tabs that can fit on the screen, then shows one overflow at the end
				 * containing the remaining items.
				 * The <code>StartAndEnd</code> is used to keep the order of tabs intact and offers two overflow tabs on both ends of the bar.
				 * @since 1.90
				 */
				tabsOverflowMode: {type : "sap.m.TabsOverflowMode", group : "Behavior", defaultValue : TabsOverflowMode.End}
			},
			aggregations : {

				/**
				 * The items displayed in the IconTabBar.
				 */
				items : {type : "sap.m.IconTab", multiple : true, singularName : "item", forwarding: {
					getter: "_getIconTabHeader",
					aggregation: "items",
					forwardBinding: true
				}},

				/**
				 * Represents the contents displayed below the IconTabBar.
				 * If there are multiple contents, they are rendered after each other.
				 * The developer has to manage to display the right one or use the content aggregation
				 * inside the IconTabFilter (which will be displayed instead if it is set).
				 */
				content : {type : "sap.ui.core.Control", multiple : true, singularName : "content"},

				/**
				 * Internal aggregation for managing the icon tab elements.
				 */
				_header : {type : "sap.m.IconTabHeader", multiple : false, visibility : "hidden"}
			},
			events : {

				/**
				 * Fires when an item is selected.
				 */
				select : {
					parameters : {

						/**
						 * The selected item
						 * @since 1.15.0
						 */
						item : {type : "sap.m.IconTabFilter"},

						/**
						 * The key of the selected item
						 * @since 1.15.0
						 */
						key : {type : "string"},

						/**
						 * The key of the previous selected item
						 * @since 1.96
						 */
						previousKey : {type : "string"},

						/**
						 * The selected item
						 * @deprecated As of 1.15.0, replaced by parameter <code>item</code> instead.
						 */
						selectedItem : {type : "sap.m.IconTabFilter"},

						/**
						 * The key of the selected item
						 * @deprecated As of 1.15.0, replaced by parameter <code>key</code> instead.
						 */
						selectedKey : {type : "string"}
					}
				},

				/**
				 * Indicates that the tab will expand or collapse.
				 * @since 1.15.0
				 */
				expand : {
					parameters : {

						/**
						 * If the tab will expand, this is true.
						 */
						expand : {type : "boolean"},

						/**
						 * If the tab will collapse, this is true.
						 */
						collapse : {type : "boolean"}
					}
				}
			},
			designtime: "sap/m/designtime/IconTabBar.designtime"
		},

		renderer: IconTabBarRenderer
	});

	ResponsivePaddingsEnablement.call(IconTabBar.prototype, {
		header: { selector: ".sapMITH" },
		content: { suffix: "content" }
	});

	// List of classes to copy from IconTabBar to IconTabHeader when used as a sticky header inside a DynamicPage.
	IconTabBar._CLASSES_TO_COPY = ["sapUiResponsiveContentPadding", "sapUiNoContentPadding", "sapUiContentPadding"];

	/**
	 * Initialization lifecycle method.
	 *
	 * @private
	 */
	IconTabBar.prototype.init = function () {
		this._initResponsivePaddingsEnablement();
	};

	/**
	 * Sets the tab content as expanded.
	 *
	 * @public
	 * @param {boolean} bExpanded New parameter value.
	 * @return {this} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype.setExpanded = function (bExpanded) {
		// set internal property
		this.setProperty("expanded", bExpanded, true);

		// toggle animation if control is already rendered
		if (this.$().length) {
			this._toggleExpandCollapse(this.getProperty("expanded"));
		}
		return this;
	};

	/**
	 * Sets the header mode.
	 *
	 * @public
	 * @param {sap.m.IconTabHeaderMode} mode New parameter value.
	 * @return {this} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype.setHeaderMode = function (mode) {
		var oIconTabHeader = this._getIconTabHeader();

		// set internal property
		this.setProperty("headerMode", mode, true);

		if (oIconTabHeader) {
			oIconTabHeader.setMode(mode);
		}

		return this;
	};

	/**
	 * Sets the tab density mode.
	 *
	 * @public
	 * @param {sap.m.IconTabDensityMode} mode New parameter value.
	 * @return {this} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype.setTabDensityMode = function (mode) {
		var oIconTabHeader = this._getIconTabHeader();

		// set internal property
		this.setProperty("tabDensityMode", mode);

		if (oIconTabHeader) {
			oIconTabHeader.setTabDensityMode(mode);
		}

		return this;
	};


	/**
	 * Sets the header background design.
	 *
	 * @public
	 * @param {sap.m.BackgroundDesign} headerBackgroundDesign New parameter value.
	 * @return {this} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype.setHeaderBackgroundDesign = function (headerBackgroundDesign) {
		var oIconTabHeader = this._getIconTabHeader();

		// set internal property
		this.setProperty("headerBackgroundDesign", headerBackgroundDesign, true);

		if (oIconTabHeader) {
			oIconTabHeader.setBackgroundDesign(headerBackgroundDesign);
		}

		return this;
	};

	/**
	 * Sets the enableTabReordering property.
	 *
	 * @public
	 * @param {boolean} value New value for enableTabReordering.
	 * @return {this} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype.setEnableTabReordering = function (value) {
		var oIconTabHeader = this._getIconTabHeader();

		// set internal property
		this.setProperty("enableTabReordering", value, true);

		if (oIconTabHeader) {
			oIconTabHeader.setEnableTabReordering(value);
		}

		return this;
	};

	/**
	 * Sets the ariaTexts property.
	 *
	 * @public
	 * @param {{headerLabel: string, headerDescription: string}} oAriaTexts New value for ariaTexts.
	 * @returns {this} this Reference to this in order to allow method chaining
	 */
	IconTabBar.prototype.setAriaTexts = function (oAriaTexts) {
		var oIconTabHeader = this._getIconTabHeader();

		// set internal property
		this.setProperty("ariaTexts", oAriaTexts, true);

		if (oIconTabHeader) {
			oIconTabHeader.setAriaTexts(oAriaTexts);
		}

		return this;
	};

	/**
	 * Gets current value of property {@link #getAriaTexts ariaTexts}.
	 *
	 * Specifies optional texts for the screen reader.
	 *
	 * The given object can contain the following keys: <code>headerLabel</code> - text to serve as a label for the header, <code>headerDescription</code> - text to serve as a description for the header.
	 *
	 * @method
	 * @returns {{headerLabel: string, headerDescription: string}|null} Value of property <code>ariaTexts</code>
	 * @public
	 * @name sap.m.IconTabBar#getAriaTexts
	 */

	/**
	 * @override
	 */
	IconTabBar.prototype.addStyleClass = function (sClass, bSuppressRerendering) {
		var oIconTabHeader = this._getIconTabHeader();

		if (oIconTabHeader) {
			sClass.split(/\s+/).forEach((sSingleClass) => {
				if (IconTabBar._CLASSES_TO_COPY.includes(sSingleClass)) {
					oIconTabHeader.addStyleClass(sSingleClass, true);
				}
			});
		}

		return Control.prototype.addStyleClass.apply(this, arguments);
	};

	/**
	 * @override
	 */
	IconTabBar.prototype.removeStyleClass = function (sClass, bSuppressRerendering) {
		var oIconTabHeader = this._getIconTabHeader();

		if (oIconTabHeader) {
			sClass.split(/\s+/).forEach((sSingleClass) => {
				if (IconTabBar._CLASSES_TO_COPY.includes(sSingleClass)) {
					oIconTabHeader.removeStyleClass(sSingleClass, true);
				}
			});
		}

		return Control.prototype.removeStyleClass.apply(this, arguments);
	};

	/**
	 * Re-renders only the displayed content of the IconTabBar.
	 *
	 * @private
	 * @param oContent Content, which should be rendered.
	 */
	IconTabBar.prototype._rerenderContent = function (oContent) {
		var $content = this.$("content");
		if (oContent && ($content.length > 0)) {
			var oRM = new RenderManager().getInterface();
			for (var i = 0; i < oContent.length; i++) {
				oRM.renderControl(oContent[i]);
			}
			oRM.flush($content[0]);
			oRM.destroy();
		}
	};

	/**
	 * Opens and closes the content container.
	 *
	 * @private
	 * @param {boolean|undefined} bExpanded The new state of the container. If not specified, it will use the property expanded.
	 * @return {this} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype._toggleExpandCollapse = function(bExpanded) {
		var $content = this.$("content");
		var oSelectedItem = this._getIconTabHeader().oSelectedItem;

		// use inverted control state if not specified by parameter
		if (bExpanded === undefined) {
			bExpanded = !this.getExpanded();
		}

		// TODO: do this in header now
		// manage selection state

		if (oSelectedItem) {
			oSelectedItem.$().toggleClass("sapMITBSelected", bExpanded);

			oSelectedItem.$().attr({
				'aria-expanded': bExpanded
			});

			if (bExpanded) {
				oSelectedItem.$().attr({ 'aria-selected': bExpanded });
			} else {
				oSelectedItem.$().removeAttr('aria-selected');
			}
		}

		// show animation (keep track of active animations to avoid flickering of controls)
		this._iAnimationCounter = (this._iAnimationCounter === undefined ? 1 : ++this._iAnimationCounter);
		if (bExpanded) { // expanding
			if (oSelectedItem) {
				if (this.$("content").children().length === 0) { //content is not rendered yet
					//if item has own content, this content is shown
					var oSelectedItemContent = oSelectedItem.getContent();
					if (oSelectedItemContent.length > 0) {
						this._rerenderContent(oSelectedItemContent);
					//if item has not own content, general content of the icontabbar is shown
					} else {
						this._rerenderContent(this.getContent());
					}
				}
				$content.stop(true, true).slideDown('400', jQuery.proxy(this.onTransitionEnded, this, bExpanded));
				this.$("containerContent").toggleClass("sapMITBContentClosed", !bExpanded);
			}
		} else { // collapsing
			this.$("contentArrow").hide();
			$content.stop(true, true).slideUp('400', jQuery.proxy(this.onTransitionEnded, this, bExpanded));
		}

		// update property (if we have a selected item) and fire event
		if (!bExpanded || oSelectedItem) {
			this.setProperty("expanded", bExpanded, true);
		}
		this.fireExpand({
			expand: bExpanded,
			collapse: !bExpanded
		});

		return this;
	};

	/**
	 * Function is executed when the expand/collapse animation is finished to adjust the UI.
	 *
	 * @private
	 * @param {boolean} bExpanded The new state of the container.
	 * @return {this} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype.onTransitionEnded = function(bExpanded) {
		var $content = this.$("content"),
			$container = this.$("containerContent"),
			$arrow = this.$("contentArrow");

		// if multiple animations are triggered, this function is executed multiple times in the end, so we need to ignore all except the last call
		if (this._iAnimationCounter === 1) {
			$container.toggleClass("sapMITBContentClosed", !bExpanded);
			if (bExpanded) { // expanding
				$arrow.show();
				$content.css("display", "block");
			} else { // collapsing
				$arrow.hide();
				$content.css("display", "none");
			}
		}
		// reduce animation counter
		this._iAnimationCounter = (this._iAnimationCounter > 0 ? --this._iAnimationCounter : 0);
		return this;
	};

	/* =========================================================== */
	/*           end: event handlers                               */
	/* =========================================================== */

	/**
	 * Lazy initializes the iconTabHeader aggregation.
	 *
	 * @private
	 * @returns {sap.m.IconTabBar|null} Aggregation for the IconTabBar.
	 */
	IconTabBar.prototype._getIconTabHeader = function () {
		if (this.isDestroyStarted()) {
			return null;
		}

		var oControl = this.getAggregation("_header");

		if (!oControl) {
			oControl = new IconTabHeader(this.getId() + "--header", {
			});
			this.setAggregation("_header", oControl, true);
		}
		return oControl;
	};

	IconTabBar.prototype._getStickyContent = function () {
		return this._getIconTabHeader();
	};

	IconTabBar.prototype._returnStickyContent = function () {
		if (this.bIsDestroyed) {
			return;
		}

		this._getStickyContent().$().prependTo(this.$());
	};

	IconTabBar.prototype._setStickySubheaderSticked = function (bIsInStickyContainer) {
		this._bStickyContentSticked = bIsInStickyContainer;
	};

	IconTabBar.prototype._getStickySubheaderSticked = function () {
		return this._bStickyContentSticked;
	};

	IconTabBar.prototype.onBeforeRendering = function () {
		var oITH = this._getIconTabHeader(),
			$ITH = oITH.$();

		oITH.setMaxNestingLevel(this.getMaxNestingLevel());
		oITH.setTabsOverflowMode(this.getTabsOverflowMode());

		if (this._bStickyContentSticked && $ITH) {
			delete this._bStickyContentSticked;
			this._getIconTabHeader().$().remove();
		}
	};

	/* =========================================================== */
	/*           begin: reflectors for header properties           */
	/* =========================================================== */

	/**
	 * Reflector for the internal header's showSelection property.
	 *
	 * @public
	 * @param {boolean} bValue the new value.
	 * @returns {this} this IconTabBar reference for chaining.
	 * @deprecated As of 1.15.0.
	 * Regarding to changes of this control this property is not needed anymore.
	 */
	IconTabBar.prototype.setShowSelection = function (bValue) {
		var oIconTabHeader = this._getIconTabHeader();

		if (oIconTabHeader) {
			oIconTabHeader.setShowSelection(bValue);
		}

		this.setProperty("showSelection", bValue, true);

		return this;
	};

	/**
	 * Reflector for the internal header's selectedKey property.
	 *
	 * @public
	 * @param {string} sValue The new value.
	 * @returns {this} this Pointer for chaining.
	 */
	IconTabBar.prototype.setSelectedKey = function (sValue) {
		var oIconTabHeader = this._getIconTabHeader();

		if (oIconTabHeader) {
			oIconTabHeader.setSelectedKey(sValue);
		}

		return this;
	};

	/**
	 * Reflector for the internal header's selectedKey property.
	 *
	 * @public
	 * @returns {string} The current property value.
	 */
	IconTabBar.prototype.getSelectedKey = function () {
		var oIconTabHeader = this._getIconTabHeader();

		if (oIconTabHeader) {
			return oIconTabHeader.getSelectedKey();
		}

		return this.getMetadata().getProperty("selectedKey").getDefaultValue();
	};

	/**
	 * Reflector for the internal header's selectedItem.
	 * Sets the selected item, updates the UI, and fires the select event.
	 *
	 * @private
	 * @param {sap.m.IconTabFilter} oItem Item to be selected.
	 * @return {sap.m.IconTabHeader} this IconTabBar reference for chaining.
	 */
	IconTabBar.prototype.setSelectedItem = function (oItem, bAPIchange) {
		return this._getIconTabHeader().setSelectedItem(oItem, bAPIchange);
	};

	/* =========================================================== */
	/*           end: reflectors for header properties             */
	/* =========================================================== */

	return IconTabBar;
});
