/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.SplitContainer.
sap.ui.define([
	'./library',
	'sap/ui/core/Control',
	"sap/ui/core/ControlBehavior",
	"sap/ui/core/Element",
	'sap/ui/core/IconPool',
	'sap/ui/core/InvisibleText',
	'sap/ui/Device',
	'sap/m/NavContainer',
	'sap/m/Popover',
	'sap/m/Button',
	'./SplitContainerRenderer',
	"sap/ui/core/Lib",
	"sap/ui/core/RenderManager",
	"sap/ui/dom/containsOrEquals",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery"
],
function(
	library,
	Control,
	ControlBehavior,
	Element,
	IconPool,
	InvisibleText,
	Device,
	NavContainer,
	Popover,
	Button,
	SplitContainerRenderer,
	Library,
	RenderManager,
	containsOrEquals,
	Log,
	jQuery
) {
	"use strict";

	// shortcut for sap.m.ButtonType
	var ButtonType = library.ButtonType;

	// shortcut for sap.m.PlacementType
	var PlacementType = library.PlacementType;

	// shortcut for sap.m.SplitAppMode
	var SplitAppMode = library.SplitAppMode;

	/**
	 * Constructor for a new SplitContainer.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * A container control that is used to display a master-detail view.
	 *
	 * <h3>Overview</h3>
	 * The SplitContainer divides the screen into two areas:
	 * <ul>
	 * <li>Master area - contains a list of available items where the user can search and filter.</li>
	 * <li>Details area - contains a control which shows further details on the item(s) selected from the master view.</li>
	 * </ul>
	 * Both areas have separate headers and footer bars with navigation and actions.
	 *
	 * <h3>Usage</h3>
	 * SplitContainer should take the full width of the page in order to work properly.
	 * <h4>When to use</h4>
	 * <ul>
	 * <li>You need to review and process different items quickly with minimal navigation.</li>
	 * </ul>
	 * <h4>When not to use</h4>
	 * <ul>
	 * <li>You need to offer complex filters for the list of items.</li>
	 * <li>You need to see different attributes for each item in the list, and compare these values across items.</li>
	 * <li>You want to display a single object. Do not use the master list to display different facets of the same object.</li>
	 * </ul>
	 *
	 * <h3>Responsive Behavior</h3>
	 * On narrow screens, such as phones or tablet devices in portrait mode, the master list and the details are split into two separate pages.
	 * The user can navigate between the list and details, and see all the available information for each area.
	 *
	 * @extends sap.ui.core.Control
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @alias sap.m.SplitContainer
	 */
	var SplitContainer = Control.extend("sap.m.SplitContainer", /** @lends sap.m.SplitContainer.prototype */ {
		metadata : {

			library : "sap.m",
			interfaces: [
				"sap.ui.core.IPlaceholderSupport"
			],
			properties : {

				/**
				 * Determines the type of the transition/animation to apply when to() is called without defining the
				 * transition to use. The default is "slide", other options are "fade", "show", and the names of any registered custom transitions.
				 */
				defaultTransitionNameDetail : {type : "string", group : "Appearance", defaultValue : "slide"},

				/**
				 * Determines the type of the transition/animation to apply when to() is called, without defining the
				 * transition to use. The default is "slide", other options are "fade", "show", and the names of any registered custom transitions.
				 */
				defaultTransitionNameMaster : {type : "string", group : "Appearance", defaultValue : "slide"},

				/**
				 * Defines whether the master page will always be displayed (in portrait and landscape mode - StretchCompressMode),
				 * or if it should be hidden when in portrait mode (ShowHideMode). Default is ShowHideMode.
				 * Other possible values are Hide (Master is always hidden) and Popover (master is displayed in popover).
				 */
				mode : {type : "sap.m.SplitAppMode", group : "Appearance", defaultValue : SplitAppMode.ShowHideMode},

				/**
				 * Determines the text displayed in master button, which has a default value "Navigation".
				 * This text is only displayed in iOS platform and the icon from the current page in detail area is
				 * displayed in the master button for the other platforms.
				 * The master button is shown/hidden depending on the orientation of the device and whether
				 * the master area is opened or not. SplitContainer manages the show/hide of the master button by itself
				 * only when the pages added to the detail area are sap.m.Page with built-in header or sap.m.Page
				 * with built-in header, which is wrapped by one or several sap.ui.core.mvc.View.
				 * Otherwise, the show/hide of master button needs to be managed by the application.
				 */
				masterButtonText : {type : "string", group : "Appearance", defaultValue : null},

				/**
				 * Specifies the tooltip of the master button. If the tooltip is not specified,
				 * the title of the page, which is displayed is the master part, is set as tooltip to the master button.
				 * @since 1.48
				 */
				masterButtonTooltip : {type : "string", group : "Appearance", defaultValue : null},

				/**
				 * Determines the background color of the SplitContainer. If set, this color overrides the default one,
				 * which is defined by the theme (should only be used when really required).
				 * Any configured background image will be placed above this colored background,
				 * but any theme adaptation in the Theme Designer will override this setting.
				 * Use the backgroundRepeat property to define whether this image should be stretched
				 * to cover the complete SplitContainer or whether it should be tiled.
				 * @since 1.11.2
				 */
				backgroundColor : {type : "string", group : "Appearance", defaultValue : null},

				/**
				 * Sets the background image of the SplitContainer. When set, this image overrides
				 * the default background defined by the theme (should only be used when really required).
				 * This background image will be placed above any color set for the background,
				 * but any theme adaptation in the Theme Designer will override this image setting.
				 * Use the backgroundRepeat property to define whether this image should be stretched
				 * to cover the complete SplitContainer or whether it should be tiled.
				 * @since 1.11.2
				 */
				backgroundImage : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null},

				/**
				 * Defines whether the background image (if configured) is proportionally stretched
				 * to cover the whole SplitContainer (false) or whether it should be tiled (true).
				 * @since 1.11.2
				 */
				backgroundRepeat : {type : "boolean", group : "Appearance", defaultValue : false},

				/**
				 * Defines the opacity of the background image - between 0 (fully transparent) and 1 (fully opaque).
				 * This can be used to improve the content visibility by making the background image partly transparent.
				 * @since 1.11.2
				 */
				backgroundOpacity : {type : "float", group : "Appearance", defaultValue : 1}
			},
			aggregations : {

				/**
				 * Determines the content entities, between which the SplitContainer navigates in master area.
				 * These can be of type sap.m.Page, sap.ui.core.mvc.View, sap.m.Carousel or any other control with fullscreen/page semantics.
				 * These aggregated controls receive navigation events like {@link sap.m.NavContainerChild#event:BeforeShow BeforeShow},
				 * they are documented in the pseudo interface {@link sap.m.NavContainerChild sap.m.NavContainerChild}.
				 */
				masterPages : {type : "sap.ui.core.Control", multiple : true, singularName : "masterPage"},

				/**
				 * Determines the content entities, between which the SplitContainer navigates in detail area.
				 * These can be of type sap.m.Page, sap.ui.core.mvc.View, sap.m.Carousel or any other control with fullscreen/page semantics.
				 * These aggregated controls receive navigation events like {@link sap.m.NavContainerChild#event:BeforeShow BeforeShow},
				 * they are documented in the pseudo interface {@link sap.m.NavContainerChild sap.m.NavContainerChild}.
				 */
				detailPages : {type : "sap.ui.core.Control", multiple : true, singularName : "detailPage"},

				/**
				 * The master navigation container managed by the SplitContainer control.
				 */
				_navMaster : {type : "sap.m.NavContainer", multiple : false, visibility : "hidden"},

				/**
				 * The detail navigation container managed by the SplitContainer control.
				 */
				_navDetail : {type : "sap.m.NavContainer", multiple : false, visibility : "hidden"},

				/**
				 * A Popover managed by the SplitContainer control.
				 */
				_navPopover : {type : "sap.m.Popover", multiple : false, visibility : "hidden"}
			},
			associations : {

				/**
				 * Sets the initial detail page, which is displayed on application launch.
				 */
				initialDetail : {type : "sap.ui.core.Control", multiple : false},

				/**
				 * Sets the initial master page, which is displayed on application launch.
				 */
				initialMaster : {type : "sap.ui.core.Control", multiple : false}
			},
			events : {

				/**
				 * Fires when navigation between two pages in master area has been triggered. The transition (if any) to the new page has not started yet.
				 * This event can be aborted by the application with preventDefault(), which means that there will be no navigation.
				 */
				masterNavigate : {
					allowPreventDefault : true,
					parameters : {

						/**
						 * The page, which was displayed before the current navigation.
						 */
						from : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which was displayed before the current navigation.
						 */
						fromId : {type : "string"},

						/**
						 * The page, which will be displayed after the current navigation.
						 */
						to : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which will be displayed after the current navigation.
						 */
						toId : {type : "string"},

						/**
						 * Determines whether the "to" page (more precisely: a control with the ID of the page,
						 * which is currently being navigated to) has not been displayed/navigated to before.
						 */
						firstTime : {type : "boolean"},

						/**
						 * Determines whether this is a forward navigation, triggered by to().
						 */
						isTo : {type : "boolean"},

						/**
						 * Determines whether this is a back navigation, triggered by back().
						 */
						isBack : {type : "boolean"},

						/**
						 * Determines whether this is a navigation to the root page, triggered by backToTop().
						 */
						isBackToTop : {type : "boolean"},

						/**
						 * Determines whether this was a navigation to a specific page, triggered by backToPage().
						 * @since 1.7.2
						 */
						isBackToPage : {type : "boolean"},

						/**
						 * Determines how the navigation was triggered, possible values are "to", "back", "backToPage", and "backToTop".
						 */
						direction : {type : "string"}
					}
				},

				/**
				 * Fires when navigation between two pages in master area has completed.
				 * NOTE: In case of animated transitions this event is fired with some delay after the navigate event.
				 */
				afterMasterNavigate : {
					parameters : {

						/**
						 * The page, which had been displayed before navigation.
						 */
						from : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which had been displayed before navigation.
						 */
						fromId : {type : "string"},

						/**
						 * The page, which is now displayed after navigation.
						 */
						to : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which is now displayed after navigation.
						 */
						toId : {type : "string"},

						/**
						 * Whether the "to" page (more precisely: a control with the ID of the page, which has been navigated to)
						 * has not been displayed/navigated to before.
						 */
						firstTime : {type : "boolean"},

						/**
						 * Determines whether was a forward navigation, triggered by to().
						 */
						isTo : {type : "boolean"},

						/**
						 * Determines whether this was a back navigation, triggered by back().
						 */
						isBack : {type : "boolean"},

						/**
						 * Determines whether this was a navigation to the root page, triggered by backToTop().
						 */
						isBackToTop : {type : "boolean"},

						/**
						 * Determines whether this was a navigation to a specific page, triggered by backToPage().
						 * @since 1.7.2
						 */
						isBackToPage : {type : "boolean"},

						/**
						 * Determines how the navigation was triggered, possible values are "to", "back", "backToPage", and "backToTop".
						 */
						direction : {type : "string"}
					}
				},

				/**
				 * Fires when a Master Button needs to be shown or hidden. This is necessary for custom headers when the SplitContainer control does not handle the placement of the master button automatically.
				 */
				masterButton : {},

				/**
				 * Fires before the master area is opened.
				 */
				beforeMasterOpen : {},

				/**
				 * Fires when the master area is fully opened after animation if any.
				 */
				afterMasterOpen : {},

				/**
				 * Fires before the master area is closed.
				 */
				beforeMasterClose : {},

				/**
				 * Fires when the master area is fully closed after the animation (if any).
				 */
				afterMasterClose : {},

				/**
				 * Fires when navigation between two pages in detail area has been triggered.
				 * The transition (if any) to the new page has not started yet.
				 * NOTE: This event can be aborted by the application with preventDefault(), which means that there will be no navigation.
				 */
				detailNavigate : {
					allowPreventDefault : true,
					parameters : {

						/**
						 * The page, which was displayed before the current navigation.
						 */
						from : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which was displayed before the current navigation.
						 */
						fromId : {type : "string"},

						/**
						 * The page, which will be displayed after the current navigation.
						 */
						to : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which will be displayed after the current navigation.
						 */
						toId : {type : "string"},

						/**
						 * Determines whether the "to" page (more precisely: a control with the ID of the page,
						 * which is currently navigated to) has not been displayed/navigated to before.
						 */
						firstTime : {type : "boolean"},

						/**
						 * Determines whether this is a forward navigation, triggered by to().
						 */
						isTo : {type : "boolean"},

						/**
						 * Determines whether this is a back navigation, triggered by back().
						 */
						isBack : {type : "boolean"},

						/**
						 * Determines whether this is a navigation to the root page, triggered by backToTop().
						 */
						isBackToTop : {type : "boolean"},

						/**
						 * Determines whether this was a navigation to a specific page, triggered by backToPage().
						 * @since 1.7.2
						 */
						isBackToPage : {type : "boolean"},

						/**
						 * Determines how the navigation was triggered, possible values are "to", "back", "backToPage", and "backToTop".
						 */
						direction : {type : "string"}
					}
				},

				/**
				 * Fires when navigation between two pages in detail area has completed.
				 * NOTE: In case of animated transitions this event is fired with some delay after the "navigate" event.
				 */
				afterDetailNavigate : {
					parameters : {

						/**
						 * The page, which had been displayed before navigation.
						 */
						from : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which had been displayed before navigation.
						 */
						fromId : {type : "string"},

						/**
						 * The page, which is now displayed after navigation.
						 */
						to : {type : "sap.ui.core.Control"},

						/**
						 * The ID of the page, which is now displayed after navigation.
						 */
						toId : {type : "string"},

						/**
						 * Determines whether the "to" page (more precisely: a control with the ID of the page,
						 * which has been navigated to) has not been displayed/navigated to before.
						 */
						firstTime : {type : "boolean"},

						/**
						 * Determines whether was a forward navigation, triggered by to().
						 */
						isTo : {type : "boolean"},

						/**
						 * Determines whether this was a back navigation, triggered by back().
						 */
						isBack : {type : "boolean"},

						/**
						 * Determines whether this was a navigation to the root page, triggered by backToTop().
						 */
						isBackToTop : {type : "boolean"},

						/**
						 * Determines whether this was a navigation to a specific page, triggered by backToPage().
						 * @since 1.7.2
						 */
						isBackToPage : {type : "boolean"},

						/**
						 * Determines how the navigation was triggered, possible values are "to", "back", "backToPage", and "backToTop".
						 */
						direction : {type : "string"}
					}
				}
			},

			designtime: "sap/m/designtime/SplitContainer.designtime"
		},

		renderer: SplitContainerRenderer
	});

	/**************************************************************
	* START - Life Cycle Methods
	**************************************************************/
	SplitContainer.prototype.init = function() {
		var that = this;

		// Init static hidden text for ARIA
		if (ControlBehavior.isAccessibilityEnabled() && !SplitContainer._sAriaPopupLabelId) {
			SplitContainer._sAriaPopupLabelId = new InvisibleText({
				text: '' // add empty string in order to prevent the redundant speech output
			}).toStatic().getId();
		}

		this._rb = Library.getResourceBundleFor("sap.m");

		// Pages arrays: As we delegate the pages to internal navigation container we have to remember the pages
		// in private member variables. By doing this we can return the right pages for master /detail aggregations.
		this._aMasterPages = [];
		this._aDetailPages = [];
		if (!Device.system.phone) {
			//initialize the master nav container
			this._oMasterNav = new NavContainer(this.getId() + "-Master", {
				width: "",
				navigate: function(oEvent){
					that._handleNavigationEvent(oEvent, false, true);
				},
				afterNavigate: function(oEvent){
					that._handleNavigationEvent(oEvent, true, true);
					that._updateMasterButtonTooltip();
				}
			});

			//initialize the detail nav container
			this._oDetailNav = new NavContainer(this.getId() + "-Detail", {
				width: "",
				navigate: function(oEvent){
					that._handleNavigationEvent(oEvent, false, false);
				},
				afterNavigate: function(oEvent){
					that._handleNavigationEvent(oEvent, true, false);
				}
			});

			this.setAggregation("_navMaster", this._oMasterNav, true);
			this.setAggregation("_navDetail", this._oDetailNav, true);

			//initialize the navigation button
			this._createShowMasterButton();

			//initialize the popover
			this._oPopOver = new Popover(this.getId() + "-Popover", {
				placement: PlacementType.Bottom,
				showHeader: false,
				contentWidth: "320px",
				contentHeight: "600px",
				beforeOpen: function(){
					that.fireBeforeMasterOpen();
				},
				beforeClose: function(){
					that.fireBeforeMasterClose();
				},
				afterOpen: function(){
					that.fireAfterMasterOpen();
					that._bMasterisOpen = true;
				},
				afterClose: function(){
					that._afterHideMasterAnimation();
				}
			}).addStyleClass("sapMSplitContainerPopover");

			if (SplitContainer._sAriaPopupLabelId) {
				this._oPopOver.addAriaLabelledBy(SplitContainer._sAriaPopupLabelId);
			}

			this.setAggregation("_navPopover", this._oPopOver, true);
		} else {
			//master nav and detail nav are the same in phone
			this._oMasterNav = this._oDetailNav =  new NavContainer({
				width: "",
				navigate: function(oEvent){
					that._handleNavigationEvent(oEvent, false, true);
				},
				afterNavigate: function(oEvent){
					that._handleNavigationEvent(oEvent, true, true);
				}
			});
			this.setAggregation("_navMaster", this._oMasterNav, true);
		}

		this._oldIsLandscape = Device.orientation.landscape;
		//if master page is open when device is in portrait and show/hide mode
		this._bMasterisOpen = false;

		// Patch removeChild methods of navigation container. This is to remove the page from the internal pages array
		// when a page is moved to another aggregation.
		var that = this;
		var fnPatchRemoveChild = function(fnRemoveChild, sNavContainerProperty, sPagesArrayProperty) {
			return function(oChild, sAggregationName, bSuppressInvalidate) {
				fnRemoveChild.apply(that[sNavContainerProperty], arguments);
				if (sAggregationName === "pages" && that[sPagesArrayProperty] && that[sPagesArrayProperty].indexOf(oChild) !== -1) {
					that._removePageFromArray(that[sPagesArrayProperty], oChild);
				}
			};
		};

		var fnMasterNavRemoveChild = this._oMasterNav._removeChild;
		this._oMasterNav._removeChild = fnPatchRemoveChild(fnMasterNavRemoveChild, "_oMasterNav", "_aMasterPages");

		if (this._oDetailNav) {
			var fnDetailNavRemoveChild = this._oDetailNav._removeChild;
			this._oDetailNav._removeChild = fnPatchRemoveChild(fnDetailNavRemoveChild, "_oDetailNav", "_aDetailPages");
		}

		if (Device.support.touch) {
			this._fnWindowScroll = this._onWindowScroll.bind(this);
			window.addEventListener('scroll', this._fnWindowScroll, true);
		}
	};

	SplitContainer.prototype.onBeforeRendering = function() {
		if (this._fnResize) {
			Device.resize.detachHandler(this._fnResize);
		}

		//if SplitContainer is rerendered while the master is open, clear the status.
		if (this._bMasterisOpen && (this._portraitHide() || this._hideMode())) {
			this._oShowMasterBtn.removeStyleClass("sapMSplitContainerMasterBtnHidden");
			this._bMasterisOpen = false;
		}

		this._oMasterNav.setInitialPage(Element.getElementById(this.getInitialMaster()));
		this._oMasterNav.setDefaultTransitionName(this.getDefaultTransitionNameMaster());

		this._updateMasterButtonTooltip();

		if (!Device.system.phone) {
			this._oDetailNav.setInitialPage(Element.getElementById(this.getInitialDetail()));
			this._updateMasterButtonText();
		}

		this._oDetailNav.setDefaultTransitionName(this.getDefaultTransitionNameDetail());
	};

	SplitContainer.prototype.exit = function() {
		if (this._fnResize) {
			Device.resize.detachHandler(this._fnResize);
		}
		delete this._aMasterPages;
		delete this._aDetailPages;
		if (this._oShowMasterBtn) {
			this._oShowMasterBtn.destroy();
			this._oShowMasterBtn = null;
		}

		if (Device.support.touch) {
			window.removeEventListener('scroll', this._fnWindowScroll);
		}
	};

	SplitContainer.prototype.onAfterRendering = function() {
		if (!Device.system.phone && this._oPopOver && this._oPopOver.isOpen()) {
			this._oPopOver.close();
		}

		if (!this._fnResize) {
			this._fnResize = jQuery.proxy(this._handleResize, this);
		}
		Device.resize.attachHandler(this._fnResize);

		// "sapMSplitContainerNoTransition" prevents initial flickering, after that it needs to be removed
		setTimeout(function () {
			this._oMasterNav.removeStyleClass("sapMSplitContainerNoTransition");
		}.bind(this), 0);
	};

	SplitContainer.prototype.applySettings = function (mSettings, oScope) {
		Control.prototype.applySettings.call(this, mSettings, oScope);

		this._updateMasterInitialPage();
	};

	/**************************************************************
	* END - Life Cycle Methods
	**************************************************************/

	/**************************************************************
	* START - Touch Event Handlers
	**************************************************************/
	SplitContainer.prototype.ontouchstart = function(oEvent){
		if (!Device.system.phone) {
				this._bIgnoreSwipe = (oEvent.originalEvent && oEvent.originalEvent._sapui_handledByControl);
		}
	};

	SplitContainer.prototype.ontouchend = function(oEvent) {
		if (!this._bIgnoreSwipe) {
			this._bIgnoreSwipe = this._oScrolledElement && containsOrEquals(this._oScrolledElement, oEvent.target);
		}
		this._oScrolledElement = null;
	};

	SplitContainer.prototype._onWindowScroll = function (oEvent) {
		this._oScrolledElement = oEvent.srcElement;
	};

	SplitContainer.prototype.onswiperight = function(oEvent) {
		// Makes sure that the logic will work only when the device touch display
		// BSP: 1580084594
		if (Device.support.touch === false) {
			return;
		}

		//only enabled on tablet or Windows 8
		if ((Device.system.tablet || (Device.os.windows && Device.os.version >= 8))
			&& (this._portraitHide() || this._hideMode())
			&& !this._bIgnoreSwipe
			&& !this._bDetailNavButton) {
			//if event is already handled by inner control, master won't be shown.
			//this fix the problem when for example, carousel control in rendered in detail area.
			//CSN 2013 224661
			this.showMaster();

		}
	};

	//handles closing of master navContainer and navigation inside it
	SplitContainer.prototype.ontap = function(oEvent) {
		if (Device.system.phone) {
			return;
		}

		var bIsMasterNav = true,
			$targetContainer = jQuery(oEvent.target).closest(".sapMSplitContainerDetail, .sapMSplitContainerMaster"), // find the closest master or detail DOM element because SplitContainers may be nested,
			oEventControl = oEvent.srcControl,
			oParentControl = oEventControl.getParent(),
			oMetaData = oParentControl && oParentControl.isA("sap.m.Button") ? oParentControl.getMetadata() : oEventControl.getMetadata(); // button with an icon

		if ($targetContainer.length > 0 && $targetContainer.hasClass("sapMSplitContainerDetail")) {
			bIsMasterNav = false;
		}

		// when press not in MasterNav and not the showMasterButton, master will be hidden
		// this should happen when:
		// 1. showhidemode in portrait
		// 2. hidemode
		if (((!this._oldIsLandscape && this.getMode() == "ShowHideMode") || this.getMode() == "HideMode")
				// press isn't occurring in master area
				&& !bIsMasterNav
				// press isn't triggered by the showMasterButton
				&& !containsOrEquals(this._oShowMasterBtn.getDomRef(), oEvent.target)
				&& !oMetaData.getEvent("press")) {
			this.hideMaster();
		}
	};

	SplitContainer.prototype.onswipeleft = function(oEvent) {
		//only enabled on tablet or Windows 8
		if ((Device.system.tablet || (Device.os.windows && Device.os.version >= 8))
			&& (this._portraitHide() || this._hideMode())
			&& !this._bIgnoreSwipe) {
			this.hideMaster();
		}
	};

	SplitContainer.prototype._onMasterButtonTap = function(oEvent){
		if (Device.system.phone) {
			return;
		}

		if (!this._oldIsLandscape) {
			if (this.getMode() == "PopoverMode") {
				if (!this._oPopOver.isOpen()) {
					this._oPopOver.openBy(this._oShowMasterBtn, true);
				} else {
					this._oPopOver.close();
				}
			} else {
				this.showMaster();
			}
		} else {
			if (this.getMode() === "HideMode") {
				this.showMaster();
			}
		}
	};
	//**************************************************************
	//* End - Touch Event Handlers
	//**************************************************************


	//**************************************************************
	//* START - Public methods
	//**************************************************************

	/**
	 * Navigates to the given page inside the SplitContainer.
	 * The navigation is done inside the master area if the page has been added,
	 * otherwise, it tries to do the page navigation in the detail area.
	 *
	 * @param {string} pageId
	 *         The screen to which we are navigating to. The ID or the control itself can be given.
     * @param {string} [transitionName=slide]
     *         The type of the transition/animation to apply. Options are "slide" (horizontal movement from the right), "baseSlide", "fade", "flip", and "show"
	 *         and the names of any registered custom transitions.
	 *
	 *         None of the standard transitions is currently making use of any given transition parameters.
	 * @param {object} [data]
	 *         This optional object can carry any payload data which should be made available to the target page. The BeforeShow event on the target page will contain this data object as data property.
	 *
	 *         Use case: in scenarios where the entity triggering the navigation can or should not directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *
	 *         When the transitionParameters object is used, this "data" object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         This optional object can contain additional information for the transition function, like the DOM element which triggered the transition or the desired transition duration.
	 *
	 *         For a proper parameter order, the "data" parameter must be given when the transitionParameters parameter is used (it can be given as "null").
	 *
	 *         NOTE: It depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 *         The "show", "slide" and "fade" transitions do not use any parameter.
	 * @public
	 * @since 1.10.0
	 */
	SplitContainer.prototype.to = function(pageId, transitionName, data, transitionParameters) {
		if (this._oMasterNav.getPage(pageId)) {
			this._oMasterNav.to(pageId, transitionName, data, transitionParameters);
		} else {
			this._oDetailNav.to(pageId, transitionName, data, transitionParameters);
		}
	};


	/**
	 * Navigates back to the nearest previous page in the SplitContainer history with the given ID (if there is no such page among the previous pages, nothing happens).
	 * The transition effect, which had been used to get to the current page is inverted and used for this navigation.
	 *
	 * Calling this navigation method, first triggers the (cancelable) navigate event on the SplitContainer,
	 * then the BeforeHide pseudo event on the source page, BeforeFirstShow (if applicable),
	 * and BeforeShow on the target page. Later, after the transition has completed,
	 * the AfterShow pseudo event is triggered on the target page and AfterHide - on the page, which has been left.
	 * The given backData object is available in the BeforeFirstShow, BeforeShow, and AfterShow event objects as data
	 * property. The original "data" object from the "to" navigation is also available in these event objects.
	 *
	 * @param {string} pageId
	 *         The screen to which is being navigated to. The ID or the control itself can be given.
	 * @param {object} [backData]
	 *         This optional object can carry any payload data which should be made available to the target page of the back navigation.
	 *         The event on the target page will contain this data object as backData property. (the original data from the to() navigation will still be available as data property).
	 *
	 *         In scenarios, where the entity triggering the navigation can't or shouldn't directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *         For back navigation this can be used, for example, when returning from a detail page to transfer any settings done there.
	 *
	 *         When the transitionParameters object is used, this data object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         This optional object can give additional information to the transition function, like the DOM element, which triggered the transition or the desired transition duration.
	 *         The animation type can NOT be selected here - it is always the inverse of the "to" navigation.
	 *
	 *         In order to use the transitionParameters property, the data property must be used (at least "null" must be given) for a proper parameter order.
	 *
	 *         NOTE: it depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 * @public
	 * @since 1.10.0
	 */
	SplitContainer.prototype.backToPage = function(pageId, backData, transitionParameters) {
		if (this._oMasterNav.getPage(pageId)) {
			this._oMasterNav.backToPage(pageId, backData, transitionParameters);
		} else {
			this._oDetailNav.backToPage(pageId, backData, transitionParameters);
		}
	};

	/**
	 * Proxy to the _safeBackToPage methods of the internal nav containers
	 * @param {string} pageId
	 * @param {string} transitionName
	 * @param {object} backData
	 * @param {object} oTransitionParameters
	 * @private
	 */
	SplitContainer.prototype._safeBackToPage = function(pageId, transitionName, backData, oTransitionParameters) {
		if (this._oMasterNav.getPage(pageId)) {
			this._oMasterNav._safeBackToPage(pageId, transitionName, backData, oTransitionParameters);
		} else {
			this._oDetailNav._safeBackToPage(pageId, transitionName, backData, oTransitionParameters);
		}
	};

	/**
	 * Inserts the page/control with the specified ID into the navigation history stack of the NavContainer.
	 *
	 * This can be used for deep-linking when the user directly reached a drilldown detail page using a bookmark and then wants to navigate up in the drilldown hierarchy.
	 * Normally, such a back navigation would not be possible as there is no previous page in the SplitContainer's history stack.
	 *
	 * @param {string} pageId
	 *         The ID of the control/page/screen, which is inserted into the history stack. The respective control must be aggregated by the SplitContainer, otherwise this will cause an error.
	 * @param {string} [transitionName=slide]
	 *         The type of the transition/animation which would have been used to navigate from the (inserted) previous page to the current page. When navigating back, the inverse animation will be applied.
	 *         Options are "slide" (horizontal movement from the right), "baseSlide", "fade", "flip", and "show" and the names of any registered custom transitions.
	 * @param {object} data
	 *         This optional object can carry any payload data which would have been given to the inserted previous page if the user would have done a normal forward navigation to it.
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	SplitContainer.prototype.insertPreviousPage = function(pageId, transitionName, data) {
		if (this._oMasterNav.getPage(pageId)) {
			this._oMasterNav.insertPreviousPage(pageId, transitionName, data);
		} else {
			this._oDetailNav.insertPreviousPage(pageId, transitionName, data);
		}
		return this;
	};

	/**
	 * Navigates to a given master page.
	 *
	 * @param {string} pageId
	 *         The screen to which drilldown should happen. The ID or the control itself can be given.
	 * @param {string} transitionName
	 *         The type of the transition/animation to apply. Options are "slide" (horizontal movement from the right), "baseSlide", "fade", "flip", and "show"
	 *         and the names of any registered custom transitions.
	 *
	 *         None of the standard transitions is currently making use of any given transition parameters.
	 * @param {object} [data]
	 *         Since version 1.7.1. This optional object can carry any payload data which should be made available to the target page. The BeforeShow event on the target page will contain this data object as data property.
	 *
	 *         Use case: in scenarios where the entity triggering the navigation can't or shouldn't directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *
	 *         When the transitionParameters object is used, this data object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         Since version 1.7.1. This optional object can contain additional information for the transition function, like the DOM element, which triggered the transition or the desired transition duration.
	 *
	 *         For a proper parameter order, the data parameter must be given when the transitionParameters parameter is used (it can be given as "null").
	 *
	 *         NOTE: it depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 *         The "show", "slide" and "fade" transitions do not use any parameter.
	 * @public
	 */
	SplitContainer.prototype.toMaster = function(pageId, transitionName, data, transitionParameters) {
		this._oMasterNav.to(pageId, transitionName, data, transitionParameters);
	};


	/**
	 * Navigates back to the previous master page which is found in the history.
	 *
	 * @param {object} [backData]
	 *         This optional object can carry any payload data which should be made available to the target page of the back navigation.
	 *         The event on the target page will contain this data object as backData property (the original data from the to() navigation will still be available as data property).
	 *
	 *         In scenarios where the entity triggering the navigation can or should not directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *         For back navigation this can be used, for example, when returning from a detail page to transfer any settings done there.
	 *
	 *         When the transitionParameters object is used, this data object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         This optional object can give additional information to the transition function, like the DOM element, which triggered the transition or the desired transition duration.
	 *         The animation type can NOT be selected here - it is always the inverse of the "to" navigation.
	 *
	 *         In order to use the transitionParameters property, the data property must be used (at least "null" must be given) for a proper parameter order.
	 *
	 *         NOTE: it depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 * @public
	 */
	SplitContainer.prototype.backMaster = function(backData, transitionParameters) {
		this._oMasterNav.back(backData, transitionParameters);
	};

	SplitContainer.prototype.backMasterToPage = function(pageId, backData, transitionParameters) {
		this._oMasterNav.backToPage(pageId, backData, transitionParameters);
	};


	/**
	 * Navigates to a given detail page.
	 *
	 * @param {string} pageId Id of the page
	 * @param {string} transitionName
	 *         The type of the transition/animation to apply. Options are "slide" (horizontal movement from the right), "baseSlide", "fade", "flip", and "show"
	 *         and the names of any registered custom transitions.
	 *
	 *         None of the standard transitions is currently making use of any given transition parameters.
	 * @param {object} [data]
	 *         This optional object can carry any payload data which should be made available to the target page. The BeforeShow event on the target page will contain this data object as data property.
	 *
	 *         Use case: in scenarios where the entity triggering the navigation can or should not directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *
	 *         When the transitionParameters object is used, this data object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         This optional object can contain additional information for the transition function, like the DOM element, which triggered the transition or the desired transition duration.
	 *
	 *         For a proper parameter order, the data parameter must be given when the transitionParameters parameter is used (it can be given as "null").
	 *
	 *         NOTE: it depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 *         The "show", "slide" and "fade" transitions do not use any parameter.
	 * @public
	 */
	SplitContainer.prototype.toDetail = function(pageId, transitionName, data, transitionParameters) {
		this._oDetailNav.to(pageId, transitionName, data, transitionParameters);
	};


	/**
	 * Navigates back to the previous detail page found in the history.
	 *
	 * @param {object} [backData]
	 *         This optional object can carry any payload data which should be made available to the target page of the back navigation. The event on the target page will contain this data object as backData property. (The original data from the to() navigation will still be available as data property.)
	 *
	 *         In scenarios where the entity triggering the navigation can or should not directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *         For back navigation this can be used, for example, when returning from a detail page to transfer any settings done there.
	 *
	 *         When the transitionParameters object is used, this data object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         This optional object can give additional information to the transition function, like the DOM element, which triggered the transition or the desired transition duration.
	 *         The animation type can NOT be selected here - it is always the inverse of the "to" navigation.
	 *
	 *         In order to use the transitionParameters property, the data property must be used (at least "null" must be given) for a proper parameter order.
	 *
	 *         NOTE: it depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 * @public
	 */
	SplitContainer.prototype.backDetail = function(backData, transitionParameters) {
		this._oDetailNav.back(backData, transitionParameters);
	};

	SplitContainer.prototype.backDetailToPage = function(pageId, backData, transitionParameters) {
		this._oDetailNav.backToPage(pageId, backData, transitionParameters);
	};


	/**
	 * Navigates back to the initial/top level of Master (this is the element aggregated as "initialPage", or the first added element).
	 * NOTE: If already on the initial page, nothing happens.
	 * The transition effect which had been used to get to the current page is inverted and used for this navigation.
	 *
	 * @param {object} [backData]
	 *         This optional object can carry any payload data which should be made available to the target page of the back navigation. The event on the target page will contain this data object as "backData" property. (The original data from the "to()" navigation will still be available as "data" property.)
	 *
	 *         In scenarios where the entity triggering the navigation can or should not directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *         For back navigation this can be used e.g. when returning from a detail page to transfer any settings done there.
	 *
	 *         When the "transitionParameters" object is used, this "data" object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         This optional object can give additional information to the transition function, like the DOM element which triggered the transition or the desired transition duration.
	 *         The animation type can NOT be selected here - it is always the inverse of the "to" navigation.
	 *
	 *         In order to use the transitionParameters property, the data property must be used (at least "null" must be given) for a proper parameter order.
	 *
	 *         NOTE: it depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 * @public
	 */
	SplitContainer.prototype.backToTopMaster = function(backData, transitionParameters) {
		this._oMasterNav.backToTop(backData, transitionParameters);
	};


	/**
	 * Navigates back to the initial/top level of Detail (this is the element aggregated as initialPage, or the first added element).
	 * NOTE: If already on the initial page, nothing happens.
	 * The transition effect which had been used to get to the current page is inverted and used for this navigation.
	 *
	 * @param {object} [backData]
	 *         This optional object can carry any payload data which should be made available to the target page of the back navigation. The event on the target page will contain this data object as backData property (the original data from the to() navigation will still be available as data property).
	 *
	 *         In scenarios where the entity triggering the navigation can or should not directly initialize the target page, it can fill this object and the target page itself (or a listener on it) can take over the initialization, using the given data.
	 *         For back navigation this can be used, for example, when returning from a detail page to transfer any settings done there.
	 *
	 *         When the transitionParameters object is used, this data object must also be given (either as object or as null) in order to have a proper parameter order.
	 * @param {object} [transitionParameters]
	 *         This optional object can give additional information to the transition function, like the DOM element, which triggered the transition or the desired transition duration.
	 *         The animation type can NOT be selected here - it is always the inverse of the "to" navigation.
	 *
	 *         In order to use the transitionParameters property, the data property must be used (at least "null" must be given) for a proper parameter order.
	 *
	 *         NOTE: it depends on the transition function how the object should be structured and which parameters are actually used to influence the transition.
	 * @public
	 */
	SplitContainer.prototype.backToTopDetail = function(backData, transitionParameters) {
		this._oDetailNav.backToTop(backData, transitionParameters);
	};

	SplitContainer.prototype.addMasterPage = function(oPage) {
		if (this._hasPageInArray(this._aMasterPages, oPage)) {
			return;
		}

		// When the same NavContainer is used for both aggregations, calling "addPage()" will not do anything in case the oPage is already
		// aggregated by this NavContainer, but in the other "virtual" aggregation of this SplitContainer (i.e. moved from detailPages to masterPages).
		// This would lead to the page being added to the "master" array, but not removed from the "detail" array because the patched method
		// in the NavContainer (removePage) is not called. Hence, remove it directly from the detail array.
		if (this._oMasterNav === this._oDetailNav && this._oDetailNav.getPages() && this._oDetailNav.getPages().indexOf(oPage) !== -1) {
			this._removePageFromArray(this._aDetailPages, oPage);
		}
		this._oMasterNav.insertPage(oPage, this._aMasterPages.length);
		this._aMasterPages.push(oPage);
		return this;
	};

	SplitContainer.prototype.addDetailPage = function(oPage) {
		var that = this,
			oRealPage = this._getRealPage(oPage);

		if (this._hasPageInArray(this._aDetailPages, oPage)) {
			return;
		}

		//processing the header in page
		oPage.addDelegate({
			onBeforeShow: function(){
				if (oRealPage) {
					if (!Device.system.phone) {
						//now it's a tablet
						//this is the initialization of header in page inside the detail navigation container
						//rules are displayed below
						// 1. navigation button is completely removed from the page in detail nav container
						// 2. iOS: show title if there is
						// 3: Android: Icon isn't shown directly in header, the icon is added to the showMasterButton.
						// 4: Android: show title in portrait mode, hide title in landscape
						if (that._needShowMasterButton()) {
							that._setMasterButton(oRealPage);
						}
					}
				}
			}
		});

		if (oRealPage) {
			oRealPage.addDelegate({
				//before rendering is used in order to avoid invalidate in renderer (set button to the header in page)
				onBeforeRendering: function(){
					// Maintain the masterButton only when the page is still the current page in detail NavContainer.
					// If the rerendering occurs after the page navigation, it's not needed to maintain the master button anymore.
					// This check is needed otherwise it may cause endless rerendering of the last page and the current page.
					if (!Device.system.phone && (that._oDetailNav.getCurrentPage() === oRealPage)) {
						if (!oRealPage.getShowNavButton() && that._needShowMasterButton()) {
							that._setMasterButton(oRealPage, true);
						} else {
							that._removeMasterButton(oRealPage);
						}
					}
				}
			});

			if (!Device.system.phone) {
				// Setting custom header to the page replaces the internal header completely, therefore the button which shows the master area has to be inserted to the custom header when it's set.
				if (!oRealPage._setCustomHeaderInSC) {
					oRealPage._setCustomHeaderInSC = oRealPage.setCustomHeader;
				}
				oRealPage.setCustomHeader = function(oHeader) {
					this._setCustomHeaderInSC.apply(this, arguments);
					if (oHeader && that._needShowMasterButton()) {
						that._setMasterButton(oRealPage);
					}
					return this;
				};

				if (!oRealPage._setShowNavButtonInSC) {
					oRealPage._setShowNavButtonInSC = oRealPage.setShowNavButton;
				}
				oRealPage.setShowNavButton = function(bShow) {
					this._setShowNavButtonInSC.apply(this, arguments);
					if (!bShow && that._needShowMasterButton()) {
						that._setMasterButton(oRealPage);
					} else {
						that._removeMasterButton(oRealPage, true);
					}
					return this;
				};
			}
		}

		// When the same NavContainer is used for both aggregations, calling "addPage()" will not do anything in case the oPage is already
		// aggregated by this NavContainer, but in the other "virtual" aggregation of this SplitContainer (i.e. moved from masterPages to detailPages).
		// This would lead to the page being added to the "detail" array, but not removed from the "master" array because the patched method
		// in the NavContainer (removePage) is not called. Hence, remove it directly from the master array.
		if (this._oMasterNav === this._oDetailNav && this._oMasterNav.getPages() && this._oMasterNav.getPages().indexOf(oPage) !== -1) {
			this._removePageFromArray(this._aMasterPages, oPage);
		}

		this._oDetailNav.addPage(oPage);
		this._aDetailPages.push(oPage);
		return this;
	};

	SplitContainer.prototype.getMasterPages = function() {
		// Return a shallow copy of the array instead of the array itself as reference
		return this._aMasterPages.slice();
	};

	SplitContainer.prototype.getDetailPages = function() {
		// Return a shallow copy of the array instead of the array itself as reference
		return this._aDetailPages.slice();
	};

	SplitContainer.prototype.indexOfMasterPage = function(oPage) {
		return this._indexOfMasterPage(oPage);
	};

	SplitContainer.prototype.indexOfDetailPage = function(oPage) {
		return this._indexOfDetailPage(oPage);
	};

	SplitContainer.prototype.insertMasterPage = function(oPage, iIndex, bSuppressInvalidate) {
		return this._insertPage(this._aMasterPages, "masterPages", oPage, iIndex, bSuppressInvalidate);
	};

	SplitContainer.prototype.removeMasterPage = function(oPage, bSuppressInvalidate) {
		return this._removePage(this._aMasterPages, "masterPages", oPage, bSuppressInvalidate);
	};

	SplitContainer.prototype.removeAllMasterPages = function(bSuppressInvalidate) {
		this._aMasterPages = [];
		return this.removeAllAggregation("masterPages", bSuppressInvalidate);
	};

	SplitContainer.prototype.insertDetailPage = function(oPage, iIndex, bSuppressInvalidate) {
		return this._insertPage(this._aDetailPages, "detailPages", oPage, iIndex, bSuppressInvalidate);
	};

	SplitContainer.prototype._restoreMethodsInPage = function(oPage) {
		if (Device.system.phone) {
			// no need to restore the functions on phone
			return;
		}

		var oRealPage = this._getRealPage(oPage);

		if (oRealPage) {
			// Since page is removed from SplitContainer, the patched version setCustomHeader and setShowNavButton needs to be deleted.
			// This method may be called several times therefore the existence of stored functions needs to be checked
			if (oRealPage._setCustomHeaderInSC) {
				oRealPage.setCustomHeader = oRealPage._setCustomHeaderInSC;
				delete oRealPage._setCustomHeaderInSC;
			}

			if (oRealPage._setShowNavButtonInSC) {
				oRealPage.setShowNavButton = oRealPage._setShowNavButtonInSC;
				delete oRealPage._setShowNavButtonInSC;
			}
		}
	};

	SplitContainer.prototype.removeDetailPage = function(oPage, bSuppressInvalidate) {
		this._restoreMethodsInPage(oPage);

		return this._removePage(this._aDetailPages, "detailPages", oPage, bSuppressInvalidate);
	};

	SplitContainer.prototype.removeAllDetailPages = function(bSuppressInvalidate) {
		var aPages = this.getDetailPages();

		// restore the original setCustomHeader function
		for (var i = 0 ; i < aPages.length ; i++) {
			this._restoreMethodsInPage(aPages[i]);
		}

		this._aDetailPages = [];

		return this.removeAllAggregation("detailPages", bSuppressInvalidate);
	};

	/**
	 * Adds a content entity either to master area or detail area depending on the master parameter.
	 *
	 * The method is provided mainly for providing API consistency between sap.m.SplitContainer and sap.m.App. So that the same code line can be reused.
	 *
	 * @param {sap.ui.core.Control} oPage
	 *         The content entities between which this SplitContainer navigates in either master area or detail area depending on the master parameter. These can be of type sap.m.Page, sap.ui.core.mvc.View, sap.m.Carousel or any other control with fullscreen/page semantics.
	 * @param {boolean} bMaster
	 *         States if the page should be added to the master area. If it's set to false, the page is added to detail area.
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 * @since 1.11.1
	 */
	SplitContainer.prototype.addPage = function(oPage, bMaster){
		if (bMaster) {
			return this.addMasterPage(oPage);
		} else {
			return this.addDetailPage(oPage);
		}
	};

	/**
	 * Used to make the master page visible when in ShowHideMode and the device is in portrait mode.
	 *
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	SplitContainer.prototype.showMaster = function() {
		var _curPage = this._getRealPage(this._oDetailNav.getCurrentPage());

		function afterPopoverOpen(){
			this._oPopOver.detachAfterOpen(afterPopoverOpen, this);
			this._bMasterOpening = false;
			this._bMasterisOpen = true;
			this.fireAfterMasterOpen();
		}

		if (this._portraitPopover()) {
			if (!this._oPopOver.isOpen()) {
				this._oPopOver.attachAfterOpen(afterPopoverOpen, this);
				this.fireBeforeMasterOpen();
				this._oPopOver.openBy(this._oShowMasterBtn, true);
				this._bMasterOpening = true;
			}
		} else if ((this._portraitHide() || this._hideMode())
					&& (!this._bMasterisOpen || this._bMasterClosing)) {

			this._oMasterNav.$().on(
				"webkitTransitionEnd transitionend",
				this._afterShowMasterAnimation.bind(this)
			);

			this.fireBeforeMasterOpen();
			this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterVisible", true);
			//BCP: 1870368506
			this._oMasterNav.getDomRef() && this._oMasterNav.getDomRef().offsetHeight;
			this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterHidden", false);
			this._bMasterOpening = true;
			this._removeMasterButton(_curPage);

			// workaround for bug in current webkit versions: in slided-in elements the z-order may be wrong and will be corrected once a re-layout is enforced
			// see http://code.google.com/p/chromium/issues/detail?id=246965
			if (Device.browser.webkit) {
				var oMNav = this._oMasterNav;
				window.setTimeout(function(){
					oMNav.$().css("box-shadow", "none"); // remove box-shadow
					window.setTimeout(function(){
						oMNav.$().css("box-shadow", "");  // add it again
					},50);
				},0);
			}
		}
		return this;
	};

	/**
	 * Used to hide the master page when in ShowHideMode and the device is in portrait mode.
	 *
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	SplitContainer.prototype.hideMaster = function() {
		if (this._portraitPopover()) {
			if (this._oPopOver.isOpen()) {
				this._oPopOver.close();
				this._bMasterClosing = true;
			}
		} else if ((this._portraitHide() || this._hideMode()) &&
					(this._bMasterisOpen || this._oMasterNav.$().hasClass("sapMSplitContainerMasterVisible"))) {

			this._oMasterNav.$().on(
				"webkitTransitionEnd transitionend",
				this._afterHideMasterAnimation.bind(this)
			);

			this.fireBeforeMasterClose();
			this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterVisible", false);
			//BCP: 1870368506
			this._oMasterNav.getDomRef() && this._oMasterNav.getDomRef().offsetHeight;
			this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterHidden", true);
			this._bMasterClosing = true;
		}
		return this;
	};

	SplitContainer.prototype._afterShowMasterAnimation = function() {
		this._oMasterNav.$().off("webkitTransitionEnd transitionend");

		if (this._portraitHide() || this._hideMode()) {
			this._bMasterOpening = false;
			this._bMasterisOpen = true;
			this.fireAfterMasterOpen();
		}
	};

	SplitContainer.prototype._afterHideMasterAnimation = function() {
		this._oMasterNav.$().off("webkitTransitionEnd transitionend");

		var oCurPage = this._getRealPage(this._oDetailNav.getCurrentPage());
		this._setMasterButton(oCurPage);

		this._bMasterClosing = false;
		this._bMasterisOpen = false;
		// If the focus is still inside the master area after master is open, the focus should be removed.
		// Otherwise user can still type something on mobile device and the browser will show the master area again.
		if (containsOrEquals(this._oMasterNav.getDomRef(), document.activeElement)) {
			document.activeElement.blur();
		}
		this.fireAfterMasterClose();
	};


	/**
	 * Returns the current displayed master page.
	 *
	 * @type sap.ui.core.Control
	 * @public
	 */
	SplitContainer.prototype.getCurrentMasterPage = function() {
		return this._oMasterNav.getCurrentPage();
	};


	/**
	 * Returns the current displayed detail page.
	 *
	 * @type sap.ui.core.Control
	 * @public
	 */
	SplitContainer.prototype.getCurrentDetailPage = function() {
		return this._oDetailNav.getCurrentPage();
	};


	/**
	 * Returns the currently displayed page either in master area or in detail area.
	 * When the parameter is set to true, the current page in master area is returned, otherwise, the current page in detail area is returned.
	 *
	 * This method is provided mainly for API consistency between sap.m.SplitContainer and sap.m.App, so that the same code line can be reused.
	 *
	 * @param {boolean} bMaster
	 *         States if this function returns the current page in master area. If it's set to false, the current page in detail area will be returned.
	 * @type sap.ui.core.Control
	 * @public
	 * @since 1.11.1
	 */
	SplitContainer.prototype.getCurrentPage = function(bMaster){
		if (bMaster) {
			return this.getCurrentMasterPage();
		} else {
			return this.getCurrentDetailPage();
		}
	};


	/**
	 * Returns the previous page (the page, from which the user drilled down to the current page with to()).
	 * Note: this is not the page, which the user has seen before, but the page which is the target of the next back() navigation.
	 * If there is no previous page, "undefined" is returned.
	 *
	 * @param {boolean} bMaster
	 *         States if this function returns the previous page in master area. If it's set to false, the previous page in detail area will be returned.
	 * @type sap.ui.core.Control
	 * @public
	 */
	SplitContainer.prototype.getPreviousPage = function(bMaster) {
		if (bMaster) {
			return this._oMasterNav.getPreviousPage();
		} else {
			return this._oDetailNav.getPreviousPage();
		}
	};


	/**
	 * Returns the page with the given ID in master area (if there's no page that has the given ID, null is returned).
	 *
	 * @param {string} pageId
	 *         The ID of the page that needs to be fetched
	 * @returns {sap.ui.core.Control|null}
	 *         The requested page
	 * @public
	 * @since 1.11.1
	 */
	SplitContainer.prototype.getMasterPage = function(pageId){
		return this._oMasterNav.getPage(pageId);
	};


	/**
	 * Returns the page with the given ID in detail area. If there's no page that has the given ID, null is returned.
	 *
	 * @param {string} pageId The ID of the page that needs to be fetched.
	 * @returns {sap.ui.core.Control|null} the requested page
	 * @public
	 * @since 1.11.1
	 */
	SplitContainer.prototype.getDetailPage = function(pageId){
		return this._oDetailNav.getPage(pageId);
	};


	/**
	 * Returns the page with the given ID from either master area, or detail area depending on the master parameter (if there's no page that has the given ID, null is returned).
	 *
	 * @param {string} pageId
	 *         The ID of the page that needs to be fetched
	 * @param {boolean} bMaster
	 *         If the page with given ID should be fetched from the master area. If it's set to false, the page will be fetched from detail area.
	 * @returns {sap.ui.core.Control|null}
	 * @public
	 * @since 1.11.1
	 */
	SplitContainer.prototype.getPage = function(pageId, bMaster){
		if (bMaster) {
			return this.getMasterPage(pageId);
		} else {
			return this.getDetailPage(pageId);
		}
	};


	/**
	 * Returns whether master area is currently displayed on the screen.
	 *
	 * In desktop browser or tablet, this method returns true when master area is displayed on the screen, regardless if in portrait or landscape mode.
	 * On mobile phone devices, this method returns true when the currently displayed page is from the pages, which are added to the master area, otherwise, it returns false.
	 *
	 * @returns {boolean}
	 * @public
	 * @since 1.16.5
	 */
	SplitContainer.prototype.isMasterShown = function(){
		if (Device.system.phone) {
			var oCurPage = this._oMasterNav.getCurrentPage();
			return this._indexOfMasterPage(oCurPage) !== -1;
		} else {
			var sMode = this.getMode();
			switch (sMode) {
				case SplitAppMode.StretchCompressMode:
					// master area is always shown in this mode
					return true;
				case SplitAppMode.HideMode:
					return this._bMasterisOpen;
				case SplitAppMode.PopoverMode:
				case SplitAppMode.ShowHideMode:
					return Device.orientation.landscape || this._bMasterisOpen;
				default:
					return false;
			}
		}
	};

	//**************************************************************
	//* END - Public methods
	//**************************************************************

	//**************************************************************
	//* START - Setters/Getters of the SplitContainer control
	//**************************************************************

	SplitContainer.prototype.setBackgroundOpacity = function(fOpacity) {
		if (fOpacity > 1 || fOpacity < 0) {
			Log.warning("Invalid value " + fOpacity + " for SplitContainer.setBackgroundOpacity() ignored. Valid values are: floats between 0 and 1.");
			return this;
		}
		return this.setProperty("backgroundOpacity", fOpacity);
	};

	SplitContainer.prototype.setMode = function (sMode) {
		var sOldMode = this.getMode();
		if (sOldMode === sMode) {
			return this;
		}

		this.setProperty("mode", sMode, true);
		// the reposition of master and detail area occurs in tablet & desktop and after it's rendered
		if (Device.system.phone || !this.getDomRef()) {
			return this;
		}

		if (sOldMode === "HideMode" && this._oldIsLandscape) {
			//remove the master button
			this._removeMasterButton(this._oDetailNav.getCurrentPage());
		}

		var oDomRef = this.getDomRef();

		if (sMode !== "PopoverMode" && this._oPopOver.getContent().length > 0) {
			this._updateMasterPosition("landscape");
		} else if (sMode == "PopoverMode") {
			if (!this._oldIsLandscape) {
				if (this._oPopOver.getContent().length === 0) {
					this._updateMasterPosition("popover");
				}
				this._setMasterButton(this._oDetailNav.getCurrentPage());
			}
			oDomRef.classList.remove("sapMSplitContainerShowHide");
			oDomRef.classList.remove("sapMSplitContainerStretchCompress");
			oDomRef.classList.remove("sapMSplitContainerHideMode");
			oDomRef.classList.add("sapMSplitContainerPopover");
		}

		if (sMode == "StretchCompressMode") {
			oDomRef.classList.remove("sapMSplitContainerShowHide");
			oDomRef.classList.remove("sapMSplitContainerPopover");
			oDomRef.classList.remove("sapMSplitContainerHideMode");
			oDomRef.classList.add("sapMSplitContainerStretchCompress");
			this._removeMasterButton(this._oDetailNav.getCurrentPage());
		}

		if (sMode == "ShowHideMode") {
			oDomRef.classList.remove("sapMSplitContainerPopover");
			oDomRef.classList.remove("sapMSplitContainerStretchCompress");
			oDomRef.classList.remove("sapMSplitContainerHideMode");
			oDomRef.classList.add("sapMSplitContainerShowHide");

			if (!Device.orientation.landscape) {
				this._setMasterButton(this._oDetailNav.getCurrentPage());
			}
		}

		if (sMode === "HideMode") {
			oDomRef.classList.remove("sapMSplitContainerPopover");
			oDomRef.classList.remove("sapMSplitContainerStretchCompress");
			oDomRef.classList.remove("sapMSplitContainerShowHide");
			oDomRef.classList.add("sapMSplitContainerHideMode");

			// always hide the master area after changing mode to HideMode
			this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterVisible", false);
			this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterHidden", true);
			this._bMasterisOpen = false;

			this._setMasterButton(this._oDetailNav.getCurrentPage());
		}

		return this;
	};

	/**************************************************************
	* START - Private methods
	**************************************************************/

	/**
	 * @private
	 */
	SplitContainer.prototype._updateMasterInitialPage = function() {
		//BCP: 002028376500005408012018
		if (this.getMode() === "HideMode" && Device.system.phone && this._aDetailPages) {
			this._oMasterNav.setInitialPage(this.getInitialDetail() ? this.getInitialDetail() : (this.getInitialMaster() || this._aDetailPages[0]));
		}
	};

	/**
	 * @private
	 */
	SplitContainer.prototype._indexOfMasterPage = function(oPage) {
		return this._aMasterPages.indexOf(oPage);
	};

	/**
	 * @private
	 */
	SplitContainer.prototype._indexOfDetailPage = function(oPage) {
		return this._aDetailPages.indexOf(oPage);
	};


	/**
	 * @private
	 */
	SplitContainer.prototype._insertPage = function(aPageArray, sAggregation, oPage, iIndex, bSuppressInvalidate) {
		this.insertAggregation(sAggregation, oPage, iIndex, bSuppressInvalidate);
		var i;
		if (iIndex < 0) {
			i = 0;
		} else if (iIndex > aPageArray.length) {
			i = aPageArray.length;
		} else {
			i = iIndex;
		}
		var iOldIndex = (aPageArray ? Array.prototype.indexOf.call(aPageArray, oPage) : -1);
		aPageArray.splice(i, 0, oPage);
		if (iOldIndex != -1) {
			// this is the insert order ui5 is doing it: first add, then remove when it was added before (even so this would remove the just added control)
			this._removePageFromArray(aPageArray, oPage);
		}
		return this;
	};


	/**
	 * @private
	 */
	SplitContainer.prototype._removePage = function(aPageArray, sAggregation, oPage, bSuppressInvalidate) {
		var oRemovedPage = this.removeAggregation(sAggregation, oPage, bSuppressInvalidate);
		if (oRemovedPage) {
			this._removePageFromArray(aPageArray, oRemovedPage);
		}
		return oRemovedPage;
	};


	/**
	 * @private
	 */
	SplitContainer.prototype._removePageFromArray = function(aPageArray, oPage) {
		var iIndex = (aPageArray ? Array.prototype.indexOf.call(aPageArray, oPage) : -1);
		if (iIndex != -1) {
			aPageArray.splice(iIndex, 1);
			if (aPageArray === this._aDetailPages) {
				this._restoreMethodsInPage(oPage);
			}
		}
	};


	SplitContainer.prototype._handleNavigationEvent = function(oEvent, bAfter, bMaster){
		var sEventName = (bAfter ? "After" : "") + (bMaster ? "Master" : "Detail") + "Navigate",
			bContinue;
		sEventName = sEventName.charAt(0).toLowerCase() + sEventName.slice(1);

		bContinue = this.fireEvent(sEventName, oEvent.mParameters, true);
		if (!bContinue) {
			oEvent.preventDefault();
		}
	};

	SplitContainer.prototype._handleResize = function() {
			var isLandscape = Device.orientation.landscape,
			_currentPage = this._oDetailNav.getCurrentPage(),
			mode = this.getMode();

		if (this._oldIsLandscape !== isLandscape) {
			this._oldIsLandscape = isLandscape;
			if (!Device.system.phone) {
				this.$().toggleClass("sapMSplitContainerPortrait", !isLandscape);

				//hidemode doesn't react to orientation change
				if (mode === "HideMode") {
					return;
				}

				if (mode === "ShowHideMode") {
					if (isLandscape) {
						this.fireBeforeMasterOpen();
					} else {
						this.fireBeforeMasterClose();
					}
				}

				if (mode === "ShowHideMode" || mode === "PopoverMode") {
					this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterVisible", isLandscape);
					this._oMasterNav.toggleStyleClass("sapMSplitContainerMasterHidden", !isLandscape);
				}

				if (mode === "ShowHideMode") {
					if (isLandscape) {
						this._bMasterisOpen = true;
						this.fireAfterMasterOpen();
					} else {
						this._bMasterisOpen = false;
						this.fireAfterMasterClose();
					}
				}

				if (mode == "PopoverMode") {
					if (this._oPopOver.isOpen()) {
					//Wait for the popover to be closed properly
						this._oPopOver.attachAfterClose(this._handlePopClose, this);
						this._oPopOver.close();
					} else {
						this._handlePopClose();
					}
				}

				_currentPage = this._getRealPage(_currentPage);
				if (!this._oldIsLandscape && mode != "StretchCompressMode") {
					this._setMasterButton(_currentPage);
				} else {
					this._removeMasterButton(_currentPage);
				}
			}

			/**
			 * @deprecated As of version 1.87
			 */
			if (this._onOrientationChange) {
				this._onOrientationChange();
			}
		}
	};

	SplitContainer.prototype._handlePopClose = function(oEvent) {
		this._oPopOver.detachAfterClose(this._handlePopClose, this);
		if (this._oldIsLandscape) {
			this._updateMasterPosition("landscape");
		} else {
			this._updateMasterPosition("popover");
		}
	};

	SplitContainer.prototype._getRealPage = function(oPage){
		var oReturn = oPage, aContent;

		while (oReturn) {
			if (oReturn instanceof Control && oReturn.isA(["sap.m.Page", "sap.m.MessagePage", "sap.m.semantic.SemanticPage"])) {
				return oReturn;
			}
			if (oReturn instanceof Control && oReturn.isA("sap.ui.core.mvc.View")) {
				aContent = oReturn.getContent();
				if (aContent.length === 1) {
					oReturn = aContent[0];
					continue;
				}
			} else if (oReturn instanceof NavContainer) {
				oReturn = oReturn.getCurrentPage();
				continue;
			}
			oReturn = null;
		}
		return oReturn;
	};

	//updates the dom position of the Master NavContainer (inside popover or left next to the Detail NavContainer)
	SplitContainer.prototype._updateMasterPosition = function(sPos) {
		var that = this;
		if (sPos == "popover") {
			//remove the NavContainer dom from the left side without rerendering the whole app
			this.removeAggregation("_navMaster", this._oMasterNav, true);
			this._oMasterNav.$().remove();
			this._oPopOver.addContent(this._oMasterNav);
			this._bMasterisOpen = false;
		}
		if (sPos == "landscape") {
			var fRearrangeNavMaster = function(){
				that._oPopOver.removeAggregation("content", that._oMasterNav, false);
				that.setAggregation("_navMaster", that._oMasterNav, true);
				//render only the master navContainer, to prevent the whole app from rerendering
				var $master = that.$();
				if ($master[0]) {
					var rm = new RenderManager().getInterface();
					rm.renderControl(that._oMasterNav.addStyleClass("sapMSplitContainerMaster"));
					rm.flush($master[0], false, (that.$("BG")[0]) ? 1 : 0);
					rm.destroy();
				}
			};

			if (this._oPopOver.isOpen()) {
				var fAfterCloseHandler = function(){
					this._oPopOver.detachAfterClose(fAfterCloseHandler, this);
					this._bMasterisOpen = false;
					fRearrangeNavMaster();
				};
				this._oPopOver.attachAfterClose(fAfterCloseHandler, this);
				this._oPopOver.close();
			} else {
				fRearrangeNavMaster();
			}
		}
	};

	//Portrait - Tablet - ShowHideMode
	SplitContainer.prototype._portraitHide = function() {
		if (!this._oldIsLandscape && !Device.system.phone && this.getMode() === "ShowHideMode") {
			return true;
		} else {
			return false;
		}
	};

	//Portrait - Tablet - PopoverMode
	SplitContainer.prototype._portraitPopover = function() {
		if (!this._oldIsLandscape && !Device.system.phone && this.getMode() === "PopoverMode") {
			return true;
		} else {
			return false;
		}
	};

	//hide mode - not phone
	SplitContainer.prototype._hideMode = function() {
		return this.getMode() === "HideMode" && !Device.system.phone;
	};

	SplitContainer.prototype._needShowMasterButton = function() {
		return (this._portraitHide() || this._hideMode() || this._portraitPopover()) && (!this._bMasterisOpen || this._bMasterClosing);
	};

	SplitContainer.prototype._updateMasterButtonTooltip = function() {
		if (!this._oShowMasterBtn) {
			return;
		}

		var sTooltip = this.getMasterButtonTooltip();
		if (sTooltip) {
			this._oShowMasterBtn.setTooltip(sTooltip);
			return;
		}

		var oPage = this._oMasterNav.getCurrentPage();

		if (oPage && oPage.getTitle) {
			var sTitle = oPage.getTitle();
			if (sTitle) {
				sTitle = sTitle.replace(/[_0-9]+$/, '');
				sTooltip = this._rb.getText('SPLITCONTAINER_NAVBUTTON_TOOLTIP', [sTitle]);
			}
		}

		if (!sTooltip) {
			sTooltip = this._rb.getText('SPLITCONTAINER_NAVBUTTON_DEFAULT_TOOLTIP');
		}

		this._oShowMasterBtn.setTooltip(sTooltip);
	};

	SplitContainer.prototype._updateMasterButtonText = function() {
		this._oShowMasterBtn.setText(this.getMasterButtonText() || this._rb.getText("SPLITCONTAINER_NAVBUTTON_TEXT"));
	};

	SplitContainer.prototype._createShowMasterButton = function() {
		if (this._oShowMasterBtn && !this._oShowMasterBtn.bIsDestroyed) {
			return;
		}

		this._oShowMasterBtn = new Button(this.getId() + "-MasterBtn", {
			icon: IconPool.getIconURI("menu2"),
			tooltip: this.getMasterButtonTooltip(),
			press: jQuery.proxy(this._onMasterButtonTap, this)
		}).addStyleClass("sapMSplitContainerMasterBtn");
	};

	SplitContainer.prototype._setMasterButton = function(oPage, fnCallBack, bSuppressRerendering) {
		if (!oPage) {
			return;
		}

		if (typeof fnCallBack === 'boolean') {
			bSuppressRerendering = fnCallBack;
			fnCallBack = undefined;
		}

		oPage = this._getRealPage(oPage);
		if (!oPage) {
			return;
		}

		var oHeaderAggregation = SplitContainer._getHeaderButtonAggregation(oPage),
			sHeaderAggregationName = oHeaderAggregation.sAggregationName,
			aHeaderContent = oHeaderAggregation.aAggregationContent;

		for (var i = 0; i < aHeaderContent.length; i++) {
			if (aHeaderContent[i] instanceof Button && aHeaderContent[i].getVisible() && aHeaderContent[i] !== this._oShowMasterBtn) {
				/**
				 * @deprecated As of version 1.120
				 */
				if (aHeaderContent[i].getType() !== ButtonType.Back && aHeaderContent[i].getType() !== ButtonType.Up) {
					continue;
				}
				this._bDetailNavButton = true;
				return;
			}
		}
		this._bDetailNavButton = false;

		var oPageHeader = oPage._getAnyHeader();
		var bIsSet = false;

		for (var i = 0; i < aHeaderContent.length; i++) {
			if (aHeaderContent[i] === this._oShowMasterBtn) {
				bIsSet = true;
			}
		}

		if (!bIsSet) {
			// showMasterBtn could have already be destroyed by destroying the customHeader of the previous page
			// When this is the case, showMasterBtn will be instantiated again
			this._createShowMasterButton();
			//Tooltip should be update again also
			this._updateMasterButtonTooltip();
			this._updateMasterButtonText();

			this._oShowMasterBtn.removeStyleClass("sapMSplitContainerMasterBtnHidden");

			if (oPageHeader) {
				oPageHeader.insertAggregation(sHeaderAggregationName, this._oShowMasterBtn, 0, bSuppressRerendering);
			}
		} else {
			this._oShowMasterBtn.$().parent().toggleClass("sapMSplitContainerMasterBtnHide", false);
			this._oShowMasterBtn.removeStyleClass("sapMSplitContainerMasterBtnHidden");
			this._oShowMasterBtn.$().parent().toggleClass("sapMSplitContainerMasterBtnShow", true);
		}

		if (fnCallBack) {
			fnCallBack(oPage);
		}
		this.fireMasterButton({show: true});

	};

	/**
	 * @private
	 * @static
	 * @returns object aggregation with two properties aggregation content and aggregationName
	 */
	SplitContainer._getHeaderButtonAggregation = function (oPage) {
		var oHeader = oPage._getAnyHeader(),
			aAggregationContent,
			sAggregationName;

		if (!oHeader) {
			return;
		}

		if (oHeader.getContentLeft) {
			aAggregationContent = oHeader.getContentLeft();
			sAggregationName = "contentLeft";
		}
		if (oHeader.getContent) {
			aAggregationContent = oHeader.getContent();
			sAggregationName = "content";
		}

		return {
			aAggregationContent : aAggregationContent,
			sAggregationName : sAggregationName
		};
	};

	SplitContainer.prototype._removeMasterButton = function(oPage, fnCallBack, bNoAnim) {
		if (!oPage) {
			return;
		}

		var that = this,
			bHidden = this._oShowMasterBtn.$().is(":hidden"),
			oHeader;

		if (typeof fnCallBack === "boolean") {
			bNoAnim = fnCallBack;
			fnCallBack = undefined;
		}

		if (!bHidden && !bNoAnim) {
			oPage = this._getRealPage(oPage);

			if (!oPage) {
				return;
			}

			oHeader = oPage._getAnyHeader();
			if (oHeader /*&& !this._checkCustomHeader(oPage)*/) {
				var aHeaderContent = SplitContainer._getHeaderButtonAggregation(oPage).aAggregationContent;
				for (var i = 0; i < aHeaderContent.length; i++) {
					if (aHeaderContent[i] === this._oShowMasterBtn) {

						this._oShowMasterBtn.destroy();
						/*eslint-disable no-loop-func */
						this._oShowMasterBtn.$().parent().on("webkitAnimationEnd animationend", function(){
							jQuery(this).off("webkitAnimationEnd animationend");
							that._oShowMasterBtn.addStyleClass("sapMSplitContainerMasterBtnHidden");
							if (fnCallBack) {
								fnCallBack(oPage);
							}
						});
						/*eslint-enable no-loop-func */
						break;
					}
				}
			}
			this.fireMasterButton({show: false});
		} else {
			// The master button is invisible even without this CSS class because the page in which the master button is can be out of the viewport.
			// Therefore this class has to be set here.
			this._oShowMasterBtn.addStyleClass("sapMSplitContainerMasterBtnHidden");
			if (fnCallBack) {
				fnCallBack(oPage);
			}
			if (!bHidden) {
				this.fireMasterButton({show: false});
			}
		}
	};

	SplitContainer.prototype._callSuperMethod = function(sFunctionName, sAggregationName){
		var args = Array.prototype.slice.call(arguments);
		if (sAggregationName === "masterPages") {
			if (sFunctionName === "indexOfAggregation") {
				return this._indexOfMasterPage.apply(this, args.slice(2));
			} else {
				return this._callNavContainerMethod(sFunctionName, this._oMasterNav, args);
			}
		} else if (sAggregationName === "detailPages") {
			if (sFunctionName === "indexOfAggregation") {
				return this._indexOfDetailPage.apply(this, args.slice(2));
			} else {
				return this._callNavContainerMethod(sFunctionName, this._oDetailNav, args);
			}
		} else {
			return Control.prototype[sFunctionName].apply(this, args.slice(1));
		}
	};

	SplitContainer.prototype._callNavContainerMethod = function(sFunctionName, oNavContainer, aArgs) {
		aArgs[1] = "pages";
		aArgs = aArgs.slice(1);
		var sRealFunctionName = SplitContainer._mFunctionMapping[sFunctionName];
		if (sRealFunctionName) {
			aArgs.shift();
			sFunctionName = sRealFunctionName;
		}
		return oNavContainer[sFunctionName].apply(oNavContainer, aArgs);
	};

	/**
	 * @private
	 */
	SplitContainer.prototype._hasPageInArray = function (array, oPage) {
		return array.some(function(oArrayEntry) {
			return oPage && (oPage === oArrayEntry);
		});
	};

		/**
	 * Shows the placeholder on the corresponding column for the provided aggregation name.
	 *
	 * @param {object} mSettings Object containing the aggregation name
	 * @param {string} mSettings.aggregation The aggregation name to decide on which column/container the placeholder should be shown
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @since 1.91
	 */
	SplitContainer.prototype.showPlaceholder = function(mSettings) {
		var Placeholder = sap.ui.require("sap/ui/core/Placeholder");

		if (!Placeholder || !Placeholder.isEnabled()) {
			return;
		}

		switch (mSettings && mSettings.aggregation) {
			case "masterPages":
				return this.getAggregation("_navMaster").showPlaceholder(mSettings);
			default:
				return this.getAggregation("_navDetail").showPlaceholder(mSettings);
		}
	};

	/**
	 * Hides the placeholder on the corresponding column for the provided aggregation name.
	 *
	 * @param {object} mSettings Object containing the aggregation name
	 * @param {string} mSettings.aggregation The aggregation name to decide on which column/container the placeholder should be hidden
	 *
	 * @private
	 * @ui5-restricted SAP internal apps
	 * @since 1.91
	 */
	SplitContainer.prototype.hidePlaceholder = function(mSettings) {
		switch (mSettings.aggregation) {
			case "masterPages":
				this.getAggregation("_navMaster").hidePlaceholder(mSettings);
				break;
			default:
				this.getAggregation("_navDetail").hidePlaceholder(mSettings);
		}
	};

	/**
	 * Checks whether a placeholder is needed by comparing the currently displayed page with
	 * the page object that is going to be displayed. If they are the same, no placeholder needs
	 * to be shown.
	 *
	 * @param {string} sAggregationName The aggregation name for the corresponding column
	 * @param {sap.ui.core.Control} oObject The page object to be displayed
	 * @returns {boolean} Whether placeholder is needed or not
	 *
	 * @private
	 * @ui5-restricted sap.ui.core.routing
	 */
	SplitContainer.prototype.needPlaceholder = function(sAggregationName, oObject) {
		var oContainer;

		switch (sAggregationName) {
			case "masterPages":
				oContainer = this.getAggregation("_navMaster");
				break;
			default:
				oContainer = this.getAggregation("_navDetail");
		}

		return !oObject || (oContainer.getCurrentPage() !== oObject);
	};
	/**************************************************************
	* END - Private methods
	**************************************************************/

	/**************************************************************
	* START - forward aggregation related methods to NavContainer
	**************************************************************/
	SplitContainer.prototype.validateAggregation = function(sAggregationName, oObject, bMultiple){
		return this._callSuperMethod("validateAggregation", sAggregationName, oObject, bMultiple);
	};

	SplitContainer.prototype.setAggregation = function(sAggregationName, oObject, bSuppressInvalidate){
		this._callSuperMethod("setAggregation", sAggregationName, oObject, bSuppressInvalidate);
		return this;
	};

	SplitContainer.prototype.getAggregation = function(sAggregationName, oDefaultForCreation){
		return this._callSuperMethod("getAggregation", sAggregationName, oDefaultForCreation);
	};

	SplitContainer.prototype.indexOfAggregation = function(sAggregationName, oObject){
		return this._callSuperMethod("indexOfAggregation", sAggregationName, oObject);
	};

	SplitContainer.prototype.insertAggregation = function(sAggregationName, oObject, iIndex, bSuppressInvalidate){
		this._callSuperMethod("insertAggregation", sAggregationName, oObject, iIndex, bSuppressInvalidate);
		return this;
	};

	SplitContainer.prototype.addAggregation = function(sAggregationName, oObject, bSuppressInvalidate){
		this._callSuperMethod("addAggregation", sAggregationName, oObject, bSuppressInvalidate);
		return this;
	};

	SplitContainer.prototype.removeAggregation = function(sAggregationName, oObject, bSuppressInvalidate){
		return this._callSuperMethod("removeAggregation", sAggregationName, oObject, bSuppressInvalidate);
	};

	SplitContainer.prototype.removeAllAggregation = function(sAggregationName, bSuppressInvalidate){
		return this._callSuperMethod("removeAllAggregation", sAggregationName, bSuppressInvalidate);
	};

	SplitContainer.prototype.destroyAggregation = function(sAggregationName, bSuppressInvalidate){
		this._callSuperMethod("destroyAggregation", sAggregationName, bSuppressInvalidate);
		return this;
	};
	/**************************************************************
	* END - forward aggregation related methods to NavContainer
	**************************************************************/

	/**************************************************************
	* START - Static methods
	**************************************************************/
	/**
	 * @private
	 */
	SplitContainer._mFunctionMapping = {
		"getAggregation" : "getPage",
		"addAggregation" : "addPage",
		"insertAggregation" : "insertPage",
		"removeAggregation" : "removePage",
		"removeAllAggregation" : "removeAllPages"
	};

	/**************************************************************
	* END - Static methods
	**************************************************************/


	return SplitContainer;

});