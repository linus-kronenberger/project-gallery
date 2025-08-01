/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["sap/ui/core/Element", 'sap/ui/unified/calendar/CalendarUtils', 'sap/ui/unified/calendar/CalendarDate', 'sap/ui/unified/CalendarLegendRenderer', 'sap/ui/unified/library', "sap/base/Log", "sap/ui/core/date/UI5Date"],
	function(Element, CalendarUtils, CalendarDate, CalendarLegendRenderer, library, Log, UI5Date) {
		"use strict";


	// shortcut for sap.ui.unified.CalendarDayType
	var CalendarDayType = library.CalendarDayType;


	/**
	 * Month renderer.
	 * @namespace
	 */
	var MonthsRowRenderer = {
		apiVersion: 2
	};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.unified.calendar.MonthsRow} oMonthsRow An object representation of the control that should be rendered
	 */
	MonthsRowRenderer.render = function(oRm, oMonthsRow){

		var oDate = oMonthsRow._getStartDate();
		var sTooltip = oMonthsRow.getTooltip_AsString();
		var sId = oMonthsRow.getId();

		oRm.openStart("div", oMonthsRow);
		oRm.class("sapUiCalMonthsRow");
		oRm.class("sapUiCalRow");

		if (sTooltip) {
			oRm.attr("title", sTooltip);
		}

		oRm.accessibilityState(oMonthsRow, {
			role: "grid",
			readonly: "true",
			multiselectable: !oMonthsRow.getSingleSelection() || oMonthsRow.getIntervalSelection()
		});

		oRm.openEnd(); // div element

		if (oMonthsRow.getIntervalSelection()) {
			oRm.openStart("span", sId + "-Start");
			oRm.style("display", "none");
			oRm.openEnd();
			oRm.text(oMonthsRow._rb.getText("CALENDAR_START_MONTH"));
			oRm.close("span");
			oRm.openStart("span", sId + "-End");
			oRm.style("display", "none");
			oRm.openEnd();
			oRm.text(oMonthsRow._rb.getText("CALENDAR_END_MONTH"));
			oRm.close("span");
		}

		this.renderRow(oRm, oMonthsRow, oDate);

		oRm.close("div");

	};

	/**
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.unified.calendar.MonthsRow} oMonthsRow An object representation of the control that should be rendered
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate The first date of the month
	 */
	MonthsRowRenderer.renderRow = function(oRm, oMonthsRow, oDate){

		var sId = oMonthsRow.getId();

		// header line
		this.renderHeader(oRm, oMonthsRow, oDate);

		// months
		oRm.openStart("div", sId + "-months"); // extra DIV around the months to allow rerendering only it's content
		oRm.class("sapUiCalItems");
		oRm.attr("role", "row");
		oRm.openEnd();
		this.renderMonths(oRm, oMonthsRow, oDate);
		oRm.close("div");
	};

	/**
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.unified.calendar.MonthsRow} oMonthsRow An object representation of the control that should be rendered
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate The first date of the month
	 */
	MonthsRowRenderer.renderHeader = function(oRm, oMonthsRow, oDate){
		CalendarUtils._checkCalendarDate(oDate);

		// header
		if (oMonthsRow._getShowHeader()) {
			var oLocaleData = oMonthsRow._getLocaleData();
			var sId = oMonthsRow.getId();

			oRm.openStart("div", sId + "-Head");
			oRm.openEnd();
			this.renderHeaderLine(oRm, oMonthsRow, oLocaleData, oDate);
			oRm.close("div");
		}

	};

	/**
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.unified.calendar.MonthsRow} oMonthsRow An object representation of the control that should be rendered
	 * @param {sap.ui.core.LocaleData} oLocaleData
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate The first date of the month
	 */
	MonthsRowRenderer.renderHeaderLine = function(oRm, oMonthsRow, oLocaleData, oDate){
		CalendarUtils._checkCalendarDate(oDate);

		var sId = oMonthsRow.getId();
		var iMonths = oMonthsRow.getMonths();
		var oMonthDate = new CalendarDate(oDate);
		var sWidth = "";
		var iYear = 0;
		var aYearMonths = [];
		var i = 0;

		for (i = 0; i < iMonths; i++) {
			iYear = oMonthDate.getYear();
			if (aYearMonths.length > 0 && aYearMonths[aYearMonths.length - 1].iYear == iYear) {
				aYearMonths[aYearMonths.length - 1].iMonths++;
			} else  {
				aYearMonths.push({iYear: iYear, iMonths: 1});
			}
			oMonthDate.setMonth(oMonthDate.getMonth() + 1);
		}

		for (i = 0; i < aYearMonths.length; i++) {
			var oYearMonths = aYearMonths[i];
			sWidth = ( 100 / iMonths * oYearMonths.iMonths) + "%";
			oRm.openStart("div", sId + "-Head" + i);
			oRm.class("sapUiCalHeadText");
			oRm.style("width", sWidth);
			oRm.openEnd();
			oRm.text(oYearMonths.iYear);
			oRm.close("div");
		}

	};

	/**
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.unified.calendar.MonthsRow} oMonthsRow An object representation of the control that should be rendered
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate The first date of the month
	 */
	MonthsRowRenderer.renderMonths = function(oRm, oMonthsRow, oDate){

		var oHelper = this.getHelper(oMonthsRow, oDate);
		var iMonths = oMonthsRow.getMonths();
		var sWidth = ( 100 / iMonths ) + "%";
		var oMonthDate = new CalendarDate(oDate);
		oMonthDate.setDate(1);

		for (var i = 0; i < iMonths; i++) {
			this.renderMonth(oRm, oMonthsRow, oMonthDate, oHelper, sWidth);
			oMonthDate.setMonth(oMonthDate.getMonth() + 1);
		}

	};

	/**
	 * @param {sap.ui.unified.calendar.MonthsRow} oMonthsRow An object representation of the control that should be rendered
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate The first date of the month
	 * @returns {Object} A helper object, containing months props
	 */
	MonthsRowRenderer.getHelper = function(oMonthsRow, oDate){
		CalendarUtils._checkCalendarDate(oDate);

		var oHelper = {};
		var sPrimaryCalendarType = oMonthsRow.getProperty("primaryCalendarType");

		oHelper.sLocale = oMonthsRow._getLocale();
		oHelper.oLocaleData = oMonthsRow._getLocaleData();
		oHelper.oToday = CalendarDate.fromLocalJSDate(UI5Date.getInstance(), sPrimaryCalendarType);
		oHelper.sCurrentMonth = oMonthsRow._rb.getText("CALENDAR_CURRENT_MONTH");
		oHelper.sId = oMonthsRow.getId();
		oHelper.oFormatLong = oMonthsRow._getFormatLong();
		if (oMonthsRow._bLongMonth || !oMonthsRow._bNamesLengthChecked) {
			oHelper.aMonthNames = oHelper.oLocaleData.getMonthsStandAlone("wide", sPrimaryCalendarType);
		} else {
			oHelper.aMonthNames = oHelper.oLocaleData.getMonthsStandAlone("abbreviated", sPrimaryCalendarType);
			oHelper.aMonthNamesWide = oHelper.oLocaleData.getMonthsStandAlone("wide", sPrimaryCalendarType);
		}

		var sLegendId = oMonthsRow.getLegend();
		if (sLegendId) {
			var oLegend = Element.getElementById(sLegendId);
			if (oLegend) {
				if (!(oLegend instanceof sap.ui.unified.CalendarLegend)) {
					throw new Error(oLegend + " is not an sap.ui.unified.CalendarLegend. " + oMonthsRow);
				}
				oHelper.oLegend = oLegend;
			} else {
				Log.warning("CalendarLegend " + sLegendId + " does not exist!", oMonthsRow);
			}
		}

		oHelper.convertTextInfoToSecondaryType = function (oDate) {
			var sSecondaryCalendarType = oMonthsRow._getSecondaryCalendarType(),
				// always use wide month names for the screen reader
				aMonthNamesSecondary = oHelper.oLocaleData.getMonthsStandAlone("abbreviated", sSecondaryCalendarType),
				oSecondaryYearFormat = oMonthsRow._oFormatYearInSecType,
				oSecondaryDates = oMonthsRow._getDisplayedSecondaryDates(oDate.getMonth(), oDate.getYear()),
				sSecondaryMonthInfo,
				sSecondaryYearInfo,
				sPattern;

			if (oSecondaryDates.start.getMonth() === oSecondaryDates.end.getMonth()) {
				sSecondaryMonthInfo = aMonthNamesSecondary[oSecondaryDates.start.getMonth()];
			} else {
				sPattern = oMonthsRow._getLocaleData().getIntervalPattern();
				sSecondaryMonthInfo = sPattern.replace(/\{0\}/, aMonthNamesSecondary[oSecondaryDates.start.getMonth()]).replace(/\{1\}/, aMonthNamesSecondary[oSecondaryDates.end.getMonth()]);
			}

			if (oSecondaryDates.start.getYear() === oSecondaryDates.end.getYear()){
				sSecondaryYearInfo = oSecondaryYearFormat.format(oSecondaryDates.start.toUTCJSDate(), true);
			} else {
				sSecondaryYearInfo = sPattern.replace(/\{0\}/, oSecondaryYearFormat.format(oSecondaryDates.start.toUTCJSDate(), true))
				.replace(/\{1\}/, oSecondaryYearFormat.format(oSecondaryDates.end.toUTCJSDate(), true));
			}

			return {sMonthInfo: sSecondaryMonthInfo, sYearInfo: sSecondaryYearInfo};
		};

		return oHelper;

	};

	/**
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.unified.calendar.MonthsRow} oMonthsRow An object representation of the control that should be rendered
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate The first date of the month
	 * @param {Object} oHelper A helper object, containing months props
	 * @param {string} sWidth The width of the month
	 */
	MonthsRowRenderer.renderMonth = function(oRm, oMonthsRow, oDate, oHelper, sWidth){
		CalendarUtils._checkCalendarDate(oDate);

		var bHasSecondaryCalendarType = !!oMonthsRow._getSecondaryCalendarType(),
			oSecondaryTypeInfo;

		if (bHasSecondaryCalendarType) {
			oSecondaryTypeInfo = oHelper.convertTextInfoToSecondaryType(oDate);
		}

		var mAccProps = {
			role: oMonthsRow._getAriaRole(),
			selected: false,
			label: "",
			describedby: oMonthsRow._getMonthDescription()
		};

		var sYyyymm = oMonthsRow._oFormatYyyymm.format(oDate.toUTCJSDate(), true);
		var iSelected = oMonthsRow._checkDateSelected(oDate);
		var oType = oMonthsRow._getDateType(oDate);
		var bEnabled = oMonthsRow._checkMonthEnabled(oDate);

		oRm.openStart("div", oHelper.sId + "-" + sYyyymm);
		oRm.class("sapUiCalItem");
		if (sWidth) {
			oRm.style("width", sWidth);
		}

		if (CalendarUtils._isSameMonthAndYear(oDate, oHelper.oToday)) {
			oRm.class("sapUiCalItemNow");
			mAccProps["label"] = oHelper.sCurrentMonth + " ";
		}

		if (iSelected > 0) {
			oRm.class("sapUiCalItemSel"); // day selected
			mAccProps["selected"] = true;
		}
		if (iSelected == 2) {
			oRm.class("sapUiCalItemSelStart"); // interval start
			mAccProps["describedby"] = mAccProps["describedby"] + " " + oHelper.sId + "-Start";
		} else if (iSelected == 3) {
			oRm.class("sapUiCalItemSelEnd"); // interval end
			mAccProps["describedby"] = mAccProps["describedby"] + " " + oHelper.sId + "-End";
		} else if (iSelected == 4) {
			oRm.class("sapUiCalItemSelBetween"); // interval between
		} else if (iSelected == 5) {
			oRm.class("sapUiCalItemSelStart"); // interval start
			oRm.class("sapUiCalItemSelEnd"); // interval end
			mAccProps["describedby"] = mAccProps["describedby"] + " " + oHelper.sId + "-Start";
			mAccProps["describedby"] = mAccProps["describedby"] + " " + oHelper.sId + "-End";
		}

		if (oType && oType.type != CalendarDayType.None) {
			oRm.class("sapUiCalItem" + oType.type);
			if (oType.tooltip) {
				oRm.attr('title', oType.tooltip);
			}
		}

		if (!bEnabled) {
			oRm.class("sapUiCalItemDsbl"); // month disabled
			mAccProps["disabled"] = true;
		}

		oRm.attr("tabindex", "-1");
		oRm.attr("data-sap-month", sYyyymm);
		mAccProps["label"] = mAccProps["label"] + oHelper.oFormatLong.format(oDate.toUTCJSDate(), true);
		if (bHasSecondaryCalendarType) {
			mAccProps["label"] = mAccProps["label"] + ", " + oSecondaryTypeInfo.sMonthInfo + " " + oSecondaryTypeInfo.sYearInfo;
		}

		if (oType && oType.type != CalendarDayType.None) {
			CalendarLegendRenderer.addCalendarTypeAccInfo(mAccProps, oType.type, oHelper.oLegend);
		}

		oRm.accessibilityState(null, mAccProps);
		if (bHasSecondaryCalendarType) {
			oRm.class("sapUiCalItemWithSecondaryType");
		}

		oRm.openEnd();
		oRm.openStart("span");
		oRm.class("sapUiCalItemText");
		oRm.openEnd();
		oRm.text(oHelper.aMonthNames[oDate.getMonth()]);
		oRm.close("span");
		if (bHasSecondaryCalendarType) {
			oRm.openStart("span");
			oRm.class("sapUiCalItemAddText");
			oRm.openEnd();
			oRm.text(oSecondaryTypeInfo.sMonthInfo);
			oRm.close("span");
		}
		oRm.close("div");
	};

	return MonthsRowRenderer;

}, /* bExport= */ true);