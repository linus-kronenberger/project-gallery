/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'./library',
	'./NotificationListBase',
	'sap/ui/core/InvisibleText',
	'sap/ui/core/IconPool',
	"sap/ui/core/Lib",
	'sap/ui/core/library',
	'sap/ui/Device',
	'sap/m/Button',
	'./NotificationListGroupRenderer'
],
function(
	library,
	NotificationListBase,
	InvisibleText,
	IconPool,
	Library,
	coreLibrary,
	Device,
	Button,
	NotificationListGroupRenderer
) {
	'use strict';

	// shortcut for sap.ui.core.Priority
	var Priority = coreLibrary.Priority;

	// shortcut for sap.m.ButtonType
	var ButtonType = library.ButtonType;

	var RESOURCE_BUNDLE = Library.getResourceBundleFor('sap.m'),
		EXPAND_TEXT = RESOURCE_BUNDLE.getText('NOTIFICATION_LIST_GROUP_EXPAND'),
		COLLAPSE_TEXT = RESOURCE_BUNDLE.getText('NOTIFICATION_LIST_GROUP_COLLAPSE'),
		READ_TEXT = RESOURCE_BUNDLE.getText('NOTIFICATION_LIST_GROUP_READ'),
		UNREAD_TEXT = RESOURCE_BUNDLE.getText('NOTIFICATION_LIST_GROUP_UNREAD'),
		EXPAND_ICON = 'sap-icon://slim-arrow-right',
		COLLAPSE_ICON = 'sap-icon://slim-arrow-down';

	var maxNumberOfNotifications = Device.system.desktop ? 400 : 100;

	/**
	 * Constructor for a new <code>NotificationListGroup<code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * The <code>NotificationListGroup</code> control is used for grouping {@link sap.m.NotificationListItem notification items} of the same type.
	 * <h4>Behavior</h4>
	 * The group handles specific behavior for different use cases:
	 * <ul>
	 * <li><code>autoPriority</code> - determines the group priority to the highest priority of an item in the group.</li>
	 * <li><code>enableCollapseButtonWhenEmpty</code> - determines if the collapse/expand button for an empty group is displayed.</li>
	 * <li><code>showEmptyGroup</code> - determines if the header/footer of an empty group is displayed.</li>
	 * </ul>
	 * @extends sap.m.NotificationListBase
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.34
	 * @alias sap.m.NotificationListGroup
	 */
	var NotificationListGroup = NotificationListBase.extend('sap.m.NotificationListGroup', /** @lends sap.m.NotificationListGroup.prototype */ {
		metadata: {
			library: 'sap.m',
			properties: {

				/**
				 * Determines if the group is collapsed or expanded.
				 */
				collapsed: {type: 'boolean', group: 'Behavior', defaultValue: false},

				/**
				 * Determines if the group will automatically set the priority based on the highest priority of its notifications or get its priority from the <code>priority</code> property.
				 */
				autoPriority: {type: 'boolean', group: 'Behavior', defaultValue: true},

				/**
				 * Determines if the group header/footer of the empty group will be always shown. By default groups with 0 notifications are not shown.
				 *
				 */
				showEmptyGroup: {type: 'boolean', group: 'Behavior', defaultValue: false},

				/**
				 * Determines if the collapse/expand button for an empty group is displayed.
				 */
				enableCollapseButtonWhenEmpty: {type: 'boolean', group: 'Behavior', defaultValue: false},

				/**
				 * Determines if the items counter inside the group header will be visible.
				 *
				 *<b>Note:</b> Counter value represents the number of currently visible (loaded) items inside the group.
				 */
				showItemsCounter: {type: 'boolean', group: 'Behavior', defaultValue: true},

				/**
				 * Determines the notification group's author name.
				 *
				 * @deprecated As of version 1.73, the concept has been discarded.
				 */
				authorName: {type: 'string', group: 'Appearance', defaultValue: '', deprecated: true},

				/**
				 * Determines the URL of the notification group's author picture.
				 *
				 *  @deprecated As of version 1.73, the concept has been discarded.
				 */
				authorPicture: {type: 'sap.ui.core.URI', deprecated: true},

				/**
				 * Determines the due date of the NotificationListGroup.
				 *
				 *  @deprecated As of version 1.73, the concept has been discarded.
				 */
				datetime: {type: 'string', group: 'Appearance', defaultValue: '', deprecated: true}
			},
			defaultAggregation : 'items',
			aggregations: {

				/**
				 * The NotificationListItems inside the group.
				 */
				items: {type: 'sap.m.NotificationListItem', multiple: true, singularName: 'item'},

				/**
				 * The collapse/expand button.
				 * @private
				 */
				_collapseButton: {type: 'sap.m.Button', multiple: false, visibility: "hidden"}
			},
			events: {
				/**
				 * <code>onCollapse</code> event is called when collapse property value is changed
				 * @since 1.44
				 */
				onCollapse: {
					parameters: {
						/**
						 * Indicates exact collapse direction
						 */
						collapsed: {type: 'boolean'}
					}
				}
			}
		},

		renderer: NotificationListGroupRenderer
	});

	NotificationListGroup.prototype._getCollapseButton = function() {
		var collapseButton = this.getAggregation('_collapseButton'),
			collapsed = this.getCollapsed();

		if (!collapseButton) {
			collapseButton = new Button(this.getId() + '-collapseButton', {
				type: ButtonType.Transparent,
				press: function () {
					var isCollapsed = !this.getCollapsed();
					this.setCollapsed(isCollapsed);
					this.fireOnCollapse({collapsed: isCollapsed});

					this.getAggregation("_collapseButton").focus();
				}.bind(this)
			});

			this.setAggregation("_collapseButton", collapseButton, true);
		}

		collapseButton.setIcon(collapsed ? EXPAND_ICON : COLLAPSE_ICON);
		collapseButton.setTooltip(collapsed ? EXPAND_TEXT : COLLAPSE_TEXT);

		return collapseButton;
	};

	/**
	 * Handles the internal event init.
	 *
	 * @private
	 */
	NotificationListGroup.prototype.init = function() {
		this._groupTitleInvisibleText = new InvisibleText({id: this.getId() + "-invisibleGroupTitleText"});
	};

	NotificationListGroup.prototype.onAfterRendering = function() {
		NotificationListBase.prototype.onAfterRendering.apply(this, arguments);

		var collapseButtonDomRef = this._getCollapseButton().getDomRef();
		if (collapseButtonDomRef) {
			collapseButtonDomRef.setAttribute("aria-expanded", !this.getCollapsed());
			collapseButtonDomRef.setAttribute("aria-controls", this.getId() + "-childrenList");
		}
	};

	/**
	 * Handles the internal event exit.
	 *
	 * @private
	 */
	NotificationListGroup.prototype.exit = function() {
		NotificationListBase.prototype.exit.apply(this, arguments);
		if (this._groupTitleInvisibleText) {
			this._groupTitleInvisibleText.destroy();
			this._groupTitleInvisibleText = null;
		}
	};

	/**
	 * Gets the visible NotificationListItems inside the group.
	 *
	 * @private
	 * @returns {number} The visible notifications.
	 */
	NotificationListGroup.prototype.getVisibleItems = function () {
		var visibleItems = this.getItems().filter(function (item) {
			return item.getVisible();
		});

		return visibleItems;
	};

	/**
	 * Gets the number of visible NotificationListItems inside the group.
	 *
	 * @private
	 * @returns {number} The number of visible notifications.
	 */
	NotificationListGroup.prototype._getVisibleItemsCount = function () {
		return this.getVisibleItems().length;
	};

	/**
	 * Updates invisible text.
	 *
	 * @private
	 */
	NotificationListGroup.prototype._getGroupTitleInvisibleText = function() {
		var readUnreadText = this.getUnread() ? UNREAD_TEXT : READ_TEXT,
			priority = this.getPriority(),
			ariaTexts = [readUnreadText];

		if (priority !== Priority.None) {
			ariaTexts.push(RESOURCE_BUNDLE.getText("NOTIFICATION_LIST_GROUP_PRIORITY", [priority]));
		}

		if (this.getShowItemsCounter()) {
			ariaTexts.push(RESOURCE_BUNDLE.getText("LIST_ITEM_COUNTER", [this._getVisibleItemsCount()]));
		}

		return this._groupTitleInvisibleText.setText(ariaTexts.join(' '));
	};

	/**
	 * Overrides the getter for priority property.
	 *
	 * @override
	 * @public
	 * @returns {sap.ui.core.Priority} Items by priority.
	 */
	NotificationListGroup.prototype.getPriority = function () {
		//If the autoPriority flag is off then return what has been set by the developer
		if (!this.getAutoPriority()) {
			return this.getProperty('priority');
		}

		/** @type {sap.m.NotificationListItem[]} */
		var notifications = this.getAggregation('items');

		/** @type {sap.ui.core.Priority|string} */
		var priority = Priority.None;

		if (notifications) {
			notifications.forEach(function (item) {
				priority = comparePriority(priority, item.getPriority());
			});
		} else {
			priority = this.getProperty('priority');
		}

		return priority;
	};

	/**
	 * Compares two priorities and returns the higher one.
	 *
	 * @private
	 * @param {sap.ui.core.Priority} firstPriority First priority string to be compared.
	 * @param {sap.ui.core.Priority} secondPriority Second priority string to be compared.
	 * @returns {sap.ui.core.Priority} The highest priority.
	 */
	function comparePriority(firstPriority, secondPriority) {
		if (firstPriority == secondPriority) {
			return firstPriority;
		}

		if ((firstPriority == 'None')) {
			return secondPriority;
		}

		if ((firstPriority == 'Low') && (secondPriority != 'None')) {
			return secondPriority;
		}

		if ((firstPriority == 'Medium') && (secondPriority != 'None' && secondPriority != 'Low')) {
			return secondPriority;
		}

		return firstPriority;
	}

	/**
	 * Handles the internal event onBeforeRendering.
	 *
	 * @private
	 */
	NotificationListGroup.prototype.onBeforeRendering = function () {
		NotificationListBase.prototype.onBeforeRendering.apply(this, arguments);

		this._getCollapseButton().setVisible(this.getEnableCollapseButtonWhenEmpty() || this._getVisibleItemsCount() > 0);
	};

	/**
	 * Checks if the max number of notification is reached
	 *
	 * @private
	 * @returns {boolean} Whether the max number of notification is reached
	 */
	NotificationListGroup.prototype._isMaxNumberReached = function () {
		return this.getItems().length > maxNumberOfNotifications;
	};

	/**
	 * Returns the messages, which should be displayed, when the notification limit is reached
	 *
	 * @private
	 * @returns {object} The messages
	 */
	NotificationListGroup.prototype._getMaxNumberReachedMsg = function () {
		return {
			title: RESOURCE_BUNDLE.getText('NOTIFICATION_LIST_GROUP_MAX_NOTIFICATIONS_TITLE', [this.getItems().length - maxNumberOfNotifications]),
			description: RESOURCE_BUNDLE.getText('NOTIFICATION_LIST_GROUP_MAX_NOTIFICATIONS_BODY')
		};
	};

	NotificationListGroup.prototype._collapse = function (event) {
		if (!this.getCollapsed()) {
			this.setCollapsed(true);
			this.fireOnCollapse({collapsed: true});
			event.stopImmediatePropagation();
		}
	};

	NotificationListGroup.prototype._expand = function (event) {
		if (this.getCollapsed()) {
			this.setCollapsed(false);
			this.fireOnCollapse({collapsed: false});
			event.stopImmediatePropagation();
		}
	};

	return NotificationListGroup;
});
