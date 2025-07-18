/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides control sap.ui.unified.Calendar.
sap.ui.define([
	"sap/base/i18n/Formatting",
	"sap/base/i18n/Localization",
	"sap/m/Popover",
	'sap/ui/core/Control',
	"sap/ui/core/Lib",
	'sap/ui/core/LocaleData',
	'sap/ui/unified/calendar/CalendarUtils',
	'./calendar/Header',
	'./calendar/TimesRow',
	'./calendar/DatesRow',
	'./calendar/MonthPicker',
	'./calendar/YearPicker',
	'sap/ui/core/date/UniversalDate',
	'./library',
	'sap/ui/core/format/DateFormat',
	'sap/ui/Device',
	'sap/ui/core/Locale',
	"./CalendarTimeIntervalRenderer",
	"sap/ui/dom/containsOrEquals",
	"sap/base/util/deepEqual",
	"sap/base/Log",
	"sap/ui/unified/DateRange",
	"sap/ui/core/date/UI5Date",
	"sap/ui/unified/Calendar"
], function(
	Formatting,
	Localization,
	Popover,
	Control,
	Library,
	LocaleData,
	CalendarUtils,
	Header,
	TimesRow,
	DatesRow,
	MonthPicker,
	YearPicker,
	UniversalDate,
	library,
	DateFormat,
	Device,
	Locale,
	CalendarTimeIntervalRenderer,
	containsOrEquals,
	deepEqual,
	Log,
	DateRange,
	UI5Date,
	Calendar
) {
	"use strict";

	/*
	 * Inside the CalendarTimeInterval UniversalDate objects are used. But in the API JS dates are used.
	 * So conversion must be done on API functions.
	 */

	/**
	 * Constructor for a new <code>CalendarTimeInterval</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Calendar with granularity of time items displayed in one line.
	 * @extends sap.ui.core.Control
	 * @version 1.138.0
	 *
	 * @constructor
	 * @public
	 * @since 1.32.0
	 * @alias sap.ui.unified.CalendarTimeInterval
	 */
	var CalendarTimeInterval = Control.extend("sap.ui.unified.CalendarTimeInterval", /** @lends sap.ui.unified.CalendarTimeInterval.prototype */ { metadata : {

		library : "sap.ui.unified",
		properties : {

			/**
			 * Width of the <code>CalendarTimeInterval</code>. The width of the single months depends on this width.
			 */
			width : {type : "sap.ui.core.CSSSize", group : "Dimension", defaultValue : null},

			/**
			 * Start date of the Interval as UI5Date or JavaScript Date object.
			 * The time interval corresponding to this Date and <code>items</code> and <code>intervalMinutes</code>
			 * will be the first time in the displayed row.
			 */
			startDate : {type : "object", group : "Data"},

			/**
			 * If set, interval selection is allowed
			 */
			intervalSelection : {type : "boolean", group : "Behavior", defaultValue : false},

			/**
			 * If set, only a single date or interval, if <code>intervalSelection</code> is enabled, can be selected
			 *
			 * <b>Note:</b> Selection of multiple intervals is not supported in the current version.
			 */
			singleSelection : {type : "boolean", group : "Behavior", defaultValue : true},

			/**
			 * Number of time items displayed. Default is 12.
			 *
			 * <b>Note:</b> On phones, the maximum number of items displayed in the row is always 6.
			 */
			items : {type : "int", group : "Appearance", defaultValue : 12},

			/**
			 * Size of on time interval in minutes, default is 60 minutes.
			 *
			 * <b>Note:</b> the start of the interval calculation is always on the corresponding date at 00:00.
			 *
			 * An interval longer than 720 minutes is not allowed. Please use the <code>CalendarDateInterval</code> instead.
			 *
			 * A day must be divisible by this interval size. One interval must not include more than one day.
			 */
			intervalMinutes : {type : "int", group : "Appearance", defaultValue : 60},

			/**
			 * If set, the day-, month- and yearPicker opens on a popup
			 * @since 1.34.0
			 */
			pickerPopup : {type : "boolean", group : "Appearance", defaultValue : false},

			/**
			 * Minimum date that can be shown and selected in the Calendar. This must be a UI5Date or JavaScript Date object.
			 *
			 * <b>Note:</b> If the <code>minDate</code> is set to be after the <code>maxDate</code>,
			 * the <code>maxDate</code> is set to the end of the month of the <code>minDate</code>.
			 * @since 1.38.0
			 */
			minDate : {type : "object", group : "Misc", defaultValue : null},

			/**
			 * Maximum date that can be shown and selected in the Calendar. This must be a UI5Date or JavaScript Date object.
			 *
			 * <b>Note:</b> If the <code>maxDate</code> is set to be before the <code>minDate</code>,
			 * the <code>minDate</code> is set to the begin of the month of the <code>maxDate</code>.
			 * @since 1.38.0
			 */
			maxDate : {type : "object", group : "Misc", defaultValue : null},

			/**
			 * Holds a reference to the currently shown picker. Possible values: timesRow, datesRow, monthPicker and yearPicker.
			 * @since 1.84.0
			 */
			_currentPicker : {type : "string", group : "Appearance", defaultValue : "timesRow", visibility: "hidden"}
		},
		aggregations : {

			/**
			 * Date ranges for selected items of the <code>CalendarTimeInterval</code>.
			 *
			 * If <code>singleSelection</code> is set, only the first entry is used.
			 */
			selectedDates : {type : "sap.ui.unified.DateRange", multiple : true, singularName : "selectedDate"},

			/**
			 * Date ranges with type to visualize special items in the <code>CalendarTimeInterval</code>.
			 * If one interval is assigned to more than one type, only the first one will be used.
			 */
			specialDates : {type : "sap.ui.unified.DateTypeRange", multiple : true, singularName : "specialDate"},

			/**
			 * Hidden, for internal use only.
			 */
			header : {type : "sap.ui.unified.calendar.Header", multiple : false, visibility : "hidden"},
			timesRow : {type : "sap.ui.unified.calendar.TimesRow", multiple : false, visibility : "hidden"},
			datesRow : {type : "sap.ui.unified.calendar.Month", multiple : false, visibility : "hidden"},
			monthPicker : {type : "sap.ui.unified.calendar.MonthPicker", multiple : false, visibility : "hidden"},
			yearPicker : {type : "sap.ui.unified.calendar.YearPicker", multiple : false, visibility : "hidden"}

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
			 * Time selection was cancelled
			 */
			cancel : {},

			/**
			 * <code>startDate</code> was changed while navigation in <code>CalendarTimeInterval</code>
			 * @since 1.34.0
			 */
			startDateChange : {}
		}
	}, renderer: CalendarTimeIntervalRenderer});

	/*
	 * There are different modes (stored in this._iMode)
	 * The standard is 0, that means a calendar showing a calendar with the time items.
	 * If 1 a day picker is shown.
	 * If 2 a month picker is shown.
	 * if 3 a year picker is shown.
	 */

	// Holds the possible values for the "_currentPicker" property.
	var CURRENT_PICKERS = {
		TIMES_ROW: "timesRow", // represents the "timesRow" aggregation
		DATES_ROW: "datesRow", // represents the "datesRow" aggregation
		MONTH_PICKER: "monthPicker",  // represents the "monthPicker" aggregation
		YEAR_PICKER: "yearPicker"  // represents the "yearPicker" aggregation
	};

	CalendarTimeInterval.prototype.init = function(){

		this._iMode = 0; // months are shown

		// to format year with era in Japanese
		this._oYearFormat = DateFormat.getDateInstance({format: "y"});

		this.data("sap-ui-fastnavgroup", "true", true); // Define group for F6 handling

		this._oMinDate = new UniversalDate(UI5Date.getInstance(Date.UTC(1, 0, 1)));
		this._oMinDate.getJSDate().setUTCFullYear(1); // otherwise year 1 will be converted to year 1901
		this._oMaxDate = new UniversalDate(UI5Date.getInstance(Date.UTC(9999, 11, 31, 23, 59, 59)));

		this._initializeHeader();

		this._initializeTimesRow();

		this._initializeMonthPicker();

		this._initializeYearPicker();

		this.setPickerPopup(false); // to initialize DatesRow

		this._iItemsHead = 15; // if more than this number of items, day information are displayed on top of items

	};

	CalendarTimeInterval.prototype._initializeHeader = function() {
		var oHeader = new Header(this.getId() + "--Head"),
			oResourceBundle = Library.getResourceBundleFor("sap.m");
		oHeader.attachEvent("pressPrevious", this._handlePrevious, this);
		oHeader.attachEvent("pressNext", this._handleNext, this);
		this.setAggregation("header", oHeader);

		if (oHeader) {
			oHeader.setAriaLabelButton0(oResourceBundle.getText("DATETIMEPICKER_DATE"));
			oHeader.setAriaLabelButton1(oResourceBundle.getText("MOBISCROLL_MONTH"));
			oHeader.setAriaLabelButton2(oResourceBundle.getText("MOBISCROLL_YEAR"));
		}
	};

	CalendarTimeInterval.prototype._initializeTimesRow = function() {
		var oTimesRow = new TimesRow(this.getId() + "--TimesRow");
		oTimesRow.attachEvent("focus", _handleFocus, this);
		oTimesRow.attachEvent("select", _handleSelect, this);
		oTimesRow._bNoThemeChange = true;
		this.setAggregation("timesRow", oTimesRow);
	};

	CalendarTimeInterval.prototype._initializeMonthPicker = function() {
		var oMonthPicker = this._createMonthPicker();
		this.setAggregation("monthPicker", oMonthPicker);

		oMonthPicker._setSelectedDatesControlOrigin(this);
	};

	CalendarTimeInterval.prototype._initializeYearPicker = function() {
		var oYearPicker = this._createYearPicker();
		this.setAggregation("yearPicker", oYearPicker);

		oYearPicker._setSelectedDatesControlOrigin(this);
	};

	CalendarTimeInterval.prototype._createDatesRow = function() {
		var oDatesRow = new DatesRow(this.getId() + "--DatesRow", {
			days: 18,
			selectedDates: [new DateRange(this.getId() + "--Range")]
		});

		oDatesRow.attachEvent("focus", _handleDateFocus, this);
		oDatesRow.attachEvent("select", _handleDateSelect, this);
		oDatesRow._bNoThemeChange = true;
		oDatesRow.getIntervalSelection = function(){
			return this.getProperty("intervalSelection");
		};
		oDatesRow.getSingleSelection = function(){
			return this.getProperty("singleSelection");
		};
		oDatesRow.getSelectedDates = function(){
			return this.getAggregation("selectedDates", []);
		};
		oDatesRow.getSpecialDates = function(){
			return this.getAggregation("specialDates", []);
		};
		oDatesRow.getAriaLabelledBy = function(){
			return this.getAssociation("ariaLabelledBy", []);
		};

		return oDatesRow;
	};

	CalendarTimeInterval.prototype._createMonthPicker = function() {
		var oMonthPicker = new MonthPicker(this.getId() + "--MP", {
			columns: 0,
			months: 6
		});
		oMonthPicker.attachEvent("select", _handleSelectMonth, this);
		oMonthPicker._bNoThemeChange = true;
		oMonthPicker.attachEvent("pageChange", _handleMonthPickerPageChange, this);

		return oMonthPicker;
	};

	CalendarTimeInterval.prototype._createYearPicker = function() {
		var oYearPicker = new YearPicker(this.getId() + "--YP", {
			columns: 0,
			years: 6 // default for 12 items
		});
		oYearPicker.attachEvent("select", _handleSelectYear, this);
		oYearPicker.attachEvent("pageChange", _handleYearPickerPageChange, this);

		oYearPicker._oMinDate.setYear(this._oMinDate.getUTCFullYear());
		oYearPicker._oMaxDate.setYear(this._oMaxDate.getUTCFullYear());

		return oYearPicker;
	};

	CalendarTimeInterval.prototype.exit = function(){

		if (this._oPopup) {
			this._oPopup.destroy();
			this._oPopup = null;
		}

		if (this._oCalendar) {
			this._oCalendar.removeDelegate(this._oFocusCalendarDelegate);
			this._oCalendar.destroy();
			this._oCalendar = null;
		}

		if (this._sInvalidateContent) {
			clearTimeout(this._sInvalidateContent);
		}

	};

	CalendarTimeInterval.prototype.onBeforeRendering = function(){

		var oTimesRow = this.getAggregation("timesRow");
		var oDate = this._getFocusedDate();


		_updateHeader.call(this);

		//Do not focus the date. If this is needed after the control rendering, the TimesRow.applyFocusInto will focus it.
		oTimesRow.displayDate(CalendarUtils._createLocalDate(oDate, true));

	};

	CalendarTimeInterval.prototype._setAriaRole = function(sRole){
		var oTimesRow = this.getAggregation("timesRow");

		oTimesRow._setAriaRole(sRole);
		oTimesRow.invalidate();

		return this;
	};

	/**
	 * Lazily initializes the calendar.
	 * @private
	 * @returns {sap.ui.unified.Calendar} The newly created control
	 */
	CalendarTimeInterval.prototype._getCalendar = function (){
		var oCalendar;

		if (!this._oCalendar) {
			oCalendar = new Calendar(this.getId() + "--Cal", {});
			oCalendar.attachEvent("select", _handleCalendarDateSelect, this);
			oCalendar.attachEvent("cancel", function (oEvent) {
				this._oPopup.close();
				var oDomRefB1 = this.getAggregation("header").getDomRef("B1");
				if (oDomRefB1) {
					oDomRefB1.focus();
				}
			}, this);

			this._oFocusCalendarDelegate = {
				onAfterRendering: function() {
					this.focus();
				}
			};

			oCalendar.addDelegate(this._oFocusCalendarDelegate,  oCalendar);

			this._oCalendar = oCalendar;
		}

		return this._oCalendar;
	};

	/**
	 * Getter for monthPicker aggregation.
	 * @returns {sap.ui.unified.calendar.MonthPicker} The monthPicker control instance
	 * @private
	 */
	CalendarTimeInterval.prototype._getMonthPicker = function () {
		return this.getAggregation("monthPicker");
	};

	/**
	 * Getter for yearPicker aggregation.
	 * @returns {sap.ui.unified.calendar.YearPicker} The yearPicker control instance
	 * @private
	 */
	CalendarTimeInterval.prototype._getYearPicker = function () {
		return this.getAggregation("yearPicker");
	};

	/**
	 * Sets start date for the interval.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oStartDate A date instance
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	CalendarTimeInterval.prototype.setStartDate = function(oStartDate){

		CalendarUtils._checkJSDateObject(oStartDate);

		if (deepEqual(this.getStartDate(), oStartDate)) {
			return this;
		}

		var iYear = oStartDate.getFullYear();
		CalendarUtils._checkYearInValidRange(iYear);

		var oMinDate = this.getMinDate();
		if (oMinDate && oStartDate.getTime() < oMinDate.getTime()) {
			Log.warning("startDate < minDate -> minDate as startDate set", this);
			oStartDate = UI5Date.getInstance(oMinDate);
		}

		var oMaxDate = this.getMaxDate();
		if (oMaxDate && oStartDate.getTime() > oMaxDate.getTime()) {
			Log.warning("startDate > maxDate -> maxDate as startDate set", this);
			oStartDate = UI5Date.getInstance(oMaxDate);
		}

		this.setProperty("startDate", oStartDate);
		var oTimesRow = this.getAggregation("timesRow");
		oTimesRow.setStartDate(oStartDate);
		// let the TimesRow calculate the begin of the interval
		this._oUTCStartDate = new UniversalDate(oTimesRow._getStartDate().getTime());

		_updateHeader.call(this);

		var oDate = CalendarUtils._createLocalDate(this._getFocusedDate(), true);
		if (!oTimesRow.checkDateFocusable(oDate)) {
			//focused date not longer visible -> focus start date (but don't set focus)
			this._setFocusedDate(this._oUTCStartDate);
			oTimesRow.displayDate(oStartDate);
		}

		return this;

	};

	// overwrite removing of date ranged because invalidate don't get information about it
	CalendarTimeInterval.prototype.removeAllSelectedDates = function() {

		this._bDateRangeChanged = true;
		var aRemoved = this.removeAllAggregation("selectedDates");
		return aRemoved;

	};

	CalendarTimeInterval.prototype.destroySelectedDates = function() {

		this._bDateRangeChanged = true;
		var oDestroyed = this.destroyAggregation("selectedDates");
		return oDestroyed;

	};

	CalendarTimeInterval.prototype.removeAllSpecialDates = function() {

		this._bDateRangeChanged = true;
		var aRemoved = this.removeAllAggregation("specialDates");
		return aRemoved;

	};

	CalendarTimeInterval.prototype.destroySpecialDates = function() {

		this._bDateRangeChanged = true;
		var oDestroyed = this.destroyAggregation("specialDates");
		return oDestroyed;

	};

	CalendarTimeInterval.prototype.setIntervalMinutes = function(iMinutes){

		if (iMinutes >= 720) {
			throw new Error("Only intervals < 720 minutes are allowed; " + this);
		}

		if (1440 % iMinutes > 0) {
			throw new Error("A day must be divisible by the interval size; " + this);
		}

		this.setProperty("intervalMinutes", iMinutes); // rerender

		// check if focused date still is valid
		var oTimesRow = this.getAggregation("timesRow");
		var oDate = CalendarUtils._createLocalDate(this._getFocusedDate(), true);
		if (!oTimesRow.checkDateFocusable(oDate)) {
			//focused date not longer visible -> focus start date
			var oStartDate = _getStartDate.call(this);
			this._setFocusedDate(oStartDate);
			oTimesRow.setDate(CalendarUtils._createLocalDate(oStartDate, true));
		}

		return this;

	};

	/**
	 * Sets the locale for the <code>CalendarTimeInterval</code>.
	 * Only for internal use
	 * @param {string} sLocale  New value for <code>locale</code>
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @private
	 */
	CalendarTimeInterval.prototype.setLocale = function(sLocale){

		if (this._sLocale != sLocale) {
			this._sLocale = sLocale;
			this._oLocaleData = undefined;
			this.invalidate();
		}

		return this;

	};

	/**
	 * Gets the used locale for the <code>CalendarTimeInterval</code>
	 * Only for internal use
	 * @returns {string} sLocale
	 * @private
	 */
	CalendarTimeInterval.prototype.getLocale = function(){

		if (!this._sLocale) {
			this._sLocale = new Locale(Formatting.getLanguageTag()).toString();
		}

		return this._sLocale;

	};

	CalendarTimeInterval.prototype._getFocusedDate = function(){

		if (!this._oFocusedDate) {
			_determineFocusedDate.call(this);
		}

		return this._oFocusedDate;

	};

	CalendarTimeInterval.prototype._setFocusedDate = function(oDate){

		if (!(oDate instanceof UniversalDate)) {
			throw new Error("Date must be a UniversalDate object " + this);
		}

		this._oFocusedDate = new UniversalDate(oDate.getTime());

	};

	/**
	 * Sets the focused item of the <code>CalendarTimeInterval</code>.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oDate date instance for focused item
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	CalendarTimeInterval.prototype.focusDate = function(oDate){

		var bFireStartDateChange = false;
		var oTimesRow = this.getAggregation("timesRow");
		if (!oTimesRow.checkDateFocusable(oDate)) {
			var oUTCDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);
			_setStartDateForFocus.call(this, oUTCDate);
			bFireStartDateChange = true;
		}

		_displayDate.call(this, oDate, false);

		if (bFireStartDateChange) {
			this.fireStartDateChange();
		}

		return this;

	};

	/**
	 * Displays an item in the <code>CalendarTimeInterval</code> but doesn't set the focus.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oDate date instance for displayed item.
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	CalendarTimeInterval.prototype.displayDate = function(oDate){

		_displayDate.call(this, oDate, true);

		return this;

	};

	CalendarTimeInterval.prototype.setItems = function(iItems){

		this.setProperty("items", iItems);

		iItems = this._getItems(); // to use phone limit

		var oTimesRow = this.getAggregation("timesRow");
		oTimesRow.setItems(iItems);

		// check if focused date still is valid
		var oDate = CalendarUtils._createLocalDate(this._getFocusedDate(), true);
		if (!oTimesRow.checkDateFocusable(oDate)) {
			//focused date not longer visible -> focus start date
			var oStartDate = _getStartDate.call(this);
			this._setFocusedDate(oStartDate);
			oTimesRow.setDate(CalendarUtils._createLocalDate(oStartDate, true));
		}

		if (!this.getPickerPopup()) {
			var oDatesRow = this.getAggregation("datesRow");
			var iDays = Math.floor(iItems * 1.5);
			if (iDays > 31) {
				// to be limited on real month length by opening
				iDays = 31;
			}
			oDatesRow.setDays(iDays);

			var oMonthPicker = this._getMonthPicker();
			var iMonths = Math.floor(iItems / 2);
			if (iMonths > 12) {
				iMonths = 12;
			}
			oMonthPicker.setMonths(iMonths);

			var oYearPicker = this._getYearPicker();
			var iYears = Math.floor(iItems / 2);
			if (iYears > 20) {
				iYears = 20;
			}
			oYearPicker.setYears(iYears);
		}

		_updateHeader.call(this);

		return this;

	};

	CalendarTimeInterval.prototype._getItems = function(){

		var iItems = this.getItems();

		// in phone mode max 6 items are displayed
		if (Device.system.phone && iItems > 6) {
			return 6;
		} else {
			return iItems;
		}

	};

	/*
	 * gets localeData for used locale
	 * if no locale is given use rendered one
	 */
	CalendarTimeInterval.prototype._getLocaleData = function(){

		if (!this._oLocaleData) {
			var sLocale = this.getLocale();
			var oLocale = new Locale(sLocale);
			this._oLocaleData = LocaleData.getInstance(oLocale);
		}

		return this._oLocaleData;

	};

	CalendarTimeInterval.prototype.setPickerPopup = function(bPickerPopup){
		var oHeader = this.getAggregation("header"),
			oDatesRow,
			oMonthPicker, oYearPicker;

		this.setProperty("pickerPopup", bPickerPopup);

		if (oDatesRow) {
			oDatesRow.destroy();
		}

		if (bPickerPopup) {
			oHeader.setVisibleButton0(false);
			oHeader.setVisibleButton1(true);
			oHeader.setVisibleButton2(false);
			oHeader.detachEvent("pressButton1", _handleButton1, this);
			oHeader.attachEvent("pressButton1", _handleButton1, this);

			if (this.getAggregation("datesRow")) {
				this.getAggregation("datesRow").destroy();
			}
			if (this._getMonthPicker()) {
				this._getMonthPicker().destroy();
			}
			if (this._getYearPicker()) {
				this._getYearPicker().destroy();
			}
		} else { //embedded mode
			oHeader.setVisibleButton0(true);
			oHeader.setVisibleButton1(true);
			oHeader.setVisibleButton2(true);

			oHeader.detachEvent("pressButton0", _handleButton0, this);
			oHeader.attachEvent("pressButton0", _handleButton0, this);
			oHeader.detachEvent("pressButton1", _handleButton1, this);
			oHeader.attachEvent("pressButton1", _handleButton1, this);
			oHeader.detachEvent("pressButton2", _handleButton2, this);
			oHeader.attachEvent("pressButton2", _handleButton2, this);

			if (!this.getAggregation("datesRow")) {
				this.setAggregation("datesRow", this._createDatesRow());
			}

			if (!this._getYearPicker()) {
				this.setAggregation("yearPicker", this._createYearPicker());
			}
			if (!this._getMonthPicker()) {
				this.setAggregation("monthPicker", this._createMonthPicker());
			}
			oMonthPicker = this._getMonthPicker();
			oYearPicker = this._getYearPicker();
			oMonthPicker.setColumns(0);
			oMonthPicker.setMonths(6);
			oYearPicker.setColumns(0);
			oYearPicker.setYears(6);
		}

		return this;

	};

	/**
	 * Set minimum date that can be shown and selected in the Calendar.
	 *
	 * @param {Date} [oDate] Min date as a JS Date object
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	CalendarTimeInterval.prototype.setMinDate = function(oDate){
		var oTimesRow,
			iYear,
			oYearPicker,
			oCalPicker;

		if (deepEqual(oDate, this.getMinDate())) {
			return this;
		}

		if (!oDate) {
			// restore default
			CalendarUtils._updateUTCDate(this._oMinDate.getJSDate(), 1, 0, 1, 0, 0, 0, 0);
		} else {
			CalendarUtils._checkJSDateObject(oDate);

			this._oMinDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);
			oTimesRow = this.getAggregation("timesRow");
			this._oMinDate = oTimesRow._getIntervalStart(this._oMinDate); // use start of the interval

			iYear = this._oMinDate.getUTCFullYear();
			CalendarUtils._checkYearInValidRange(iYear);

			if (this._oMaxDate.getTime() < this._oMinDate.getTime()) {
				Log.warning("minDate > maxDate -> maxDate set to end of the month", this);
				this._oMaxDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);
				CalendarUtils._updateUTCDate(this._oMaxDate, null, this._oMaxDate.getUTCMonth() + 1, 0, 23, 59, 59, 0);
				this.setProperty("maxDate", CalendarUtils._createLocalDate(this._oMaxDate, true));
			}

			if (this._oFocusedDate) {
				// check if still in valid range
				if (this._oFocusedDate.getTime() < this._oMinDate.getTime()) {
					Log.warning("focused date < minDate -> minDate focused", this);
					this.focusDate(oDate);
				}
			}

			if (this._oUTCStartDate && this._oUTCStartDate.getTime() < this._oMinDate.getTime()) {
				Log.warning("start date < minDate -> minDate set as start date", this);
				_setStartDate.call(this, new UniversalDate(this._oMinDate.getTime()), true, true);
			}

		}

		this.setProperty("minDate", oDate); // re-render TimesRow because visualization can change

		if (this.getPickerPopup()) {
			oCalPicker = this._getCalendar();
			oCalPicker.setMinDate(oDate);
		} else {
			oYearPicker = this._getYearPicker();
			oYearPicker._oMinDate.setYear(this._oMinDate.getUTCFullYear());
		}

		return this;

	};

	/**
	 * Set maximum date that can be shown and selected in the Calendar.
	 *
	 * @param {Date} [oDate] Max date as a JS Date object
	 * @returns {this} Reference to <code>this</code> for method chaining
	 * @public
	 */
	CalendarTimeInterval.prototype.setMaxDate = function(oDate){
		var oTimesRow,
			iYear,
			oEndDate,
			oStartDate,
			oYearPicker,
			oCalPicker;

		if (deepEqual(oDate, this.getMaxDate())) {
			return this;
		}

		if (!oDate) {
			// restore default
			CalendarUtils._updateUTCDate(this._oMaxDate.getJSDate(), 9999, 11, 31, 23, 59, 59, 0);
		} else {
			CalendarUtils._checkJSDateObject(oDate);

			this._oMaxDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);
			oTimesRow = this.getAggregation("timesRow");
			this._oMaxDate = oTimesRow._getIntervalStart(this._oMaxDate); // use end of the interval
			this._oMaxDate.setUTCMinutes(this._oMaxDate.getUTCMinutes() + this.getIntervalMinutes());
			this._oMaxDate.setUTCMilliseconds(-1);

			iYear = this._oMaxDate.getUTCFullYear();
			CalendarUtils._checkYearInValidRange(iYear);

			if (this._oMinDate.getTime() > this._oMaxDate.getTime()) {
				Log.warning("maxDate < minDate -> minDate set to begin of the month", this);
				this._oMinDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);
				CalendarUtils._updateUTCDate(this._oMinDate, null, null, 1, 0, 0, 0, 0);
				this.setProperty("minDate", CalendarUtils._createLocalDate(this._oMinDate, true));
			}

			if (this._oFocusedDate) {
				// check if still in valid range
				if (this._oFocusedDate.getTime() > this._oMaxDate.getTime()) {
					Log.warning("focused date > maxDate -> maxDate focused", this);
					this.focusDate(oDate);
				}
			}

			if (this._oUTCStartDate) {
				oEndDate = new UniversalDate(this._oUTCStartDate.getTime());
				oEndDate.setUTCMinutes(oEndDate.getUTCMinutes() + this.getIntervalMinutes() * (this._getItems() - 1));
				if (oEndDate.getTime() > this._oMaxDate.getTime()) {
					oStartDate = new UniversalDate(this._oMaxDate.getTime());
					oStartDate.setUTCMinutes(oStartDate.getUTCMinutes() - this.getIntervalMinutes() * (this._getItems() - 1));
					if (oStartDate.getTime() >= this._oMinDate.getTime()) {
						// minDate wins if range is too short
						Log.warning("end date > maxDate -> maxDate set as end date", this);
						_setStartDate.call(this, oStartDate, true, true);
					}
				}
			}
		}

		this.setProperty("maxDate", oDate); // re-render TimesRow because visualization can change

		if (this.getPickerPopup()) {
			oCalPicker = this._getCalendar();
			oCalPicker.setMaxDate(oDate);
		} else {
			oYearPicker = this._getYearPicker();
			oYearPicker._oMaxDate.setYear(this._oMaxDate.getUTCFullYear());
		}

		return this;

	};

	CalendarTimeInterval.prototype.onclick = function(oEvent){

		if (oEvent.isMarked("delayedMouseEvent") ) {
			return;
		}

		if (oEvent.target.id == this.getId() + "-cancel") {
			this.onsapescape(oEvent);
		}

	};

	CalendarTimeInterval.prototype.onmousedown = function(oEvent){

		oEvent.preventDefault(); // to prevent focus set outside of DatePicker
		oEvent.setMark("cancelAutoClose");

	};

	CalendarTimeInterval.prototype.onsapescape = function(oEvent){
		if (this.getPickerPopup()) {
			_closeCalendarPicker.call(this);
			this.fireCancel();
		} else {
			switch (this._iMode) {
			case 0: // time picker
				this.fireCancel();
				break;

			case 1: // day picker
			case 2: // month picker
			case 3: // year picker
				this.setProperty("_currentPicker", CURRENT_PICKERS.TIMES_ROW);
				break;
				// no default
			}
		}
	};

	CalendarTimeInterval.prototype.setProperty = function () {
		var sPropName = arguments[0],
			sPropValue = arguments[1];

		Control.prototype.setProperty.apply(this, arguments);

		if (sPropName === "_currentPicker") {
			switch (sPropValue) {
				case "timesRow": this._iMode = 0; break;
				case "datesRow": this._iMode = 1; break;
				case "monthPicker": this._iMode = 2; break;
				case "yearPicker": this._iMode = 3; break;
				default: return;
			}
		}

		return this;
	};

	CalendarTimeInterval.prototype._handlePrevious = function(oEvent){

		var oFocusedDate = this._getFocusedDate(),
			iItems, oStartDate, iMinutes, oDatesRow, oDate, iDays, oMonthPicker, oYearPicker;

		switch (this._iMode) {
		case 0: // time picker
			iItems = this._getItems();
			oStartDate = new UniversalDate(_getStartDate.call(this).getTime());
			iMinutes = this.getIntervalMinutes();
			oStartDate.setUTCMinutes(oStartDate.getUTCMinutes() - iItems * iMinutes);
			oFocusedDate.setUTCMinutes(oFocusedDate.getUTCMinutes() - iItems * iMinutes);
			this._setFocusedDate(oFocusedDate);
			_setStartDate.call(this, oStartDate, true);

			break;

		case 1: // day picker
			if (!this.getPickerPopup()) {
				oDatesRow = this.getAggregation("datesRow");
				oDate = CalendarUtils._createUniversalUTCDate(oDatesRow.getDate());
				iDays = oDatesRow.getDays();
				if (oDate.getUTCDate() <= iDays) {
					// stay in month
					oDate.setUTCDate(1);
				} else  {
					oDate.setUTCDate(oDate.getUTCDate() - iDays);
				}
				_setDateInDatesRow.call(this, oDate);
			}
			break;

		case 2: // month picker
			if (!this.getPickerPopup()) {
				oMonthPicker = this._getMonthPicker();
				if (oMonthPicker.getMonths() < 12) {
					oMonthPicker.previousPage();
					_togglePrevNext.call(this);
				} else {
					oFocusedDate.setUTCFullYear(oFocusedDate.getUTCFullYear() - 1);
					_setStartDateForFocus.call(this, oFocusedDate);
					this._setFocusedDate(oFocusedDate);
					_updateHeader.call(this);
					_setDisabledMonths.call(this, oFocusedDate.getUTCFullYear(), oMonthPicker);
					this.fireStartDateChange();
				}
			}
			break;

		case 3: // year picker
			if (!this.getPickerPopup()) {
				oYearPicker = this._getYearPicker();
				oYearPicker.previousPage();
				_togglePrevNexYearPicker.call(this);
			}
			break;
			// no default
		}

	};

	CalendarTimeInterval.prototype._handleNext = function(oEvent){

		var oFocusedDate = this._getFocusedDate();

		switch (this._iMode) {
		case 0: // time picker
			var iItems = this._getItems();
			var oStartDate = new UniversalDate(_getStartDate.call(this).getTime());
			var iMinutes = this.getIntervalMinutes();
			oStartDate.setUTCMinutes(oStartDate.getUTCMinutes() + iItems * iMinutes);
			oFocusedDate.setUTCMinutes(oFocusedDate.getUTCMinutes() + iItems * iMinutes);
			this._setFocusedDate(oFocusedDate);
			_setStartDate.call(this, oStartDate, true);

			break;

		case 1: // day picker
			if (!this.getPickerPopup()) {
				var oDatesRow = this.getAggregation("datesRow");
				var oDate = CalendarUtils._createUniversalUTCDate(oDatesRow.getDate());
				var oLastDayOfMonth = new UniversalDate(oDate.getTime());
				oLastDayOfMonth.setUTCDate(1);
				oLastDayOfMonth.setUTCMonth(oLastDayOfMonth.getUTCMonth() + 1);
				oLastDayOfMonth.setUTCDate(0);
				var iDays = oDatesRow.getDays();
				if (oDate.getUTCDate() + iDays > oLastDayOfMonth.getUTCDate()) {
					// stay in month
					oDate.setUTCDate(oLastDayOfMonth.getUTCDate());
				} else  {
					oDate.setUTCDate(oDate.getUTCDate() + iDays);
				}
				_setDateInDatesRow.call(this, oDate);
			}

			break;

		case 2: // month picker
			if (!this.getPickerPopup()) {
				var oMonthPicker = this._getMonthPicker();
				if (oMonthPicker.getMonths() < 12) {
					oMonthPicker.nextPage();
					_togglePrevNext.call(this);
				} else {
					oFocusedDate.setUTCFullYear(oFocusedDate.getUTCFullYear() + 1);
					_setStartDateForFocus.call(this, oFocusedDate);
					this._setFocusedDate(oFocusedDate);
					_updateHeader.call(this);
					_setDisabledMonths.call(this, oFocusedDate.getUTCFullYear(), oMonthPicker);
					this.fireStartDateChange();
				}
			}
			break;

		case 3: // year picker
			if (!this.getPickerPopup()) {
				var oYearPicker = this._getYearPicker();
				oYearPicker.nextPage();
				_togglePrevNexYearPicker.call(this);
			}
			break;
			// no default

		}

	};

	CalendarTimeInterval.prototype._getShowItemHeader = function(){

		var iItems = this.getItems();
		if (iItems > this._iItemsHead) {
			return true;
		} else  {
			return false;
		}

	};

	function _setStartDate(oStartDate, bSetFocusDate, bNoEvent){

		var oMaxDate = new UniversalDate(this._oMaxDate.getTime());
		oMaxDate.setUTCMinutes(oMaxDate.getUTCMinutes() - this.getIntervalMinutes() * (this._getItems() - 1));
		if (oMaxDate.getTime() < this._oMinDate.getTime()) {
			// min and max smaller than interval
			oMaxDate = new UniversalDate(this._oMinDate.getTime());
			oMaxDate.setUTCMinutes(oMaxDate.getUTCMinutes() + this.getIntervalMinutes() * (this._getItems() - 1));
		}
		if (oStartDate.getTime() < this._oMinDate.getTime()) {
			oStartDate = new UniversalDate(this._oMinDate.getTime());
		} else if (oStartDate.getTime() > oMaxDate.getTime()){
			oStartDate = oMaxDate;
		}

		var oTimesRow = this.getAggregation("timesRow");
		var oLocalDate = CalendarUtils._createLocalDate(oStartDate, true);
		oTimesRow.setStartDate(oLocalDate);
		// let the TimesRow calculate the begin of the interval
		this._oUTCStartDate = new UniversalDate(oTimesRow._getStartDate().getTime());
		oLocalDate = CalendarUtils._createLocalDate(this._oUTCStartDate, true);
		this.setProperty("startDate", oLocalDate);

		_updateHeader.call(this);

		if (bSetFocusDate) {
			var oDate = CalendarUtils._createLocalDate(this._getFocusedDate(), true);
			if (!oTimesRow.checkDateFocusable(oDate)) {
				//focused date not longer visible -> focus start date
				this._setFocusedDate(oStartDate);
				oTimesRow.setDate(oLocalDate);
			} else  {
				oTimesRow.setDate(oDate);
			}
		}

		if (!bNoEvent) {
			this.fireStartDateChange();
		}

	}

	function _getStartDate(){

		if (!this._oUTCStartDate) {
			// no start date set, use focused date
			var oTimesRow = this.getAggregation("timesRow");
			oTimesRow.setStartDate(CalendarUtils._createLocalDate(this._getFocusedDate(), true));
			// let the TimesRow calculate the begin of the interval
			this._oUTCStartDate = new UniversalDate(oTimesRow._getStartDate().getTime());
			this._setFocusedDate(this._oUTCStartDate);
		}

		return this._oUTCStartDate;

	}

	/*
	 * sets the date in the used Month controls
	 * @param {boolean} bSkipFocus if set no focus is set to the date
	 */
	function _renderTimesRow(bSkipFocus){

		var oDate = this._getFocusedDate();
		var oTimesRow = this.getAggregation("timesRow");

		if (!bSkipFocus) {
			oTimesRow.setDate(CalendarUtils._createLocalDate(oDate, true));
		} else {
			oTimesRow.displayDate(CalendarUtils._createLocalDate(oDate, true));
		}

		// change header buttons
		_updateHeader.call(this);

	}

	function _determineFocusedDate(){

		var aSelectedDates = this.getSelectedDates();
		if (aSelectedDates && aSelectedDates[0] && aSelectedDates[0].getStartDate()) {
			// selected dates are provided -> use first one to focus
			this._oFocusedDate = CalendarUtils._createUniversalUTCDate(aSelectedDates[0].getStartDate(), undefined, true);
		} else {
			// use current date
			var oNewDate = UI5Date.getInstance();
			this._oFocusedDate = CalendarUtils._createUniversalUTCDate(oNewDate, undefined, true);
		}

		if (this._oFocusedDate.getTime() < this._oMinDate.getTime()) {
			this._oFocusedDate = new UniversalDate(this._oMinDate.getTime());
		} else if (this._oFocusedDate.getTime() > this._oMaxDate.getTime()){
			this._oFocusedDate = new UniversalDate(this._oMaxDate.getTime());
		}

	}

	CalendarTimeInterval.prototype._showCalendarPicker = function() {
		var oDate = CalendarUtils._createLocalDate(this._getFocusedDate(), true);
		var oCalPicker = this._getCalendar();
		var oSelectedDate = new DateRange({ startDate: oDate });

		oCalPicker.displayDate(oDate, false);
		oCalPicker.removeAllSelectedDates();
		oCalPicker.addSelectedDate(oSelectedDate);
		oCalPicker.setMinDate(this.getMinDate());
		oCalPicker.setMaxDate(this.getMaxDate());

		_openPickerPopup.call(this, oCalPicker);
		this._showOverlay();
	};

	CalendarTimeInterval.prototype._showOverlay = function () {
		this.$("contentOver").css("display", "");
	};

	CalendarTimeInterval.prototype._hideOverlay = function () {
		this.$("contentOver").css("display", "none");
	};

	function _closeCalendarPicker(bSkipFocus) {
		if (this._oPopup && this._oPopup.isOpen()) {
			this._oPopup.close();
		}
		this._hideOverlay();
		if (!bSkipFocus) {
			_renderTimesRow.call(this); // to focus date
		}

		this._getCalendar()._closePickers();
	}

	/**
	 * Shows an embedded day Picker.
	 * This function assumes there is a "datesRow" aggregation.
	 * So callers must take care.
	 * @returns {void}
	 * @private
	 */
	function _showDayPicker(){

		var oDate = this._getFocusedDate();
		var iItems = this._getItems();
		var oDatesRow = this.getAggregation("datesRow");
		var oDateRange = oDatesRow.getSelectedDates()[0];
		oDateRange.setStartDate(CalendarUtils._createLocalDate(oDate, true));

		// set number of days - but max number of days of this month
		var oLastDayOfMonth = new UniversalDate(oDate.getTime());
		oLastDayOfMonth.setUTCDate(1);
		oLastDayOfMonth.setUTCMonth(oLastDayOfMonth.getUTCMonth() + 1);
		oLastDayOfMonth.setUTCDate(0);
		var iLastDay = oLastDayOfMonth.getUTCDate();
		var iDays = Math.floor(iItems * 1.5);
		if (iDays > iLastDay) {
			// to be limited on real month length by opening
			iDays = iLastDay;
		}
		oDatesRow.setDays(iDays);

		this.setProperty("_currentPicker", CURRENT_PICKERS.DATES_ROW);

		this._showOverlay();

		// set start date and focus date
		_setDateInDatesRow.call(this, oDate);

		this._iMode = 1;

	}

	/**
	 * Shows an embedded month Picker.
	 * This function assumes there is a "monthPicker" aggregation.
	 * So callers must take care.
	 * @returns {void}
	 * @private
	 */
	function _showMonthPicker(){


		var oDate = this._getFocusedDate();
		var oMonthPicker = this._getMonthPicker();

		this.setProperty("_currentPicker", CURRENT_PICKERS.MONTH_PICKER);

		this._showOverlay();

		oMonthPicker.setMonth(oDate.getUTCMonth());
		_setDisabledMonths.call(this, oDate.getUTCFullYear(), oMonthPicker);

		this._iMode = 2;

		_togglePrevNext.call(this);

	}

	/**
	 * Shows an embedded year Picker.
	 * This function assumes there is a "yearPicker" aggregation.
	 * So callers must take care.
	 * @returns {void}
	 * @private
	 */
	function _showYearPicker(){

		var oDate = this._getFocusedDate();
		var oYearPicker = this._getYearPicker();

		this.setProperty("_currentPicker", CURRENT_PICKERS.YEAR_PICKER);

		this._showOverlay();

		oYearPicker.setDate(oDate.getJSDate());

		_togglePrevNexYearPicker.call(this);

		this._iMode = 3;

	}

	function _updateHeader(){

		_setHeaderText.call(this);
		_togglePrevNext.call(this);

	}

	/**
	 * Enables / Disables previous and next button in the Header.
	 * This function assumes there is a "monthPicker" aggregation unless the bSkipMonthCheck flag is false.
	 * So callers must take care.
	 * @param {boolean} bSkipMonthCheck if month picker should be examined or not
	 * @returns {void}
	 * @private
	 */
	function _togglePrevNext(bSkipMonthCheck){

		var oDate = new UniversalDate(_getStartDate.call(this).getTime());
		var iItems = this._getItems();
		var iYear = oDate.getJSDate().getUTCFullYear();
		var iYearMax = this._oMaxDate.getJSDate().getUTCFullYear();
		var iYearMin = this._oMinDate.getJSDate().getUTCFullYear();
		var iMonth = oDate.getJSDate().getUTCMonth();
		var iMonthMax = this._oMaxDate.getJSDate().getUTCMonth();
		var iMonthMin = this._oMinDate.getJSDate().getUTCMonth();
		var iDate = oDate.getJSDate().getUTCDate();
		var iDateMax = this._oMaxDate.getJSDate().getUTCDate();
		var iDateMin = this._oMinDate.getJSDate().getUTCDate();
		var iHours = oDate.getJSDate().getUTCHours();
		var iHoursMax = this._oMaxDate.getJSDate().getUTCHours();
		var iHoursMin = this._oMinDate.getJSDate().getUTCHours();
		var iMinutes = oDate.getJSDate().getUTCMinutes();
		var iMinutesMax = this._oMaxDate.getJSDate().getUTCMinutes();
		var iMinutesMin = this._oMinDate.getJSDate().getUTCMinutes();
		var oHeader = this.getAggregation("header");

		if (this._iMode == 2 && !bSkipMonthCheck) {
			// in line month picker don't disable buttons
			var oMonthPicker = this._getMonthPicker();
			var iMonths = oMonthPicker.getMonths();
			var iStartMonth = oMonthPicker.getStartMonth();
			var iEndMonth = iStartMonth + iMonths - 1;

			if (iStartMonth == 0 || (iYear == iYearMin && iStartMonth <= iMonthMin)) {
				oHeader.setEnabledPrevious(false);
			} else {
				oHeader.setEnabledPrevious(true);
			}

			if (iEndMonth > 10 || (iYear == iYearMax && iEndMonth >= iMonthMax)) {
				oHeader.setEnabledNext(false);
			} else {
				oHeader.setEnabledNext(true);
			}

			return;
		}

		if ((iYear < iYearMin ||
				(iYear == iYearMin && ( bSkipMonthCheck || ( iMonth < iMonthMin ||
						(iMonth == iMonthMin && (iDate < iDateMin ||
								(iDate == iDateMin && (iHours < iHoursMin ||
										(iHours == iHoursMin && iMinutes <= iMinutesMin)))))))))
				|| ((this._iMode == 1 || this._iMode == 2) && this.getPickerPopup())) {
			oHeader.setEnabledPrevious(false);
		} else  {
			oHeader.setEnabledPrevious(true);
		}

		oDate.setUTCMinutes(oDate.getUTCMinutes() + (iItems) * this.getIntervalMinutes() - 1);
		iYear = oDate.getJSDate().getUTCFullYear();
		iMonth = oDate.getJSDate().getUTCMonth();
		iDate = oDate.getJSDate().getUTCDate();
		iHours = oDate.getJSDate().getUTCHours();
		iMinutes = oDate.getJSDate().getUTCMinutes();
		if ((iYear > iYearMax ||
				(iYear == iYearMax && ( !bSkipMonthCheck || ( iMonth > iMonthMax ||
						(iMonth == iMonthMax && (iDate > iDateMax ||
								(iDate == iDateMax && (iHours > iHoursMax ||
										(iHours == iHoursMax && iMinutes >= iMinutesMax)))))))))
				|| ((this._iMode == 1 || this._iMode == 2) && this.getPickerPopup())) {
			oHeader.setEnabledNext(false);
		} else  {
			oHeader.setEnabledNext(true);
		}

		if (this._iMode === 1) {
			var oLastDayOfMonth = new UniversalDate(oDate.getTime());
			oLastDayOfMonth.setUTCDate(1);
			oLastDayOfMonth.setUTCMonth(oLastDayOfMonth.getUTCMonth() + 1);
			oLastDayOfMonth.setUTCDate(0);
			var iDays = this.getAggregation("datesRow").getDays();
			oDate.setUTCDate( 1 + (Math.ceil(oDate.getUTCDate() / iDays) - 1) * iDays );
			if (oLastDayOfMonth.getUTCDate() - oDate.getUTCDate() < iDays) {
				oDate.setUTCDate(oLastDayOfMonth.getUTCDate() - iDays + 1);
			}
			iDate = oDate.getUTCDate();
			if (iDate <= 1 || (iYear == iYearMin && iMonth == iMonthMin && iDate <= iDateMin)) {
				oHeader.setEnabledPrevious(false);
			} else {
				oHeader.setEnabledPrevious(true);
			}

			if ((iDate + iDays) >= oLastDayOfMonth.getUTCDate() || (iYear == iYearMax && iMonth == iMonthMax && iDate >= iDateMax)) {
				oHeader.setEnabledNext(false);
			} else {
				oHeader.setEnabledNext(true);
			}
		}

	}

	/**
	 * Disable / Enable the next and previous button in the Header.
	 * This function assumes there is a "yearPicker" aggregation.
	 * So callers must take care.
	 * @returns {void}
	 * @private
	 */
	function _togglePrevNexYearPicker(){

		var oYearPicker = this._getYearPicker();
		var iYears = oYearPicker.getYears();
		var oDate = CalendarUtils._createUniversalUTCDate(oYearPicker.getProperty("_middleDate").toLocalJSDate());
		oDate.setUTCFullYear(oDate.getUTCFullYear() + Math.floor(iYears / 2));
		var oHeader = this.getAggregation("header");
		var oMaxDate = new UniversalDate(this._oMaxDate);
		oMaxDate.setUTCFullYear(oMaxDate.getUTCFullYear() - Math.ceil(iYears / 2));
		oMaxDate.setUTCMonth(11, 31);
		var oMinDate = new UniversalDate(this._oMinDate);
		oMinDate.setUTCFullYear(oMinDate.getUTCFullYear() + Math.floor(iYears / 2) + 1);
		oMinDate.setUTCMonth(0, 1);

		if (oDate.getTime() > oMaxDate.getTime()) {
			oHeader.setEnabledNext(false);
		} else {
			oHeader.setEnabledNext(true);
		}
		if (oDate.getTime() < oMinDate.getTime()) {
			oHeader.setEnabledPrevious(false);
		} else {
			oHeader.setEnabledPrevious(true);
		}

	}

	function _setHeaderText(){

		// sets the text for the day, month and year button to the header
		var oHeader = this.getAggregation("header");
		var sText;
		var oStartDate = _getStartDate.call(this);
		var oDateFormat;
		var oLocaleData = this._getLocaleData();
		var aMonthNames = [];
		var aMonthNamesWide = [];
		var sAriaLabel;
		var bShort = false;
		var aDay;
		var bRelative = false;

		if (oLocaleData.oLocale.sLanguage.toLowerCase() === "ja" || oLocaleData.oLocale.sLanguage.toLowerCase() === "zh") {
			// format the day to have the specific day symbol in Japanese and Chinese
			aDay = DateFormat.getDateInstance({format: "d"}).format(oStartDate, true);
		} else {
			aDay = (oStartDate.getUTCDate()).toString();
		}

		if (this._bLongMonth || !this._bNamesLengthChecked) {
			aMonthNames = oLocaleData.getMonthsStandAlone("wide");
		} else {
			bShort = true;
			aMonthNames = oLocaleData.getMonthsStandAlone("abbreviated");
			aMonthNamesWide = oLocaleData.getMonthsStandAlone("wide");
		}

		var iMonth = oStartDate.getUTCMonth();
		sText = aMonthNames[iMonth];
		if (bShort) {
			sAriaLabel = aMonthNamesWide[aMonthNames[iMonth]];
		}

		if (!this.getPickerPopup()) {
			oHeader.setTextButton0(aDay);
			oHeader.setTextButton1(sText);
			oHeader.setTextButton2(this._oYearFormat.format(oStartDate, true));
		} else {
			oDateFormat = DateFormat.getInstance({style: "long", strictParsing: true, relative: bRelative}, oLocaleData.oLocale);
			sAriaLabel = aDay = oDateFormat.format(CalendarUtils._createLocalDate(oStartDate, true));
			oHeader.setTextButton1(aDay);
		}

		if (bShort) {
			oHeader.setAriaLabelButton1(sAriaLabel);
		}
	}

	function _focusDate(oDate, bNotVisible){

		// if a date should be focused thats out of the borders -> focus the border
		var oFocusedDate;
		var bChanged = false;
		if (oDate.getTime() < this._oMinDate.getTime()) {
			oFocusedDate = this._oMinDate;
			bChanged = true;
		} else if (oDate.getTime() > this._oMaxDate.getTime()){
			oFocusedDate = this._oMaxDate;
			bChanged = true;
		} else  {
			oFocusedDate = oDate;
		}

		this._setFocusedDate(oFocusedDate);

		if (bChanged || bNotVisible) {
			_setStartDateForFocus.call(this, oFocusedDate);
			_renderTimesRow.call(this, false);
			this.fireStartDateChange();
		}

	}

	function _displayDate(oDate, bSkipFocus){

		if (oDate && (!this._oFocusedDate || this._oFocusedDate.getTime() != oDate.getTime())) {
			CalendarUtils._checkJSDateObject(oDate);

			oDate = CalendarUtils._createUniversalUTCDate(oDate, undefined, true);

			var iYear = oDate.getUTCFullYear();
			CalendarUtils._checkYearInValidRange(iYear);

			if (oDate.getTime() < this._oMinDate.getTime() || oDate.getTime() > this._oMaxDate.getTime()) {
				throw new Error("Date must not be in valid range (minDate and maxDate); " + this);
			}

			this._setFocusedDate(oDate);

			if (this.getDomRef() && this._iMode == 0) {
				_renderTimesRow.call(this, bSkipFocus);
			}
		}

	}

	function _handleButton0(oEvent){

		if (this._iMode != 1) {
			_showDayPicker.call(this);
		} else {
			this.setProperty("_currentPicker", CURRENT_PICKERS.TIMES_ROW);
		}

	}

	function _handleButton1(oEvent){
		var fnMPDelegate;

		if (this.getPickerPopup()) {
			this._showCalendarPicker();
		} else {
			if (this._iMode != 2) {
				fnMPDelegate = function () {
					var oMonthPicker = this._getMonthPicker();

					oMonthPicker._oItemNavigation.focusItem(oMonthPicker.getProperty("_focusedMonth"));
					oMonthPicker.removeDelegate(fnMPDelegate);
				};
				_showMonthPicker.call(this);
				this._getMonthPicker().addDelegate({ onAfterRendering: fnMPDelegate }, this);
			} else {
				this.setProperty("_currentPicker", CURRENT_PICKERS.TIMES_ROW);
			}
		}

	}

	function _handleButton2(oEvent){
		var fnYPDelegate;

		if (this._iMode != 3) {
			fnYPDelegate = function () {
				var oYearPicker = this._getYearPicker();

				oYearPicker.focus();
				oYearPicker.removeDelegate(fnYPDelegate);
			};
			_showYearPicker.call(this);
			this._getYearPicker().addDelegate({ onAfterRendering: fnYPDelegate }, this);

		} else {
			this.setProperty("_currentPicker", CURRENT_PICKERS.TIMES_ROW);
		}

	}

	function _handleSelect(oEvent){

		this.fireSelect();

	}

	function _handleFocus(oEvent){

		var oDate = CalendarUtils._createUniversalUTCDate(oEvent.getParameter("date"), undefined, true);
		var bNotVisible = oEvent.getParameter("notVisible");

		_focusDate.call(this, oDate, bNotVisible);

	}

	function _handleCalendarDateSelect(oEvent) {
		var oCalendar = oEvent.getSource(),
			oSelectedDate = oCalendar.getSelectedDates()[0].getStartDate();

		var oFocusedDate = new UniversalDate(this._getFocusedDate().getTime());
		var oDate = CalendarUtils._createUniversalUTCDate(oSelectedDate);

		oFocusedDate.setUTCFullYear(oDate.getUTCFullYear());

		//setting separately month and date afterwards could lead to not needed shifting of the month
		oFocusedDate.setUTCMonth(oDate.getUTCMonth(), oDate.getUTCDate());

		_focusDate.call(this, oFocusedDate, true);
		_closeCalendarPicker.call(this);
	}

	function _handleDateSelect(oEvent){

		var oFocusedDate = new UniversalDate(this._getFocusedDate().getTime());
		var oDatesRow = oEvent.oSource;
		var oDateRange = oDatesRow.getSelectedDates()[0];
		var oDate = CalendarUtils._createUniversalUTCDate(oDateRange.getStartDate());

		if (!this.getPickerPopup() || oDate.getUTCMonth() == oFocusedDate.getUTCMonth()) {
			// ignore days outside month if in popup mode
			oFocusedDate.setUTCDate(oDate.getUTCDate());
			oFocusedDate.setUTCMonth(oDate.getUTCMonth());
			oFocusedDate.setUTCFullYear(oDate.getUTCFullYear());

			_focusDate.call(this, oFocusedDate, true);

			this.setProperty("_currentPicker", CURRENT_PICKERS.TIMES_ROW);
		}

		this._addTimesRowFocusDelegate();

	}

	/**
	 * Handles day focus from the embedded day Picker.
	 * This function assumes there is a "datesRow" aggregation.
	 * So callers must take care.
	 * @returns {void}
	 * @private
	 */
	function _handleDateFocus(oEvent){

		var oFocusedDate = new UniversalDate(this._getFocusedDate().getTime());
		var oDate = CalendarUtils._createUniversalUTCDate(oEvent.getParameter("date"), undefined, true);
		var bNotVisible = oEvent.getParameter("otherMonth");

		if (bNotVisible &&
				oDate.getUTCMonth() == oFocusedDate.getUTCMonth() &&
				oDate.getUTCFullYear() == oFocusedDate.getUTCFullYear()) {
			// only show days in the same month
			// set start date and focus date
			_setDateInDatesRow.call(this, oDate);
		}

	}

	/**
	 * Handles user selection of a month from the Month Picker.
	 * This function assumes there is a "monthPicker" aggregation.
	 * So callers must take care.
	 * @returns {void}
	 * @private
	 */
	function _handleSelectMonth(oEvent){

		var oFocusedDate = new UniversalDate(this._getFocusedDate().getTime());
		var oMonthPicker = this._getMonthPicker();
		var iMonth = oMonthPicker.getMonth();

		oFocusedDate.setUTCMonth(iMonth);

		if (iMonth != oFocusedDate.getUTCMonth() ) {
			// day did not exist in this month (e.g. 31) -> go to last day of month
			oFocusedDate.setUTCDate(0);
		}

		_focusDate.call(this, oFocusedDate, true);

		this.setProperty("_currentPicker", CURRENT_PICKERS.TIMES_ROW);

		this._addTimesRowFocusDelegate();

	}

	/**
	 * Handles the user year selection.
	 * This function assumes there is a "yearPicker" aggregation.
	 * So callers must take care.
	 * @returns {void}
	 * @private
	 */
	function _handleSelectYear(oEvent){

		var oFocusedDate = new UniversalDate(this._getFocusedDate().getTime());
		var oYearPicker = this._getYearPicker();
		var oDate = CalendarUtils._createUniversalUTCDate(oYearPicker.getDate());
		var iMonth = oFocusedDate.getUTCMonth();

		oDate.setUTCMonth(oFocusedDate.getUTCMonth(), oFocusedDate.getUTCDate()); // to keep day and month stable also for islamic date
		oDate.setUTCHours(oFocusedDate.getUTCHours());
		oDate.setUTCMinutes(oFocusedDate.getUTCMinutes());
		oFocusedDate = oDate;

		if (iMonth != oFocusedDate.getUTCMonth() ) {
			// day did not exist in this year (29. Feb) -> go to last day of month
			oFocusedDate.setUTCDate(0);
		}

		_focusDate.call(this, oFocusedDate, true);

		this.setProperty("_currentPicker", CURRENT_PICKERS.TIMES_ROW);

		this._addTimesRowFocusDelegate();
	}

	CalendarTimeInterval.prototype._addTimesRowFocusDelegate = function () {
		var oFocusMonthsRowDelegate = {
				onAfterRendering: function() {
					this._oItemNavigation.focusItem(this._oItemNavigation.getFocusedIndex());
					this.removeDelegate(oFocusMonthsRowDelegate);
				}
			},
			oTimesRow = this.getAggregation("timesRow");

		oTimesRow.addDelegate(oFocusMonthsRowDelegate,  oTimesRow);
	};

	function _setStartDateForFocus(oDate) {

		// set start date according to new focused date
		// only if focused date is not in current rendered month interval
		// new focused date should have the same position like the old one
		var oTimesRow = this.getAggregation("timesRow");
		var oStartDate = _getStartDate.call(this);
		var iIndex = oTimesRow._oItemNavigation.getFocusedIndex();
		oStartDate = new UniversalDate(oDate.getTime());
		oStartDate.setUTCMinutes( oStartDate.getUTCMinutes() - iIndex * this.getIntervalMinutes());
		_setStartDate.call(this, oStartDate, false, true);

	}

	/**
	 * Sets date in the embedded day Picker.
	 * This function assumes there is a "datesRow" aggregation.
	 * So callers must take care.
	 * @param oDate
	 * @returns {void}
	 * @private
	 */
	function _setDateInDatesRow(oDate) {

		var oDatesRow = this.getAggregation("datesRow");
		var oHeader = this.getAggregation("header");

		if (!this.getPickerPopup()) {
			// set number of days - but max number of days of this month
			var oLastDayOfMonth = new UniversalDate(oDate.getTime());
			oLastDayOfMonth.setUTCDate(1);
			oLastDayOfMonth.setUTCMonth(oLastDayOfMonth.getUTCMonth() + 1);
			oLastDayOfMonth.setUTCDate(0);
			var iDays = oDatesRow.getDays();

			// set start day and selected day
			var oStartDate = new UniversalDate(oDate.getTime());
			oStartDate.setUTCDate( 1 + (Math.ceil(oDate.getUTCDate() / iDays) - 1) * iDays );
			if (oLastDayOfMonth.getUTCDate() - oStartDate.getUTCDate() < iDays) {
				oStartDate.setUTCDate(oLastDayOfMonth.getUTCDate() - iDays + 1);
			}

			oDatesRow.setStartDate(CalendarUtils._createLocalDate(oStartDate, true));

			var iYear = oStartDate.getJSDate().getUTCFullYear();
			var iYearMax = this._oMaxDate.getJSDate().getUTCFullYear();
			var iYearMin = this._oMinDate.getJSDate().getUTCFullYear();
			var iMonth = oStartDate.getJSDate().getUTCMonth();
			var iMonthMax = this._oMaxDate.getJSDate().getUTCMonth();
			var iMonthMin = this._oMinDate.getJSDate().getUTCMonth();
			var iDate = oStartDate.getJSDate().getUTCDate();
			var iDateMax = this._oMaxDate.getJSDate().getUTCDate();
			var iDateMin = this._oMinDate.getJSDate().getUTCDate();

			if (iDate <= 1 || (iYear == iYearMin && iMonth == iMonthMin && iDate <= iDateMin)) {
				oHeader.setEnabledPrevious(false);
			} else {
				oHeader.setEnabledPrevious(true);
			}

			if ((iDate + iDays) >= oLastDayOfMonth.getUTCDate() || (iYear == iYearMax && iMonth == iMonthMax && iDate >= iDateMax)) {
				oHeader.setEnabledNext(false);
			} else {
				oHeader.setEnabledNext(true);
			}

			if (!this._oFocusDatesRowDelegate) {
				this._oFocusDatesRowDelegate = {
					onAfterRendering: function() {
						this.focus();
					}
				};

				oDatesRow.addDelegate(this._oFocusDatesRowDelegate,  oDatesRow);
			}

		} else {
			oHeader.setEnabledPrevious(false);
			oHeader.setEnabledNext(false);
		}

		oDatesRow.setDate(CalendarUtils._createLocalDate(oDate, true));
	}

	function _openPickerPopup(oPicker){

		if (!this._oPopup) {
			var oPopover = new Popover({
				placement: "VerticalPreferredBottom",
				showHeader: false,
				showArrow: false,
				verticalScrolling: false
			});

			oPopover.oPopup.setDurations(0, 0); // no animations
			oPopover.addEventDelegate({
				onsapescape: this._oCalendar.onsapescape
			}, this._oCalendar);

			this._oPopup = oPopover;
		}

		this._oPopup.addContent(oPicker);

		this._oPopup.attachAfterClose(function () {
			this._hideOverlay();
			this._addTimesRowFocusDelegate();
		}, this);

		this._oPopup.attachAfterOpen(function () {
			var $Button = oHeader.$("B1");
			var $Popover = this._oPopup.$();
			var iOffsetX = Math.floor(($Popover.width() - $Button.width()) / 2);

			this._oPopup.setOffsetX(Localization.getRTL() ? iOffsetX : -iOffsetX);

			var iOffsetY = $Button.height();

			this._oPopup.setOffsetY(this._oPopup._getCalculatedPlacement() === "Top" ? iOffsetY : -iOffsetY);
		}, this);

		var oHeader = this.getAggregation("header");
		this._oPopup.openBy(oHeader.getDomRef("B1"));
	}

	function _setDisabledMonths(iYear, oMonthPicker) {

		var iMinMonth = 0;
		var iMaxMonth = 11;

		if (iYear == this._oMinDate.getUTCFullYear()) {
			iMinMonth = this._oMinDate.getUTCMonth();
		}

		if (iYear == this._oMaxDate.getUTCFullYear()) {
			iMaxMonth = this._oMaxDate.getUTCMonth();
		}

		oMonthPicker.setMinMax(iMinMonth, iMaxMonth);

	}

	function _handleMonthPickerPageChange(oEvent) {

		_togglePrevNext.call(this);

	}

	function _handleYearPickerPageChange(oEvent) {

		_togglePrevNexYearPicker.call(this);

	}

	return CalendarTimeInterval;

});