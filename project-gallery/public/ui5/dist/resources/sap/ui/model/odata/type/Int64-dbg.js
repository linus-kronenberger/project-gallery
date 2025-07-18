/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/base/Log",
	"sap/base/util/extend",
	"sap/ui/core/Lib",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/model/FormatException",
	"sap/ui/model/ParseException",
	"sap/ui/model/ValidateException",
	"sap/ui/model/odata/type/ODataType"
], function(Log, extend, Library, NumberFormat, FormatException, ParseException, ValidateException, ODataType) {
	"use strict";

	var rInteger = /^[-+]?(\d+)$/, // user input for an Int64 w/o the sign
		// The number range of an Int64
		oRange = {minimum : "-9223372036854775808", maximum : "9223372036854775807"},
		// The values Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER are the largest integer
		// n such that n and n + 1 are both exactly representable as a Number value.
		oSafeRange = {minimum : "-9007199254740991", maximum : "9007199254740991"};

	/**
	 * Checks whether <code>sValue</code> is in the given range.
	 * @param {sap.ui.model.odata.type.Int64} oType
	 *   the type instance
	 * @param {string} sValue
	 *   value to be checked
	 * @param {object} oRange
	 *   the allowed range object with minimum and maximum as <code>string</code>
	 * @returns {string}
	 *   the error text or <code>undefined</code> if the check was successful
	 */
	function checkValueRange(oType, sValue, oRange) {
		var sAbsoluteLimit, aMatches, bNegative;

		aMatches = rInteger.exec(sValue);
		if (aMatches) {
			bNegative = sValue.charAt(0) === '-';
			sAbsoluteLimit = bNegative ? oRange.minimum.slice(1) : oRange.maximum;

			if (aMatches[1].length < sAbsoluteLimit.length ) {
				return undefined;
			}
			if (aMatches[1].length > sAbsoluteLimit.length || aMatches[1] > sAbsoluteLimit) {
				if (bNegative) {
					return getText("EnterNumberMin", [oType.formatValue(oRange.minimum, "string")]);
				} else {
					return getText("EnterNumberMax", [oType.formatValue(oRange.maximum, "string")]);
				}
			}
			return undefined;
		}
		return getText("EnterInt");
	}

	/**
	 * Fetches a text from the message bundle and formats it using the parameters.
	 *
	 * @param {string} sKey
	 *   the message key
	 * @param {any[]} aParams
	 *   the message parameters
	 * @returns {string}
	 *   the message
	 */
	function getText(sKey, aParams) {
		return Library.getResourceBundleFor("sap.ui.core").getText(sKey, aParams);
	}

	/**
	 * Returns the type's nullable constraint.
	 *
	 * @param {sap.ui.model.odata.type.Int64} oType
	 *   the type
	 * @returns {boolean}
	 *   the nullable constraint or <code>true</code> if not defined
	 */
	function isNullable(oType) {
		return !oType.oConstraints || oType.oConstraints.nullable !== false;
	}

	/**
	 * Sets the constraints.
	 *
	 * @param {sap.ui.model.odata.type.Int64} oType
	 *   the type instance
	 * @param {object} [oConstraints]
	 *   constraints, see {@link #constructor}
	 */
	function setConstraints(oType, oConstraints) {
		var vNullable;

		oType.oConstraints = undefined;
		if (oConstraints) {
			vNullable = oConstraints.nullable;
			if (vNullable === false || vNullable === "false") {
				oType.oConstraints = {nullable : false};
			} else if (vNullable !== undefined && vNullable !== true && vNullable !== "true") {
				Log.warning("Illegal nullable: " + vNullable, null, oType.getName());
			}
		}
		oType._handleLocalizationChange();
	}

	/**
	 * Constructor for a primitive type <code>Edm.Int64</code>.
	 *
	 * @class This class represents the OData primitive type <a
	 * href="http://www.odata.org/documentation/odata-version-2-0/overview#AbstractTypeSystem">
	 * <code>Edm.Int64</code></a>.
	 *
	 * In both {@link sap.ui.model.odata.v2.ODataModel} and {@link sap.ui.model.odata.v4.ODataModel}
	 * this type is represented as a <code>string</code>.
	 *
	 * @extends sap.ui.model.odata.type.ODataType
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @alias sap.ui.model.odata.type.Int64
	 * @param {object} [oFormatOptions]
	 *   Format options as defined in {@link sap.ui.core.format.NumberFormat.getIntegerInstance}.
	 *   In contrast to NumberFormat <code>groupingEnabled</code> defaults to <code>true</code>.
	 * @param {boolean} [oFormatOptions.parseEmptyValueToZero=false]
	 *   Whether the empty string and <code>null</code> are parsed to <code>"0"</code> if the <code>nullable</code>
	 *   constraint is set to <code>false</code>; see {@link #parseValue parseValue}; since 1.115.0
	 * @param {object} oConstraints
	 *   constraints; {@link #validateValue validateValue} throws an error if any constraint is
	 *   violated
	 * @param {boolean|string} [oConstraints.nullable=true]
	 *   if <code>true</code>, the value <code>null</code> is accepted
	 * @throws {Error} If the <code>oFormatOptions.decimalPadding</code> format option is provided
	 * @public
	 * @since 1.27.1
	 */
	var Int64 = ODataType.extend("sap.ui.model.odata.type.Int64", {
			constructor : function (oFormatOptions, oConstraints) {
				ODataType.apply(this, arguments);
				this.oFormatOptions = oFormatOptions;
				setConstraints(this, oConstraints);
				this.checkParseEmptyValueToZero();
			}
		});

	/**
	 * Formats the given value to the given target type.
	 *
	 * @param {string} sValue
	 *   the value to be formatted, which is represented as a string in the model
	 * @param {string} sTargetType
	 *   the target type; may be "any", "float", "int", "string", or a type with one of these types
	 *   as its {@link sap.ui.base.DataType#getPrimitiveType primitive type}.
	 *   See {@link sap.ui.model.odata.type} for more information.
	 * @returns {number|string}
	 *   the formatted output value in the target type; <code>undefined</code> or <code>null</code>
	 *   are formatted to <code>null</code>
	 * @throws {sap.ui.model.FormatException}
	 *   if <code>sTargetType</code> is unsupported
	 *   or when formatting to "int" or "float" and <code>sValue</code>
	 *   exceeds <code>Number.MIN/MAX_SAFE_INTEGER</code>
	 * @public
	 */
	Int64.prototype.formatValue = function (sValue, sTargetType) {
		var sErrorText;

		if (sValue === null || sValue === undefined) {
			return null;
		}
		switch (this.getPrimitiveType(sTargetType)) {
			case "any":
				return sValue;
			case "float":
			case "int":
				sErrorText = checkValueRange(this, sValue, oSafeRange);
				if (sErrorText) {
					throw new FormatException(sErrorText);
				}
				return parseInt(sValue);
			case "string":
				return this.getFormat().format(sValue);
			default:
				throw new FormatException("Don't know how to format " + this.getName() + " to "
					+ sTargetType);
		}
	};

	/**
	 * @override
	 */
	Int64.prototype.getFormat = function () {
		if (!this.oFormat) {
			var oFormatOptions = extend({groupingEnabled : true}, this.oFormatOptions);
			oFormatOptions.parseAsString = true;
			delete oFormatOptions.parseEmptyValueToZero;
			this.oFormat = NumberFormat.getIntegerInstance(oFormatOptions);
		}

		return this.oFormat;
	};

	/**
	 * Returns the type's name.
	 *
	 * @returns {string}
	 *   the type's name
	 * @public
	 */
	Int64.prototype.getName = function () {
		return "sap.ui.model.odata.type.Int64";
	};

	/**
	 * Called by the framework when any localization setting changed.
	 * @private
	 */
	Int64.prototype._handleLocalizationChange = function () {
		this.oFormat = null;
	};

	/**
	 * Parses the given value, which is expected to be of the given type, to an Int64 in
	 * <code>string</code> representation.
	 *
	 * @param {string|number|null} vValue
	 *   The value to be parsed
	 * @param {string} sSourceType
	 *   The source type (the expected type of <code>vValue</code>); may be "float", "int",
	 *   "string", or a type with one of these types as its
	 *   {@link sap.ui.base.DataType#getPrimitiveType primitive type}.
	 *   See {@link sap.ui.model.odata.type} for more information.
	 * @returns {string|null}
	 *   The parsed value. The empty string and <code>null</code> are parsed to:
	 *   <ul>
	 *     <li><code>"0"</code> if the <code>parseEmptyValueToZero</code> format option
	 *       is set to <code>true</code> and the <code>nullable</code> constraint is set to <code>false</code>,</li>
	 *     <li><code>null</code> otherwise.</li>
	 *   </ul>
	 *
	 * @throws {sap.ui.model.ParseException}
	 *   If <code>sSourceType</code> is unsupported or if the given string cannot be parsed to a
	 *   Int64
	 * @public
	 */
	Int64.prototype.parseValue = function (vValue, sSourceType) {
		var vEmptyValue = this.getEmptyValue(vValue);
		if (vEmptyValue !== undefined) {
			return vEmptyValue;
		}

		var sResult;
		switch (this.getPrimitiveType(sSourceType)) {
			case "string":
				sResult = this.getFormat().parse(vValue);
				if (!sResult) {
					throw new ParseException(getText("EnterInt"));
				}
				break;
			case "int":
			case "float":
				sResult = NumberFormat.getIntegerInstance({
						maxIntegerDigits : Infinity,
						groupingEnabled : false
					}).format(vValue);
				break;
			default:
				throw new ParseException("Don't know how to parse " + this.getName() + " from "
					+ sSourceType);
		}

		return sResult;
	};

	/**
	 * Validates whether the given value in model representation is valid and meets the
	 * defined constraints.
	 *
	 * @param {string} sValue
	 *   the value to be validated
	 * @throws {sap.ui.model.ValidateException} if the value is not valid
	 * @public
	 */
	Int64.prototype.validateValue = function (sValue) {
		var sErrorText;

		if (sValue === null && isNullable(this)) {
			return;
		}

		if (typeof sValue === "string") {
			sErrorText = checkValueRange(this, sValue, oRange);
			if (sErrorText) {
				throw new ValidateException(sErrorText);
			}
			return;
		}
		throw new ValidateException(getText("EnterInt"));
	};

	return Int64;
});