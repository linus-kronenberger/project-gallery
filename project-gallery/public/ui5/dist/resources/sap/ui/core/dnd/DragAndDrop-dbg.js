/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"../library",
	"sap/base/i18n/Localization",
	"sap/ui/Device",
	"sap/ui/core/Element",
	"sap/ui/core/StaticArea",
	"../UIArea",
	"sap/ui/thirdparty/jquery"
],
function(lib, Localization, Device, Element, StaticArea, UIArea, jQuery) {
	"use strict";

	var RelativeDropPosition = lib.dnd.RelativeDropPosition;

	/**
	 * Contains classes and helpers related to drag & drop functionality.
	 *
	 * @name sap.ui.core.dnd
	 * @namespace
	 * @public
	 * @since 1.52
	 */
	var DnD = {},
		oDragControl = null,        // the control being dragged
		oDropControl = null,        // the current drop target control
		oValidDropControl = null,   // the control which the dragged control can be dropped on based on the valid drop info
		aValidDragInfos = [],       // valid DragInfos configured for the currently dragged source
		aValidDropInfos = [],       // valid DropInfos configured for the current drop target
		oDragSession = null,        // stores active drag session throughout a drag activity
		$DropIndicator,             // drop position indicator
		$GhostContainer,            // container to place custom ghosts
		sCalculatedDropPosition,    // calculated position of the drop action relative to the valid dropped control.
		iTargetEnteringTime,        // timestamp of drag enter
		mLastIndicatorStyle = {},   // holds the last style settings of the indicator
		oDraggableAncestorNode,     // reference to ancestor node that has draggable=true attribute
		iDragEndTimer,              // timer for the dragend event to ensure it is dispatched after the drop event
		iDragLeaveTimer,			// timer for the dragleave event to ensure dragging leaves the browser window
		bDraggedOutOfBrowser;       // determines whether something dragged out of the browser context e.g. for file upload


	function addStyleClass(oElement, sStyleClass) {
		if (!oElement) {
			return;
		}

		if (oElement.addStyleClass) {
			oElement.addStyleClass(sStyleClass);
		} else {
			oElement.$().addClass(sStyleClass);
		}
	}

	function removeStyleClass(oElement, sStyleClass) {
		if (!oElement) {
			return;
		}

		if (oElement.removeStyleClass) {
			oElement.removeStyleClass(sStyleClass);
		} else {
			oElement.$().removeClass(sStyleClass);
		}
	}

	function dispatchEvent(oEvent, sEventName) {
		var oControl = Element.closestTo(oEvent.target, true);
		if (!oControl) {
			return;
		}

		var oNewEvent = new jQuery.Event(null, oEvent);
		oNewEvent.type = sEventName;
		oControl.getUIArea()._handleEvent(oNewEvent);
	}

	function simulateEvent(sEventName, oControl, oDataTransfer, vSimulated = true) {
		const oEvent = new Event(sEventName);
		if (oDataTransfer) {
			oEvent.dataTransfer = oDataTransfer;
		}

		const $Event = new jQuery.Event(oEvent);
		$Event.setMark("simulated", vSimulated);
		oControl.$().trigger($Event);
		return $Event;
	}

	function getSiblingOfControl(oControl, sDirection) {
		let aAggregatedControls = [];
		const oParent = oControl.getParent();
		const oMetadata = oParent.getMetadata();
		const sAggregation = oControl.sParentAggregationName;
		const aPublicAggregations = oMetadata.getAllAggregations();

		if (aPublicAggregations[sAggregation]) {
			aAggregatedControls = oParent[aPublicAggregations[sAggregation]._sGetter]();
		} else {
			const aPrivateAggregations = oMetadata.getAllPrivateAggregations();
			if (aPrivateAggregations[sAggregation]) {
				aAggregatedControls = oParent.getAggregation(sAggregation);
			}
		}

		const iIndex = aAggregatedControls.indexOf(oControl);
		if (sDirection == "next") {
			return aAggregatedControls.slice(iIndex + 1).find((aAggregatedControl) => aAggregatedControl.getDomRef());
		}
		return aAggregatedControls.slice(0, iIndex).findLast((aAggregatedControl) => aAggregatedControl.getDomRef());
	}

	function getReorderInfo(oEvent) {
		if (oEvent.isMarked() || !(oEvent.ctrlKey || oEvent.metaKey) || !oEvent.code?.startsWith("Arrow")) {
			return;
		}

		const oTarget = oEvent.target;
		const oControl = oTarget.hasAttribute("data-sap-ui-draghandle") ? Element.closestTo(oTarget, true) : Element.getElementById(oTarget.id);
		if (!oControl) {
			return;
		}

		const oDragControl = Element.getElementById(oControl.$().closest("[data-sap-ui-draggable]").attr("id"));
		const oDragControlParent = oDragControl?.getParent();
		const sAggregationName = oDragControl?.sParentAggregationName;
		if (!oDragControlParent || !sAggregationName) {
			return;
		}

		const aDropConfigs = [];
		const aDraggableGroups = [];
		oDragControlParent.getDragDropConfig().forEach((oConfig) => {
			if (!oConfig.getKeyboardHandling()) {
				return;
			}
			if (oConfig.isA("sap.ui.core.dnd.IDropInfo") && oConfig.getTargetAggregation() == sAggregationName && oConfig.getDropPosition() == "Between") {
				aDropConfigs.push(oConfig);
			}
			if (oConfig.isA("sap.ui.core.dnd.IDragInfo") && oConfig.getSourceAggregation() == sAggregationName) {
				aDraggableGroups.push(oConfig.getGroupName());
			}
		});

		const oDropConfig = aDropConfigs.find((oDropConfig) => aDraggableGroups.includes(oDropConfig.getGroupName()));
		if (!oDropConfig) {
			return;
		}

		return {
			oDragControl,
			oDropConfig
		};
	}

	function isSelectableElement(oElement) {
		return !oElement.disabled && /^(input|textarea)$/.test(oElement.localName);
	}

	function setDragGhost(oDragControl, oEvent) {
		if (!oDragControl || !oDragControl.getDragGhost) {
			return;
		}

		var oDragGhost = oDragControl.getDragGhost();
		if (!oDragGhost) {
			return;
		}

		if (!$GhostContainer) {
			$GhostContainer = jQuery('<div class="sapUiDnDGhostContainer"></div>');
			jQuery(document.body).append($GhostContainer);
		}

		$GhostContainer.append(oDragGhost);
		window.setTimeout(function() { $GhostContainer.empty(); }, 0);

		var oOriginalEvent = oEvent.originalEvent;
		oOriginalEvent.dataTransfer.setDragImage(oDragGhost, oOriginalEvent.offsetX, oOriginalEvent.offsetY);
	}

	function createDragSession(oEvent) {
		var mData = {},
			mIndicatorConfig,
			oDataTransfer = oEvent.originalEvent.dataTransfer,
			setTransferData = function(sType, sData) {
				oDataTransfer.setData(sType, sData);
			};

		/**
		 * When a user requests to drag some controls that can be dragged, a drag session is started.
		 * The drag session can be used to transfer data between applications or between dragged and dropped controls.
		 * Please see provided APIs for more details.
		 *
		 * <b>Note:</b> An implementation of this interface is provided by the framework during drag-and-drop operations
		 * and is exposed as <code>dragSession</code> parameter of the different drag and drop events.
		 *
		 * <b>Note:</b> This interface is not intended to be implemented by controls, applications or test code.
		 * Extending it with additional methods in future versions will be regarded as a compatible change.
		 *
		 * @interface
		 * @name sap.ui.core.dnd.DragSession
		 * @public
		 */
		return /** @lends sap.ui.core.dnd.DragSession */ {
			/**
			 * Sets string data with any MIME type.
			 * <b>Note:</b> This works if you navigate between different windows.
			 *
			 * @param {string} sKey The key of the data
			 * @param {string} sData Data
			 * @public
			 */
			setData: function(sKey, sData) {
				sData = "" + sData;
				mData[sKey] = sData;
				setTransferData(sKey, sData);
			},

			/**
			 * Returns the data that has been set via <code>setData</code> method.
			 *
			 * @param {string} sKey The key of the data
			 * @returns {string} Data
			 * @public
			 */
			getData: function(sKey) {
				return mData[sKey];
			},

			/**
			 * Sets string data with plain text MIME type.
			 * <b>Note:</b> This works if you navigate between different windows.
			 *
			 * @param {string} sData Data
			 * @public
			 */
			setTextData: function(sData) {
				sData = "" + sData;
				mData["text/plain"] = sData;
				mData["text"] = sData;
				setTransferData("text/plain", sData);
				setTransferData("text", sData);
			},

			/**
			 * Returns the data that has been set via <code>setTextData</code> method.
			 *
			 * @returns {string} Data
			 * @public
			 */
			getTextData: function() {
				return mData["text/plain"];
			},

			/**
			 * Sets any type of data (even functions, pointers, anything non-serializable) with any MIME type.
			 * <b>Note:</b> This works only within a UI5 application within the same window/frame.
			 *
			 * @param {string} sKey The key of the data
			 * @param {any} vData Data
			 * @public
			 */
			setComplexData: function(sKey, vData) {
				mData[sKey] = vData;
			},

			/**
			 * Returns the data that has been set via <code>setComplexData</code> method.
			 *
			 * @param {string} sKey The key of the data
			 * @returns {any|undefined} The previously set data or undefined
			 * @public
			 */
			getComplexData: function(sKey) {
				return mData[sKey];
			},

			/**
			 * Returns the drop indicator.
			 *
			 * @returns {HTMLElement|null} Drop indicator's DOM reference
			 * @protected
			 */
			getIndicator: function() {
				return $DropIndicator && $DropIndicator[0];
			},

			/**
			 * Defines the visual configuration of the drop indicator for the current <code>DropInfo</code>.
			 *
			 * @param {object} mConfig Custom styles of the drop indicator.
			 * @protected
			 */
			setIndicatorConfig: function(mConfig) {
				mIndicatorConfig = mConfig;
			},

			/**
			 * Returns the visual configuration of the drop indicator.
			 *
			 * @returns {object} Drop indicator configuration
			 * @protected
			 */
			getIndicatorConfig: function() {
				return mIndicatorConfig;
			},

			/**
			 * Returns the dragged control, if available within the same UI5 application frame.
			 *
			 * @returns {sap.ui.core.Element|null} The dragged control
			 * @protected
			 */
			getDragControl: function() {
				return oDragControl;
			},

			/**
			 * The valid drop target underneath the dragged control.
			 *
			 * @returns {sap.ui.core.Element|null} The drop target
			 * @protected
			 */
			getDropControl: function() {
				return oValidDropControl;
			},

			/**
			 * Set the valid target.
			 *
			 * @param {sap.ui.core.Element} oControl The dropped target
			 * @protected
			 */
			setDropControl: function(oControl) {
				oValidDropControl = oControl;
			},

			/**
			 * Returns the drop configuration corresponding to the drop control.
			 *
			 * @returns {sap.ui.core.dnd.DropInfo|null} The drop configuration
			 * @protected
			 */
			getDropInfo: function() {
				return aValidDropInfos[0] || null;
			},

			/**
			 * Returns the calculated position of the drop action relative to the valid dropped control.
			 *
			 * @returns {sap.ui.core.dnd.RelativeDropPosition} The calculated position
			 * @protected
			 */
			getDropPosition: function() {
				return sCalculatedDropPosition;
			}
		};
	}

	function closeDragSession() {
		hideDropIndicator();
		oDragControl = oDropControl = oValidDropControl = oDragSession = null;
		sCalculatedDropPosition = "";
		bDraggedOutOfBrowser = false;
		aValidDragInfos = [];
		aValidDropInfos = [];
	}

	function getDropIndicator() {
		if ($DropIndicator) {
			return $DropIndicator;
		}

		$DropIndicator = jQuery("<div class='sapUiDnDIndicator'></div>");
		jQuery(StaticArea.getDomRef()).append($DropIndicator);
		return $DropIndicator;
	}

	function hideDropIndicator() {
		if ($DropIndicator) {
			$DropIndicator.removeAttr("style");
			$DropIndicator.hide();
			mLastIndicatorStyle = {};
		}
	}

	function showDropIndicator(oEvent, oDropTarget, sDropPosition, sDropLayout, bCalculateOnly) {
		if (!oDropTarget) {
			return;
		}

		const vSimulated = oEvent.getMark("simulated");
		if (vSimulated) {
			if (vSimulated == "prev") {
				return RelativeDropPosition.Before;
			}
			if (vSimulated == "next") {
				return RelativeDropPosition.After;
			}
		}

		var mClientRect = oValidDropControl.getDropAreaRect ? oValidDropControl.getDropAreaRect(sDropLayout) : oDropTarget.getBoundingClientRect(),
			mIndicatorConfig = oEvent.dragSession && oEvent.dragSession.getIndicatorConfig(),
			iPageYOffset = window.scrollY,
			iPageXOffset = window.scrollX,
			$Indicator = getDropIndicator(),
			sRelativePosition,
			mStyle = {},
			mDropRect = {
				top: mClientRect.top + iPageYOffset,
				bottom: mClientRect.bottom + iPageYOffset,
				left: mClientRect.left + iPageXOffset,
				right: mClientRect.right + iPageXOffset,
				width: mClientRect.width,
				height: mClientRect.height
			};

		if (!sDropPosition || sDropPosition == "On") {
			sRelativePosition = RelativeDropPosition.On;
			sDropLayout = "";
		} else if (sDropLayout == "Horizontal") {
			var iCursorX = oEvent.pageX - mDropRect.left;
			mStyle.height = mDropRect.height;
			mStyle.top = mDropRect.top;

			if (sDropPosition == "Between") {
				mStyle.width = "";
				if (iCursorX < mDropRect.width * 0.5) {
					sRelativePosition = RelativeDropPosition.Before;
					mStyle.left = mDropRect.left;
				} else {
					sRelativePosition = RelativeDropPosition.After;
					mStyle.left = mDropRect.right;
				}
			} else if (sDropPosition == "OnOrBetween") {
				if (iCursorX < mDropRect.width * 0.25) {
					sRelativePosition = RelativeDropPosition.Before;
					mStyle.left = mDropRect.left;
					mStyle.width = "";
				} else if (iCursorX > mDropRect.width * 0.75) {
					sRelativePosition = RelativeDropPosition.After;
					mStyle.left = mDropRect.right;
					mStyle.width = "";
				} else {
					sRelativePosition = RelativeDropPosition.On;
				}
			}
			if (sRelativePosition != RelativeDropPosition.On && Localization.getRTL()) {
				sRelativePosition = (sRelativePosition == RelativeDropPosition.After) ? RelativeDropPosition.Before : RelativeDropPosition.After;
			}
		} else {
			var iCursorY = oEvent.pageY - mDropRect.top;
			mStyle.width = mDropRect.width;
			mStyle.left = mDropRect.left;

			if (sDropPosition == "Between") {
				mStyle.height = "";
				if (iCursorY < mDropRect.height * 0.5) {
					sRelativePosition = RelativeDropPosition.Before;
					mStyle.top = mDropRect.top;
				} else {
					sRelativePosition = RelativeDropPosition.After;
					mStyle.top = mDropRect.bottom;
				}
			} else if (sDropPosition == "OnOrBetween") {
				if (iCursorY < mDropRect.height * 0.25) {
					sRelativePosition = RelativeDropPosition.Before;
					mStyle.top = mDropRect.top;
					mStyle.height = "";
				} else if (iCursorY > mDropRect.height * 0.75) {
					sRelativePosition = RelativeDropPosition.After;
					mStyle.top = mDropRect.bottom;
					mStyle.height = "";
				} else {
					sRelativePosition = RelativeDropPosition.On;
				}
			}
		}

		if (bCalculateOnly || mIndicatorConfig?.display == "none") {
			return sRelativePosition;
		}

		if (sRelativePosition == RelativeDropPosition.On) {
			mStyle.top = mDropRect.top;
			mStyle.left = mDropRect.left;
			mStyle.width = mDropRect.width;
			mStyle.height = mDropRect.height;
			sDropPosition = sRelativePosition;
		} else {
			sDropPosition = "Between";
		}

		if (mLastIndicatorStyle.top != mStyle.top ||
			mLastIndicatorStyle.left != mStyle.left ||
			mLastIndicatorStyle.width != mStyle.width ||
			mLastIndicatorStyle.height != mStyle.height) {
			$Indicator.attr("data-drop-layout", sDropLayout);
			$Indicator.attr("data-drop-position", sDropPosition);
			$Indicator.css(Object.assign(mStyle, mIndicatorConfig));
			$Indicator.show();
			mLastIndicatorStyle = mStyle;
		}

		return sRelativePosition;
	}

	function getDragDropConfigs(oControl) {
		var oParent = oControl.getParent(),
			aSelfConfigs = (oControl.getDragDropConfig) ? oControl.getDragDropConfig() : [],
			aParentConfigs = (oParent && oParent.getDragDropConfig) ? oParent.getDragDropConfig() : [];

		return aSelfConfigs.concat(aParentConfigs);
	}

	function getValidDragInfos(oDragControl) {
		var aDragDropConfigs = getDragDropConfigs(oDragControl);
		return aDragDropConfigs.filter(function(oDragOrDropInfo) {
			return oDragOrDropInfo.isDraggable(oDragControl);
		});
	}

	function getValidDropInfos(oDropControl, aDragInfos, oEvent) {
		var aDragDropConfigs = getDragDropConfigs(oDropControl);
		aDragInfos = aDragInfos || [];

		return aDragDropConfigs.filter(function(oDragOrDropInfo) {
			// DragDropInfo defined at the drop target is irrelevant we only need DropInfos
			return !oDragOrDropInfo.isA("sap.ui.core.dnd.IDragInfo");
		}).concat(aDragInfos).filter(function(oDropInfo) {
			if (!oDropInfo.isDroppable(oDropControl, oEvent)) {
				return false;
			}

			// master group matches always
			var sDropGroupName = oDropInfo.getGroupName();
			if (!sDropGroupName) {
				return true;
			}

			// group name matching
			return aDragInfos.some(function(oDragInfo) {
				return oDragInfo.getGroupName() == sDropGroupName;
			});
		});
	}

	function setDropEffect(oEvent, oDropInfo) {
		// allow dropping
		oEvent.preventDefault();

		// set visual drop indicator from the drop info in case of the dragged source is a control
		if (oDragControl) {
			var sDropEffect = oDropInfo.getDropEffect().toLowerCase();
			oEvent.originalEvent.dataTransfer.dropEffect = sDropEffect;
		}
	}

	function showDropPosition(oEvent, oDropInfo, oValidDropControl, bCalculateOnly) {
		// no target aggregation so entire control is the target
		var sTargetAggregation = oDropInfo.getTargetAggregation();
		if (!sTargetAggregation) {
			return showDropIndicator(oEvent, oValidDropControl.getDomRef(), undefined, undefined, bCalculateOnly);
		}

		// whether the current DOM element corresponds to the configured aggregation
		var oTargetDomRef;
		if (oEvent.getMark("DragWithin") == sTargetAggregation) {
			oTargetDomRef = oValidDropControl.getDomRefForSetting(sTargetAggregation);
		}

		// not dragging over an aggregated child of the element
		oTargetDomRef = oTargetDomRef || oValidDropControl.getDomRef();

		// let the user know the drop position
		return showDropIndicator(oEvent, oTargetDomRef, oDropInfo.getDropPosition(true), oDropInfo.getDropLayout(true), bCalculateOnly);
	}

	// before controls handle UIArea events
	DnD.preprocessEvent = function(oEvent) {
		if (oDragSession && oEvent.type.indexOf("dr") == 0) {
			// attach dragSession to all drag events
			oEvent.dragSession = oDragSession;

			// stop the drag leave timer in case of any drag event
			if (iDragLeaveTimer) {
				iDragLeaveTimer = clearTimeout(iDragLeaveTimer);
			}
		}

		var sEventHandler = "onbefore" + oEvent.type;
		if (DnD[sEventHandler]) {
			DnD[sEventHandler](oEvent);
		}
	};

	// after controls handle UIArea events
	DnD.postprocessEvent = function(oEvent) {
		var sEventHandler = "onafter" + oEvent.type;
		if (DnD[sEventHandler]) {
			DnD[sEventHandler](oEvent);
		}
	};

	// keyboard support for aggregation reordering
	DnD.onbeforekeydown = function(oEvent) {
		if (getReorderInfo(oEvent)) {
			oEvent.setMark("dnd");
		}
	};

	// keyboard support for aggregation reordering
	DnD.onafterkeydown = function(oEvent) {
		if (!oEvent.getMark("dnd")) {
			return;
		}

		let sDirection, oDropControl;
		const { oDragControl, oDropConfig } = getReorderInfo(oEvent);
		const sDropLayout = oDropConfig.getDropLayout(true);
		if (sDropLayout == "Horizontal" && (oEvent.code == "ArrowRight" || oEvent.code == "ArrowLeft")) {
			const sNext = Localization.getRTL() ? "prev" : "next";
			const sPrev = Localization.getRTL() ? "next" : "prev";
			sDirection = oEvent.code == "ArrowRight" ? sNext : sPrev;
			oDropControl = getSiblingOfControl(oDragControl, sDirection);
			oEvent.preventDefault();
		}
		if (sDropLayout == "Vertical" && (oEvent.code == "ArrowDown" || oEvent.code == "ArrowUp")) {
			sDirection = oEvent.code == "ArrowDown" ? "next" : "prev";
			oDropControl = getSiblingOfControl(oDragControl, sDirection);
			oEvent.preventDefault();
		}

		if (!oDropControl) {
			return;
		}

		const oDataTransfer = new DataTransfer();
		const oDragStartEvent = simulateEvent("dragstart", oDragControl, oDataTransfer, sDirection);
		if (oDragStartEvent.isDefaultPrevented() || oDragStartEvent.isMarked("NonDraggable")) {
			return;
		}

		const oDragEnterEvent = simulateEvent("dragenter", oDropControl, oDataTransfer, sDirection);
		if (!oDragEnterEvent.isMarked("NonDroppable")) {
			simulateEvent("drop", oDropControl, oDataTransfer, sDirection);
		}

		simulateEvent("dragend", oDragControl, oDataTransfer, sDirection);
	};

	DnD.onbeforemousedown = function(oEvent) {
		// text selection workaround since preventDefault on dragstart does not help
		// https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10375756/
		// https://bugzilla.mozilla.org/show_bug.cgi?id=800050
		if ((Device.browser.firefox) && isSelectableElement(oEvent.target)) {
			oDraggableAncestorNode = jQuery(oEvent.target).closest("[data-sap-ui-draggable=true]").prop("draggable", false)[0];
		}
	};

	DnD.onbeforemouseup = function(oEvent) {
		if (oDraggableAncestorNode) {
			oDraggableAncestorNode.draggable = true;
			oDraggableAncestorNode = null;
		}
	};

	DnD.onbeforedragstart = function(oEvent) {
		// draggable implicitly
		if (!oEvent.target.draggable) {
			return;
		}

		// the text inside input fields should still be selectable
		if (isSelectableElement(document.activeElement)) {
			oEvent.target.getAttribute("data-sap-ui-draggable") && oEvent.preventDefault();
			return;
		}

		// identify the control being dragged
		oDragControl = Element.closestTo(oEvent.target, true);
		if (!oDragControl) {
			return;
		}

		// identify and remember the applicable DragInfos
		aValidDragInfos = getValidDragInfos(oDragControl);
		if (!aValidDragInfos.length) {
			return;
		}

		// mobile devices needs text data with a value set on the dataTransfer object to allow dragging
		if (Device.browser.mobile && !oEvent.originalEvent.dataTransfer.getData("text")) {
			oEvent.originalEvent.dataTransfer.setData("text", " ");
		}

		// create the drag session object and attach to the event
		oEvent.dragSession = oDragSession = createDragSession(oEvent);
	};

	DnD.onafterdragstart = function(oEvent) {
		// drag is not possible if preventDefault is called for dragstart event
		if (!aValidDragInfos.length || oEvent.isDefaultPrevented()) {
			closeDragSession();
			return;
		}

		// fire dragstart event of valid DragInfos and filter if preventDefault is called
		aValidDragInfos = oEvent.isMarked("NonDraggable") ? [] : aValidDragInfos.filter(function(oDragInfo) {
			return oDragInfo.fireDragStart(oEvent);
		});

		// check whether drag is possible
		if (!aValidDragInfos.length) {
			oEvent.preventDefault();
			closeDragSession();
			return;
		}

		// drag start visualization is not necessary for simulated events
		if (oEvent.simulated) {
			return;
		}

		// set custom drag ghost
		setDragGhost(oDragControl, oEvent);

		// set dragging class of the drag source
		addStyleClass(oDragControl, "sapUiDnDDragging");

		// prevent HTML element from scrolling during drag-and-drop if the drag control is already in a scroll container
		if (jQuery(oEvent.target).closest(".sapUiScrollDelegate")[0]) {
			jQuery("html").addClass("sapUiDnDNoScrolling");
		}
	};

	DnD.onbeforedragenter = function(oEvent) {
		// check whether we remain within the same control
		var oControl = Element.closestTo(oEvent.target, true);
		if (oControl && oDropControl === oControl) {
			oEvent.setMark("DragWithin", "SameControl");
		} else {
			iTargetEnteringTime = Date.now();
			oDropControl = oControl;
		}

		var aDropInfos = [], oParentDomRef;
		oValidDropControl = oControl;

		// find the first valid drop control and corresponding valid DropInfos from the dom-control hierarchy
		for (var i = 0; i < 20 && oValidDropControl; i++) {
			aDropInfos = getValidDropInfos(oValidDropControl, aValidDragInfos, oEvent);
			if (aDropInfos.length) {
				break;
			}

			oParentDomRef = oValidDropControl.getDomRef();
			oParentDomRef = oParentDomRef && oParentDomRef.parentElement;
			oValidDropControl = Element.closestTo(oParentDomRef, true);
		}

		// if we are not dragging within the same control we can update valid drop infos
		if (oEvent.getMark("DragWithin") != "SameControl") {
			aValidDropInfos = aDropInfos;
			if (oDragSession) {
				oDragSession.setIndicatorConfig(null);
			}
		}

		// no valid drop info found
		if (!aValidDropInfos.length) {
			oValidDropControl = null;
		} else if (!oDragSession) {
			bDraggedOutOfBrowser = true;
			oEvent.dragSession = oDragSession = createDragSession(oEvent);
		}
	};

	DnD.onafterdragenter = function(oEvent) {
		// drop is not possible if there is no valid drop control or dragenter event is marked as NonDroppable
		if (!oValidDropControl || oEvent.isMarked("NonDroppable")) {
			aValidDropInfos = [];
		} else if (oEvent.getMark("DragWithin") != "SameControl") {
			// fire dragenter event of valid DropInfos and filter if preventDefault is called
			aValidDropInfos = aValidDropInfos.filter(function(oDropInfo) {
				sCalculatedDropPosition = showDropPosition(oEvent, oDropInfo, oValidDropControl, true);
				return oDropInfo.fireDragEnter(oEvent);
			});
		}

		// set drop effect and drop position
		var oValidDropInfo = aValidDropInfos[0];
		if (!oValidDropInfo || oValidDropInfo.getDropEffect() == "None") {
			hideDropIndicator();
			sCalculatedDropPosition = "";
		} else {
			setDropEffect(oEvent, oValidDropInfo);
			sCalculatedDropPosition = showDropPosition(oEvent, oValidDropInfo, oValidDropControl);
		}
	};

	DnD.onbeforedragover = function(oEvent) {
		// handle longdragover event
		var iCurrentTime = Date.now();
		if (iCurrentTime - iTargetEnteringTime >= 1000) {
			dispatchEvent(oEvent, "longdragover");
			iTargetEnteringTime = iCurrentTime;
		}
	};

	DnD.onafterdragover = function(oEvent) {
		// drop is not possible if there is no valid drop control or dragover event is marked as NonDroppable
		if (!oValidDropControl || oEvent.isMarked("NonDroppable")) {
			aValidDropInfos = [];
		} else {
			// fire dragover event of valid DropInfos and filter if preventDefault is called
			aValidDropInfos = aValidDropInfos.filter(function(oDropInfo) {
				sCalculatedDropPosition = showDropPosition(oEvent, oDropInfo, oValidDropControl, true);
				return oDropInfo.fireDragOver(oEvent);
			});
		}

		// set drop effect and drop position
		const oValidDropInfo = aValidDropInfos[0];
		if (!oValidDropInfo || oValidDropInfo.getDropEffect() == "None") {
			hideDropIndicator();
			sCalculatedDropPosition = "";
		} else {
			// browsers drop effect must be set on dragover always
			setDropEffect(oEvent, oValidDropInfo);

			// drop position is set already at dragenter it should not be changed for DropPosition=On
			if (oValidDropInfo && oValidDropInfo.getDropPosition(true) == "On") {
				return;
			}

			// drop indicator position may change depending on the mouse pointer location
			sCalculatedDropPosition = showDropPosition(oEvent, oValidDropInfo, oValidDropControl);
		}
	};

	DnD.onafterdragleave = function(oEvent) {
		// clean up the drop indicator if the user left the browser window while dragging
		if (bDraggedOutOfBrowser) {
			if (Device.browser.safari) {
				// Safari does not provide the relatedTarget: https://bugs.webkit.org/show_bug.cgi?id=66547
				iDragLeaveTimer = setTimeout(closeDragSession, 100);
			} else if (!oEvent.relatedTarget) {
				closeDragSession();
			}
		}
	};

	DnD.onbeforedrop = function(oEvent) {
		// prevent default action
		if (aValidDropInfos.length) {
			oEvent.preventDefault();
		}
	};

	DnD.onafterdrop = function(oEvent) {
		// fire drop events of valid DropInfos
		aValidDropInfos.forEach(function(oDropInfo) {
			oDropInfo.fireDrop(oEvent);
		});

		// dragend event is not dispatched if the dragged element is removed
		iDragEndTimer = requestAnimationFrame(this.onafterdragend.bind(this, oEvent));
	};

	DnD.onafterdragend = function(oEvent) {
		// cleanup the timer if there is a waiting job on the queue
		iDragEndTimer = cancelAnimationFrame(iDragEndTimer);

		// fire dragend event of valid DragInfos
		aValidDragInfos.forEach(function(oDragInfo) {
			oDragInfo.fireDragEnd(oEvent);
		});

		// remove the dragging class of the dragged control
		removeStyleClass(oDragControl, "sapUiDnDDragging");

		// retain the scrolling behavior of the html element after dragend
		jQuery("html").removeClass("sapUiDnDNoScrolling");

		// finalize drag session
		closeDragSession();
	};

	// process the events of the UIArea
	UIArea.addEventPreprocessor(DnD.preprocessEvent);
	UIArea.addEventPostprocessor(DnD.postprocessEvent);

	return DnD;

}, /* bExport= */ true);