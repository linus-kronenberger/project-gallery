/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides class sap.ui.model.odata.v4.lib._MetadataRequestor
sap.ui.define([
	"./_Helper",
	"./_V2MetadataConverter",
	"./_V4MetadataConverter",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery"
], function (_Helper, _V2MetadataConverter, _V4MetadataConverter, Log, jQuery) {
	"use strict";

	return {
		/**
		 * Creates a requestor for metadata documents.
		 * @param {object} mHeaders
		 *   A map of headers
		 * @param {string} sODataVersion
		 *   The version of the OData service. Supported values are "2.0" and "4.0".
		 * @param {boolean} [bIgnoreAnnotationsFromMetadata]
		 *   Whether to ignore all annotations from metadata documents. Only annotations from
		 *   additional annotation files are loaded.
		 * @param {object} [mQueryParams={}]
		 *   A map of query parameters as described in
		 *   {@link sap.ui.model.odata.v4.lib._Helper.buildQuery}. Note that "sap-context-token"
		 *   is deleted(!) after the first <code>read</code> for a metadata document.
		 * @param {boolean} [bWithCredentials]
		 *   Whether the XHR should be called with <code>withCredentials</code>
		 * @param {function} fnGetOrCreateRetryAfterPromise
		 *   A function that returns or creates the "Retry-After" promise
		 * @returns {object}
		 *   A new MetadataRequestor object
		 */
		create : function (mHeaders, sODataVersion, bIgnoreAnnotationsFromMetadata, mQueryParams,
				bWithCredentials, fnGetOrCreateRetryAfterPromise) {
			var mUrl2Promise = {},
				sQuery = _Helper.buildQuery(mQueryParams);

			return {
				/**
				 * Reads a metadata document from the given URL, taking care of "Retry-After".
				 *
				 * @param {string} sUrl
				 *   The URL of a metadata document, it must not contain a query string or a
				 *   fragment part
				 * @param {boolean} [bAnnotations]
				 *   <code>true</code> if an additional annotation file is read, otherwise it is
				 *   expected to be a metadata document in the correct OData version
				 * @param {boolean} [bPrefetch]
				 *   Whether to just read the metadata document, but not yet convert it from XML to
				 *   JSON. For any given URL, this is useful in an optional early call that precedes
				 *   a normal call without this flag.
				 * @returns {Promise}
				 *   A promise fulfilled with the metadata as a JSON object, enriched with a
				 *   <code>$Date</code>, <code>$ETag</code> or <code>$LastModified</code> property
				 *   that contains the value of the response header "Date", "ETag" or
				 *   "Last-Modified" respectively; these additional properties are missing if there
				 *   is no such header. In case of <code>bPrefetch</code>, the JSON object is
				 *   empty except for <code>$XML</code> (which contains the unconverted metadata as
				 *   XML) and the additional properties described before.
				 * @throws {Error}
				 *   If <code>bPrefetch</code> is set in two consecutive calls for the same URL
				 */
				read : function (sUrl, bAnnotations, bPrefetch) {
					var oPromise;

					function convertXMLMetadata(oJSON) {
						var Converter = sODataVersion === "4.0" || bAnnotations
								? _V4MetadataConverter
								: _V2MetadataConverter,
							oData = oJSON.$XML,
							bIgnoreAnnotations = bIgnoreAnnotationsFromMetadata && !bAnnotations;

						delete oJSON.$XML; // be nice to the garbage collector
						return Object.assign(
							new Converter().convertXMLMetadata(oData, sUrl, bIgnoreAnnotations),
							oJSON);
					}

					if (sUrl in mUrl2Promise) {
						if (bPrefetch) {
							throw new Error("Must not prefetch twice: " + sUrl);
						}
						oPromise = mUrl2Promise[sUrl].then(convertXMLMetadata);
						delete mUrl2Promise[sUrl];
					} else {
						oPromise = new Promise(function (fnResolve, fnReject) {
							function send() {
								const oAjaxSettings = {
										method : "GET",
										headers : mHeaders
									};
								if (bWithCredentials) {
									oAjaxSettings.xhrFields = {withCredentials : true};
								}
								jQuery.ajax(bAnnotations ? sUrl : sUrl + sQuery, oAjaxSettings)
								.then(function (oData, _sTextStatus, jqXHR) {
									var sDate = jqXHR.getResponseHeader("Date"),
										sETag = jqXHR.getResponseHeader("ETag"),
										oJSON = {$XML : oData},
										sLastModified = jqXHR.getResponseHeader("Last-Modified");

									if (sDate) {
										oJSON.$Date = sDate;
									}
									if (sETag) {
										oJSON.$ETag = sETag;
									}
									if (sLastModified) {
										oJSON.$LastModified = sLastModified;
									}
									fnResolve(oJSON);
								}, function (jqXHR) {
									var oError
										= _Helper.createError(jqXHR, "Could not load metadata");

									if (jqXHR.status === 503
											&& jqXHR.getResponseHeader("Retry-After")
											&& fnGetOrCreateRetryAfterPromise(oError)) {
										fnGetOrCreateRetryAfterPromise().then(send, fnReject);
									} else {
										Log.error("GET " + sUrl, oError.message,
											"sap.ui.model.odata.v4.lib._MetadataRequestor");
										fnReject(oError);
									}
								});
							}

							const oRetryAfterPromise = fnGetOrCreateRetryAfterPromise();
							if (oRetryAfterPromise) {
								oRetryAfterPromise.then(send, fnReject);
							} else {
								send();
							}
							if (!bAnnotations
								&& mQueryParams && "sap-context-token" in mQueryParams) {
								delete mQueryParams["sap-context-token"];
								sQuery = _Helper.buildQuery(mQueryParams);
							}
						});
						if (bPrefetch) {
							mUrl2Promise[sUrl] = oPromise;
						} else {
							oPromise = oPromise.then(convertXMLMetadata);
						}
					}
					return oPromise;
				}
			};
		}
	};
}, /* bExport= */false);
