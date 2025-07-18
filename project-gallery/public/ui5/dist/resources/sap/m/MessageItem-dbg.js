/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"./library",
	"sap/ui/core/Item",
	"sap/ui/core/message/MessageType",
	"sap/base/Log"
],
	function(library, Item, MessageType, Log) {
		"use strict";

		/**
		 * Constructor for a new MessageItem.
		 *
		 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
		 * @param {object} [mSettings] Initial settings for the new control
		 *
		 * @class
		 * A wrapper control used to hold different types of system messages.
		 * <h3>Structure</h3>
		 * The message item holds the basic set of properties for a system message:
		 * <ul>
		 * <li> Type, title, subtitle and description </li>
		 * <li> If the description contains markup, the <code>markupDescription</code> needs to be set to true, to ensure it is interpreted correctly. </li>
		 * <li> If the long text description can be specified by a URL by setting, the <code>longtextUrl</code> property. </li>
		 * <li> The message item can have a single {@link sap.m.Link} after the description. It is stored in the <code>link</code> aggregation. </li>
		 * <h3>Usage</h3>
		 * <b>Note:</b> The MessageItem control replaces {@link sap.m.MessagePopoverItem} as a more generic wrapper for messages.
		 *
		 * @extends sap.ui.core.Item
		 * @author SAP SE
		 * @version 1.138.0
		 *
		 * @constructor
		 * @public
		 * @since 1.46
		 * @alias sap.m.MessageItem
		 */

		var MessageItem = Item.extend("sap.m.MessageItem", /** @lends sap.m.MessageItem.prototype */ {
			metadata: {
				library: "sap.m",
				properties: {
					/**
					 * Specifies the type of the message
					 */
					type: { type: "sap.ui.core.message.MessageType", group: "Appearance", defaultValue: MessageType.Error },

					/**
					 * Specifies the title of the message
					 */
					title: { type: "string", group: "Data", defaultValue: "" },

					/**
					 * Specifies the subtitle of the message
					 * <b>Note:</b> This is only visible when the <code>title</code> property is not empty.
					 */
					subtitle : {type : "string", group : "Data", defaultValue : null},

					/**
					 * Specifies detailed description of the message
					 */
					description: { type: "string", group: "Data", defaultValue: "" },

					/**
					 * Specifies if description should be interpreted as markup
					 */
					markupDescription: { type: "boolean", group: "Data", defaultValue: false },

					/**
					 * Specifies long text description location URL
					 */
					longtextUrl: { type: "sap.ui.core.URI", group: "Behavior", defaultValue: null },

					/**
					 * Defines the number of messages for a given message.
					 */
					counter: { type: "int", group: "Misc", defaultValue: null },

					/**
					 * Name of a message group the current item belongs to.
					 */
					groupName: { type: "string", group: "Misc", defaultValue: "" },

					/**
					 * Defines whether the title of the item will be interactive.
					 * @since 1.58
					 */
					activeTitle: { type: "boolean", group: "Misc", defaultValue: false }
				},
				defaultAggregation: "link",
				aggregations: {
					/**
					 * Adds an sap.m.Link control which will be displayed at the end of the description of a message.
					 */
					link: { type: "sap.m.Link", multiple: false, singularName: "link" }
				}
			}
		});

		MessageItem.prototype.setProperty = function (sPropertyName, oValue, bSuppressInvalidate) {
			// BCP: 1670235674
			// MessageItem acts as a proxy to StandardListItem
			// So, we should ensure if something is changed in MessageItem, it would be propagated to the StandardListItem
			var oParent = this.getParent(),
				sType = this.getType().toLowerCase(),
				// Exclude list properties. Some properties have already been set and shouldn't be changed in the StandardListItem
				aPropertiesNotToUpdateInList = ["description", "type", "groupName"],
				// properties affecting details page rendering
				aDetailsPageUpdatingProps = ["type", "title", "subtitle", "description", "markupDescription", "longtextUrl", "counter", "groupName", "activeTitle"],
				// TODO: the '_oMessagePopoverItem' needs to be updated to proper name in the eventual sap.m.MessageView control
				fnUpdateProperty = function (sName, oItem) {
					if (oItem._oMessagePopoverItem.getId() === this.getId() && oItem.getMetadata().getProperty(sName)) {
						oItem.setProperty(sName, oValue);
					}
				};

			if (aPropertiesNotToUpdateInList.indexOf(sPropertyName) === -1 &&
				oParent && ("_bItemsChanged" in oParent) && !oParent._bItemsChanged) {

				oParent._oLists && oParent._oLists.all && oParent._oLists.all.getItems && oParent._oLists.all.getItems().forEach(fnUpdateProperty.bind(this, sPropertyName));
				oParent._oLists && oParent._oLists[sType] && oParent._oLists[sType].getItems && oParent._oLists[sType].getItems().forEach(fnUpdateProperty.bind(this, sPropertyName));
			}

			if (typeof this._updatePropertiesFn === "function") {
				this._updatePropertiesFn();
			}

			Item.prototype.setProperty.apply(this, arguments);

			if (aDetailsPageUpdatingProps.includes(sPropertyName) && oParent && oParent._updateDescription) {
				oParent._updateDescription(this);
			}

			return this;
		};

		/**
		 * Custom function which will be fired upon updating any property in the MessageItem
		 *
		 * @param {function} customFn The custom function to be executed
		 * @private
		 */
		MessageItem.prototype._updateProperties = function (customFn) {
			this._updatePropertiesFn = customFn;
		};

		/**
		 * Sets type of the MessageItem.
		 * <b>Note:</b> if you set the type to None it will be handled and rendered as Information.
		 *
		 * @param {module:sap/ui/core/message/MessageType} sType Type of Message
		 * @returns {this} The MessageItem
		 * @public
		 */
		MessageItem.prototype.setType = function (sType) {
			if (sType === MessageType.None) {
				sType = MessageType.Information;
				Log.warning("The provided None type is handled and rendered as Information type");
			}

			return this.setProperty("type", sType, true);
		};

		return MessageItem;
	});
