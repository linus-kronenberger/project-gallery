/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.m.InputListItem.
sap.ui.define([
	"sap/ui/core/library",
	"./library",
	"./ListItemBase",
	"./InputListItemRenderer"
],
	function(coreLibrary, library, ListItemBase, InputListItemRenderer) {
	"use strict";


	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;
	var ContentSize = library.InputListItemContentSize;

	/**
	 * Constructor for a new InputListItem.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * List item should be used for a label and an input field.
	 * @extends sap.m.ListItemBase
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @alias sap.m.InputListItem
	 * @see {@link fiori:/input-list-item/ Input List Item}
	 */
	var InputListItem = ListItemBase.extend("sap.m.InputListItem", /** @lends sap.m.InputListItem.prototype */ {
		metadata : {

			library : "sap.m",
			properties : {

				/**
				 * Label of the list item
				 */
				label : {type : "string", group : "Misc", defaultValue : null},

				/**
				 * This property specifies the label text directionality with enumerated options. By default, the label inherits text direction from the DOM.
				 * @since 1.30.0
				 */
				labelTextDirection : {type : "sap.ui.core.TextDirection", group : "Appearance", defaultValue : TextDirection.Inherit},

				/**
				 * Determines how much space is allocated for the input control.
				 * @since 1.130
				 */
				contentSize: {type : "sap.m.InputListItemContentSize", group : "Appearance", defaultValue : ContentSize.L}
			},
			defaultAggregation : "content",
			aggregations : {

				/**
				 * Content controls can be added
				 */
				content : {type : "sap.ui.core.Control", multiple : true, singularName : "content", bindable : "bindable"}
			},
			designtime: "sap/m/designtime/InputListItem.designtime"
		},

		renderer: InputListItemRenderer
	});

	InputListItem.prototype.getContentAnnouncement = function() {
		var sAnnouncement = this.getLabel() + " . ";
		this.getContent().forEach(function(oContent) {
			sAnnouncement += ListItemBase.getAccessibilityText(oContent) + " ";
		});
		return sAnnouncement.trim();
	};

	return InputListItem;

});
