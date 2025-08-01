/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides control sap.ui.unified.CalendarTimeInterval.
sap.ui.define([
	"sap/base/i18n/Formatting",
	"sap/base/i18n/date/CalendarType",
	'sap/ui/core/Control',
	"sap/ui/core/Element",
	"sap/ui/core/Lib",
	'sap/ui/core/LocaleData',
	'sap/ui/core/delegate/ItemNavigation',
	'sap/ui/unified/calendar/CalendarUtils',
	'sap/ui/core/date/UniversalDate',
	'sap/ui/unified/library',
	'sap/ui/core/format/DateFormat',
	'sap/ui/core/Locale',
	"./TimesRowRenderer",
	"sap/ui/dom/containsOrEquals",
	"sap/base/util/deepEqual",
	"sap/ui/thirdparty/jquery",
	"sap/ui/unified/DateRange",
	"sap/ui/core/date/UI5Date",
	'sap/ui/core/InvisibleText'
], function(
	Formatting,
	_CalendarType, // type of `primaryCalendarType` and `secondaryCalendarType`
	Control,
	Element,
	Library,
	LocaleData,
	ItemNavigation,
	CalendarUtils,
	UniversalDate,
	library,
	DateFormat,
	Locale,
	TimesRowRenderer,
	containsOrEquals,
	deepEqual,
	jQuery,
	DateRange,
	UI5Date,
	InvisibleText
) {
	"use strict";

	/*
	 * <code>UniversalDate</code> objects are used inside the <code>TimesRow</code>, whereas UI5Date or JavaScript dates are used in the API.
	 * This means that a conversion must be performed for the API functions.
	 */

	/**
	 * Constructor for a new <code>TimesRow</code>.
	 * It shows a calendar with time granularity (normally hours)
	 *
	 * <b>Note:</b> This is used inside the CalendarTimeInterval, not for standalone usage.
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Renders a row of time items using ItemNavigation. There is no paging or navigation outside the rendered area implemented.
	 * This is done inside the CalendarTimeInterval.
	 * If used inside the CalendarTimeInterval the properties and aggregation are directly taken from the parent
	 * (to not duplicate and synchronize DateRanges and so on...).
	 *
	 * The TimesRow works with UI5Date or JavaScript Date objects.
	 * @extends sap.ui.core.Control
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.32.0
	 * @alias sap.ui.unified.calendar.TimesRow
	 */
	var TimesRow = Control.extend("sap.ui.unified.calendar.TimesRow", /** @lends sap.ui.unified.calendar.TimesRow.prototype */ { metadata : {

		library : "sap.ui.unified",
		properties : {
			/**
			 * A date as UI5Date or JavaScript Date object. The month including this date is rendered and this date is focused initially (if no other focus is set).
			 * If the date property is not in the range <code>startDate</code> + <code>items</code> in the rendering phase,
			 * it is set to the <code>startDate</code>.
			 * So after setting the <code>startDate</code> the date should be set to be in the visible range.
			 */
			date : {type : "object", group : "Data"},

			/**
			 * Start date, as UI5Date or JavaScript Date object, of the row.
			 */
			startDate : {type : "object", group : "Data"},

			/**
			 * Number of time items displayed
			 */
			items : {type : "int", group : "Appearance", defaultValue : 12},

			/**
			 * Size of on time interval in minutes, default is 60 minutes.
			 *
			 * <b>Note:</b> the start of the interval calculation is always <code>startDat</code> at 00:00.
			 *
			 * An interval longer than 720 minutes is not allowed. Please use the <code>DatesRow</code> instead.
			 *
			 * A day must be divisible by this interval size. One interval must not include more than one day.
			 */
			intervalMinutes : {type : "int", group : "Appearance", defaultValue : 60},

			/**
			 * If set, interval selection is allowed
			 */
			intervalSelection : {type : "boolean", group : "Behavior", defaultValue : false},

			/**
			 * If set, only a single month or interval, if intervalSelection is enabled, can be selected
			 *
			 * <b>Note:</b> Selection of multiple intervals is not supported in the current version.
			 */
			singleSelection : {type : "boolean", group : "Behavior", defaultValue : true},

			/**
			 * If set, a header with the years is shown to visualize what month belongs to what year.
			 */
			showHeader : {type : "boolean", group : "Appearance", defaultValue : false},

			/**
			 * If set, the calendar type is used for display.
			 * If not set, the calendar type of the global configuration is used.
			 * @private
			 * @ui5-restricted sap.ui.unified.TimesRow
			 * @since 1.108.0
			 */
			primaryCalendarType : {type : "sap.base.i18n.date.CalendarType", group : "Appearance"},

			/**
			 * If set, the days are also displayed in this calendar type
			 * If not set, the dates are only displayed in the primary calendar type
			 * @private
			 * @ui5-restricted sap.ui.unified.TimesRow
			 * @since 1.109.0
			 */
			secondaryCalendarType : {type : "sap.base.i18n.date.CalendarType", group : "Appearance"}
		},
		aggregations : {

			/**
			 * Date ranges for selected dates.
			 * If <code>singleSelection</code> is set, only the first entry is used.
			 */
			selectedDates : {type : "sap.ui.unified.DateRange", multiple : true, singularName : "selectedDate"},

			/**
			 * Date ranges with type to visualize special item in the row.
			 * If one day is assigned to more than one type, only the first one will be used.
			 */
			specialDates : {type : "sap.ui.unified.DateTypeRange", multiple : true, singularName : "specialDate"}
		},
		associations: {

			/**
			 * Association to controls / IDs which label this control (see WAI-ARIA attribute aria-labelledby).
			 */
			ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" },

			/**
			 * Association to the <code>CalendarLegend</code> explaining the colors of the <code>specialDates</code>.
			 *
			 * <b>Note</b> The legend does not have to be rendered but must exist, and all required types must be assigned.
			 * @since 1.38.5
			 */
			legend: { type: "sap.ui.unified.CalendarLegend", multiple: false}
		},
		events : {

			/**
			 * Time selection changed
			 */
			select : {},

			/**
			 * Time focus changed
			 */
			focus : {
				parameters : {
					/**
					 * date, as UI5Date or JavaScript Date object, of the focused time.
					 */
					date : {type : "object"},
					/**
					 * If set, the focused date is not rendered yet. (This happens by navigating out of the visible area.)
					 */
					notVisible : {type : "boolean"}
				}
			}
		}
	}, renderer: TimesRowRenderer});

	TimesRow.prototype.init = function(){

		this._oFormatYyyyMMddHHmm = DateFormat.getInstance({pattern: "yyyyMMddHHmm", calendarType: this.getProperty("primaryCalendarType")});
		this._oFormatLong = DateFormat.getDateTimeInstance({style: "long/short", calendarType: this.getProperty("primaryCalendarType")});
		this._oFormatDate = DateFormat.getDateInstance({style: "medium", calendarType: this.getProperty("primaryCalendarType")});

		this._mouseMoveProxy = jQuery.proxy(this._handleMouseMove, this);

		this._rb = Library.getResourceBundleFor("sap.ui.unified");

	};

	TimesRow.prototype.exit = function(){

		if (this._oItemNavigation) {
			this.removeDelegate(this._oItemNavigation);
			this._oItemNavigation.destroy();
			delete this._oItemNavigation;
		}

		if (this._invisibleDayHint) {
			this._invisibleDayHint.destroy();
			this._invisibleDayHint = null;
		}
	};

	TimesRow.prototype.onAfterRendering = function(){

		_initItemNavigation.call(this);

	};

	TimesRow.prototype.onsapfocusleave = function(oEvent){

		if (!oEvent.relatedControlId || !containsOrEquals(this.getDomRef(), Element.getElementById(oEvent.relatedControlId).getFocusDomRef())) {
			if (this._bMouseMove) {
				_unbindMousemove.call(this, true);

				_selectTime.call(this, this._getDate());
				this._bMoveChange = false;
				this._bMousedownChange = false;
				_fireSelect.call(this);
			}

			if (this._bMousedownChange) {
				// mouseup somewhere outside of control -> if focus left finish selection
				this._bMousedownChange = false;
				_fireSelect.call(this);
			}
		}

	};

	// overwrite removing of date ranged because invalidate don't get information about it
	TimesRow.prototype.removeAllSelectedDates = function() {

		this._bDateRangeChanged = true;
		var aRemoved = this.removeAllAggregation("selectedDates");
		return aRemoved;

	};

	TimesRow.prototype.destroySelectedDates = function() {

		this._bDateRangeChanged = true;
		var oDestroyed = this.destroyAggregation("selectedDates");
		return oDestroyed;

	};

	TimesRow.prototype.removeAllSpecialDates = function() {

		this._bDateRangeChanged = true;
		var aRemoved = this.removeAllAggregation("specialDates");
		return aRemoved;

	};

	TimesRow.prototype.destroySpecialDates = function() {

		this._bDateRangeChanged = true;
		var oDestroyed = this.destroyAggregation("specialDates");
		return oDestroyed;

	};

	TimesRow.prototype.setIntervalMinutes = function(iMinutes){

		if (iMinutes >= 720) {
			throw new Error("Only intervals < 720 minutes are allowed; " + this);
		}

		if (1440 % iMinutes > 0) {
			throw new Error("A day must be divisible by the interval size; " + this);
		}

		this.setProperty("intervalMinutes", iMinutes, false); // rerender

		this._oFormatTime = undefined; // could change

		return this;

	};

	/**
	 * Setter for the <code>date</code> property.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oDate A date instance
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	TimesRow.prototype.setDate = function(oDate){

		_changeDate.call(this, oDate, false);

		return this.setProperty("date", oDate);

	};

	/**
	 * Returns a Date in UTC timezone from local timezone
	 * @returns {sap.ui.core.date.UniversalDate} Date in UTC timezone
	 * @private
	 */
	TimesRow.prototype._getDate = function(){

		if (!this._oUTCDate) {
			this._oUTCDate = CalendarUtils._createUniversalUTCDate(UI5Date.getInstance(), undefined, true);
		}

		return this._oUTCDate;

	};

	/**
	 * Sets start date, as UI5Date or JavaScript Date object, of the row.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oStartDate A date instance
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	TimesRow.prototype.setStartDate = function(oStartDate){

		CalendarUtils._checkJSDateObject(oStartDate);

		var iYear = oStartDate.getFullYear();
		CalendarUtils._checkYearInValidRange(iYear);

		var oUTCDate = CalendarUtils._createUniversalUTCDate(oStartDate, undefined, true);
		this.setProperty("startDate", oStartDate);
		this._oUTCStartDate = this._getIntervalStart(oUTCDate);

		if (this.getDomRef()) {
			var oOldDate = CalendarUtils._createLocalDate(this._getDate(), true);
			this._bNoRangeCheck = true;
			this.displayDate(oStartDate); // don't set focus
			this._bNoRangeCheck = false;
			if (oOldDate && this.checkDateFocusable(oOldDate)) {
				this.displayDate(oOldDate);
			}
		}
		return this;

	};

	/**
	 * Returns the start of the corresponding interval date.
	 * @returns {sap.ui.core.date.UniversalDate} Date in UTC timezone
	 * @private
	 */
	TimesRow.prototype._getStartDate = function(){

		if (!this._oUTCStartDate) {
			this._oUTCStartDate = CalendarUtils._createUniversalUTCDate(UI5Date.getInstance(), undefined, true);
			this._oUTCStartDate = this._getIntervalStart(this._oUTCStartDate);
		}

		return this._oUTCStartDate;
	};

	/**
	 * Displays the given date without setting the focus.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oDate A date instance
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	TimesRow.prototype.displayDate = function(oDate){

		_changeDate.call(this, oDate, true);

		return this;

	};

	/*
	 * Use rendered locale for stand alone control
	 * But as Calendar can have an own locale, use this one if used inside Calendar
	 */
	TimesRow.prototype._getLocale = function(){

		var oParent = this.getParent();

		if (oParent && oParent.getLocale) {
			return oParent.getLocale();
		} else if (!this._sLocale) {
			this._sLocale = new Locale(Formatting.getLanguageTag()).toString();
		}

		return this._sLocale;

	};

	/*
	 * gets localeData for used locale
	 * Use rendered locale for stand alone control
	 * But as Calendar can have an own locale, use this one if used inside Calendar
	 */
	TimesRow.prototype._getLocaleData = function(){

		var oParent = this.getParent();

		if (oParent && oParent._getLocaleData) {
			return oParent._getLocaleData();
		} else if (!this._oLocaleData) {
			var sLocale = this._getLocale();
			var oLocale = new Locale(sLocale);
			this._oLocaleData = LocaleData.getInstance(oLocale);
		}

		return this._oLocaleData;

	};

	/*
	 * get format for long date output depending on used locale
	 */
	TimesRow.prototype._getFormatLong = function(){

		var sLocale = this._getLocale();

		if (this._oFormatLong.oLocale.toString() != sLocale) {
			var oLocale = new Locale(sLocale);
			this._oFormatLong = DateFormat.getDateTimeInstance({style: "long/short", calendarType: this.getProperty("primaryCalendarType")}, oLocale);
		}

		return this._oFormatLong;

	};

	/*
	 * get format for time output depending on used locale
	 */
	TimesRow.prototype._getFormatTime = function(){

		var sLocale = this._getLocale();

		if (!this._oFormatTime || this._oFormatTime.oLocale.toString() != sLocale) {
			var oLocale = new Locale(sLocale);
			var iIntervalMinutes = this.getIntervalMinutes();
			var oLocaleData = this._getLocaleData();
			var sPattern;
			var sTimeFormatShort = oLocaleData.getTimePattern("short");
			this._oFormatTimeAmPm = undefined;

			// don't display minutes
			if (iIntervalMinutes % 60 == 0) {
				//sPattern determines whether the shown format will be 12 or 24 hrs
				sPattern = _getPreferredHourSymbol(sTimeFormatShort);

				if (sTimeFormatShort.search("a") >= 0) {
					// AP/PM indicator used
					this._oFormatTimeAmPm = DateFormat.getTimeInstance({pattern: "a", calendarType: this.getProperty("primaryCalendarType")}, oLocale);
				}
			} else {
				sPattern = sTimeFormatShort;
				// no leading zeros
				sPattern = sPattern.replace("HH", "H");
				sPattern = sPattern.replace("hh", "h");
				if (sPattern.search("a") >= 0) {
					// AP/PM indicator used
					this._oFormatTimeAmPm = DateFormat.getTimeInstance({pattern: "a", calendarType: this.getProperty("primaryCalendarType")}, oLocale);
					sPattern = sPattern.replace("a", "").trim();
				}
			}
			this._oFormatTime = DateFormat.getTimeInstance({pattern: sPattern, calendarType: this.getProperty("primaryCalendarType")}, oLocale);
		}

		return this._oFormatTime;

	};

	/*
	 * get format for date output depending on used locale
	 */
	TimesRow.prototype._getFormatDate = function(){

		var sLocale = this._getLocale();

		if (this._oFormatDate.oLocale.toString() != sLocale) {
			var oLocale = new Locale(sLocale);
			this._oFormatDate = DateFormat.getDateInstance({style: "medium", calendarType: this.getProperty("primaryCalendarType")}, oLocale);
		}

		return this._oFormatDate;

	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype.getIntervalSelection = function(){

		var oParent = this.getParent();

		if (oParent && oParent.getIntervalSelection) {
			return oParent.getIntervalSelection();
		} else {
			return this.getProperty("intervalSelection");
		}

	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype.getSingleSelection = function(){

		var oParent = this.getParent();

		if (oParent && oParent.getSingleSelection) {
			return oParent.getSingleSelection();
		} else {
			return this.getProperty("singleSelection");
		}

	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype.getSelectedDates = function(){

		var oParent = this.getParent();

		if (oParent && oParent.getSelectedDates) {
			return oParent.getSelectedDates();
		} else {
			return this.getAggregation("selectedDates", []);
		}

	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype.getSpecialDates = function(){

		var oParent = this.getParent();

		if (oParent && oParent.getSpecialDates) {
			return oParent.getSpecialDates();
		} else {
			return this.getAggregation("specialDates", []);
		}

	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype._getShowHeader = function(){

		var oParent = this.getParent();

		if (oParent && oParent._getShowItemHeader) {
			return oParent._getShowItemHeader();
		} else {
			return this.getProperty("showHeader");
		}

	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype.getIntervalMinutes = function(){

		var oParent = this.getParent();

		if (oParent && oParent.getIntervalMinutes) {
			return oParent.getIntervalMinutes();
		} else {
			return this.getProperty("intervalMinutes");
		}

	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype.getAriaLabelledBy = function(){

		var oParent = this.getParent();

		if (oParent && oParent.getAriaLabelledBy) {
			return oParent.getAriaLabelledBy();
		} else {
			return this.getAssociation("ariaLabelledBy", []);
		}

	};

	/**
	 * Sets the parent control instance which contains the legend
	 * to the TimesRow control instance
	 * @ui5-restricted sap.m.PlanningCalendar
	 * @private
	 * @param {*} oControl containing the legend
	 */
	TimesRow.prototype._setLegendControlOrigin = function (oControl) {
		this._oLegendControlOrigin = oControl;
	};

	/*
	 * if used inside CalendarTimeInterval get the value from the parent
	 * To don't have sync issues...
	 */
	TimesRow.prototype.getLegend = function(){

		var oParent = this.getParent();

		if (this._oLegendControlOrigin) {
			return this._oLegendControlOrigin.getLegend();
		}

		if (oParent && oParent.getLegend) {
			return oParent.getLegend();
		} else {
			return this.getAssociation("legend");
		}

	};

	/*
	 * Checks if a date is selected and what kind of selected
	 * @returns {int} iSelected 0: not selected; 1: single day selected, 2: interval start, 3: interval end, 4: interval between, 5: one day interval (start = end)
	 * @private
	 */
	TimesRow.prototype._checkDateSelected = function(oDate){

		if (!(oDate instanceof UniversalDate)) {
			throw new Error("Date must be a UniversalDate object " + this);
		}

		var iSelected = 0;
		var aSelectedDates = this.getSelectedDates();
		var oMyDate = new UniversalDate(oDate.getTime());
		oMyDate = this._getIntervalStart(oMyDate);
		var oTimeStamp = oMyDate.getTime();

		for ( var i = 0; i < aSelectedDates.length; i++) {
			// initalize the time part of the start and end time
			var oRange = aSelectedDates[i];
			var oStartDate = oRange.getStartDate();
			var oStartTimeStamp = 0;
			if (oStartDate) {
				oStartDate = CalendarUtils._createUniversalUTCDate(oStartDate, undefined, true);
				oStartDate = this._getIntervalStart(oStartDate);
				oStartTimeStamp = oStartDate.getTime();
			}
			var oEndDate = oRange.getEndDate();
			var oEndTimeStamp = 0;
			if (oEndDate) {
				oEndDate = CalendarUtils._createUniversalUTCDate(oEndDate, undefined, true);
				oEndDate = this._getIntervalStart(oEndDate);
				oEndTimeStamp = oEndDate.getTime();
			}

			if (oTimeStamp == oStartTimeStamp && !oEndDate ) {
				iSelected = 1; // single day selected
				break;
			} else if (oTimeStamp == oStartTimeStamp && oEndDate ) {
				iSelected = 2; // interval start
				if (oEndDate && oTimeStamp == oEndTimeStamp) {
					// one day interval
					iSelected = 5;
				}
				break;
			} else if (oEndDate && oTimeStamp == oEndTimeStamp) {
				iSelected = 3; // interval end
				break;
			} else if (oEndDate && oTimeStamp > oStartTimeStamp && oTimeStamp < oEndTimeStamp) {
				iSelected = 4; // interval between
				break;
			}

			if (this.getSingleSelection()) {
				// if single selection only check the first range
				break;
			}
		}

		return iSelected;

	};

	/*
	 * gets the type of a single date checking the specialDates aggregation
	 * the first hit is used
	 * @returns {object} date type and tooltip defined in CalendarDayType
	 * @private
	 */
	TimesRow.prototype._getDateType = function(oDate){

		if (!(oDate instanceof UniversalDate)) {
			throw new Error("Date must be a UniversalDate object " + this);
		}

		var oType;
		var aSpecialDates = this.getSpecialDates();
		var oMyDate = new UniversalDate(oDate.getTime());
		oMyDate = this._getIntervalStart(oMyDate);
		var oTimeStamp = oMyDate.getTime();

		for ( var i = 0; i < aSpecialDates.length; i++) {
			// initialize the time part of the start and end time
			var oRange = aSpecialDates[i];
			var oStartDate = oRange.getStartDate();
			var oStartTimeStamp = 0;
			if (oStartDate) {
				oStartDate = CalendarUtils._createUniversalUTCDate(oStartDate, undefined, true);
				oStartDate = this._getIntervalStart(oStartDate);
				oStartTimeStamp = oStartDate.getTime();
			}
			var oEndDate = oRange.getEndDate();
			var oEndTimeStamp = 0;
			if (oEndDate) {
				oEndDate = CalendarUtils._createUniversalUTCDate(oEndDate, undefined, true);
				oEndDate = this._getIntervalStart(oEndDate);
				oEndDate.setUTCMinutes(oEndDate.getUTCMinutes() + this.getIntervalMinutes() - 1);
				oEndTimeStamp = oEndDate.getTime();
			} else if (oStartDate.getUTCHours() == 0 && oStartDate.getUTCMinutes() == 0 && oStartDate.getUTCSeconds() == 0 && oStartDate.getUTCMilliseconds() == 0) {
				// special case, only start date and on midnight -> use as full day
				oEndDate = new UniversalDate(oStartDate.getTime());
				oEndDate.setUTCDate(oEndDate.getUTCDate() + 1);
				oEndTimeStamp = oEndDate.getTime();
			}

			if ((oTimeStamp == oStartTimeStamp && !oEndDate) || (oTimeStamp >= oStartTimeStamp && oTimeStamp <= oEndTimeStamp)) {
				oType = {type: oRange.getType(), tooltip: oRange.getTooltip_AsString(), color: oRange.getColor()};
				break;
			}
		}

		return oType;

	};

	/*
	 * Checks if a time is enabled
	 * the min. and max. date of the CalendarTimeInterval are used
	 * @returns {boolean} Flag if enabled
	 * @private
	 */
	TimesRow.prototype._checkTimeEnabled = function(oDate){

		if (!(oDate instanceof UniversalDate)) {
			throw new Error("Date must be a UniversalDate object " + this);
		}

		var oTimeStamp = oDate.getTime();
		var oParent = this.getParent();

		if (oParent && oParent._oMinDate && oParent._oMaxDate) {
			if (oTimeStamp < oParent._oMinDate.getTime() || oTimeStamp > oParent._oMaxDate.getTime()) {
				return false;
			}
		}

		return true;

	};

	TimesRow.prototype._handleMouseMove = function(oEvent){

		if (!this.$().is(":visible")) {
			// calendar was closed -> remove mousemove handler
			_unbindMousemove.call(this, true);
		}

		var $Target = jQuery(oEvent.target);

		if ($Target.hasClass("sapUiCalItemText")) {
			$Target = $Target.parent();
		}

		if ($Target.hasClass("sapUiCalItem")) {
			var oOldFocusedDate = this._getDate();
			var oFocusedDate = new UniversalDate(this._oFormatYyyyMMddHHmm.parse($Target.attr("data-sap-time"), true).getTime());

			if (oFocusedDate.getTime() != oOldFocusedDate.getTime()) {
				this._oUTCDate = oFocusedDate;
				_selectTime.call(this, oFocusedDate, true);
				this._bMoveChange = true;
			}
		}

	};

	TimesRow.prototype.onmouseup = function(oEvent){

		if (this._bMouseMove) {
			_unbindMousemove.call(this, true);

			// focus now selected day
			var oFocusedDate = this._getDate();
			var aDomRefs = this._oItemNavigation.getItemDomRefs();

			for ( var i = 0; i < aDomRefs.length; i++) {
				var $DomRef = jQuery(aDomRefs[i]);
				if ($DomRef.attr("data-sap-time") == this._oFormatYyyyMMddHHmm.format(oFocusedDate.getJSDate(), true)) {
					$DomRef.trigger("focus");
					break;
				}
			}

			if (this._bMoveChange) {
				// selection was changed -> make it final
				var $Target = jQuery(oEvent.target);

				if ($Target.hasClass("sapUiCalItemText")) {
					$Target = $Target.parent();
				}

				if ($Target.hasClass("sapUiCalItem")) {
					oFocusedDate = new UniversalDate(this._oFormatYyyyMMddHHmm.parse($Target.attr("data-sap-time"), true).getTime());
				}

				_selectTime.call(this, oFocusedDate);
				this._bMoveChange = false;
				this._bMousedownChange = false;
				_fireSelect.call(this);
			}
		}

		if (this._bMousedownChange) {
			this._bMousedownChange = false;
			_fireSelect.call(this);
		}

	};

	TimesRow.prototype.onsapselect = function(oEvent){

		// focused item must be selected
		var bSelected = _selectTime.call(this, this._getDate());
		if (bSelected) {
			_fireSelect.call(this);
		}

		//to prevent bubbling into input field if in DatePicker
		oEvent.stopPropagation();
		oEvent.preventDefault();

	};

	TimesRow.prototype.onsapselectmodifiers = function(oEvent){

		this.onsapselect(oEvent);

	};

	TimesRow.prototype.onsappageupmodifiers = function(oEvent){

		// not handled by ItemNavigation
		// go one or 7 days back
		var oFocusedDate = new UniversalDate(this._getDate().getTime());
		var iDate = oFocusedDate.getUTCDate();

		if (oEvent.metaKey || oEvent.ctrlKey) {
			oFocusedDate.setUTCDate(iDate - 7);
		} else {
			oFocusedDate.setUTCDate(iDate - 1);
		}

		this.fireFocus({date: CalendarUtils._createLocalDate(oFocusedDate, true), notVisible: true});

		// cancel the event otherwise the browser select some text
		oEvent.preventDefault();

	};

	TimesRow.prototype.onsappagedownmodifiers = function(oEvent){

		// not handled by ItemNavigation
		// go one or 7 days forward
		var oFocusedDate = new UniversalDate(this._getDate().getTime());
		var iDate = oFocusedDate.getUTCDate();

		if (oEvent.metaKey || oEvent.ctrlKey) {
			oFocusedDate.setUTCDate(iDate + 7);
		} else {
			oFocusedDate.setUTCDate(iDate + 1);
		}

		this.fireFocus({date: CalendarUtils._createLocalDate(oFocusedDate, true), notVisible: true});

		// cancel the event otherwise the browser select some text
		oEvent.preventDefault();

	};

	/**
	 * Checks if a date is focusable in the current rendered output.
	 * This means that if it is not rendered, it is not focusable.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oDate date instance for focused date.
	 * @returns {boolean} flag if focusable
	 * @public
	 */
	TimesRow.prototype.checkDateFocusable = function(oDate){

		CalendarUtils._checkJSDateObject(oDate);

		if (this._bNoRangeCheck) {
			// to force to render months if start date is changed
			return false;
		}

		var oStartDate = this._getStartDate();

		// set end date to begin of first item outside row
		var oEndDate = new UniversalDate(oStartDate.getTime());
		oEndDate.setUTCMinutes(oEndDate.getUTCMinutes() + this.getItems() * this.getIntervalMinutes());
		var oUTCDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);

		if (oUTCDate.getTime() >= oStartDate.getTime() && oUTCDate.getTime() < oEndDate.getTime()) {
			return true;
		} else  {
			return false;
		}

	};
	/**
	* Overrides the applyFocusInfo in order to focus the given html element.
	* Focus handler does not work with DOM elements, but with UI5 controls only. That's why we need to take care that
	* when focus is being restored back (e.g. after rerendering), we focus the needed DOM element (in this case hour)
	*
	* @param {object} oInfo the focus info
	* @returns {this} Reference to <code>this</code> for method chaining
	*/
	TimesRow.prototype.applyFocusInfo = function(oInfo){
		this._oItemNavigation.focusItem(this._oItemNavigation.getFocusedIndex());
		return this;
	};

	/*
	 * calculates the start of the corresponding interval
	 */
	TimesRow.prototype._getIntervalStart = function(oDate){

		var iTimeStamp = oDate.getTime();
		var oStartDate = new UniversalDate(oDate.getTime());
		oStartDate.setUTCHours(0);
		oStartDate.setUTCMinutes(0);
		oStartDate.setUTCSeconds(0);
		oStartDate.setUTCMilliseconds(0);
		var iMinutes = this.getIntervalMinutes();

		// stop at begin of next interval
		while (oStartDate.getTime() <= iTimeStamp) {
			oStartDate.setUTCMinutes(oStartDate.getUTCMinutes() + iMinutes);
		}

		// interval start is the begin of the last interval
		var oIntervalDate = new UniversalDate(oStartDate.getTime());
		oIntervalDate.setUTCMinutes(oIntervalDate.getUTCMinutes() - iMinutes);

		return oIntervalDate;

	};

	TimesRow.prototype._setAriaRole = function(sRole){
		this._ariaRole = sRole;

		return this;
	};

	TimesRow.prototype._getAriaRole = function(){

		return this._ariaRole ? this._ariaRole : "gridcell";
	};

	TimesRow.prototype._getTimeDescription = function() {
		return this._fnInvisibleHintFactory().getId();
	};

	TimesRow.prototype._fnInvisibleHintFactory = function() {
		if (!this._invisibleDayHint) {
			this._invisibleDayHint = new InvisibleText({
				text: Library.getResourceBundleFor("sap.m").getText("SLIDETILE_ACTIVATE")
			}).toStatic();
		}

		return this._invisibleDayHint;
	};

	TimesRow.prototype._updateItemARIASelected = function($oDomRef, bSelect) {
		var sRole = this._getAriaRole();

		if (sRole === "gridcell") {
			// aria-selected is valid only for role=gridcell and not for role=button
			$oDomRef.attr("aria-selected", bSelect);
		}

		return this;
	};


	function _initItemNavigation(){

		var oDate = this._getDate();
		var sYyyyMMddHHmm = this._oFormatYyyyMMddHHmm.format(oDate.getJSDate(), true);
		var iIndex = 0;

		var oRootDomRef = this.$("times").get(0);
		var aDomRefs = this.$("times").children(".sapUiCalItem");

		for ( var i = 0; i < aDomRefs.length; i++) {
			var $DomRef = jQuery(aDomRefs[i]);
			if ($DomRef.attr("data-sap-time") === sYyyyMMddHHmm) {
				iIndex = i;
				break;
			}
		}

		if (!this._oItemNavigation) {
			this._oItemNavigation = new ItemNavigation();
			this._oItemNavigation.attachEvent(ItemNavigation.Events.AfterFocus, _handleAfterFocus, this);
			this._oItemNavigation.attachEvent(ItemNavigation.Events.FocusAgain, _handleFocusAgain, this);
			this._oItemNavigation.attachEvent(ItemNavigation.Events.BorderReached, _handleBorderReached, this);
			this.addDelegate(this._oItemNavigation);
			this._oItemNavigation.setDisabledModifiers({
				sapnext : ["alt"],
				sapprevious : ["alt"],
				saphome : ["alt"],
				sapend : ["alt"]
			});
			this._oItemNavigation.setCycling(false);
			this._oItemNavigation.setColumns(1, true);
		}
		this._oItemNavigation.setRootDomRef(oRootDomRef);
		this._oItemNavigation.setItemDomRefs(aDomRefs);
		this._oItemNavigation.setFocusedIndex(iIndex);
		this._oItemNavigation.setPageSize(aDomRefs.length); // to make sure that pageup/down goes out of month

	}

	function _handleAfterFocus(oControlEvent){

		var iIndex = oControlEvent.getParameter("index");
		var oEvent = oControlEvent.getParameter("event");

		if (!oEvent) {
			return; // happens if focus is set via ItemNavigation.focusItem directly
		}

		var oOldDate = this._getDate();
		var oFocusedDate = new UniversalDate(oOldDate.getTime());
		var aDomRefs = this._oItemNavigation.getItemDomRefs();

		// find out what day was focused
		var $DomRef = jQuery(aDomRefs[iIndex]);

		oFocusedDate = new UniversalDate(this._oFormatYyyyMMddHHmm.parse($DomRef.attr("data-sap-time"), true).getTime());
		this._oUTCDate = oFocusedDate;

		this.fireFocus({date: CalendarUtils._createLocalDate(oFocusedDate, true), notVisible: false});

		if (oEvent.type == "mousedown") {
			// as no click event is fired in some cases, e.g. if DOM changed select the month on mousedown
			_handleMousedown.call(this, oEvent, oFocusedDate, iIndex);
		}

	}

	function _handleFocusAgain(oControlEvent){

		var iIndex = oControlEvent.getParameter("index");
		var oEvent = oControlEvent.getParameter("event");

		if (!oEvent) {
			return; // happens if focus is set via ItemNavigation.focusItem directly
		}

		if (oEvent.type == "mousedown") {
			// as no click event is fired in some cases, e.g. if DOM has changed select the day on mousedown
			var oFocusedDate = this._getDate();
			_handleMousedown.call(this, oEvent, oFocusedDate, iIndex);
		}

	}

	function _handleBorderReached(oControlEvent){

		var oEvent = oControlEvent.getParameter("event");
		var iItems = this.getItems();
		var iMinutes = this.getIntervalMinutes();
		var oOldDate = this._getDate();
		var oFocusedDate = new UniversalDate(oOldDate.getTime());

		if (oEvent.type) {
			switch (oEvent.type) {
			case "sapnext":
			case "sapnextmodifiers":
				//go to next item
				oFocusedDate.setUTCMinutes(oFocusedDate.getUTCMinutes() + iMinutes);
				break;

			case "sapprevious":
			case "sappreviousmodifiers":
				//go to previous minutes
				oFocusedDate.setUTCMinutes(oFocusedDate.getUTCMinutes() - iMinutes);
				break;

			case "sappagedown":
				// go getItems() forward
				oFocusedDate.setUTCMinutes(oFocusedDate.getUTCMinutes() + iMinutes * iItems);
				break;

			case "sappageup":
				// go getItems()  backwards
				oFocusedDate.setUTCMinutes(oFocusedDate.getUTCMinutes() - iMinutes * iItems);
				break;

			default:
				break;
			}

			this.fireFocus({date: CalendarUtils._createLocalDate(oFocusedDate, true), notVisible: true});

		}

	}

	function _handleMousedown(oEvent, oFocusedDate, iIndex){

		if (oEvent.button) {
			// only use left mouse button
			return;
		}

		var bSelected = _selectTime.call(this, oFocusedDate);
		if (bSelected) {
			this._bMousedownChange = true;
		}

		if (this._bMouseMove) {
			// a mouseup must be happened outside of control -> just end move
			_unbindMousemove.call(this, true);
			this._bMoveChange = false;
		} else if (this.getIntervalSelection() && this.$().is(":visible")) {
			// if closed in select event, do not add mousemove handler
			_bindMousemove.call(this, true);
		}

		oEvent.preventDefault();
		oEvent.setMark("cancelAutoClose");

	}

	function _changeDate(oDate, bNoFocus){

		CalendarUtils._checkJSDateObject(oDate);

		var iYear = oDate.getFullYear();
		CalendarUtils._checkYearInValidRange(iYear);

		var bFocusable = true; // if date not changed it is still focusable
		if (!deepEqual(this.getDate(), oDate)) {
			var oUTCDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);
			oUTCDate = this._getIntervalStart(oUTCDate);
			bFocusable = this.checkDateFocusable(oDate);

			if (!this._bNoRangeCheck && !bFocusable) {
				throw new Error("Date must be in visible date range; " + this);
			}

			this.setProperty("date", oDate);
			this._oUTCDate = oUTCDate;
		}

		if (this.getDomRef()) {
			if (bFocusable) {
				_focusDate.call(this, this._oUTCDate, bNoFocus);
			} else {
				this.setDate(oDate);
			}
		}

	}

	function _focusDate(oDate, bNoFocus){

		var sYyyyMMddHHmm = this._oFormatYyyyMMddHHmm.format(oDate.getJSDate(), true);
		var aDomRefs = this._oItemNavigation.getItemDomRefs();
		var $DomRefTime;
		for ( var i = 0; i < aDomRefs.length; i++) {
			$DomRefTime = jQuery(aDomRefs[i]);
			if ($DomRefTime.attr("data-sap-time") == sYyyyMMddHHmm) {
				if (document.activeElement != aDomRefs[i]) {
					if (bNoFocus) {
						this._oItemNavigation.setFocusedIndex(i);
					} else {
						this._oItemNavigation.focusItem(i);
					}
				}
				break;
			}
		}

	}

	function _selectTime(oDate, bMove){

		if (!this._checkTimeEnabled(oDate)) {
			// date is disabled -> do not select it
			return false;
		}

		var aSelectedDates = this.getSelectedDates();
		var oDateRange;
		var i = 0;
		var oParent = this.getParent();
		var oAggOwner = this;
		var oStartDate;

		if (oParent && oParent.getSelectedDates) {
			// if used in Calendar use the aggregation of this one
			oAggOwner = oParent;
		}

		/* eslint-disable no-lonely-if */
		if (this.getSingleSelection()) {

			if (aSelectedDates.length > 0) {
				oDateRange = aSelectedDates[0];
				oStartDate = oDateRange.getStartDate();
				if (oStartDate) {
					oStartDate = CalendarUtils._createUniversalUTCDate(oStartDate, undefined, true);
					oStartDate = this._getIntervalStart(oStartDate);
				}
			} else {
				oDateRange = new DateRange();
				oAggOwner.addAggregation("selectedDates", oDateRange);
			}

			if (this.getIntervalSelection() && (!oDateRange.getEndDate() || bMove) && oStartDate) {
				// single interval selection
				var oEndDate;
				if (oDate.getTime() < oStartDate.getTime()) {
					oEndDate = oStartDate;
					oStartDate = oDate;
					if (!bMove) {
						// in move mode do not set date. this bring broblems if on backward move the start date would be changed
						oDateRange.setProperty("startDate", CalendarUtils._createLocalDate(UI5Date.getInstance(oStartDate.getTime()), true));
						oDateRange.setProperty("endDate", CalendarUtils._createLocalDate(UI5Date.getInstance(oEndDate.getTime()), true));
					}
				} else if (oDate.getTime() >= oStartDate.getTime()) {
					// single day ranges are allowed
					oEndDate = oDate;
					if (!bMove) {
						oDateRange.setProperty("endDate", CalendarUtils._createLocalDate(UI5Date.getInstance(oEndDate.getTime()), true));
					}
				}
			} else {
				oDateRange.setProperty("startDate", CalendarUtils._createLocalDate(UI5Date.getInstance(oDate.getTime()), true));
				oDateRange.setProperty("endDate", undefined);
			}
		} else {
			// multiple selection
			if (this.getIntervalSelection()) {
				throw new Error("Calender don't support multiple interval selection");

			} else {
				var iSelected = this._checkDateSelected(oDate);
				if (iSelected > 0) {
					// already selected - deselect
					for ( i = 0; i < aSelectedDates.length; i++) {
						oStartDate = aSelectedDates[i].getStartDate();
						if (oStartDate) {
							oStartDate = CalendarUtils._createUniversalUTCDate(oStartDate, undefined, true);
							oStartDate = this._getIntervalStart(oStartDate);
							if (oDate.getTime() == oStartDate.getTime()) {
								oAggOwner.removeAggregation("selectedDates", i);
								break;
							}
						}
					}
				} else {
					// not selected -> select
					oDateRange = new DateRange({startDate: CalendarUtils._createLocalDate(UI5Date.getInstance(oDate.getTime()), true)});
					oAggOwner.addAggregation("selectedDates", oDateRange);
				}
			}
		}

		return true;

	}

	function _fireSelect(){

		if (this._bMouseMove) {
			// detach mouse move handler because calendar might be losed in select event handler
			_unbindMousemove.call(this, true);
		}

		this.fireSelect();

	}

	function _bindMousemove(){

		jQuery(window.document).on('mousemove', this._mouseMoveProxy);
		this._bMouseMove = true;

	}

	function _unbindMousemove(){

		jQuery(window.document).off('mousemove', this._mouseMoveProxy);
		this._bMouseMove = undefined;

	}

	/*
	 * Getter for the time's preferred hour symbol. Possible options are h|H|k|K.
	 * @param {string} sTimeFormatShort Hours time format
	 * @returns {string} Hours pattern.
	 * @private
	 */
	function _getPreferredHourSymbol(sTimeFormatShort){
		var sPattern;
		if (sTimeFormatShort.toUpperCase().indexOf("K") > -1) {
			sPattern = sTimeFormatShort.indexOf("k") > -1 ? "k" : "K";
		} else {
			sPattern = sTimeFormatShort.indexOf("h") > -1 ? "h" : "H";
		}

		return sPattern;
	}

	return TimesRow;

});