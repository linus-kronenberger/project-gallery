/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.unified.calendar.CalendarDate
sap.ui.define([
	'sap/ui/base/Object',
	'sap/ui/core/date/UniversalDate',
	'sap/ui/core/date/UI5Date'
],
	function(BaseObject, UniversalDate, UI5Date) {
		"use strict";

		/*
		 * All calculations in this class are done by representing the date(year, month, date) as UTC values for an
		 * internal UI5Date or JavaScript Date object.
		 */

		/**
		 * Constructor for CalendarDate
		 *
		 * @class
		 * Lightweight container for calendar date. It is a timezone agnostic and contains an year, month and date.
		 * The difference between this class and the UI5Date or JavaScript Date object is: <br/>
		 * <ul>
		 *     <li>it does not contain the time part</li>
		 *     <li>year is always considered as full year, i.e. year 10 means 10, not 1910.</li>
		 * </ul>
		 *
		 * The constructor accepts the following parameters:
		 * <ul>
		 *     <li>CalendarDate(oCalendarDate) - Creates new CalendarDate by copying it from other CalendarDate</li>
		 *
		 *     <li>CalendarDate(oCalendarDate, sCalendarType) - Creates new CalendarDate by copying it from the given
		 *     CalendarDate, but for the given sCalendarType. For calendar types, check sap/base/i18n/date/CalendarType</li>
		 *
		 *     <li>CalendarDate(iYear, iMonth, iDate) - Creates new CalendarDate for the given year, month(0 based) and
		 *     date. The parameters are considered as Gregorian. Once the CalendarDate is created, getters for year, month
		 *     and date returns values according to the current (configuration based) calendar.</li>
		 *
		 *     <li>CalendarDate(iYear, iMonth, iDate, calendarType) - Creates new CalendarDate for the given year, month
		 *     (0 based), date and calendar type. The year, month and date parameters are considered as Gregorian. Once
		 *     the CalendarDate is created, getters for year, month and date returns values according to the given calendar.</li>
		 * </ul>
		 *
		 * This class is used for internal purposes inside calendar related controls. Standalone usage is not supported.
		 * The class is a wrapper of sap.ui.core.date.UniversalDate, which means that all of the functions are calendar aware.
		 *
		 * @private
		 * @alias sap.ui.unified.calendar.CalendarDate
		 */
		var CalendarDate = BaseObject.extend("sap.ui.unified.calendar.CalendarDate", /** @lends sap.ui.unified.calendar.CalendarDate.prototype */ {
			constructor: function () {
				var aArgs = arguments,
					oJSDate, oNow, sCalendarType;

				switch (aArgs.length) {
					case 0: // defaults to the current date
						oNow = UI5Date.getInstance();
						return CalendarDate.call(this, oNow.getFullYear(), oNow.getMonth(), oNow.getDate());

					case 1: // CalendarDate
					case 2: // CalendarDate, sCalendarType
						if (!(aArgs[0] instanceof CalendarDate)) {
							throw "Invalid arguments: the first argument must be of type sap.ui.unified.calendar.CalendarDate.";
						}
						sCalendarType = aArgs[1] ? aArgs[1] : aArgs[0]._oUDate.sCalendarType;
						//Use source.valueOf() (returns the same point of time regardless calendar type) instead of
						//source's getters to avoid non-gregorian Year, Month and Date may be used to construct a Gregorian date
						oJSDate = UI5Date.getInstance(aArgs[0].valueOf());

						//Make this date really local. Now getters are safe.
						oJSDate.setFullYear(oJSDate.getUTCFullYear(), oJSDate.getUTCMonth(), oJSDate.getUTCDate());
						oJSDate.setHours(oJSDate.getUTCHours(), oJSDate.getUTCMinutes(), oJSDate.getUTCSeconds(), oJSDate.getUTCMilliseconds());

						this._oUDate = createUniversalUTCDate(oJSDate, sCalendarType);
						break;

					case 3: // year, month, date
					case 4: // year, month, date, sCalendarType
						checkNumericLike(aArgs[0], "Invalid year: " + aArgs[0]);
						checkNumericLike(aArgs[1], "Invalid month: " + aArgs[1]);
						checkNumericLike(aArgs[2], "Invalid date: " + aArgs[2]);

						oJSDate = UI5Date.getInstance(0,0,1);
						oJSDate.setFullYear(aArgs[0], aArgs[1], aArgs[2]); // 2 digits year is not supported. If so, it is considered as full year as well.

						if (aArgs[3]) {
							sCalendarType = aArgs[3];
						}
						this._oUDate = createUniversalUTCDate(oJSDate, sCalendarType);
						break;

					default:
						throw "Invalid arguments. Accepted arguments are: 1) oCalendarDate, (optional)calendarType" +
						"or 2) year, month, date, (optional) calendarType" + aArgs;
				}
			}
		});

		/**
		 * Retrieves the year.
		 * @returns {number} the year. Short format for year (2 digits) is not supported. This means that if the current year is 10,
		 * this method will return 10.
		 */
		CalendarDate.prototype.getYear = function () {
			return this._oUDate.getUTCFullYear();
		};

		/**
		 * Sets an year.
		 * @param {int} year Short format for year (2 digits) is not supported. This means that if 10 is given, this will
		 * be considered as year 10, not 1910, as in JS Date.
		 * @returns {this} <code>this</code> for method chaining.
		 */
		CalendarDate.prototype.setYear = function (year) {
			checkNumericLike(year, "Invalid year: " + year);
			this._oUDate.setUTCFullYear(year);
			return this;
		};

		/**
		 * Retrieves the month of an year.
		 * @returns {number} zero based month in the range 0-11.
		 */
		CalendarDate.prototype.getMonth = function () {
			return this._oUDate.getUTCMonth();
		};

		/**
		 * Sets the given month as ordinal month of the year.
		 * @param {int} month An integer between 0 and 11, representing the months January through December( or their
		 * equivalent month names for the given calendar).
		 * If the specified value is is outside of the expected range, this method attempts to update the date information
		 * accordingly. For example, if 12 is given as a month, the year will be incremented by 1, and 1 will be used for month.
		 * @param {int} [date] An integer between 1 and 31, representing the day of the month, but other values are allowed.
		 * 0 will result in the previous month's last day.
		 * -1 will result in the day before the previous month's last day.
		 * 32 will result in:
		 * - first day of the next month if the current month has 31 days.
		 * - second day of the next month if the current month has 30 days.
		 * Other value will result in adding or subtracting days according to the given value.
		 * @returns {this} <code>this</code> for method chaining.
		 */
		CalendarDate.prototype.setMonth = function (month, date) {
			checkNumericLike(month, "Invalid month: " + month);
			if (date || date === 0) {
				checkNumericLike(date, "Invalid date: " + date);
				this._oUDate.setUTCMonth(month, date);
			} else {
				this._oUDate.setUTCMonth(month);
			}
			return this;
		};

		/**
		 * Retrieves the ordinal date of a month.
		 * @returns {number} date of the month
		 */
		CalendarDate.prototype.getDate = function () {
			return this._oUDate.getUTCDate();
		};

		/**
		 * Sets the given date as an ordinal date of the month.
		 * @param {int} date An integer between certain date range for the current month. If the given date value is outside
		 * the valid date range for the current month, this method attempts to update the date information accordingly.
		 * For example, if the month has 30 days and 31 is given as a date, the month will be incremented by 1, and 1 will be used for date.
		 * Also if 0 is given for a date, the month will be decremented by 1, and the date will be set to the last date of that previous month.
		 * @returns {this} <code>this</code> for method chaining.
		 */
		CalendarDate.prototype.setDate = function (date) {
			checkNumericLike(date, "Invalid date: " + date);
			this._oUDate.setUTCDate(date);
			return this;
		};

		/**
		 * Retrieves the day of week.
		 * @returns {int} the number (0-6) representing the day of week.
		 */
		CalendarDate.prototype.getDay = function() {
			return this._oUDate.getUTCDay();
		};

		/**
		 * Retrieves the calendar type associated with this instance;
		 * @returns {module:sap/base/i18n/date/CalendarType} the calendar type
		 */
		CalendarDate.prototype.getCalendarType = function() {
			return this._oUDate.sCalendarType;
		};

		/**
		 * Retrieves the date era.
		 * @returns {int} era
		 */
		CalendarDate.prototype.getEra = function() {
			return this._oUDate.getUTCEra();
		};

		/**
		 * Compares the current date to the given date.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate to compare with.
		 * @returns {boolean} true if the current date preceds the given calendar date, false otherwise
		 */
		CalendarDate.prototype.isBefore = function (oCalendarDate) {
			checkCalendarDate(oCalendarDate);
			return this.valueOf() < oCalendarDate.valueOf();
		};

		/**
		 * Compares the current date to the given.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate to compare with.
		 * @returns {boolean} true if the current date follows the given calendar date, false otherwise.
		 */
		CalendarDate.prototype.isAfter = function (oCalendarDate) {
			checkCalendarDate(oCalendarDate);
			return this.valueOf() > oCalendarDate.valueOf();
		};

		/**
		 * Compares the current date to the given date.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate to compare with.
		 * @returns {boolean} true if the current date equals or precedes the given calendar date, false otherwise
		 */
		CalendarDate.prototype.isSameOrBefore = function (oCalendarDate) {
			checkCalendarDate(oCalendarDate);
			return this.valueOf() <= oCalendarDate.valueOf();
		};

		/**
		 * Compares the current date to the given.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate to compare with.
		 * @returns {boolean} true if the current date equals or follows the given calendar date, false otherwise.
		 */
		CalendarDate.prototype.isSameOrAfter = function (oCalendarDate) {
			checkCalendarDate(oCalendarDate);
			return this.valueOf() >= oCalendarDate.valueOf();
		};

		/**
		 * Compares the current date to the given.
		 * @param {sap.ui.unified.calendar.CalendarDate} oCalendarDate to compare with.
		 * @returns {boolean} true if the current date equals the given calendar date, false otherwise.
		 */
		CalendarDate.prototype.isSame = function (oCalendarDate) {
			checkCalendarDate(oCalendarDate);
			return this.valueOf() === oCalendarDate.valueOf();
		};

		/**
		 * Converts the underlying sap.ui.unified.calendar.CalendarDate to a JavaScript Gregorian date by setting its time part to zero.
		 * For example if the date is 2017-01-10, this method will return JSDate object like: 2017-01-10 00:00:00 local time.
		 * @returns {Date|module:sap/ui/core/date/UI5Date} the date instance corresponding to the underlying calendar date
		 */
		CalendarDate.prototype.toLocalJSDate = function () {
			// Use this._oUDate.getTime()(returns the same point of time regardless calendar type)  instead of
			// this._oUDate's getters to avoid non-gregorian Year, Month and Date to be used to construct a Gregorian date
			var oLocalDate = UI5Date.getInstance(this._oUDate.getTime());

			//Make this date really local. Now getters are safe.
			oLocalDate.setFullYear(oLocalDate.getUTCFullYear(), oLocalDate.getUTCMonth(), oLocalDate.getUTCDate());
			oLocalDate.setHours(0, 0, 0, 0);

			return oLocalDate;
		};

		/**
		 * Converts the underlying sap.ui.unified.calendar.CalendarDate to a JavaScript Gregorian date by setting its time part to zero.
		 * For example if the date is 2017-01-10, this method will return JSDate object like: 2017-01-10 00:00:00 utc time.
		 * @returns {Date|module:sap/ui/core/date/UI5Date} the date instance corresponding to the underlying calendar date
		 */
		CalendarDate.prototype.toUTCJSDate = function () {
			// Use this._oUDate.getTime()(returns the same point of time regardless calendar type)  instead of
			// this._oUDate's getters to avoid non-gregorian Year, Month and Date to be used to construct a Gregorian date
			var oUTCDate = UI5Date.getInstance(this._oUDate.getTime());
			oUTCDate.setUTCHours(0, 0, 0, 0);

			return oUTCDate;
		};

		/**
		 * Retrieves the string representation of the current instance.
		 * @returns {string} a string representing the current CalendarDate object.
		 */
		CalendarDate.prototype.toString = function () {
			return this._oUDate.sCalendarType + ": " + this.getYear() + "/" + (this.getMonth() + 1) + "/" + this.getDate();
		};

		/**
		 * Retrieves the primitive representation of the object.
		 * @returns {number} the number representing this object.
		 */
		CalendarDate.prototype.valueOf = function () {
			return this._oUDate.getTime();
		};

		/**
		 * Creates an instance from a local date information of a UI5Date or JavaScript Date. Time related information is cut.
		 * For example, if this method is called with UI5Date or JavaScript Date "2017-12-21 01:00:00 GMT +02:00", the returned result would be "2017-12-21"
		 * despite that the given UI5Date or JavaScript Date corresponds to "2017-12-20 23:00:00 GMT".
		 * @param {Date|module:sap/ui/core/date/UI5Date} oJSDate a date instance
		 * @param {module:sap/base/i18n/date/CalendarType} [sCalendarType] to be used. If not specified, the calendar type from configuration will be used.
		 * For more details on the Configuration, please check sap.ui.core.Configuration#getCalendarType
		 * @returns {sap.ui.unified.calendar.CalendarDate} the calendar date corresponding to the given UI5Date or JavaScript Date.
		 */
		CalendarDate.fromLocalJSDate = function (oJSDate, sCalendarType) {
			// Cross frame check for a date should be performed here otherwise setDateValue would fail in OPA tests
			// because Date object in the test is different than the Date object in the application (due to the iframe).
			if (!oJSDate || Object.prototype.toString.call(oJSDate) !== "[object Date]" || isNaN(oJSDate)) {
				throw new Error("Date parameter must be a JavaScript or UI5Date date object: [" + oJSDate + "].");
			}
			return new CalendarDate(oJSDate.getFullYear(), oJSDate.getMonth(), oJSDate.getDate(), sCalendarType);
		};

		/* The UTC components of a UI5Date or JavaScript Date are used to create a CalendarDate */
		CalendarDate.fromUTCDate = function (oJSDate, sCalendarType) {
			// Cross frame check for a date should be performed here otherwise setDateValue would fail in OPA tests
			// because Date object in the test is different than the Date object in the application (due to the iframe).
			if (!oJSDate || Object.prototype.toString.call(oJSDate) !== "[object Date]" || isNaN(oJSDate)) {
				throw new Error("Date parameter must be a JavaScript or UI5Date date object: [" + oJSDate + "].");
			}
			return new CalendarDate(oJSDate.getUTCFullYear(), oJSDate.getUTCMonth(), oJSDate.getUTCDate(), sCalendarType);
		};

		/**
		 * Creates an UniversalDate corresponding to the given date and calendar type.
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate date instance to create the UniversalDate from. Local date information is used.
		 * @param {module:sap/base/i18n/date/CalendarType} sCalendarType The type to be used. If not specified, the calendar type from configuration will be used.
		 * For more details on the Configuration, please check sap.ui.core.Configuration#getCalendarType
		 * @returns {sap.ui.core.date.UniversalDate} The created date
		 */
		function createUniversalUTCDate(oDate, sCalendarType) {
			if (sCalendarType) {
				return UniversalDate.getInstance(createUTCDate(oDate), sCalendarType);
			} else {
				return new UniversalDate(createUTCDate(oDate).getTime());
			}
		}

		/**
		 * Creates a UI5Date or JavaScript UTC date corresponding to the given UI5Date or JavaScript Date.
		 * @param {Date|module:sap/ui/core/date/UI5Date} oDate date instance. Time related information is cut.
		 * @returns {Date|module:sap/ui/core/date/UI5Date} date instance created from the date object, but this time considered as UTC date information.
		 */
		function createUTCDate(oDate) {
			var oUTCDate = UI5Date.getInstance(Date.UTC(0, 0, 1));

			oUTCDate.setUTCFullYear(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());

			return oUTCDate;
		}

		function checkCalendarDate(oCalendarDate) {
			if (!(oCalendarDate instanceof CalendarDate)) {
				throw "Invalid calendar date: [" + oCalendarDate + "]. Expected: sap.ui.unified.calendar.CalendarDate";
			}
		}

		/**
		 * Verifies the given value is numeric like, i.e. 3, "3" and throws an error if it is not.
		 * @param {any} value The value of any type to check. If null or undefined, this method throws an error.
		 * @param {string} message The message to be used if an error is to be thrown
		 * @throws will throw an error if the value is null or undefined or is not like a number
		 */
		function checkNumericLike(value, message) {
			if (value == undefined || value === Infinity || isNaN(value)) {//checks also for null.
				throw message;
			}
		}

		return CalendarDate;

});