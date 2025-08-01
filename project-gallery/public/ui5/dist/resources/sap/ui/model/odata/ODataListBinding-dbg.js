/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides class sap.ui.model.odata.ODataListBinding
sap.ui.define([
	"./CountMode",
	"./ODataUtils",
	"sap/base/assert",
	"sap/base/Log",
	"sap/base/util/deepEqual",
	"sap/base/util/each",
	"sap/base/util/merge",
	"sap/base/util/array/diff",
	"sap/ui/model/ChangeReason",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterProcessor",
	"sap/ui/model/FilterType",
	"sap/ui/model/ListBinding",
	"sap/ui/model/Sorter",
	"sap/ui/model/odata/Filter"
], function(CountMode, ODataUtils, assert, Log, deepEqual, each, merge, arrayDiff, ChangeReason,
	Filter, FilterProcessor, FilterType, ListBinding, Sorter, ODataFilter) {
	"use strict";

	/**
	 * @class
	 * List binding implementation for OData format.
	 *
	 * @param {sap.ui.model.odata.ODataModel} oModel Model that this list binding belongs to
	 * @param {string} sPath Path into the model data, relative to the given <code>oContext</code>
	 * @param {sap.ui.model.Context} oContext Context that the <code>sPath</code> is based on
	 * @param {array} [aSorters] Initial sort order (can be either a sorter or an array of sorters)
	 * @param {array} [aFilters] Predefined filter/s (can be either a filter or an array of filters)
	 * @param {object} [mParameters] A map which contains additional parameters for the binding
	 * @param {string} [mParameters.expand] Value for the OData <code>$expand</code> query parameter which should be included in the request
	 * @param {string} [mParameters.select] Value for the OData <code>$select</code> query parameter which should be included in the request
	 * @param {Object<string,string>} [mParameters.custom] An optional map of custom query parameters. Custom parameters must not start with <code>$</code>
	 * @param {sap.ui.model.odata.CountMode} [mParameters.countMode] Defines the count mode of this binding;
	 *           if not specified, the default count mode of the <code>oModel</code> is applied
	 * @throws {Error} If one of the filters uses an operator that is not supported by the underlying model
	 *   implementation or if the {@link sap.ui.model.Filter.NONE} filter instance is contained in
	 *   <code>aFilters</code> together with other filters
	 *
	 * @public
	 * @deprecated As of version 1.66, please use {@link sap.ui.model.odata.v2.ODataListBinding} instead.
	 * @alias sap.ui.model.odata.ODataListBinding
	 * @extends sap.ui.model.ListBinding
	 */
	var ODataListBinding = ListBinding.extend("sap.ui.model.odata.ODataListBinding", /** @lends sap.ui.model.odata.ODataListBinding.prototype */ {

		constructor : function(oModel, sPath, oContext, aSorters, aFilters, mParameters) {
			ListBinding.apply(this, arguments);
			this.sFilterParams = null;
			this.sSortParams = null;
			this.sRangeParams = null;
			this.sCustomParams = this.oModel.createCustomParams(this.mParameters);
			this.iStartIndex = 0;
			this.bPendingChange = false;
			this.aKeys = [];
			this.bInitial = true;
			this.sCountMode = (mParameters && mParameters.countMode) || this.oModel.sDefaultCountMode;
			this.bRefresh = false;
			this.bNeedsUpdate = false;
			this.bDataAvailable = false;
			this.bIgnoreSuspend = false;
			this.oCombinedFilter = null;

			// check filter integrity
			this.oModel.checkFilter(this.aApplicationFilters);

			// load the entity type for the collection only once and not e.g. every time when filtering
			if (!this.oModel.getServiceMetadata()) {
				var that = this,
				fnCallback = function(oEvent) {
					that.bInitial = false;
					that._initSortersFilters();
					that.oModel.detachMetadataLoaded(fnCallback);
				};
				this.oModel.attachMetadataLoaded(this, fnCallback);
			} else {
				this.bInitial = false;
				this._initSortersFilters();
			}

			// if nested list is already available and no filters or sorters are set,
			// use the data and don't send additional requests
			var oRef = this.oModel._getObject(this.sPath, this.oContext);
			this.aExpandRefs = oRef;
			if (Array.isArray(oRef) && !aSorters && !aFilters) {
				this.aKeys = oRef;
				this.iLength = oRef.length;
				this.bLengthFinal = true;
				this.bDataAvailable = true;
			} else if (oRef === null && this.oModel.resolve(this.sPath, this.oContext)) { // means that expanded data has no data available e.g. for 0..n relations
				this.aKeys = [];
				this.iLength = 0;
				this.bLengthFinal = true;
				this.bDataAvailable = true;
			} else if (this.oModel.getServiceMetadata()) {
				// call getLength when metadata is already loaded or don't do anything
				// if the metadata gets loaded it will call a refresh on all bindings
				this.resetData();
			}
		}
	});

	/**
	 * Returns all current contexts of this list binding in no special order. Just like
	 * {@link #getCurrentContexts}, this method does not request any data from a back end and does
	 * not change the binding's state. In contrast to {@link #getCurrentContexts}, it does not only
	 * return those contexts that were last requested by a control, but all contexts that are
	 * currently available in the binding.
	 *
	 * @returns {sap.ui.model.odata.v2.Context[]}
	 *   All current contexts of this list binding, in no special order
	 *
	 * @public
	 * @since 1.98.0
	 */
	ODataListBinding.prototype.getAllCurrentContexts = function () {
		var aContexts = [],
			that = this;

		this.aKeys.forEach(function (sKey) {
			aContexts.push(that.oModel.getContext("/" + sKey));
		});

		return aContexts;
	};

	/**
	 * Return contexts for the list
	 *
	 * @param {int} [iStartIndex=0]
	 *   The start index of the requested contexts
	 * @param {int} [iLength]
	 *   The requested amount of contexts
	 * @param {int} [iThreshold=0]
	 *   The maximum number of contexts to read before and after the given range; with this,
	 *   controls can prefetch data that is likely to be needed soon, e.g. when scrolling down in a
	 *   table
	 * @return {sap.ui.model.Context[]}
	 *   The array of contexts for each row of the bound list
	 * @protected
	 */
	ODataListBinding.prototype.getContexts = function(iStartIndex, iLength, iThreshold) {

		if (this.bInitial) {
			return [];
		}

		this.iLastLength = iLength;
		this.iLastStartIndex = iStartIndex;
		this.iLastThreshold = iThreshold;

		//	Set default values if startindex, threshold or length are not defined
		if (!iStartIndex) {
			iStartIndex = 0;
		}
		if (!iLength) {
			iLength = this.oModel.iSizeLimit;
			if (this.bLengthFinal && this.iLength < iLength) {
				iLength = this.iLength;
			}
		}
		if (!iThreshold) {
			iThreshold = 0;
		}

		var bLoadContexts = true,
			aContexts = this._getContexts(iStartIndex, iLength),
			oContextData = {},
			oSection;

		oSection = this.calculateSection(iStartIndex, iLength, iThreshold, aContexts);
		bLoadContexts = aContexts.length != iLength && !(this.bLengthFinal && aContexts.length >= this.iLength - iStartIndex);

		// check if metadata are already available
		if (this.oModel.getServiceMetadata()) {
			// If rows are missing send a request
			if (!this.bPendingRequest && oSection.length > 0 && (bLoadContexts || iLength < oSection.length)) {
				this.loadData(oSection.startIndex, oSection.length);
				aContexts.dataRequested = true;
			}
		}

		if (this.bRefresh) {
			// if refreshing and length is 0, pretend a request to be fired to make a refresh with
			// with preceding $count request look like a request with $inlinecount=allpages
			if (this.bLengthFinal && this.iLength == 0) {
				this.loadData(oSection.startIndex, oSection.length, true);
				aContexts.dataRequested = true;
			}
			this.bRefresh = false;
		} else {
			// Do not create context data and diff in case of refresh, only if real data has been received
			// The current behaviour is wrong and makes diff detection useless for OData in case of refresh
			for (var i = 0; i < aContexts.length; i++) {
				oContextData[aContexts[i].getPath()] = aContexts[i].getObject();
			}

			if (this.bUseExtendedChangeDetection) {
				//Check diff
				if (this.aLastContexts && iStartIndex < this.iLastEndIndex) {
					var that = this;
					var aDiff = arrayDiff(this.aLastContexts, aContexts, function(oOldContext, oNewContext) {
						return deepEqual(
								oOldContext && that.oLastContextData && that.oLastContextData[oOldContext.getPath()],
								oNewContext && oContextData && oContextData[oNewContext.getPath()]
							);
					});
					aContexts.diff = aDiff;
				}
			}

			this.iLastEndIndex = iStartIndex + iLength;
			this.aLastContexts = aContexts.slice(0);
			this.oLastContextData = merge({}, oContextData);
		}

		return aContexts;
	};

	ODataListBinding.prototype.getCurrentContexts = function() {
		return this.aLastContexts || [];
	};

	/**
	 * Return contexts for the list
	 *
	 * @param {int} [iStartIndex=0] the start index of the requested contexts
	 * @param {int} [iLength] the requested amount of contexts
	 *
	 * @return {Array} the contexts array
	 * @private
	 */
	ODataListBinding.prototype._getContexts = function(iStartIndex, iLength) {
		var aContexts = [],
			oContext,
			sKey;

		if (!iStartIndex) {
			iStartIndex = 0;
		}
		if (!iLength) {
			iLength = this.oModel.iSizeLimit;
			if (this.bLengthFinal && this.iLength < iLength) {
				iLength = this.iLength;
			}
		}

		//	Loop through known data and check whether we already have all rows loaded
		for (var i = iStartIndex; i < iStartIndex + iLength; i++) {
			sKey = this.aKeys[i];
			if (!sKey) {
				break;
			}
			oContext = this.oModel.getContext('/' + sKey);
			aContexts.push(oContext);
		}

		return aContexts;
	};

	/*
	 * @private
	 */
	ODataListBinding.prototype.calculateSection = function(iStartIndex, iLength, iThreshold, aContexts) {
		var iSectionLength,
			iSectionStartIndex,
			iPreloadedSubsequentIndex,
			iPreloadedPreviousIndex,
			iRemainingEntries,
			oSection = {},
			sKey;

		iSectionStartIndex = iStartIndex;
		iSectionLength = 0;

		// check which data exists before startindex; If all necessary data is loaded iPreloadedPreviousIndex stays undefined
		for (var i = iStartIndex; i >= Math.max(iStartIndex - iThreshold,0); i--) {
			sKey = this.aKeys[i];
			if (!sKey) {
				iPreloadedPreviousIndex = i + 1;
				break;
			}
		}
		// check which data is already loaded after startindex; If all necessary data is loaded iPreloadedSubsequentIndex stays undefined
		for (var j = iStartIndex + iLength; j < iStartIndex + iLength + iThreshold; j++) {
			sKey = this.aKeys[j];
			if (!sKey) {
				iPreloadedSubsequentIndex = j;
				break;
			}
		}

		// calculate previous remaining entries
		iRemainingEntries = iStartIndex - iPreloadedPreviousIndex;
		if (iPreloadedPreviousIndex && iStartIndex > iThreshold && iRemainingEntries < iThreshold) {
			if (aContexts.length != iLength) {
				iSectionStartIndex = iStartIndex - iThreshold;
			} else {
				iSectionStartIndex = iPreloadedPreviousIndex - iThreshold;
			}
			iSectionLength = iThreshold;
		}

		// prevent iSectionStartIndex to become negative
		iSectionStartIndex = Math.max(iSectionStartIndex, 0);

		// No negative preload needed; move startindex if we already have some data
		if (iSectionStartIndex == iStartIndex) {
			iSectionStartIndex += aContexts.length;
		}

		//read the rest of the requested data
		if (aContexts.length != iLength) {
			iSectionLength += iLength - aContexts.length;
		}

		//calculate subsequent remaining entries
		iRemainingEntries = iPreloadedSubsequentIndex - iStartIndex - iLength;

		if (iRemainingEntries == 0) {
			iSectionLength += iThreshold;
		}

		if (iPreloadedSubsequentIndex && iRemainingEntries < iThreshold && iRemainingEntries > 0) {
				//check if we need to load previous entries; If not we can move the startindex
				if (iSectionStartIndex > iStartIndex) {
					iSectionStartIndex = iPreloadedSubsequentIndex;
					iSectionLength += iThreshold;
				}

		}

		//check final length and adapt sectionLength if needed.
		if (this.bLengthFinal && this.iLength < (iSectionLength + iSectionStartIndex)) {
			iSectionLength = this.iLength - iSectionStartIndex;
		}

		oSection.startIndex = iSectionStartIndex;
		oSection.length = iSectionLength;

		return oSection;
	};

	/**
	 * Setter for context
	 * @param {Object} oContext the new context object
	 */
	ODataListBinding.prototype.setContext = function(oContext) {
		if (this.oContext != oContext) {
			this.oContext = oContext;
			if (this.isRelative()) {
				// get new entity type with new context and init filters now correctly
				this._initSortersFilters();

				if (!this.bInitial) {
					// if nested list is already available, use the data and don't send additional requests
					var oRef = this.oModel._getObject(this.sPath, this.oContext);
					this.aExpandRefs = oRef;
					// eslint-disable-next-line no-unsafe-negation
					if (Array.isArray(oRef) && !this.aSorters.length > 0 && !this.aFilters.length > 0) {
						this.aKeys = oRef;
						this.iLength = oRef.length;
						this.bLengthFinal = true;
						this._fireChange({ reason: ChangeReason.Context });
					} else if (!this.oModel.resolve(this.sPath, this.oContext) || oRef === null){
						// if path does not resolve, or data is known to be null (e.g. expanded list)
						this.aKeys = [];
						this.iLength = 0;
						this.bLengthFinal = true;
						this._fireChange({ reason: ChangeReason.Context });
					} else {
						this.refresh();
					}
				}
			}
		}
	};

	/**
	 * Get a download URL with the specified format considering the
	 * sort/filter/custom parameters.
	 *
	 * @param {string} sFormat Value for the $format Parameter
	 * @return {string} URL which can be used for downloading
	 * @since 1.24
	 * @public
	 */
	ODataListBinding.prototype.getDownloadUrl = function(sFormat) {
		var aParams = [],
			sPath;

		if (sFormat) {
			aParams.push("$format=" + encodeURIComponent(sFormat));
		}
		if (this.sSortParams) {
			aParams.push(this.sSortParams);
		}
		if (this.sFilterParams) {
			aParams.push(this.sFilterParams);
		}
		if (this.sCustomParams) {
			aParams.push(this.sCustomParams);
		}

		sPath = this.oModel.resolve(this.sPath,this.oContext);

		return sPath && this.oModel._createRequestUrl(sPath, null, aParams);
	};

	/**
	 * Load list data from the server.
	 *
	 * @param {number} iStartIndex The first index to load
	 * @param {number} iLength The number of entries to load
	 * @param {boolean} bPretend Whether the request should be pretended
	 */
	ODataListBinding.prototype.loadData = function(iStartIndex, iLength, bPretend) {

		var that = this,
			bInlineCountRequested = false;

		// create range parameters and store start index for sort/filter requests
		if (iStartIndex || iLength) {
			this.sRangeParams = "$skip=" + iStartIndex + "&$top=" + iLength;
			this.iStartIndex = iStartIndex;
		} else {
			iStartIndex = this.iStartIndex;
		}

		// create the request url
		var aParams = [];
		if (this.sRangeParams) {
			aParams.push(this.sRangeParams);
		}
		if (this.sSortParams) {
			aParams.push(this.sSortParams);
		}
		if (this.sFilterParams) {
			aParams.push(this.sFilterParams);
		}
		if (this.sCustomParams) {
			aParams.push(this.sCustomParams);
		}
		if (!this.bLengthFinal &&
			(this.sCountMode == CountMode.Inline ||
			this.sCountMode == CountMode.Both)) {
			aParams.push("$inlinecount=allpages");
			bInlineCountRequested = true;
		}

		function fnSuccess(oData) {

			// Collecting contexts
			each(oData.results, function(i, entry) {
				that.aKeys[iStartIndex + i] = that.oModel._getKey(entry);
			});

			// update iLength (only when the inline count was requested and is available)
			if (bInlineCountRequested && oData.__count) {
				that.iLength = parseInt(oData.__count);
				that.bLengthFinal = true;
			}

			// if we got data and the results + startindex is larger than the
			// length we just apply this value to the length and add the requested
			// length again to enable paging/scrolling
			if (that.iLength < iStartIndex + oData.results.length) {
				that.iLength = iStartIndex + oData.results.length;
				that.bLengthFinal = false;
			}

			// if less entries are returned than have been requested
			// set length accordingly
			if (oData.results.length < iLength || iLength === undefined) {
				that.iLength = iStartIndex + oData.results.length;
				that.bLengthFinal = true;
			}

			// check if there are any results at all...
			if (iStartIndex == 0 && oData.results.length == 0) {
				that.iLength = 0;
				that.bLengthFinal = true;
			}

			that.oRequestHandle = null;
			that.bPendingRequest = false;

			// If request is originating from this binding, change must be fired afterwards
			that.bNeedsUpdate = true;

			that.bIgnoreSuspend = true;
		}

		function fnCompleted(oData) {
			that.fireDataReceived({data: oData});
		}

		function fnError(oError, bAborted) {
			that.oRequestHandle = null;
			that.bPendingRequest = false;
			if (!bAborted) {
				// reset data and trigger update
				that.aKeys = [];
				that.iLength = 0;
				that.bLengthFinal = true;
				that.bDataAvailable = true;
				that._fireChange({reason: ChangeReason.Change});
			}
			that.fireDataReceived();
		}

		function fnUpdateHandle(oHandle) {
			that.oRequestHandle = oHandle;
		}

		var sPath = this.sPath,
			oContext = this.oContext;

		if (this.isRelative()) {
			sPath = this.oModel.resolve(sPath,oContext);
		}
		if (sPath) {
			if (bPretend) {
				// Pretend to send a request by firing the appropriate events
				var sUrl = this.oModel._createRequestUrl(sPath, null, aParams);
				this.fireDataRequested();
				this.oModel.fireRequestSent({url: sUrl, method: "GET", async: true});
				setTimeout(function() {
					// If request is originating from this binding, change must be fired afterwards
					that.bNeedsUpdate = true;
					that.checkUpdate();
					that.oModel.fireRequestCompleted({url: sUrl, method: "GET", async: true, success: true});
					that.fireDataReceived({data: {}});
				}, 0);
			} else {
				// Execute the request and use the metadata if available
				this.bPendingRequest = true;
				this.fireDataRequested();
				this.oModel._loadData(sPath, aParams, fnSuccess, fnError, false, fnUpdateHandle, fnCompleted);
			}
		}

	};

	ODataListBinding.prototype.getLength = function() {
		// If length is not final and larger than zero, add some additional length to enable
		// scrolling/paging for controls that only do this if more items are available
		if (this.bLengthFinal || this.iLength == 0) {
			return this.iLength;
		} else {
			var iAdditionalLength = this.iLastThreshold || this.iLastLength || 10;
			return this.iLength + iAdditionalLength;
		}
	};

	ODataListBinding.prototype.isLengthFinal = function() {
		return this.bLengthFinal;
	};

	/**
	 * Request the length of the list from the backend and cache it.
	 */
	ODataListBinding.prototype._getLength = function() {

		var that = this;

		// create a request object for the data request
		var aParams = [];
		if (this.sFilterParams) {
			aParams.push(this.sFilterParams);
		}

		// use only custom params for count and not expand,select params
		if (this.mParameters && this.mParameters.custom) {
			var oCust = { custom: {}};
			each(this.mParameters.custom, function (sParam, oValue){
				oCust.custom[sParam] = oValue;
			});
			aParams.push(this.oModel.createCustomParams(oCust));
		}

		function _handleSuccess(oData) {
			that.iLength = parseInt(oData);
			that.bLengthFinal = true;
		}

		function _handleError(oError) {
			var sErrorMsg = "Request for $count failed: " + oError.message;
			if (oError.response) {
				sErrorMsg += ", " + oError.response.statusCode + ", " + oError.response.statusText + ", " + oError.response.body;
			}
			Log.warning(sErrorMsg);
		}

		// Use context and check for relative binding
		var sPath = this.oModel.resolve(this.sPath, this.oContext);

		// Only send request, if path is defined
		if (sPath) {
			var sUrl = this.oModel._createRequestUrl(sPath + "/$count", null, aParams);
			var oRequest = this.oModel._createRequest(sUrl, "GET", false);
			// count needs other accept header
			oRequest.headers["Accept"] = "text/plain, */*;q=0.5";

			// execute the request and use the metadata if available
			// (since $count requests are synchronous we skip the withCredentials here)
			this.oModel._request(oRequest, _handleSuccess, _handleError, undefined, undefined, this.oModel.getServiceMetadata());
		}
	};

	/**
	 * Refreshes the binding, checks whether the model data has been changed and fires a change
	 * event if this is the case. For server side models this should refetch the data from the
	 * server. To update a control, even if no data has been changed, e.g. to reset a control after
	 * failed validation, use the parameter <code>bForceUpdate</code>.
	 *
	 * @param {boolean} [bForceUpdate] Update the bound control even if no data has been changed
	 * @param {object} [mChangedEntities] A map of changed entities
	 * @param {object} [mEntityTypes] A map of entity types
	 * @public
	 */
	ODataListBinding.prototype.refresh = function(bForceUpdate, mChangedEntities, mEntityTypes) {
		var bChangeDetected = false;

		if (!bForceUpdate) {
			if (mEntityTypes) {
				var sResolvedPath = this.oModel.resolve(this.sPath, this.oContext);
				var oEntityType = this.oModel.oMetadata._getEntityTypeByPath(sResolvedPath);
				if (oEntityType && (oEntityType.entityType in mEntityTypes)) {
					bChangeDetected = true;
				}
			}
			if (mChangedEntities && !bChangeDetected) {
				each(this.aKeys, function(i, sKey) {
					if (sKey in mChangedEntities) {
						bChangeDetected = true;
						return false;
					}

					return true;
				});
			}
			if (!mChangedEntities && !mEntityTypes) { // default
				bChangeDetected = true;
			}
		}
		if (bForceUpdate || bChangeDetected) {
			this.abortPendingRequest();
			this.resetData();
			this._fireRefresh({reason: ChangeReason.Refresh});
		}
	};

	/**
	 * Fires a <code>refresh</code> event.
	 *
	 * @param {object} oParameters Parameters for the event
	 */
	ODataListBinding.prototype._fireRefresh = function(oParameters) {
		 if (this.oModel.resolve(this.sPath, this.oContext)) {
			 this.bRefresh = true;
			 this.fireEvent("refresh", oParameters);
		 }
	};

	/**
	 * Initialize binding. Fires a change if data is already available ($expand) or a refresh.
	 * If metadata is not yet available, do nothing, method will be called again when
	 * metadata is loaded.
	 *
	 * @public
	 */
	ODataListBinding.prototype.initialize = function() {
		if (this.oModel.oMetadata.isLoaded()) {
			if (this.bDataAvailable) {
				this._fireChange({reason: ChangeReason.Change});
			} else {
				this._fireRefresh({reason: ChangeReason.Refresh});
			}
		}
	};

	/**
	 * Checks whether this Binding would provide new values and in case it changed, fires a change
	 * event.
	 *
	 * @param {boolean} [bForceUpdate]
	 *   Whether the event should be fired regardless of the bindings state
	 * @param {object} mChangedEntities
	 *   A map of changed entities
	 */
	ODataListBinding.prototype.checkUpdate = function(bForceUpdate, mChangedEntities) {
		var sChangeReason = this.sChangeReason ? this.sChangeReason : ChangeReason.Change,
			bChangeDetected = false,
			oLastData, oCurrentData,
			that = this,
			oRef,
			bRefChanged;

		if (this.bSuspended && !this.bIgnoreSuspend) {
			return;
		}

		if (!bForceUpdate && !this.bNeedsUpdate) {

			// check if data in listbinding contains data loaded via expand
			// if yes and there was a change detected we:
			// - set the new keys if there are no sortes/filters set
			// - trigger a refresh if there are sorters/filters set
			oRef = this.oModel._getObject(this.sPath, this.oContext);
			bRefChanged = Array.isArray(oRef) && !deepEqual(oRef,this.aExpandRefs);
			this.aExpandRefs = oRef;
			if (bRefChanged) {
				if (this.aSorters.length > 0 || this.aFilters.length > 0) {
					this.refresh();
					return;
				} else {
					this.aKeys = oRef;
					this.iLength = oRef.length;
					this.bLengthFinal = true;
					bChangeDetected = true;
				}
			} else if (mChangedEntities) {
				each(this.aKeys, function(i, sKey) {
					if (sKey in mChangedEntities) {
						bChangeDetected = true;
						return false;
					}

					return true;
				});
			} else {
				bChangeDetected = true;
			}
			if (bChangeDetected && this.aLastContexts) {
				// Reset bChangeDetected and compare actual data of entries
				bChangeDetected = false;

				//Get contexts for visible area and compare with stored contexts
				var aContexts = this._getContexts(this.iLastStartIndex, this.iLastLength, this.iLastThreshold);
				if (this.aLastContexts.length != aContexts.length) {
					bChangeDetected = true;
				} else {
					each(this.aLastContexts, function(iIndex, oContext) {
						oLastData = that.oLastContextData[oContext.getPath()];
						oCurrentData = aContexts[iIndex].getObject();
						// Compare whether last data is completely contained in current data
						if (!deepEqual(oLastData, oCurrentData, true)) {
							bChangeDetected = true;
							return false;
						}

						return true;
					});
				}
			}
		}
		if (bForceUpdate || bChangeDetected || this.bNeedsUpdate) {
			this.bNeedsUpdate = false;
			this._fireChange({reason: sChangeReason});
		}
		this.sChangeReason = undefined;
		this.bIgnoreSuspend = false;
	};

	/**
	 * Resets the current list data and length
	 *
	 * @private
	 */
	ODataListBinding.prototype.resetData = function() {
		this.aKeys = [];
		this.iLength = 0;
		this.bLengthFinal = false;
		this.sChangeReason = undefined;
		this.bDataAvailable = false;
		if (this.oModel.isCountSupported() &&
			(this.sCountMode == CountMode.Request ||
			this.sCountMode == CountMode.Both)) {
			this._getLength();
		}
	};

	/**
	 * Aborts the current pending request (if any)
	 *
	 * This can be called if we are sure that the data from the current request is no longer relevant,
	 * e.g. when filtering/sorting is triggered or the context is changed.
	 *
	 * @private
	 */
	ODataListBinding.prototype.abortPendingRequest = function() {
		if (this.oRequestHandle) {
			this.oRequestHandle.abort();
			this.oRequestHandle = null;
			this.bPendingRequest = false;
		}
	};

	/**
	 * Sorts the list.
	 *
	 * @param {sap.ui.model.Sorter|sap.ui.model.Sorter[]} aSorters
	 *   The Sorter or an array of sorter objects which define the sort order
	 * @param {boolean} [bReturnSuccess=false]
	 *   Whether to return <code>true</code> or <code>false</code>, instead of <code>this</code>,
	 *   depending on whether the sorting has been done
	 * @return {this}
	 *   Returns <code>this</code> to facilitate method chaining or the success state
	 *
	 * @public
	 */
	ODataListBinding.prototype.sort = function(aSorters, bReturnSuccess) {

		var bSuccess = false;

		if (!aSorters) {
			aSorters = [];
		}

		if (aSorters instanceof Sorter) {
			aSorters = [aSorters];
		}

		this.aSorters = aSorters;
		this.createSortParams(aSorters);

		if (!this.bInitial) {
			// Only reset the keys, length usually doesn't change when sorting
			this.aKeys = [];
			this.abortPendingRequest();
			this.sChangeReason = ChangeReason.Sort;
			this._fireRefresh({reason : this.sChangeReason});
			this._fireSort({sorter: aSorters});
			bSuccess = true;
		}
		if (bReturnSuccess) {
			return bSuccess;
		} else {
			return this;
		}
	};

	ODataListBinding.prototype.createSortParams = function(aSorters) {
		this.sSortParams = ODataUtils.createSortParams(aSorters);
	};

	/**
	 *
	 * Filters the list.
	 *
	 * When using <code>sap.ui.model.Filter</code> the filters are first grouped according to their
	 * binding path. All filters belonging to a group are combined with OR and after that the
	 * results of all groups are combined with AND.
	 * Usually this means, all filters applied to a single table column are combined with OR, while
	 * filters on different table columns are combined with AND.
	 * Please note that a custom filter function is not supported.
	 *
	 * @param {sap.ui.model.Filter|sap.ui.model.Filter[]} aFilters
	 *   Single filter object or an array of filter objects
	 * @param {sap.ui.model.FilterType} sFilterType
	 *   Type of the filter which should be adjusted, if it is not given, the standard behaviour
	 *   applies
	 * @param {boolean} [bReturnSuccess=false]
	 *   Whether to return <code>true</code> or <code>false</code>, instead of <code>this</code>,
	 *   depending on whether the filtering has been done
	 * @return {this}
	 *   Returns <code>this</code> to facilitate method chaining or the success state
	 * @throws {Error} If one of the filters uses an operator that is not supported by the underlying model
	 *   implementation or if the {@link sap.ui.model.Filter.NONE} filter instance is contained in
	 *   <code>aFilters</code> together with other filters
	 *
	 * @public
	 */
	ODataListBinding.prototype.filter = function(aFilters, sFilterType, bReturnSuccess) {

		var bSuccess = false;

		if (!aFilters) {
			aFilters = [];
		}

		if (aFilters instanceof Filter) {
			aFilters = [aFilters];
		}

		// check filter integrity
		this.oModel.checkFilter(aFilters);

		if (sFilterType == FilterType.Application) {
			this.aApplicationFilters = aFilters;
		} else {
			this.aFilters = aFilters;
		}

		if (!aFilters || !Array.isArray(aFilters) || aFilters.length == 0) {
			this.aFilters = [];
		}
		//if no application-filters are present, or they are not in array form/empty array, init the filters with []
		if (!this.aApplicationFilters || !Array.isArray(this.aApplicationFilters) || this.aApplicationFilters.length === 0) {
			this.aApplicationFilters = [];
		}

		//if we have some Application Filters, they will ANDed to the Control-Filters
		this.convertFilters();
		this.oCombinedFilter = FilterProcessor.combineFilters(this.aFilters, this.aApplicationFilters);
		this.createFilterParams(this.oCombinedFilter);

		if (!this.bInitial) {
			this.resetData();
			this.abortPendingRequest();
			this.sChangeReason = ChangeReason.Filter;
			this._fireRefresh({reason : this.sChangeReason});
			if (sFilterType == FilterType.Application) {
				this._fireFilter({filters: this.aApplicationFilters});
			} else {
				this._fireFilter({filters: this.aFilters});
			}
			bSuccess = true;
		}

		if (bReturnSuccess) {
			return bSuccess;
		} else {
			return this;
		}
	};

	/**
	 * Convert sap.ui.model.odata.Filter to sap.ui.model.Filter
	 *
	 * @private
	 */
	ODataListBinding.prototype.convertFilters = function() {
		this.aFilters = this.aFilters.map(function(oFilter) {
			return oFilter instanceof ODataFilter ? oFilter.convert() : oFilter;
		});
		this.aApplicationFilters = this.aApplicationFilters.map(function(oFilter) {
			return oFilter instanceof ODataFilter ? oFilter.convert() : oFilter;
		});
	};

	/**
	 * Creates a $filter query option string, which will be used
	 * as part of URL for OData-Requests.
	 * @param {sap.ui.model.Filter} oFilter The root filter object of the filter tree
	 * @private
	 */
	ODataListBinding.prototype.createFilterParams = function(oFilter) {
		this.sFilterParams = ODataUtils.createFilterParams(oFilter, this.oModel.oMetadata, this.oEntityType);
	};

	ODataListBinding.prototype._initSortersFilters = function() {
		// if path could not be resolved entity type cannot be retrieved and
		// also filters/sorters don't need to be set
		var sResolvedPath = this.oModel.resolve(this.sPath, this.oContext);
		if (!sResolvedPath) {
			return;
		}
		this.oEntityType = this._getEntityType();
		this.convertFilters();
		this.oCombinedFilter = FilterProcessor.combineFilters(this.aFilters, this.aApplicationFilters);
		this.createSortParams(this.aSorters);
		this.createFilterParams(this.oCombinedFilter);
	};

	ODataListBinding.prototype._getEntityType = function(){
		var sResolvedPath = this.oModel.resolve(this.sPath, this.oContext);

		if (sResolvedPath) {
			var oEntityType = this.oModel.oMetadata._getEntityTypeByPath(sResolvedPath);
			assert(oEntityType, "EntityType for path " + sResolvedPath + " could not be found!");
			return oEntityType;

		}
		return undefined;
	};

	ODataListBinding.prototype.resume = function() {
		this.bIgnoreSuspend = false;
		ListBinding.prototype.resume.apply(this, arguments);
	};

	return ODataListBinding;

});