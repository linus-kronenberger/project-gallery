/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/base/Log"
], function(Log) {
	"use strict";

	function getQueryString(sURL) {
		var iHash = sURL.indexOf('#');
		if (iHash >= 0) {
			sURL = sURL.slice(0, iHash);
		}
		var iSearch = sURL.indexOf('?');
		if (iSearch >= 0 ) {
			return sURL.slice(iSearch + 1);
		}
		return "";
	}

	function decode(str) {
		return decodeURIComponent(str.replace(/\+/g,' '));
	}

	function parse(mParams, sQueryString) {
		function append(sName, sValue) {
			if ( sName in mParams ) {
				mParams[sName].push(sValue);
			} else {
				mParams[sName] = [sValue];
			}
		}

		sQueryString.split("&").forEach(function(sName) {
			var iPos = sName.indexOf("=");
			if ( iPos >= 0 ) {
				append(decode(sName.slice(0, iPos)), decode(sName.slice(iPos + 1)));
			} else if ( sName.length ) {
				append(decode(sName), "");
			}
		});
	}

	/**
	 * @deprecated as of version 1.119. See class description for details.
	 * @class Provides access to the individual parameters of a URL query string.
	 *
	 * This class parses the query string from a URL and provides access to the values of individual parameters.
	 * There are methods to check whether the query string {@link #has contains a parameter (<code>has()</code>)},
	 * to {@link #get get a single value (<code>get()</code>)} for a parameter and to {@link #getAll get a list
	 * of all values (<code>getAll()</code>)} for a parameter. Another method allows to {@link #keys iterate over
	 * all parameter names (<code>keys()</code>)}.
	 *
	 * <h3>Decoding</h3>
	 *
	 * The constructor and the factory methods expect percentage encoded input whereas all other APIs expect and
	 * return decoded strings. After parsing the query string, any plus sign (0x2b) in names or values is replaced
	 * by a blank (0x20) and the resulting strings are percentage decoded (<code>decodeURIComponent</code>).
	 *
	 *
	 * <h3>Deprecation</h3>
	 *
	 * This class is deprecated in favor of the URL web standard classes <code>URLSearchParams</code> / <code>URL</code>.
	 *
	 * <code>UriParameters.fromQuery(input)</code> can be migrated to <code>new URLSearchParams(input)</code>
	 *
	 * <code>UriParameters.fromURL(input)</code> can be migrated to <code>new URL(input).searchParams</code>
	 *
	 * <h4>Caveats</h4>
	 *
	 * The API has already been designed to be a drop-in replacement but there are some important caveats to consider when switching to the
	 * standard APIs <code>URLSearchParams</code> / <code>URL</code>:
	 * <ul>
	 * <li><code>new URL(input).searchParams</code> validates the given URL according to the WHATWG URL Standard ({@link https://url.spec.whatwg.org}).
	 *     <code>UriParameters.fromURL(input)</code> only extracts the query string from the given input but does not perform any validation.</li>
	 * <li>In some edge cases, especially for incomplete/invalid encoding, decoding behaves differently. Decoding in <code>UriParameters</code> is described in the section above.
	 *     For details about the encoding/decoding of <code>URLSearchParams</code>, see the WHATWG URL Standard ({@link https://url.spec.whatwg.org}).</li>
	 * <li>The <code>get</code> method's second parameter, <code>bAll</code>, is not available;
	 *     use the <code>getAll</code> method instead.</li>
	 * <li>The <code>keys</code> method's return value contains an entry for every occurrence of the key within the query, in the defined order and including duplicates.
	 *     <code>UriParameters#keys()</code> yields unique key values, even when there are multiple values for the same key.</li>
	 * <li>The internal <code>mParams</code> property is not available anymore (you should never access internal properties of
	 *     UI5 classes or objects). With the predecessor of this API, access to <code>mParams</code> was often used
	 *     to check whether a parameter is defined at all. Using the <code>has</code> method or checking the
	 *     result of <code>get</code> against <code>null</code> serves the same purpose.</li>
	 * </ul>
	 * @since 1.68
	 * @alias module:sap/base/util/UriParameters
	 * @param {string} [sURL] URL with parameters
	 * @public
	 * @see https://url.spec.whatwg.org/#interface-urlsearchparams
	 * @constructor-deprecated As of 1.68, using the constructor has been deprecated. Either use {@link #.fromURL} or {@link #.fromQuery}.
	 */
	var UriParameters = function(sURL) {

		var mParams = Object.create(null);

		if ( sURL != null ) {
			// validate input
			if ( typeof sURL !== "string" ) {
				throw new TypeError("query parameter must be a string");
			}
			// For compatibility reasons, we accept a URL and extract the query string from it
			// Note that is different from the behavior of the standard URLSearchParams API
			// which interprets any input as query string
			parse(mParams, getQueryString(sURL));
		}

		/**
		 * Checks whether a parameter occurs at least once in the query string.
		 *
		 * @example
		 *
		 * UriParameters.fromQuery("?foo=bar").has("foo") === true
		 * UriParameters.fromQuery("?foo").has("foo") === true
		 * UriParameters.fromQuery("?foo").has("bar") === false
		 * UriParameters.fromQuery("?foo+bar=ba%7a").has("foo bar") === true
		 *
		 * @param {string} sName Name of the query parameter to check
		 * @returns {boolean} Whether the parameter has been defined
		 * @public
		 */
		this.has = function(sName) {
			return sName in mParams;
		};

		/**
		 * Internal implementation of get
		 * @param {string} sName parameter name
		 * @returns {string|null} value
		 * @private
		 */
		this._get = function(sName) {
			return sName in mParams ? mParams[sName][0] : null;
		};

		/**
		 * Returns all values of the query parameter with the given name.
		 *
		 * An array of string values of all occurrences of the parameter with the given name is returned.
		 * This array is empty if (and only if) the parameter does not occur in the query string.
		 *
		 * @example
		 * // pseudo code, '===' here means 'deep equals'
		 * UriParameters.fromQuery("?foo=bar").getAll("foo") === ["bar"]
		 * UriParameters.fromQuery("?foo").getAll("foo") === [""]
		 * UriParameters.fromQuery("?foo").getAll("bar") === []
		 * UriParameters.fromQuery("?foo=bar&foo=baz").getAll("foo") === ["bar","baz"]
		 *
		 * @param {string} sName Name of the query parameter
		 * @returns {string[]} Array with all values of the query parameter with the given name
		 * @SecSource {return|XSS} Return values might contain external URL parameters
		 * @public
		 */
		this.getAll = function(sName) {
			return sName in mParams ? mParams[sName].slice() : [];
		};

		/**
		 * Returns an iterator for all contained parameter names.
		 *
		 * @example <caption>Using keys() iterator</caption>
		 *
		 * var params = UriParameters.fromQuery("?a=1&b=2&c=3");
		 * var keys = Array.from(params.keys()); // ["a", "b", "c"]
		 *
		 * @returns {Iterator<string>} Iterator for all parameter names.
		 * @public
		 */
		this.keys = function() {
			return Object.keys(mParams).values(); // requires ES6 API, but not ES6 syntax
		};

		// marker to log only once per instance
		var bParamWarning = false;

		/*
		 * As many consumers of the old API used this internal property, we make it available but log a warning.
		 * Using this property prevents a later migration to the URLSearchParams API.
		 */
		Object.defineProperty(this, "mParams", {
			get: function() {
				if ( !bParamWarning ) {
					Log.warning("[Deprecated] UriParameters.mParams must not be accessed.");
					bParamWarning = true;
				}
				return Object.assign({}, mParams);
			},
			configurable: false
		});

	};

	/**
	 * Returns the first value of the named query parameter.
	 *
	 * The value of the first occurrence of the parameter with name <code>sName</code> in the query
	 * string is returned. If that first occurrence does not contain a value (it does not contain an equal
	 * sign), then an empty string is returned.
	 *
	 * If (and only if) the parameter does not occur in the query string, <code>null</code> is returned.
	 *
	 * @example
	 *
	 * UriParameters.fromQuery("?foo=bar").get("foo") === "bar"
	 * UriParameters.fromQuery("?foo").get("foo") === ""
	 * UriParameters.fromQuery("?foo").get("bar") === null
	 * UriParameters.fromQuery("?foo+bar=ba%7a").get("foo bar") === "baz"
	 *
	 * @param {string} sName Name of the query parameter to get the value for
	 * @param {boolean} [bAll=false] Whether all values for the parameter should be returned; the use of
	 *   this parameter is deprecated and highly discouraged; use the {@link #getAll} method instead
	 * @return {string|null} First value of the query parameter with the given name or <code>null</code>
	 * @SecSource {return|XSS} Return value contains URL parameters
	 * @public
	 */
	UriParameters.prototype.get = function(sName, bAll) {
		// Note: this method is still implemented on the prototype to keep existing mocks working
		if ( bAll ) {
			// LOG
			Log.warning("[Deprecated] UriParameters.get(..., true) must not be used, use getAll() instead.");
			return this.getAll(sName);
		}
		return this._get(sName);
	};

	/**
	 * Parses the query portion of the given URL and returns an object to access the individual
	 * parameters.
	 *
	 * Callers using <code>UriParameters.fromURL(input)</code> can be migrated to
	 * <code>new URL(input).searchParams</code> once that API is available (or polyfilled) in all supported browsers.
	 *
	 * @param {string} sURL to parse the query portion of.
	 * @returns {module:sap/base/util/UriParameters} Object providing read access to the query parameters
	 * @public
	 */
	UriParameters.fromURL = function(sURL) {
		return new UriParameters(sURL);
	};

	/**
	 * Parses the given query string and returns an interface to access the individual parameters.
	 *
	 * Callers using <code>UriParameters.fromQuery(input)</code> can be migrated to
	 * <code>new URLSearchParams(input)</code> once that API is available (or polyfilled) in all supported browsers.
	 *
	 * @param {string} [sQuery=""] Query string to parse, a leading question mark (?) will be ignored
	 * @returns {module:sap/base/util/UriParameters} Object providing read access to the query parameters
	 * @public
	 */
	UriParameters.fromQuery = function(sQuery) {
		if ( typeof sQuery === "string" ) {
			if ( sQuery[0] !== "?" ) {
				sQuery = "?" + sQuery;
			}
			// encode hash signs to prevent them from being cut-off
			sQuery = sQuery.replace(/#/g, "%23");
		}
		return new UriParameters(sQuery);
	};

	return UriParameters;
});
