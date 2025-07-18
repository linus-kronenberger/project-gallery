/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.tnt.ToolHeader
sap.ui.define([
	"./library",
	"sap/m/OverflowToolbar",
	"sap/m/OverflowToolbarAssociativePopover",
	"./ToolHeaderRenderer",
	"sap/ui/Device",
	"sap/m/library"
], function (
	library,
	OverflowToolbar,
	OverflowToolbarAssociativePopover,
	ToolHeaderRenderer,
	Device,
    mobileLibrary
) {
	"use strict";

	// shortcut for sap.m.PlacementType
	var PlacementType = mobileLibrary.PlacementType;

	/**
	 * Constructor for a new ToolHeader.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 *
	 * The ToolHeader control is a horizontal container that is most
	 * commonly used to display buttons, texts, and other various input controls.
	 * <h3>Overview</h3>
	 * The ToolHeader control is based on {@link sap.m.OverflowToolbar}. It contains clearly structured menus of commands that are available across the various apps within the same tool layout.
	 * <h3>Usage</h3>
	 * <ul>
	 * <li>This control is specialized for administrative applications. For other types of applications use: {@link sap.m.Shell}</li>
	 * <li>If an app implements side navigation in addition to the tool header menu, the menu icon must be the first item on the left-hand side of the tool header.</li>
	 * <li>The app menu and the side navigation must not have any dependencies and must work independently.</li>
	 * </ul>
	 * <h4>Horizon theme specifics</h4>
	 * Only the following controls are supported: sap.m.Button, sap.m.Image, sap.m.Title, sap.m.Text, sap.m.SearchField, sap.m.Avatar.
	 * <h4>Fiori 3 theme specifics</h4>
	 * In Fiori 3 Default theme the ToolHeader is with dark design unlike most of the other controls. This defines the usage of limited controls inside it, which will result in good design combination.<br/>
	 * The ToolHeader stylizes the contained controls with the Shell color parameters, to match the dark design requirement. However, that's not a dark theme.<br/><br/>
	 * Only the following controls are supported:
		<div>
		<table>
		<tr>
			<th>Control name</th>
			<th>Supported</th>
			<th>Not supported</th>
		</tr>
		<tr>
			<td>sap.m.Text</td>
			<td>Single line text, text truncation</td>
			<td>Wrapping</td>
		</tr>
		<tr>
			<td>sap.m.Title</td>
			<td>Single line text, text truncation. Consider using title headings of H4, H5, H6.</td>
			<td>Wrapping</td>
		</tr>
		<tr>
			<td>sap.m.Label</td>
			<td>Single line text, text truncation</td>
			<td>Wrapping</td>
		</tr>
		<tr>
			<td>sap.m.ObjectStatus</td>
			<td>Labels, semantic colors</td>
			<td>Indication colors</td>
		</tr>
		<tr>
			<td>sap.ui.core.Icon</td>
			<td>sap.ui.core.IconColor enumeration for both icons and backgrounds.</td>
			<td>Interaction state colors</td>
		</tr>
		<tr>
			<td>sap.m.Button</td>
			<td>Buttons in their Back, Default, Transparent and Up types. All four types are over-styled to look as transparent buttons.</td>
			<td>-</td>
		</tr>
		<tr>
			<td>sap.m.MenuButton</td>
			<td>Emphasized button type. Should be used for triggering Mega menu. If there is no Mega menu, use Title (H6) instead. </br> Default (over-styled as Transparent) and Transparent types are used for standard menu representation.</td>
			<td>-</td>
		</tr>
		<tr>
			<td>sap.m.Select</td>
			<td>Default and IconOnly types. IconOnly looks like a button while Default looks is like an input.</td>
			<td>Semantic states</td>
		</tr>
		<tr>
			<td>sap.m.SearchField</td>
			<td>Support for the regular state of the control.</td>
			<td>-</td>
		</tr>
		<tr>
			<td>sap.m.IconTabHeader</td>
			<td>All background design variations (all are transparent). Text tab filters or text and count tab filters in Inline mode only.</td>
			<td>Semantic colors, icons and separators.</td>
		</tr>
		<tr>
			<td>sap.f.Avatar/sap.m.Avatar</td>
			<td>Support for default (Accent 6) color. Image avatar.</td>
			<td>-</td>
		</tr>
		<tr>
			<td>sap.m.Image</td>
			<td>Primarily used for displaying the company logo.</td>
			<td>Interaction states</td>
		</tr>
		</table>
		</div>
	*
	* @extends sap.m.OverflowToolbar
	*
	* @author SAP SE
	* @version 1.138.0
	*
	* @constructor
	* @public
	* @since 1.34
	* @alias sap.tnt.ToolHeader
	*/
	var ToolHeader = OverflowToolbar.extend("sap.tnt.ToolHeader", /** @lends sap.tnt.ToolHeader.prototype */ {
		metadata: {
			library: "sap.tnt",
			properties: {
			},
			aggregations: {
			}
		},

		renderer: ToolHeaderRenderer
	});

	/**
	 * Initializes the control.
	 * @private
	 * @override
	 */
	ToolHeader.prototype.init = function() {
		OverflowToolbar.prototype.init.apply(this, arguments);
		this.addStyleClass("sapTntToolHeader sapContrast sapContrastPlus");
	};

	/**
	 * Lazy loader for the popover.
	 * @returns {sap.m.Popover}
	 * @private
	 */
	ToolHeader.prototype._getPopover = function() {
		var oPopover = this.getAggregation("_popover");

		if (!oPopover) {
			oPopover = new OverflowToolbarAssociativePopover(this.getId() + "-popover", {
				showHeader: false,
				showArrow: Device.system.phone ? false : true,
				modal: false,
				horizontalScrolling: Device.system.phone ? false : true,
				contentWidth: Device.system.phone ? "100%" : "auto"
			}).addStyleClass("sapTntToolHeaderPopover sapContrast sapContrastPlus");

			if (Device.system.phone) {
				// This will trigger when the toolbar is in the header/footer, because the position is known in advance (strictly top/bottom)
				oPopover.attachBeforeOpen(this._shiftPopupShadow, this);

				// This will trigger when the toolbar is not in the header/footer, when the actual calculation is ready (see the overridden _calcPlacement)
				oPopover.attachAfterOpen(this._shiftPopupShadow, this);
			}

			// This will set the toggle button to "off"
			oPopover.attachAfterClose(this._popOverClosedHandler, this);

			this.setAggregation("_popover", oPopover, true);
		}

		return oPopover;
	};

	/**
	 * Returns "sap.m.PlacementType.Bottom".
	 * @returns {sap.m.PlacementType}
	 * @private
	 * @override
	 */
	ToolHeader.prototype._getBestActionSheetPlacement = function () {
		return PlacementType.Bottom;
	};

	return ToolHeader;
});