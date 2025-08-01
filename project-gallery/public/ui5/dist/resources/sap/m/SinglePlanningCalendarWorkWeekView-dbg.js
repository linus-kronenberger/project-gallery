/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'./library',
	'./SinglePlanningCalendarView',
	"sap/base/i18n/Formatting",
	"sap/ui/core/Locale",
	'sap/ui/unified/calendar/CalendarDate',
	'sap/ui/unified/calendar/CalendarUtils',
	'sap/ui/core/LocaleData'
],
function(library, SinglePlanningCalendarView, Formatting, Locale, CalendarDate, CalendarUtils, LocaleData) {
	"use strict";

	/**
	 * Constructor for a new <code>SinglePlanningCalendarWorkWeekView</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 *
	 * Represents a week view of the {@link sap.m.SinglePlanningCalendar}.
	 * The purpose of the element is to decouple the view logic from parent control <code>SinglePlanningCalendar</code>.
	 *
	 * @extends sap.m.SinglePlanningCalendarView
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public

	 * @since 1.61
	 * @alias sap.m.SinglePlanningCalendarWorkWeekView
	 */
	var SinglePlanningCalendarWorkWeekView = SinglePlanningCalendarView.extend("sap.m.SinglePlanningCalendarWorkWeekView", {
		metadata: {

			library: "sap.m"

		}
	});

	/**
	 * Returns the number of columns to be displayed in the grid of the <code>sap.m.SinglePlanningCalendar</code>.
	 *
	 * @returns {int} the number of columns to be displayed
	 * @override
	 * @public
	 */
	SinglePlanningCalendarWorkWeekView.prototype.getEntityCount = function () {
		return 5;
	};

	/**
	 * Should return a number of entities until the next/previous startDate of the
	 * <code>sap.m.SinglePlanningCalendar</code> after navigating forward or backwards.
	 *
	 * @returns {int} the number of entities to be skipped by scrolling
	 * @override
	 * @public
	 */
	SinglePlanningCalendarWorkWeekView.prototype.getScrollEntityCount = function () {
		return 7;
	};

	/**
	 * Calculates the startDate which will be displayed in the <code>sap.m.SinglePlanningCalendar</code> based
	 * on a given date.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oDate The given date
	 * @returns {Date|module:sap/ui/core/date/UI5Date} The startDate of the view
	 * @override
	 * @public
	 */
	SinglePlanningCalendarWorkWeekView.prototype.calculateStartDate = function (oDate) {
		var oCalDate = CalendarDate.fromLocalJSDate(oDate),
			oCalFirstDateOfWeek = CalendarUtils._getFirstDateOfWeek(oCalDate),
			oLocaleData = this._getFormatSettingsLocaleData();

		if (oCalFirstDateOfWeek.getDay() === oLocaleData.getWeekendEnd()) { // TODO: This logic does not work with all of the locales. Will be fixed in the future.
			oCalFirstDateOfWeek.setDate(oCalFirstDateOfWeek.getDate() + 1);
		}

		return oCalFirstDateOfWeek.toLocalJSDate();
	};

	/**
	 * Returns local data about the current locale.
	 *
	 * @returns {LocaleData} the local data
	 * @private
	 */
	SinglePlanningCalendarWorkWeekView.prototype._getFormatSettingsLocaleData = function () {
		return LocaleData.getInstance(new Locale(Formatting.getLanguageTag()));
	};

	return SinglePlanningCalendarWorkWeekView;

});