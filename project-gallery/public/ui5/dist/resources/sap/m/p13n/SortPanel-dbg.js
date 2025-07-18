/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"./QueryPanel",
	"sap/m/Text",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/ui/core/Lib",
	"sap/ui/layout/Grid",
	"sap/ui/layout/GridData"
], (
	QueryPanel,
	Text,
	SegmentedButton,
	SegmentedButtonItem,
	Library,
	Grid,
	GridData
) => {
	"use strict";

	/**
	 * Constructor for a new <code>SortPanel</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * This control can be used to customize personalization content for sorting
	 * for an associated control instance.
	 *
	 * @extends sap.m.p13n.QueryPanel
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @public
	 * @since 1.96
	 * @alias sap.m.p13n.SortPanel
	 */

	const SortPanel = QueryPanel.extend("sap.m.p13n.SortPanel", {
		metadata: {
			properties: {
				/**
				 * A short text describing the panel.
				 * <b>Note:</b> This text will only be displayed if the panel is being used in a <code>sap.m.p13n.Popup</code>.
				 */
				title: {
					type: "string",
					defaultValue: Library.getResourceBundleFor("sap.m").getText("p13n.DEFAULT_TITLE_SORT")
				}
			},
			library: "sap.m"
		},
		renderer: {
			apiVersion: 2
		}
	});

	SortPanel.prototype.PRESENCE_ATTRIBUTE = "sorted";
	SortPanel.prototype.CHANGE_REASON_SORTORDER = "sortorder";

	/**
	 * P13n <code>SortItem</code> object type.
	 *
	 * @static
	 * @constant
	 * @typedef {object} sap.m.p13n.SortItem
	 * @property {string} name The unique key of the item
	 * @property {string} label The label describing the personalization item
	 * @property {boolean} sorted Defines the sorting state of the personalization item
	 * @property {boolean} descending Defines the descending state of the personalization item
	 *
	 * @public
	 */

	/**
	 * Sets the personalization state of the panel instance.
	 *
	 * @name sap.m.p13n.SortPanel.setP13nData
	 * @public
	 * @function
	 *
	 * @param {sap.m.p13n.SortItem[]} aP13nData An array containing the personalization state
	 * @returns {sap.m.p13n.SortPanel} The SortPanel instance
	 *
	 */

	SortPanel.prototype._createRemoveButton = function() {
		const oRemoveBtn = QueryPanel.prototype._createRemoveButton.apply(this, arguments);
		oRemoveBtn.setLayoutData(new GridData({
			span: "XL3 L3 M3 S4" //on "S" the Asc/Desc text is invisible, we need to increase the size the
		}));
		return oRemoveBtn;
	};

	SortPanel.prototype._createOrderSwitch = function(sKey, bDesc) {
		const oSortOrderSwitch = new SegmentedButton({
			enabled: sKey ? true : false,
			layoutData: new GridData({
				span: "XL2 L2 M2 S3" //on "S" the Asc/Desc text is invisible, we need to increase the size then
			}),
			items: [
				new SegmentedButtonItem({
					key: "asc",
					icon: "sap-icon://sort-ascending"
				}),
				new SegmentedButtonItem({
					key: "desc",
					icon: "sap-icon://sort-descending"
				})
			],
			selectionChange: (oEvt) => {
				const oItem = oEvt.getParameter("item");
				const sSortOrder = oItem.getKey();
				const oText = oEvt.getSource().getParent().getContent()[2];
				oText.setText(this._getSortOrderText(sSortOrder === "desc"));
				const sKey = oEvt.oSource.getParent().getContent()[0].getSelectedItem().getKey();

				this._changeOrder(sKey, sSortOrder == "desc");
			}
		});

		oSortOrderSwitch.setSelectedItem(bDesc ? oSortOrderSwitch.getItems()[1] : oSortOrderSwitch.getItems()[0]);

		return oSortOrderSwitch;
	};

	SortPanel.prototype._createSortOrderText = function(sKey, bDesc) {
		return new Text({
			layoutData: new GridData({
				span: "XL3 L3 M3 S3",
				visibleS: false
			}),
			text: this._getSortOrderText(bDesc)
		}).addStyleClass("sapUiTinyMarginTop");
	};

	SortPanel.prototype._createQueryRowGrid = function(oItem) {
		//Enhance row with sort specific controls (Segmented Button + sort order text)
		const oSelect = this._createKeySelect(oItem.name);
		const oSortOrderSwitch = this._createOrderSwitch(oItem.name, oItem.descending);
		const oSortOrderText = this._createSortOrderText(oItem.name, oItem.descending);

		return new Grid({
			containerQuery: true,
			defaultSpan: "XL4 L4 M4 S5",
			content: [
				oSelect,
				oSortOrderSwitch,
				oSortOrderText
			]
		}).addStyleClass("sapUiTinyMargin");
	};

	SortPanel.prototype._getPlaceholderText = function() {
		return this._getResourceText("p13n.SORT_PLACEHOLDER");
	};

	SortPanel.prototype._getRemoveButtonTooltipText = function() {
		return this._getResourceText("p13n.SORT_REMOVEICONTOOLTIP");
	};

	SortPanel.prototype._getRemoveButtonAnnouncementText = function() {
		return this._getResourceText("p13n.SORT_REMOVEICONANNOUNCE");
	};

	SortPanel.prototype._selectKey = function(oComboBox) {
		QueryPanel.prototype._selectKey.apply(this, arguments);

		//Enable SegmentedButton
		const oListItem = oComboBox.getParent().getParent();
		const sNewKey = oComboBox.getSelectedKey();
		const aContent = oListItem.getContent()[0].getContent();
		aContent[1].setEnabled(!!sNewKey);

		//keep existing 'sortorder' selection
		const bDescending = aContent[1].getSelectedKey() === "desc";
		this._changeOrder(sNewKey, bDescending);
	};

	SortPanel.prototype._getSortOrderText = function(bDesc) {
		return bDesc ? this._getResourceText("p13n.SORT_DESCENDING") : this._getResourceText("p13n.SORT_ASCENDING");
	};

	SortPanel.prototype._changeOrder = function(sKey, bDesc) {
		const aItems = this._getP13nModel().getProperty("/items").filter((oItem) => {
			return oItem.name === sKey;
		});

		if (aItems.length > 0) {
			aItems[0].descending = bDesc;

			this.fireChange({
				reason: this.CHANGE_REASON_SORTORDER,
				item: aItems[0]
			});
		}
	};

	return SortPanel;

});