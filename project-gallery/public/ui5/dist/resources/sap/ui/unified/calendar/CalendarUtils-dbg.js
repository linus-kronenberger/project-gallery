/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// package documentation
/**
 * Controls and helper classes around the calendar control.
 *
 * @namespace
 * @name sap.ui.unified.calendar
 * @public
 */

// Provides class sap.ui.unified.calendar.CalendarUtils
sap.ui.define([
	"sap/base/i18n/Formatting",
	"sap/base/i18n/Localization",
	"sap/base/i18n/date/CalendarType",
	'sap/ui/core/date/UniversalDate',
	'./CalendarDate',
	'sap/ui/core/Locale',
	'sap/ui/core/LocaleData',
	'sap/ui/core/format/DateFormat',
	"sap/ui/core/date/UI5Date"
],
	function(Formatting, Localization, CalendarType, UniversalDate, CalendarDate, Locale, LocaleData, DateFormat, UI5Date) {
		"use strict";

		// Static class

		/**
		 * @alias sap.ui.unified.calendar.CalendarUtils
		 * @namespace
		 * @private
		 */
		var CalendarUtils = {};

		/**
		 * The maximum ECMAScript Date converted to milliseconds.
		 * @type {int}
		 * @private
		 */
		CalendarUtils.MAX_MILLISECONDS = 8640000000000000;

		/**
		 * 24 hours as milliseconds
		 * @type {int}
		 * @private
		 */
		CalendarUtils.HOURS24 = 1000 * 3600 * 24;

		/**
		 * Creates a Date in local timezone from UTC timezone
		 * @param {Date} oDate in UTC timezone
		 * @param {boolean} bTime if set the time part of the date will be used too, otherwise it will be initial
		 * @return {Date} in local timezone
		 * @private
		 */
		CalendarUtils._createLocalDate = function (oDate, bTime) {

			var oLocaleDate;

			if (oDate) {
				var oMyDate;

				if (oDate instanceof UniversalDate) {
					oMyDate = oDate.getJSDate();
				} else {
					oMyDate = oDate;
				}

				oLocaleDate = UI5Date.getInstance(oMyDate.getUTCFullYear(), oMyDate.getUTCMonth(), oMyDate.getUTCDate());
				if (oMyDate.getFullYear() < 1000) {
					oLocaleDate.setFullYear(oMyDate.getFullYear());
				}

				if (bTime) {
					oLocaleDate.setHours(oMyDate.getUTCHours());
					oLocaleDate.setMinutes(oMyDate.getUTCMinutes());
					oLocaleDate.setSeconds(oMyDate.getUTCSeconds());
					oLocaleDate.setMilliseconds(oMyDate.getUTCMilliseconds());
				}
			}

			return oLocaleDate;

		};

		/**
		 * Creates a Date in UTC timezone from local timezone
		 * @param {Date} oDate in local timezone
		 * @param {boolean} bTime if set the time part of the date will be used too, otherwise it will be initial
		 * @return {Date} in UTC timezone
		 * @private
		 */
		CalendarUtils._createUTCDate = function (oDate, bTime) {

			var oUTCDate;

			if (oDate) {
				var oMyDate;

				if (oDate instanceof UniversalDate) {
					oMyDate = oDate.getJSDate();
				} else {
					oMyDate = oDate;
				}

				oUTCDate = UI5Date.getInstance(Date.UTC(oMyDate.getFullYear(), oMyDate.getMonth(), oMyDate.getDate()));
				if (oMyDate.getFullYear() < 1000) {
					oUTCDate.setUTCFullYear(oMyDate.getFullYear());
				}

				if (bTime) {
					oUTCDate.setUTCHours(oMyDate.getHours());
					oUTCDate.setUTCMinutes(oMyDate.getMinutes());
					oUTCDate.setUTCSeconds(oMyDate.getSeconds());
					oUTCDate.setUTCMilliseconds(oMyDate.getMilliseconds());
				}
			}

			return oUTCDate;

		};

		/**
		 * Creates a Date in UTC timezone from local timezone
		 * @param {Date} oDate in local timezone
		 * @param {module:sap/base/i18n/date/CalendarType} sCalendarType the type of the used calendar
		 * @param {boolean} bTime if set the time part of the date will be used too, otherwise it will be initial
		 * @return {sap.ui.core.date.UniversalDate} in UTC timezone
		 * @private
		 */
		CalendarUtils._createUniversalUTCDate = function (oDate, sCalendarType, bTime) {

			var oUTCDate;

			if (sCalendarType) {
				oUTCDate = UniversalDate.getInstance(this._createUTCDate(oDate, bTime), sCalendarType);
			} else {
				oUTCDate = new UniversalDate(this._createUTCDate(oDate, bTime).getTime()); // use getTime() because IE and FF can not parse dates < 0100.01.01
			}

			return oUTCDate;

		};

		/**
		 * Calculates the week number corresponding to a date object.
		 *
		 * @param {sap.ui.unified.calendar.CalendarDate} oDate Date of the week.
		 * @param {string} sCalendarType The calendar type. If there is no calendar type provided, it will be taken from the Configuration.
		 * @param {string} sLocale The locale of the calendar.
		 * @param {string} sCalendarWeekNumbering The type of calendar week numbering.
		 * @param {int} iFirstDayOfWeek The start week day number.
		 *
		 * @returns {int} Week number
		 * @private
		 */
		CalendarUtils.calculateWeekNumber = function (oDate, sCalendarType, sLocale, sCalendarWeekNumbering, iFirstDayOfWeek) {
			const oLocale = new Locale(sLocale);
			const oLocaleData = LocaleData.getInstance(oLocale);
			const iLocaleMinimalDaysInFirstWeek = oLocaleData.getMinimalDaysInFirstWeek();

			const oDateFormat = DateFormat.getInstance({
				pattern: "w",
				calendarType: sCalendarType,
				firstDayOfWeek: iFirstDayOfWeek,
				minimalDaysInFirstWeek: iLocaleMinimalDaysInFirstWeek,
				calendarWeekNumbering: sCalendarWeekNumbering
			}, oLocale);

			const iWeekNumber = oDateFormat.format(oDate.toLocalJSDate());

			return Number(iWeekNumber);
		};

		/**
		 * Returns the last week's date based on that week's start date.
		 * @param {sap.ui.unified.calendar.CalendarDate} oWeekStartDate Week's start date
		 * @returns {sap.ui.unified.calendar.CalendarDate} Last week's date
		 * @private
		 */
		CalendarUtils._getLastWeekDate = function (oWeekStartDate) {
			return new CalendarDate(oWeekStartDate).setDate(oWeekStartDate.getDate() + 6);
		};

		/**
		 * Retrieves the first date of the same week in which is the given date.
		 * This function works with date values in UTC to produce timezone agnostic results.
		 * @param {Date} oDate the input date for which we search the first week date.
		 * This date is considered as is (no UTC conversion, time cut etc).
		 * @param {{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [oWeekConfig] calendar week calculation parameters,
		 * defaults to oLocale but has precedence over oLocale if both are provided.
		 * Both properties firstDayOfWeek and minimalDaysInFirstWeek must be provided, otherwise it will be ignored.
		 * If provided US split week is ignored.
		 * e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
		 *
		 * <br>
		 * The US weeks at the end of December and at the beginning of January(53th and 1st),
		 * are not considered.
		 * If a given date is in the beginning of January (e.g. Friday, 2 Jan 2015, week 1),
		 * according to US rules, those are actually 2 weeks:
		 * <ul>
		 * <li>week 53(Sunday, 28 Dec 2014 - Wednesday, 31 Dec 2014) and</li>
		 * <li>week 1(Thursday, 1 Jan 2015 - Saturday, 3 Jan 2015)</li>
		 * </ul>
		 *
		 * The rules above are not considered. If one wants to get it like it, she/he can use UniversalDate.getFirstDateOfWeek
		 *
		 * The way this function works is the following:
		 * If a given date is in the beginning of January (e.g. Friday, 2 Jan 2015, week 1), the function will return
		 * week start date in the previous year(e.g. Sunday, 28 Dec 2014, week 53).
		 *
		 * @returns {Date} first date of the same week as the given <code>oDate</code> in UTC timezone.
		 * @public
		 */
		CalendarUtils.getFirstDateOfWeek = function (oDate, oWeekConfig) {
			var oUniversalDate = new UniversalDate(oDate.getTime()),
				oFirstDateOfWeek,
				oFirstUniversalDateOfWeek,
				oLocaleData = LocaleData.getInstance(new Locale(Formatting.getLanguageTag())),
				oLocale = new Locale(Localization.getLanguageTag()),
				iCLDRFirstWeekDay = oLocaleData.getFirstDayOfWeek(),
				oWeek;

			if (!oWeekConfig || (oWeekConfig.firstDayOfWeek === -1 || oWeekConfig.firstDayOfWeek === undefined)) {
				oWeekConfig = {
					firstDayOfWeek: oLocaleData.getFirstDayOfWeek(),
					minimalDaysInFirstWeek: oLocaleData.getMinimalDaysInFirstWeek()
				};
			}

			oWeek = UniversalDate.getWeekByDate(oUniversalDate.getCalendarType(), oUniversalDate.getUTCFullYear(),
				oUniversalDate.getUTCMonth(), oUniversalDate.getUTCDate(), oLocale, oWeekConfig);

			oFirstDateOfWeek = UniversalDate.getFirstDateOfWeek(oUniversalDate.getCalendarType(), oWeek.year, oWeek.week, oLocale, oWeekConfig);
			oFirstUniversalDateOfWeek = new UniversalDate(UniversalDate.UTC(oFirstDateOfWeek.year, oFirstDateOfWeek.month, oFirstDateOfWeek.day));

			//In case the day of the computed weekFirstDate is not as in CLDR(e.g. en_US locales), make sure we align it

			if (oWeekConfig && (oWeekConfig.firstDayOfWeek === -1 || oWeekConfig.firstDayOfWeek === undefined)) {
				while (oFirstUniversalDateOfWeek.getUTCDay() !== iCLDRFirstWeekDay) {
					oFirstUniversalDateOfWeek.setUTCDate(oFirstUniversalDateOfWeek.getUTCDate() - 1);
				}
			}

			return new UniversalDate(UniversalDate.UTC(oFirstUniversalDateOfWeek.getUTCFullYear(), oFirstUniversalDateOfWeek.getUTCMonth(),
				oFirstUniversalDateOfWeek.getUTCDate(), oDate.getUTCHours(), oDate.getUTCMinutes(), oDate.getUTCSeconds())).getJSDate();
		};

		/**
		 * Gets the first day of a given month.
		 * This function works with date values in UTC to produce timezone agnostic results.
		 *
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate date instance
		 * @returns {Date|module:sap/ui/core/date/UI5Date} date instance corresponding to the first date of the month
		 * @public
		 */
		CalendarUtils.getFirstDateOfMonth = function(oDate) {
			var oNewDate = new UniversalDate(oDate.getTime());
			oNewDate.setUTCDate(1);

			return oNewDate;
		};

		/**
		 * Calculates the number of weeks for a given year using the current locale settings
		 * @param {int} iYear The target year of interest in format (YYYY)
		 * @returns {int} The number of weeks for the given year
		 * @private
		 */
		CalendarUtils._getNumberOfWeeksForYear = function (iYear) {
			var sLocale = Formatting.getLanguageTag().toString(),
				oLocaleData = LocaleData.getInstance(new Locale(sLocale)),
				o1stJan = UI5Date.getInstance(Date.UTC(iYear, 0, 1)),
				i1stDay = o1stJan.getUTCDay(),
				iNumberOfWeeksInYear = 52;

			//This is valid for all the regions where Sunday is the first day of the week
			if (oLocaleData.getFirstDayOfWeek() === 0) {
				if (i1stDay === 5 || i1stDay === 6) {
					iNumberOfWeeksInYear = 53;
				}
			} else {
				if (i1stDay === 3 || i1stDay === 4) {
					iNumberOfWeeksInYear = 53;
				}
			}

			return iNumberOfWeeksInYear;
		};

		/**
		 * Determines if the given dates' months differ, including same months from different years.
		 *
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate1 date instance
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate2 date instance
		 * @return {boolean} true if the given dates' months differ
		 * @public
		 */
		CalendarUtils.monthsDiffer = function(oDate1, oDate2) {
			return (oDate1.getMonth() !== oDate2.getMonth() || oDate1.getFullYear() !== oDate2.getFullYear());
		};

		/**
		 * Checks in UTC mode if the corresponding date is last in a month.
		 * @param {sap.ui.core.date.UniversalDate} oDate The date to be checked whether it is the last one
		 * @returns {boolean} True if the next date is bigger or not regarding the selected one
		 * @public
		 */
		CalendarUtils.isDateLastInMonth = function(oDate) {
			var oNextDay = UI5Date.getInstance(oDate.getTime() + 24 * 60 * 60 * 1000);
			return oNextDay.getUTCDate() < oDate.getUTCDate();
		};


		/**
		 * Sets the given values to the date.
		 * @param {sap.ui.core.date.UniversalDate} oDate The date which parameters will be set
		 * @param {int} iYear The year to be set
		 * @param {int} iMonth The month to be set
		 * @param {int} iDate The date to be set
		 * @param {int} iHours The hours to be set
		 * @param {int} iMinutes The minutes to be set
		 * @param {int} iSeconds The seconds to be set
		 * @param {int} iMilliseconds The milliseconds to be set
		 * @private
		 */
		CalendarUtils._updateUTCDate = function(oDate, iYear, iMonth, iDate, iHours, iMinutes, iSeconds, iMilliseconds) {
			if (iYear != null) {
				oDate.setUTCFullYear(iYear);
			}
			if (iMonth != null) {
				oDate.setUTCMonth(iMonth);
			}
			if (iDate != null) {
				oDate.setUTCDate(iDate);
			}
			if (iHours != null) {
				oDate.setUTCHours(iHours);
			}
			if (iMinutes != null) {
				oDate.setUTCMinutes(iMinutes);
			}
			if (iSeconds != null) {
				oDate.setUTCSeconds(iSeconds);
			}
			if (iMilliseconds != null) {
				oDate.setUTCMilliseconds(iMilliseconds);
			}
		};

		/**
		 * Checks if the given object is UI5Date ot JavaScript Date object and throws error if its not.
		 * @param {Object} oDate The date to be checked
		 * @private
		 */
		CalendarUtils._checkJSDateObject = function(oDate) {
			// Cross frame check for a date should be performed here otherwise setDateValue would fail in OPA tests
			// because Date object in the test is different than the Date object in the application (due to the iframe).
			if (!oDate || Object.prototype.toString.call(oDate) !== "[object Date]" || isNaN(oDate)) {
				throw new Error("Date must be a JavaScript or UI5Date date object.");
			}
		};

		/**
		 * Checks if the given year is between of 1 and 9999 in Gregorian calendar type
		 * @param {int} iYear The year to be checked
		 * @param {string} sCalendarType The calendar type of the year to be checked. If there is no calendar type provided, it will be taken from the Configuration.
		 * @private
		 */
		CalendarUtils._checkYearInValidRange = function(iYear, sCalendarType) {
			var sConfigCalendarType = Formatting.getCalendarType(),
				oMinDate = new CalendarDate(this._minDate(CalendarType.Gregorian), sCalendarType || sConfigCalendarType),
				oMaxDate = new CalendarDate(this._maxDate(CalendarType.Gregorian), sCalendarType || sConfigCalendarType);
			if (typeof iYear !== "number" || iYear < oMinDate.getYear() || iYear > oMaxDate.getYear()) {
				throw new Error("Year must be in valid range (between year 0001 and year 9999 in Gregorian calendar type).");
			}
		};

		/**
		 * Compares the given month and the one from the <code>startDate</code>.
		 *
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate1 date instance
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate2 date instance
		 * @return {boolean} true if the first date's month is chronologically after the second
		 * @private
		 */
		CalendarUtils._isNextMonth = function(oDate1, oDate2) {
			return (oDate1.getMonth() > oDate2.getMonth() && oDate1.getFullYear() === oDate2.getFullYear())
				|| oDate1.getFullYear() > oDate2.getFullYear();
		};

		/**
		 * Evaluates minutes between two dates.
		 * @param {Date|module:sap/ui/core/date/UI5Date} oFirstDate date instance
		 * @param {Date|module:sap/ui/core/date/UI5Date} oSecondDate date instance
		 * @return {int} iMinutes
		 * @private
		 */
		CalendarUtils._minutesBetween = function(oFirstDate, oSecondDate) {
			var iMinutes = (oSecondDate.getTime() - oFirstDate.getTime()) / 1000;
			iMinutes = iMinutes / 60;

			return Math.abs(Math.round(iMinutes));
		};

		/**
		 * Evaluates whether the given minutes are less than the current.
		 * The function uses local js date for comparison.
		 * @param {int} iMinutes The minutes to check
		 * @return {boolean} true if the give minutes are less than the current
		 * @private
		 */
		CalendarUtils._areCurrentMinutesLessThan = function (iMinutes) {
			var iCurrentMinutes = UI5Date.getInstance().getMinutes();

			return iMinutes >= iCurrentMinutes;
		};

		/**
		 * Evaluates whether the given minutes are more than the current.
		 * The function uses local js date for comparison.
		 * @param {int} iMinutes The minutes to check
		 * @return {boolean} true if the give minutes are more than the current
		 * @private
		 */
		CalendarUtils._areCurrentMinutesMoreThan = function (iMinutes) {
			var iCurrentMinutes = UI5Date.getInstance().getMinutes();

			return iMinutes <= iCurrentMinutes;
		};

		/**
		 * Evaluates months between two dates.
		 * @param {Date|module:sap/ui/core/date/UI5Date} oFirstDate date instance
		 * @param {Date|module:sap/ui/core/date/UI5Date} oSecondDate date instance
		 * @param {boolean} bDontAbsResult if omitted or false, the result will be positive number of months between dates;
		 * 					if true, the result will be positive or negative depending of the direction of the difference
		 * @return {int} iMonths
		 * @private
		 */
		CalendarUtils._monthsBetween = function(oFirstDate, oSecondDate, bDontAbsResult) {
			var oUTCFirstDate = UI5Date.getInstance(Date.UTC(oFirstDate.getUTCFullYear(), oFirstDate.getUTCMonth(), oFirstDate.getUTCDate())),
				oUTCSecondDate = UI5Date.getInstance(Date.UTC(oSecondDate.getUTCFullYear(), oSecondDate.getUTCMonth(), oSecondDate.getUTCDate())),
				iMonths;

			oUTCFirstDate.setUTCFullYear(oFirstDate.getUTCFullYear());
			oUTCSecondDate.setUTCFullYear(oSecondDate.getUTCFullYear());

			iMonths = (oUTCSecondDate.getUTCFullYear() * 12 + oUTCSecondDate.getUTCMonth())
				- (oUTCFirstDate.getUTCFullYear() * 12 + oUTCFirstDate.getUTCMonth());

			if (!bDontAbsResult) {
				iMonths = Math.abs(iMonths);
			}

			return iMonths;
		};

		/**
		 * Evaluates hours between two dates.
		 * @param {Date|module:sap/ui/core/date/UI5Date} oFirstDate date instance
		 * @param {Date|module:sap/ui/core/date/UI5Date} oSecondDate date instance
		 * @return {int} iMinutes
		 * @private
		 */
		CalendarUtils._hoursBetween = function(oFirstDate, oSecondDate) {
			var oNewFirstDate = UI5Date.getInstance(Date.UTC(oFirstDate.getUTCFullYear(),
				oFirstDate.getUTCMonth(), oFirstDate.getUTCDate(), oFirstDate.getUTCHours()));
			var oNewSecondDate = UI5Date.getInstance(Date.UTC(oSecondDate.getUTCFullYear(),
				oSecondDate.getUTCMonth(), oSecondDate.getUTCDate(), oSecondDate.getUTCHours()));

			oNewFirstDate.setUTCFullYear(oFirstDate.getUTCFullYear());
			oNewSecondDate.setUTCFullYear(oSecondDate.getUTCFullYear());

			return Math.abs((oNewFirstDate.getTime() - oNewSecondDate.getTime()) / (1000 * 60 * 60));
		};

		/**
		 * Evaluates whether a given date time part indicates midniht.
		 *
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate date instance
		 * @returns {boolean} is midnight
		 */
		CalendarUtils._isMidnight = function(oDate) {
			return oDate.getHours() === 0 && oDate.getMinutes() === 0 && oDate.getSeconds() === 0 && oDate.getMilliseconds() === 0;
		};

		 // Utilities for working with sap.ui.unified.calendar.CalendarDate

		/**
		 * Calculates how many days are in a given month.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate The date which year will be checked
		 * @returns {int} The number of days in the month for the given oCalendarDate
		 * @throws Will throw an error if the arguments are null or are not of the correct type
		 * @private
		 */
		CalendarUtils._daysInMonth = function (oCalendarDate) {
			this._checkCalendarDate(oCalendarDate);

			oCalendarDate = new CalendarDate(oCalendarDate);
			oCalendarDate.setDate(1);
			oCalendarDate.setMonth(oCalendarDate.getMonth() + 1);
			oCalendarDate.setDate(0);
			return oCalendarDate.getDate();
		};

		/**
		 * Checks if the given date is the last date of the same month.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate The date to be checked
		 * @returns {boolean} True if the provided date is the last date in the same month, false otherwise
		 * @throws Will throw an error if the arguments are null or are not of the correct type
		 * @private
		 */
		CalendarUtils._isLastDateInMonth = function (oCalendarDate) {
			return oCalendarDate.getDate() === CalendarUtils._daysInMonth(oCalendarDate);
		};

		/**
		 * Retrieves the first date of the same week in which is the given date.
		 * <br><br>
		 * The US weeks at the end of December and at the beginning of January(53th and 0th), are not considered.
		 * If a given date is in the beginning of January (e.g. Friday, 2 Jan 2015, week 0), the function will return
		 * week start date in the previous year(e.g. Sunday, 28 Dec 2014, week 53).
		 *
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate the input date for which we search the first week date.
		 * @param {{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [oWeekConfig] calendar week calculation parameters,
		 * defaults to oLocale but has precedence over oLocale if both are provided.
		 * Both properties firstDayOfWeek and minimalDaysInFirstWeek must be provided, otherwise it will be ignored.
		 * If provided US split week is ignored.
		 * e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
		 * @returns {sap.ui.unified.calendar.CalendarDate} first date of the same week as the given <code>oDate</code> in local timezone.
		 * @throws Will throw an error if the arguments are null or are not of the correct type.
		 * @private
		 */
		CalendarUtils._getFirstDateOfWeek = function (oCalendarDate, oWeekConfig) {
			var oLocaleData = LocaleData.getInstance(new Locale(Formatting.getLanguageTag()));
			this._checkCalendarDate(oCalendarDate);

			if (!oWeekConfig || (oWeekConfig.firstDayOfWeek === -1 || oWeekConfig.firstDayOfWeek === undefined)) {
				oWeekConfig = {
					firstDayOfWeek: oLocaleData.getFirstDayOfWeek(),
					minimalDaysInFirstWeek: oLocaleData.getMinimalDaysInFirstWeek()
				};
			}

			if (oCalendarDate.getDay() !== oWeekConfig.firstDayOfWeek) {
				var oJSDate = CalendarUtils.getFirstDateOfWeek(oCalendarDate.toUTCJSDate(), oWeekConfig);
				oJSDate.setFullYear(oJSDate.getUTCFullYear(), oJSDate.getUTCMonth(), oJSDate.getUTCDate());

				return CalendarDate.fromLocalJSDate(oJSDate, oCalendarDate.getCalendarType());
			}

			return oCalendarDate;
		};

		/**
		 * Gets the first day of a given month.
		 *
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate The date whose first date will be returned
		 * @returns {sap.ui.unified.calendar.CalendarDate} Date corresponding to the first date of the month
		 * @throws Will throw an error if the arguments are null or are not of the correct type
		 * @private
		 */
		CalendarUtils._getFirstDateOfMonth = function(oCalendarDate) {
			this._checkCalendarDate(oCalendarDate);

			var oCalendarDateFirstDay = new CalendarDate(oCalendarDate, oCalendarDate.getCalendarType());

			oCalendarDateFirstDay.setDate(1);

			return oCalendarDateFirstDay;
		};

		/**
		 * @param {module:sap/base/i18n/date/CalendarType} sCalendarType The date type whose minimal date will be returned
		 * @returns {sap.ui.unified.calendar.CalendarDate} The minimal date that this calendar supports
		 * @private
		 */
		CalendarUtils._minDate = function (sCalendarType) {
			var oCalDate = new CalendarDate(1, 0, 1, sCalendarType);
			oCalDate.setYear(1);
			oCalDate.setMonth(0);
			oCalDate.setDate(1);
			return oCalDate;
		};

		/**
		 * Creates a date corresponding to the max date this calendar supports.
		 * @param {module:sap/base/i18n/date/CalendarType} sCalendarType The date type whose maximal date will be returned
		 * @returns {sap.ui.unified.calendar.CalendarDate} The maximum date that this calendar supports
		 * @private
		 */
		CalendarUtils._maxDate = function (sCalendarType) {
			var oCalDate = new CalendarDate(9999, 11, 1, sCalendarType);
			oCalDate.setYear(9999);
			oCalDate.setMonth(11);
			oCalDate.setDate(this._daysInMonth(oCalDate));// 31st for Gregorian Calendar
			return new CalendarDate(oCalDate);
		};

		/**
		 * Check if given date matches given date range.
		 * @param {sap.ui.unified.calendar.CalendarDate} oDate The date to check
		 * @param {sap.ui.unified.calendar.CalendarDate} oStartDate The start of the date range
		 * @param {sap.ui.unified.calendar.CalendarDate} oEndDate The end of the date range
		 * @param {boolean} inclusive If true the given date interval is closed (includes the endpoints), otherwise the
		 * given date interval is open(excludes the endpoints)
		 * @returns {boolean} True if the given date is between the start and end date of the range(inclusive), false otherwise
		 * @throws Will throw an error if the arguments are null or are not of the correct type
		 * @private
		 */
		CalendarUtils._isBetween = function (oDate, oStartDate, oEndDate, inclusive) {
			this._checkCalendarDate(oDate);
			this._checkCalendarDate(oStartDate);
			this._checkCalendarDate(oEndDate);

			if (inclusive) {
				return oDate.isSameOrAfter(oStartDate) && oDate.isSameOrBefore(oEndDate);
			} else {
				return oDate.isAfter(oStartDate) && oDate.isBefore(oEndDate);
			}
		};

		/**
		 * Calculates the difference between two calendar dates in days.
		 * @param {sap.ui.unified.calendar.CalendarDate} oFirstDate the first date
		 * @param {sap.ui.unified.calendar.CalendarDate} oSecondDate the second date
		 * @returns {int} days (positive or negative) corresponding to the delta between oFirstDate and oSecondDate
		 * @throws Will throw an error if the arguments are null or are not of the correct type.
		 * @private
		 */
		CalendarUtils._daysBetween = function (oFirstDate, oSecondDate) {
			this._checkCalendarDate(oFirstDate);
			this._checkCalendarDate(oSecondDate);

			return Math.ceil((oFirstDate.valueOf() - oSecondDate.valueOf()) / (this.HOURS24));
		};

		/**
		 * Check if given date does not match given date range.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate the date to check.
		 * @param {sap.ui.unified.calendar.CalendarDate} oStartCalendarDate the start of the date range
		 * @param {sap.ui.unified.calendar.CalendarDate} oEndCalendarDate the end of the date range
		 * @returns {boolean} true if the given date is between the start and end date of the range(inclusive), false otherwise.
		 * @throws Will throw an error if the arguments are null or are not of the correct type.
		 * @private
		 */
		CalendarUtils._isOutside = function (oCalendarDate, oStartCalendarDate, oEndCalendarDate) {
			return !this._isBetween(oCalendarDate, oStartCalendarDate, oEndCalendarDate, true);
		};

		/**
		 * Checks if given first date has the same month, year and era as the given second date.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate1 the first date
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate2 the second date
		 * @return {boolean} true if month, year and era matches for both given dates, false otherwise
		 * @throws Will throw an error if the arguments are null or are not of the correct type.
		 * @private
		 */
		CalendarUtils._isSameMonthAndYear = function(oCalendarDate1, oCalendarDate2) {
			this._checkCalendarDate(oCalendarDate1);
			this._checkCalendarDate(oCalendarDate2);

			return oCalendarDate1.getEra() === oCalendarDate2.getEra()
				&& oCalendarDate1.getYear() === oCalendarDate2.getYear()
				&& oCalendarDate1.getMonth() === oCalendarDate2.getMonth();
		};

		/**
		 * Checks if given date is non null and of type sap.ui.unified.calendar.CalendarDate.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate the date to check
		 * @throws Will throw an error if the argument is null or is not of the correct type.
		 * @private
		 */
		CalendarUtils._checkCalendarDate = function (oCalendarDate) {
			if (!oCalendarDate || !(oCalendarDate instanceof CalendarDate)) {
				throw "Invalid calendar date: [" + oCalendarDate + "]. Expected: sap.ui.unified.calendar.CalendarDate";
			}
		};

		/**
		* Returns week information for given calendar date.
		* @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate The date whose week wll be returned
		* @return {object} Week information - year and week, for given calendar date
		* @private
		*/
		CalendarUtils._getWeek = function (oCalendarDate) {
			this._checkCalendarDate(oCalendarDate);
			return UniversalDate.getWeekByDate(oCalendarDate.getCalendarType(), oCalendarDate.getYear(), oCalendarDate.getMonth(), oCalendarDate.getDate());
		};

		/**
		 * Evaluates whether the given date is part of the weekend.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalDate The date to be checked
		 * @param {sap.ui.core.LocaleData} oLocaleData locale date for the used locale
		 * @return {boolean} True if the date is part of the weekend
		 * @private
		 */
		CalendarUtils._isWeekend = function (oCalDate, oLocaleData) {
			var iDay = oCalDate.getDay();

			return iDay === oLocaleData.getWeekendStart() || iDay === oLocaleData.getWeekendEnd();
		};

		return CalendarUtils;

	}, /* bExport= */ true);