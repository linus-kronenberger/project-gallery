/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'sap/base/i18n/Localization',
	"sap/ui/core/Element",
	'sap/ui/unified/calendar/CalendarDate',
	'sap/ui/unified/calendar/CalendarUtils',
	'sap/ui/core/date/UniversalDate',
	'sap/ui/core/IconPool', // side effect: required when calling RenderManager#icon
	'sap/ui/core/InvisibleText',
	'./PlanningCalendarLegend',
	'sap/ui/unified/library',
	'sap/ui/unified/calendar/RecurrenceUtils',
	'sap/ui/core/date/UI5Date'
],
	function(
		Localization,
		Element,
		CalendarDate,
		CalendarUtils,
		UniversalDate,
		_IconPool,
		InvisibleText,
		PlanningCalendarLegend,
		unifiedLibrary,
		RecurrenceUtils,
		UI5Date
	) {
		"use strict";

		var iVerticalPaddingBetweenAppointments = 0.125;
		var iAppointmentBottomPadding = 0.125;
		var iAppointmentTopPadding = 0.0625;

		// shortcut for sap.ui.unified.CalendarDayType
		var CalendarDayType = unifiedLibrary.CalendarDayType;

		/**
		 * SinglePlanningCalendarGrid renderer.
		 * @namespace
		 */
		var SinglePlanningCalendarGridRenderer = {
			apiVersion: 2
		};

		/**
		 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer
		 * @param {sap.m.SinglePlanningCalendarGrid} oControl An object representation of the control that should be rendered
		 */
		SinglePlanningCalendarGridRenderer.render = function (oRm, oControl) {
			oRm.openStart("div", oControl);
			oRm.class("sapMSinglePCGrid");
			oRm.openEnd();
			oRm.renderControl(oControl.getAggregation("_columnHeaders"));
			this.renderBlockersContainer(oRm, oControl);
			oRm.openStart("div");
			oRm.class("sapMSinglePCGridContent");
			oRm.openEnd();
			this.renderRowHeaders(oRm, oControl);
			this.renderNowMarker(oRm, oControl);
			this.renderColumns(oRm, oControl);
			oRm.close("div"); // END .sapMSinglePCGridContent
			oRm.close("div"); // END .sapMSinglePCGrid
		};

		SinglePlanningCalendarGridRenderer.renderBlockersContainer = function (oRm, oControl) {
			var iColumns = oControl._getColumns(),
				iMaxLevel = oControl._getBlockersToRender().iMaxlevel,
				oStartDate = oControl.getStartDate(),
				// hackie thing to calculate the container width. When we have more than 1 line of blockers - we must add 0.1875rem in order to render the blockers visually in the container.
				iContainerHeight = (iMaxLevel + 1) * oControl._getBlockerRowHeight() + 0.1875,
				oFormat = oControl._getDateFormatter(),
				aSpecialDates = oControl._getSpecialDates(),
				oCalendarDate = CalendarDate.fromLocalJSDate(oStartDate),
				aDayTypes = oControl._getColumnHeaders()._getDateTypes(oCalendarDate),
				oType,
				sLegendItemType;

			oRm.openStart("div");
			oRm.attr("role", "grid");
			oRm.class("sapMSinglePCBlockersRow");
			oRm.openEnd();

			oRm.openStart("div");
			oRm.attr("role", "row");
			oRm.class("sapMSinglePCBlockersColumns");

			//day view
			if (aSpecialDates && oControl._getColumns() === 1) {
				if (aDayTypes && aDayTypes[0]) {
					oType = aDayTypes[0];
					oRm.class("sapUiCalItem" + oType.type);
					sLegendItemType = PlanningCalendarLegend.findLegendItemForItem(Element.getElementById(oControl._sLegendId), oType);
				}

				oRm.class("sapMSpecialDaysInDayView");
			}

			oRm.style("height", iContainerHeight + "rem");
			oRm.openEnd();

			this.renderDndPlaceholders(oRm, oControl, oControl.getAggregation("_blockersPlaceholders"));

			for (var i = 0; i < iColumns; i++) {
				var oColumnCalDate = new CalendarDate(oStartDate.getFullYear(), oStartDate.getMonth(), oStartDate.getDate() + i);

				oRm.openStart("div");
				oRm.attr("role", "gridcell");
				oRm.attr("data-sap-start-date", oFormat.format(oColumnCalDate.toLocalJSDate()));
				oRm.attr("data-sap-end-date", oFormat.format(oColumnCalDate.toLocalJSDate()));
				oRm.attr("aria-labelledby", InvisibleText.getStaticId("sap.m", "SPC_BLOCKERS") +
				" " + "fullDay-" + oFormat.format(oColumnCalDate.toLocalJSDate()) + "-Descr");
				oRm.class("sapMSinglePCBlockersColumn");
				oRm.attr("tabindex", -1);

				if (oControl._checkDateSelected(oColumnCalDate) && iColumns > 1) {
					this.renderSelectedRowBorders(oRm, oControl, i, oColumnCalDate, iColumns, "Blocker");
				}
				if (oColumnCalDate.isSame(new CalendarDate())) {
					oRm.class("sapMSinglePCBlockersColumnToday");
				}

				if (CalendarUtils._isWeekend(oColumnCalDate, oControl._getCoreLocaleData())) {
					oRm.class("sapMSinglePCBlockersColumnWeekend");
				}

				oRm.openEnd();

				oRm.openStart("span", "fullDay-" + oFormat.format(oColumnCalDate.toLocalJSDate()) + "-Descr");
				oRm.class("sapUiInvisibleText");
				oRm.openEnd();
				oRm.text(oControl._getCellStartEndInfo(oColumnCalDate.toLocalJSDate()));
				//acc for day view + special dates + legend
				if (oControl._sLegendId && sLegendItemType) {
					oRm.text(sLegendItemType);
				}
				if (oControl._doesContainBlockers(oColumnCalDate)) {
					oRm.text(oControl._getCellDescription());
				}
				oRm.close("span");

				oRm.close("div"); // END .sapMSinglePCColumn
			}
			this.renderBlockers(oRm, oControl);
			oRm.close("div"); // END .sapMSinglePCColumns
			oRm.close("div"); // END .sapMSinglePCGridBlockers
		};

		SinglePlanningCalendarGridRenderer.renderSelectedRowBorders = function (oRm, oControl, i, oColumnCalDate, iColumns, suffix) {
			var oPrevClumnCalDate = new CalendarDate(oColumnCalDate.toLocalJSDate().getFullYear(), oColumnCalDate.toLocalJSDate().getMonth(), oColumnCalDate.toLocalJSDate().getDate() - 1);
			var oNextClumnCalDate = new CalendarDate(oColumnCalDate.toLocalJSDate().getFullYear(), oColumnCalDate.toLocalJSDate().getMonth(), oColumnCalDate.toLocalJSDate().getDate() + 1);
			oRm.class("sapUiCalColumnSelected");

			if (i == 0 && oControl._checkDateSelected(oNextClumnCalDate)) {
				oRm.class("sapUiCalColumnSelectedStart" + suffix);
			} else if (i == 0 && !oControl._checkDateSelected(oNextClumnCalDate)) {
				oRm.class("sapUiCalColumnSingleSelect" + suffix);
			} else if (i === iColumns - 1 && oControl._checkDateSelected(oPrevClumnCalDate)) {
				oRm.class("sapUiCalColumnSelectedEnd" + suffix);
			} else if (i === iColumns - 1 && !oControl._checkDateSelected(oPrevClumnCalDate)) {
				oRm.class("sapUiCalColumnSingleSelect" + suffix);
			} else if (oControl._checkDateSelected(oPrevClumnCalDate) && oControl._checkDateSelected(oNextClumnCalDate)){
				oRm.class("sapUiCalColumnSelectedBetween" + suffix);
			} else if (oControl._checkDateSelected(oPrevClumnCalDate)) {
				oRm.class("sapUiCalColumnSelectedEnd" + suffix);
			} else if (oControl._checkDateSelected(oNextClumnCalDate)) {
				oRm.class("sapUiCalColumnSelectedStart" + suffix);
			} else {
				oRm.class("sapUiCalColumnSingleSelect" + suffix);
			}
		};

		SinglePlanningCalendarGridRenderer.renderBlockers = function (oRm, oControl) {
			var that = this,
				oBlockersList = oControl._getBlockersToRender().oBlockersList;

			oRm.openStart("div");
			oRm.attr("role", "gridcell");
			oRm.openEnd();

			oRm.openStart("div");
			oRm.attr("role", "list");
			oRm.attr("aria-labelledby", InvisibleText.getStaticId("sap.m", "SPC_BLOCKERS"));
			oRm.class("sapMSinglePCBlockers");
			oRm.class("sapUiCalendarRowVisFilled"); // TODO: when refactor the CSS of appointments maybe we won't need this class

			oRm.openEnd();
			oBlockersList.getIterator().forEach(function (oBlocker) {
				that.renderBlockerAppointment(oRm, oControl, oBlocker);
			});
			oRm.close("div"); // END .sapMSinglePCBlockers

			oRm.close("div");
		};

		SinglePlanningCalendarGridRenderer.renderBlockerAppointment = function(oRm, oControl, oBlockerNode) {
			var oGridCalStart = CalendarDate.fromLocalJSDate(oControl.getStartDate()),
				oBlocker = oBlockerNode.getData(),
				oBlockerCalStart = CalendarDate.fromLocalJSDate(oBlocker.getStartDate()),
				oBlockerCalEnd = CalendarDate.fromLocalJSDate(oBlocker.getEndDate()),
				iStartDayDiff = CalendarUtils._daysBetween(oBlockerCalStart, oGridCalStart),
				iEndDayDiff = CalendarUtils._daysBetween(oBlockerCalEnd, oGridCalStart),
				iColumns = oControl._getColumns(),
				iRowHeight = oControl._getBlockerRowHeight(),
				iBlockerLevel = oBlockerNode.level,
				iBlockerWidth = oBlockerNode.width,
				sTooltip = oBlocker.getTooltip_AsString(),
				sType = oBlocker.getType(),
				sColor = oBlocker.getColor(),
				sTitle = oBlocker.getTitle(),
				sText = oBlocker.getText(),
				sIcon = oBlocker.getIcon(),
				sId = oBlocker.getId(),
				mAccProps = {
					role: "listitem",
					labelledby: {
						value: InvisibleText.getStaticId("sap.ui.unified", "CALENDAR_ALL_DAY_PREFIX"),
						append: true
					},
					// Prevents aria-selected from being added on the Blocker appointment
					selected: null
				},
				aAriaLabels = oControl.getAriaLabelledBy(),
				iLeftPosition = iStartDayDiff * (100 / iColumns),
				iRightPosition = (iColumns - iEndDayDiff - 1) * (100 / iColumns),
				bIsRTL = Localization.getRTL(),
				aClasses;

			if (aAriaLabels.length > 0) {
				mAccProps["labelledby"].value = mAccProps["labelledby"].value + " " + aAriaLabels.join(" ");
			}

			if (sTitle) {
				mAccProps["labelledby"].value = mAccProps["labelledby"].value + " " + sId + "-Title";
			}

			// Put start/end information after the title
			mAccProps["labelledby"].value = mAccProps["labelledby"].value + " " + sId + "-Descr";

			if (sText) {
				mAccProps["labelledby"].value = mAccProps["labelledby"].value + " " + sId + "-Text";
			}

			if (oBlocker.getTentative()) {
				mAccProps["labelledby"].value = mAccProps["labelledby"].value + " " + InvisibleText.getStaticId("sap.ui.unified", "APPOINTMENT_TENTATIVE");
			}

			if (oBlocker.getSelected()) {
				mAccProps["describedby"] = {
					value: InvisibleText.getStaticId("sap.ui.unified", "APPOINTMENT_SELECTED"),
					append: true
				};
			}

			oRm.openStart("div", oBlocker);
			oRm.attr("data-sap-level", iBlockerLevel);
			oRm.attr("data-sap-width", iBlockerWidth);
			oRm.attr("tabindex", 0);

			if (sTooltip) {
				oRm.attr("title", sTooltip);
			}
			oRm.accessibilityState(oBlocker, mAccProps);
			oRm.class("sapMSinglePCAppointmentWrap");
			oRm.class("sapUiCalendarRowApps"); // TODO: when refactor the CSS of appointments maybe we won't need this class
			if (!sColor && sType !== CalendarDayType.None) {
				oRm.class("sapUiCalendarApp" + sType);
			}
			if (sColor) {
				if (Localization.getRTL()) {
					oRm.style("border-right-color", sColor);
				} else {
					oRm.style("border-left-color", sColor);
				}
			}

			oRm.style("top", iRowHeight * iBlockerLevel + 0.0625 + "rem"); // Adding 0.0625rem to render all of the blockers 0.0625rem below in order to have space on top of them.
			oRm.style(bIsRTL ? "right" : "left", Math.max(iLeftPosition, 0) + "%");
			oRm.style(bIsRTL ? "left" : "right", Math.max(iRightPosition, 0) + "%");
			oRm.openEnd();

			oRm.openStart("div");
			oRm.class("sapUiCalendarApp");

			if (oBlocker.getSelected()) {
				oRm.class("sapUiCalendarAppSel");
			}

			if (oBlocker.getTentative()) {
				oRm.class("sapUiCalendarAppTent");
			}

			if (sIcon) {
				oRm.class("sapUiCalendarAppWithIcon");
			}

			oRm.openEnd(); // div element

			// extra content DIV to make some styling possible
			oRm.openStart("div");
			oRm.class("sapUiCalendarAppCont");

			if (sColor && !oBlocker.getSelected()) {
				oRm.style("background-color", oBlocker._getCSSColorForBackground(sColor));
			}

			oRm.openEnd(); // div element

			if (iLeftPosition < 0) {
				aClasses = ["sapUiCalendarAppArrowIconLeft", "sapUiCalendarAppArrowIcon"];
				oRm.icon("sap-icon://arrow-left", aClasses, { title: null, role: "img" });
			}

			if (sIcon) {
				aClasses = ["sapUiCalendarAppIcon"];
				var mAttributes = {};

				mAttributes["id"] = `${sId}-Icon`;
				mAttributes["title"] = null;
				mAttributes["role"] = "img";
				oRm.icon(sIcon, aClasses, mAttributes);
			}

			if (sTitle) {
				oRm.openStart("span", `${sId}-Title`);
				oRm.class("sapUiCalendarAppTitle");
				oRm.openEnd(); // span element
				oRm.text(sTitle, true);
				oRm.close("span");
			}

			if (iRightPosition < 0) {
				aClasses = ["sapUiCalendarAppArrowIconRight", "sapUiCalendarAppArrowIcon"];
				oRm.icon("sap-icon://arrow-right", aClasses, { title: null, role: "img" });
			}

			oRm.openStart("span", `${sId}-Descr`);
			oRm.class("sapUiInvisibleText");
			oRm.openEnd(); // span element
			oRm.text(oControl._getAppointmentAnnouncementInfo(oBlocker));
			oRm.close("span");


			oRm.close("div");

			oRm.close("div");
			oRm.close("div");
		};

		SinglePlanningCalendarGridRenderer.renderRowHeaders = function (oRm, oControl) {
			var iStartHour = oControl._getVisibleStartHour(),
				iEndHour = oControl._getVisibleEndHour(),
				oStartDate = UI5Date.getInstance(),
				oHoursFormat = oControl._getHoursFormat(),
				oAMPMFormat = oControl._getAMPMFormat();

			oRm.openStart("div");
			oRm.class("sapMSinglePCRowHeaders");
			oRm.openEnd();

			for (var i = iStartHour; i <= iEndHour; i++) {
				oStartDate.setHours(i);
				oRm.openStart("span");
				oRm.class("sapMSinglePCRowHeader");
				oRm.class("sapMSinglePCRowHeader" + i);

				if (oControl._shouldHideRowHeader(i)) {
					oRm.class("sapMSinglePCRowHeaderHidden");
				}

				oRm.openEnd();

				oRm.text(oHoursFormat.format(oStartDate));

				if (oControl._hasAMPM()) {
					oRm.openStart("span");
					oRm.class("sapMSinglePCRowHeaderAMPM");
					oRm.openEnd();
					oRm.text(" " + oAMPMFormat.format(oStartDate));
					oRm.close("span");
				}

				oRm.close("span"); // END .sapMSinglePCRowHeader
			}

			oRm.close("div"); // END .sapMSinglePCRowHeaders
		};

		SinglePlanningCalendarGridRenderer.renderColumns = function (oRm, oControl) {
			var iColumns = oControl._getColumns(),
				oStartDate = oControl.getStartDate(),
				oAppointmentsToRender = oControl._getAppointmentsToRender();

			oRm.openStart("div");
			oRm.attr("role", "grid");
			oRm.attr("aria-labelledby", InvisibleText.getStaticId("sap.m", "SPC_APPOINTMENTS"));
			oRm.class("sapMSinglePCColumns");
			oRm.openEnd();

			for (var i = 0; i < iColumns; i++) {
				var oColumnCalDate = new CalendarDate(oStartDate.getFullYear(), oStartDate.getMonth(), oStartDate.getDate() + i),
					oFormat = oControl._getDateFormatter(),
					sDate = oFormat.format(oColumnCalDate.toLocalJSDate());

				oRm.openStart("div");
				oRm.attr("role", "row");
				oRm.attr("data-sap-day", sDate);
				oRm.class("sapMSinglePCColumn");

				if (oControl._checkDateSelected(oColumnCalDate) && iColumns > 1) {
					this.renderSelectedRowBorders(oRm, oControl, i, oColumnCalDate, iColumns, "Column");
				}

				if (oColumnCalDate.isSame(new CalendarDate())) {
					oRm.class("sapMSinglePCColumnToday");
				}

				if (oControl._isNonWorkingDay(oColumnCalDate)) {
					oRm.class("sapMSinglePCColumnWeekend");
				}

				oRm.openEnd();

				this.renderDndPlaceholders(oRm, oControl, oControl._dndPlaceholdersMap[oColumnCalDate]);

				this.renderRows(oRm, oControl, sDate, oColumnCalDate);
				this.renderAppointments(oRm, oControl, oAppointmentsToRender[sDate], oColumnCalDate, i);
				oRm.close("div"); // END .sapMSinglePCColumn
			}

			oRm.close("div"); // END .sapMSinglePCColumns
		};

		SinglePlanningCalendarGridRenderer.renderDndPlaceholders = function (oRm, oControl, aPlaceholders) {
			oRm.openStart("div");
			oRm.class("sapMSinglePCOverlay");
			oRm.openEnd(); // span element
			aPlaceholders.forEach(oRm.renderControl, oRm);
			oRm.close("div");
		};

		SinglePlanningCalendarGridRenderer.renderRows = function (oRm, oControl, sDate, oColumnCalDate) {
			const iStartHour = oControl._getVisibleStartHour();
			const iEndHour = oControl._getVisibleEndHour();
			const oFormat = oControl._getDateFormatter();
			const oDate = oControl._parseDateStringAndHours(sDate, 0);
			const aRecurrenceNonWorkingForDay = oControl._isNonWorkingDay(oColumnCalDate) ? [] : oControl.getNonWorkingPeriods().filter((oPeriod) => {
				if (!oPeriod.isRecurring()) {
					return oPeriod.hasNonWorkingAtDate(oDate);
				}
				const hasOccurrenceOnDate = RecurrenceUtils.hasOccurrenceOnDate.bind(oPeriod);
				return hasOccurrenceOnDate(oDate);
			}).sort((oCalendarItemA, oCalendarItemB) => {
				return  oCalendarItemA.getStartDate().getMinutes() - oCalendarItemB.getStartDate().getMinutes() ||
				oCalendarItemA.getEndDate().getMinutes() - oCalendarItemB.getEndDate().getMinutes();
			});

			for (let i = iStartHour; i <= iEndHour; i++) {
				const oCellStartDate = oControl._parseDateStringAndHours(sDate, i);
				const oCellEndDate = UI5Date.getInstance(oCellStartDate.getFullYear(), oCellStartDate.getMonth(), oCellStartDate.getDate(), oCellStartDate.getHours() + 1);

				const aNonWorkingPartsForHour = aRecurrenceNonWorkingForDay.filter((oCalendarItem) => {
					return oCalendarItem.hasNonWorkingAtHour(oCellStartDate);
				});

				oRm.openStart("div");
				oRm.attr("role", "gridcell");
				oRm.class("sapMSinglePCRow");
				if (!oControl._isVisibleHour(i)) {
					oRm.class("sapMSinglePCNonWorkingRow");
				}

				oRm.attr("data-sap-hour", i);
				oRm.attr("data-sap-start-date", oFormat.format(oCellStartDate));
				oRm.attr("data-sap-end-date", oFormat.format(oCellEndDate));
				oRm.attr("aria-labelledby", oFormat.format(oCellStartDate) + "-Descr");
				oRm.attr("tabindex", -1);
				oRm.openEnd();

				oRm.openStart("span", oFormat.format(oCellStartDate) + "-Descr");
				oRm.class("sapUiInvisibleText");
				oRm.openEnd();
				oRm.text(oControl._getCellStartEndInfo(oCellStartDate, oCellEndDate));

				if (oControl._doesContainAppointments(oCellStartDate, oCellEndDate)) {
					oRm.text(oControl._getCellDescription());
				}
				oRm.close("span");

				if (!aNonWorkingPartsForHour?.length) {
					oRm.close("div"); // END .sapMSinglePCRow
					continue;
				}

				RecurrenceUtils.getWorkingAndNonWorkingSegments(oCellStartDate, aNonWorkingPartsForHour).forEach((oHourParts) => {
					if (oHourParts.type === "working") {
						this.renderWorkingParts(oRm, oHourParts.duration);
					} else {
						this.renderNonWorkingParts(oRm, oHourParts.duration);
					}
				});

				oRm.close("div"); // END .sapMSinglePCRow
			}
		};

		SinglePlanningCalendarGridRenderer.renderAppointments = function (oRm, oControl, oAppointmentsByDate, oColumnDate, iColumn) {
			var that = this,
				iIndex = 0;

			if (oAppointmentsByDate) {
				oRm.openStart("div");
				oRm.attr("role", "gridcell");
				oRm.openEnd();

				oRm.openStart("div");
				oRm.attr("role", "list");
				oRm.class("sapMSinglePCAppointments");
				oRm.class("sapUiCalendarRowVisFilled"); // TODO: when refactor the CSS of appointments maybe we won't need this class

				oRm.openEnd();

				oAppointmentsByDate.oAppointmentsList.getIterator().forEach(function (oAppointmentNode) {
					var iMaxLevel = oAppointmentsByDate.iMaxLevel,
						iLevel = oAppointmentNode.level,
						iWidth = oAppointmentNode.width,
						oAppointment = oAppointmentNode.getData();

					that.renderAppointment(oRm, oControl, iMaxLevel, iLevel, iWidth, oAppointment, oColumnDate, iColumn, iIndex);
					iIndex++;
				});
				oRm.close("div");
				oRm.close("div");
			}
		};

		SinglePlanningCalendarGridRenderer.renderAppointment = function(oRm, oControl, iMaxLevel, iAppointmentLevel, iAppointmentWidth, oAppointment, oColumnDate, iColumn, iIndex) {
			var oGridCalStart = CalendarDate.fromLocalJSDate(oControl.getStartDate()),
				oGridCalEnd = new CalendarDate(oGridCalStart),
				iRowHeight = oControl._getRowHeight(),
				oColumnStartDateAndHour = new UniversalDate(oColumnDate.getYear(), oColumnDate.getMonth(), oColumnDate.getDate(), oControl._getVisibleStartHour()),
				oColumnEndDateAndHour = new UniversalDate(oColumnDate.getYear(), oColumnDate.getMonth(), oColumnDate.getDate(), oControl._getVisibleEndHour(), 59, 59),
				oAppStartDate = oAppointment.getStartDate(),
				oAppEndDate = oAppointment.getEndDate(),
				oAppCalStart = CalendarDate.fromLocalJSDate(oAppStartDate),
				oAppCalEnd = CalendarDate.fromLocalJSDate(oAppEndDate),
				sTooltip = oAppointment.getTooltip_AsString(),
				sType = oAppointment.getType(),
				sColor = oAppointment.getColor(),
				sTitle = oAppointment.getTitle(),
				sText = oAppointment.getText(),
				sIcon = oAppointment.getIcon(),
				sId = oAppointment.getId(),
				aCustomContent = oAppointment.getCustomContent(),
				bHasCustomContent = !!aCustomContent.length,
				mAccProps = {
					role: "listitem",
					labelledby: {
						value: InvisibleText.getStaticId("sap.ui.unified", "APPOINTMENT"),
						append: true
					},
					// Prevents aria-selected from being added on the appointment
					selected: null
				},
				aAriaLabels = oControl.getAriaLabelledBy(),
				bAppStartIsOutsideVisibleStartHour = oColumnStartDateAndHour.getTime() > oAppStartDate.getTime(),
				bAppEndIsOutsideVisibleEndHour = oColumnEndDateAndHour.getTime() < oAppEndDate.getTime(),
				iAppTop = bAppStartIsOutsideVisibleStartHour ? 0 : oControl._calculateTopPosition(oAppStartDate),
				iAppBottom = bAppEndIsOutsideVisibleEndHour ? 0 : oControl._calculateBottomPosition(oAppEndDate),
				iAppChunkWidth = 100 / (iMaxLevel + 1),
				bDraggable = oAppointment.getParent().getEnableAppointmentsDragAndDrop(),
				iScaleFactor = oControl.getProperty("scaleFactor"),
				iDivider = 2 * iScaleFactor,
				iStartDayDiff,
				iEndDayDiff,
				bArrowLeft,
				bArrowRight,
				aClasses;

			oGridCalEnd.setDate(oGridCalEnd.getDate() + oControl._getColumns() - 1);
			iStartDayDiff = CalendarUtils._daysBetween(oAppCalStart, oGridCalStart);
			iEndDayDiff = CalendarUtils._daysBetween(oGridCalEnd, oAppCalEnd);
			bArrowLeft = oColumnDate.isSame(oGridCalStart);
			bArrowRight = oColumnDate.isSame(oGridCalEnd);

			if (aAriaLabels.length > 0) {
				mAccProps["labelledby"].value = `${mAccProps["labelledby"].value} ${aAriaLabels.join(" ")}`;
			}

			if (!bHasCustomContent && sTitle) {
				mAccProps["labelledby"].value = `${mAccProps["labelledby"].value} ${sId}-${iColumn}_${iIndex}-Title`;
			}

			// Put start/end information after the title
			mAccProps["labelledby"].value = `${mAccProps["labelledby"].value} ${sId}-${iColumn}_${iIndex}-Descr`;

			if (!bHasCustomContent && sText) {
				mAccProps["labelledby"].value = `${mAccProps["labelledby"].value} ${sId}-${iColumn}_${iIndex}-Text`;
			}

			if (oAppointment.getTentative()) {
				mAccProps["labelledby"].value = `${mAccProps["labelledby"].value} ${InvisibleText.getStaticId("sap.ui.unified", "APPOINTMENT_TENTATIVE")}`;
			}

			if (oAppointment.getSelected()) {
				mAccProps["describedby"] = {
					value: InvisibleText.getStaticId("sap.ui.unified", "APPOINTMENT_SELECTED"),
					append: true
				};
			}

			oRm.openStart("div", oAppointment.getId() + "-" + iColumn + "_" + iIndex);
			oRm.attr("draggable", bDraggable);
			oRm.attr("data-sap-ui-draggable", bDraggable);
			oRm.attr("data-sap-ui-related", oAppointment.getId());
			oRm.attr("data-sap-level", iAppointmentLevel);
			oRm.attr("data-sap-width", iAppointmentWidth);
			oRm.attr("tabindex", 0);

			if (sTooltip) {
				oRm.attr("title", sTooltip);
			}
			oRm.accessibilityState(oAppointment, mAccProps);
			oRm.class("sapMSinglePCAppointmentWrap");
			oRm.class("sapUiCalendarRowApps"); // TODO: when refactor the CSS of appointments maybe we won't need this class
			if (!sColor && sType !== CalendarDayType.None) {
				oRm.class("sapUiCalendarApp" + sType);
			}
			if (sColor) {
				if (Localization.getRTL()) {
					oRm.style("border-right-color", sColor);
				} else {
					oRm.style("border-left-color", sColor);
				}
			}
			oRm.style("top", iAppTop + "rem");
			oRm.style("bottom", iAppBottom + "rem");
			oRm.style(Localization.getRTL() ? "right" : "left", iAppChunkWidth * iAppointmentLevel + "%");
			oRm.style("width", iAppChunkWidth * iAppointmentWidth + "%"); // TODO: take into account the levels
			oRm.openEnd();

			oRm.openStart("div");
			oRm.class("sapUiCalendarApp");
			oRm.style("min-height", (iRowHeight - ((iVerticalPaddingBetweenAppointments + iAppointmentBottomPadding + iAppointmentTopPadding) * iScaleFactor)) / iDivider + "rem");

			if (oAppointment.getSelected()) {
				oRm.class("sapUiCalendarAppSel");
			}

			if (oAppointment.getTentative()) {
				oRm.class("sapUiCalendarAppTent");
			}

			if (!bHasCustomContent && sIcon) {
				oRm.class("sapUiCalendarAppWithIcon");
			}

			oRm.openEnd(); // div element

			// extra content DIV to make some styling possible
			oRm.openStart("div");
			oRm.class("sapUiCalendarAppCont");

			if (sColor && !oAppointment.getSelected()) {
				oRm.style("background-color", oAppointment._getCSSColorForBackground(sColor));
			}

			oRm.openEnd(); // div element

			if (bArrowLeft && iStartDayDiff < 0) {
				aClasses = ["sapUiCalendarAppArrowIconLeft", "sapUiCalendarAppArrowIcon"];
				oRm.icon("sap-icon://arrow-left", aClasses, { title: null, role: "img" });
			}

			if (!bHasCustomContent && sIcon) {
				aClasses = ["sapUiCalendarAppIcon"];
				var mAttributes = {};

				mAttributes["id"] = `${sId}-${iColumn}_${iIndex}-Icon`;
				mAttributes["title"] = null;
				mAttributes["role"] = "presentation";
				oRm.icon(sIcon, aClasses, mAttributes);
			}

			oRm.openStart("div");
			oRm.class("sapUiCalendarAppointmentWrapper");
			oRm.openEnd();

			if (!bHasCustomContent && sTitle) {
				oRm.openStart("span", `${sId}-${iColumn}_${iIndex}-Title`);
				oRm.class("sapUiCalendarAppTitle");
				oRm.openEnd(); // span element
				oRm.text(sTitle, true);
				oRm.close("span");
			}

			if (!bHasCustomContent && sText) {
				oRm.openStart("span", `${sId}-${iColumn}_${iIndex}-Text`);
				oRm.class("sapUiCalendarAppText");
				oRm.openEnd(); // span element
				oRm.text(sText, true);
				oRm.close("span");
			}

			if (bHasCustomContent) {
				aCustomContent.forEach(function (oContent) {
					oRm.renderControl(oContent);
				});
			}

			oRm.close("div");

			if (bArrowRight && iEndDayDiff < 0) {
				aClasses = ["sapUiCalendarAppArrowIconRight", "sapUiCalendarAppArrowIcon"];
				oRm.icon("sap-icon://arrow-right", aClasses, { title: null, role: "img" });
			}

			oRm.openStart("span", `${sId}-${iColumn}_${iIndex}-Descr`);
			oRm.class("sapUiInvisibleText");
			oRm.openEnd(); // span element
			oRm.text(oControl._getAppointmentAnnouncementInfo(oAppointment));
			oRm.close("span");

			oRm.close("div");

			if (oControl.getEnableAppointmentsResize()) {
				this.renderResizeHandles(oRm, !bAppStartIsOutsideVisibleStartHour, !bAppEndIsOutsideVisibleEndHour);
			}

			oRm.close("div");
			oRm.close("div");
		};

		SinglePlanningCalendarGridRenderer.renderNowMarker = function (oRm, oControl) {
			var oDate = UI5Date.getInstance();

			if (oControl._isNowMarkerInView(oDate)) {
				oRm.openStart("div", oControl.getId() + "-nowMarker");
				oRm.style("top", oControl._calculateTopPosition(oDate) + "rem");
				oRm.class("sapMSinglePCNowMarker");
				oRm.openEnd();
				oRm.openStart("span", oControl.getId() + "-nowMarkerText");
				oRm.class("sapMSinglePCNowMarkerText");
				oRm.openEnd();
				oRm.text(oControl._formatTimeAsString(oDate));
				if (oControl._hasAMPM()) {
					oRm.openStart("span", oControl.getId() + "-nowMarkerAMPM");
					oRm.class("sapMSinglePCNowMarkerAMPM");
					oRm.openEnd();
					oRm.text(oControl._addAMPM(oDate));
					oRm.close("span");
				}
				oRm.close("span"); // END .sapMSinglePCNowMarkerText
				oRm.close("div"); // END .sapMSinglePCNowMarker
			}
		};

		SinglePlanningCalendarGridRenderer.renderResizeHandles = function(oRm, bRenderTop, bRenderBottom) {
			if (bRenderBottom) {
				oRm.openStart("span");
				oRm.class("sapMSinglePCAppResizeHandleBottom");
				oRm.openEnd();
				oRm.close("span");
			}
			if (bRenderTop) {
				oRm.openStart("span");
				oRm.class("sapMSinglePCAppResizeHandleTop");
				oRm.openEnd();
				oRm.close("span");
			}
		};

		SinglePlanningCalendarGridRenderer.renderWorkingParts = function (oRm, iDuration){
			const iHeight = iDuration / 60 * 100;

			oRm.openStart("div");
			oRm.style("height",`${iHeight}%`);
			oRm.openEnd();
			oRm.close("div");
		};

		SinglePlanningCalendarGridRenderer.renderNonWorkingParts = function (oRm, iDuration){
			const iHeight = iDuration / 60 * 100;

			oRm.openStart("div");
			oRm.class("sapMSinglePCNonWorkingPeriod");
			oRm.style("height",`${iHeight}%`);
			oRm.openEnd();
			oRm.close("div");
		};

		return SinglePlanningCalendarGridRenderer;

	}, true /* bExport */);
