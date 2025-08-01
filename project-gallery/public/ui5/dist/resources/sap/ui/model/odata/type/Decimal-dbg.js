/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/base/Log",
	"sap/ui/core/Lib",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/model/FormatException",
	"sap/ui/model/ParseException",
	"sap/ui/model/ValidateException",
	"sap/ui/model/odata/ODataUtils",
	"sap/ui/model/odata/type/ODataType"
], function(Log, Library, NumberFormat, FormatException, ParseException, ValidateException, BaseODataUtils, ODataType) {
	"use strict";

	var rDecimal = /^[-+]?(\d+)(?:\.(\d+))?$/,
		rTrailingZeroes = /(?:(\.[0-9]*[1-9]+)0+|\.0*)$/;

	/**
	 * Returns the type's scale constraint.
	 *
	 * @param {sap.ui.model.odata.type.Decimal} oType
	 *   the type
	 * @returns {number}
	 *   the scale constraint or <code>0</code> if not defined
	 */
	function getScale(oType) {
		return (oType.oConstraints && oType.oConstraints.scale) || 0;
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
	 * Removes trailing zeroes after the decimal point from the given value; in case there are only
	 * zeroes after the decimal point, also removes the decimal point.
	 *
	 * @param {string} sValue The value, e.g. "1.000"
	 * @returns {string} The value without trailing zeroes, e.g. "1"
	 */
	function removeTrailingZeroes(sValue) {
		if (sValue.indexOf(".") >= 0) {
			sValue = sValue.replace(rTrailingZeroes, "$1");
		}

		return sValue;
	}

	/**
	 * Sets the constraints.
	 *
	 * @param {sap.ui.model.odata.type.Decimal} oType
	 *   the type instance
	 * @param {object} [oConstraints]
	 *   constraints, see {@link #constructor}
	 */
	function setConstraints(oType, oConstraints) {
		var vNullable, iPrecision, vPrecision, iScale, vScale;

		function logWarning(vValue, sName) {
			Log.warning("Illegal " + sName + ": " + vValue, null, oType.getName());
		}

		function validateInt(vValue, iDefault, iMinimum, sName) {
			var iValue = typeof vValue === "string" ? parseInt(vValue) : vValue;

			if (iValue === undefined) {
				return iDefault;
			}
			if (typeof iValue !== "number" || isNaN(iValue) || iValue < iMinimum) {
				logWarning(vValue, sName);
				return iDefault;
			}
			return iValue;
		}

		/*
		 * Validates whether the given value is a valid Edm.Decimal value.
		 *
		 * @param {string} sValue
		 *   the constraint minimum or maximum value
		 * @param {string} sName
		 *   name for logging
		 * @returns {string}
		 *   the validated value or undefined
		 */
		function validateDecimal(sValue, sName) {
			if (sValue) {
				if (sValue.match(rDecimal)) {
					return sValue;
				}
				logWarning(sValue, sName);
			}

			return undefined;
		}

		function validateBoolean(vValue, sName) {
			if (vValue === true || vValue === "true") {
				return true;
			}
			if (vValue !== undefined && vValue !== false && vValue !== "false") {
				logWarning(vValue, sName);
			}

			return undefined;
		}

		function setConstraint(sName, vValue, vDefault) {
			if (vValue !== vDefault) {
				oType.oConstraints = oType.oConstraints || {};
				oType.oConstraints[sName] = vValue;
			}
		}

		oType.oConstraints = undefined;
		if (oConstraints) {
			vNullable = oConstraints.nullable;
			vPrecision = oConstraints.precision;
			vScale = oConstraints.scale;

			iScale = vScale === "variable" ? Infinity : validateInt(vScale, 0, 0, "scale");
			iPrecision = validateInt(vPrecision, Infinity, 1, "precision");
			if (iScale !== Infinity && iPrecision < iScale) {
				Log.warning("Illegal scale: must be less than or equal to precision (precision="
					+ vPrecision + ", scale=" + vScale + ")", null, oType.getName());
				iScale = Infinity; // "variable"
			}
			setConstraint("precision", iPrecision, Infinity);
			setConstraint("scale", iScale, 0);
			if (vNullable === false || vNullable === "false") {
				setConstraint("nullable", false, true);
			} else if (vNullable !== undefined && vNullable !== true && vNullable !== "true") {
				logWarning(vNullable, "nullable");
			}

			setConstraint("minimum", validateDecimal(oConstraints.minimum, "minimum"));
			setConstraint("minimumExclusive",
				validateBoolean(oConstraints.minimumExclusive, "minimumExclusive"));
			setConstraint("maximum", validateDecimal(oConstraints.maximum, "maximum"));
			setConstraint("maximumExclusive",
				validateBoolean(oConstraints.maximumExclusive, "maximumExclusive"));
		}
		oType._handleLocalizationChange();
	}

	/**
	 * Constructor for a primitive type <code>Edm.Decimal</code>.
	 *
	 * @class This class represents the OData primitive type <a
	 * href="http://www.odata.org/documentation/odata-version-2-0/overview#AbstractTypeSystem">
	 * <code>Edm.Decimal</code></a>.
	 *
	 * In both {@link sap.ui.model.odata.v2.ODataModel} and {@link sap.ui.model.odata.v4.ODataModel}
	 * this type is represented as a <code>string</code>. It never uses exponential format ("1e-5").
	 *
	 * @extends sap.ui.model.odata.type.ODataType
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @alias sap.ui.model.odata.type.Decimal
	 * @param {object} [oFormatOptions]
	 *   Format options as defined in {@link sap.ui.core.format.NumberFormat.getFloatInstance}.
	 *   In contrast to NumberFormat <code>groupingEnabled</code> defaults to <code>true</code>.
	 *   Note that <code>maxFractionDigits</code> and <code>minFractionDigits</code> are set to
	 *   the value of the constraint <code>scale</code> unless it is "variable". They can however
	 *   be overwritten.
	 * @param {boolean} [oFormatOptions.parseEmptyValueToZero=false]
	 *   Whether the empty string and <code>null</code> are parsed to <code>"0"</code> if the <code>nullable</code>
	 *   constraint is set to <code>false</code>; see {@link #parseValue parseValue}; since 1.115.0
	 * @param {boolean} [oFormatOptions.preserveDecimals=true]
	 *   by default decimals are preserved, unless <code>oFormatOptions.style</code> is given as
	 *   "short" or "long"; since 1.89.0
	 * @param {object} [oConstraints]
	 *   constraints; {@link #validateValue validateValue} throws an error if any constraint is
	 *   violated
	 * @param {string} [oConstraints.maximum]
	 *   the maximum value allowed
	 * @param {boolean} [oConstraints.maximumExclusive=false]
	 *   if <code>true</code>, the maximum value itself is not allowed
	 * @param {string} [oConstraints.minimum]
	 *   the minimum value allowed
	 * @param {boolean} [oConstraints.minimumExclusive=false]
	 *   if <code>true</code>, the minimum value itself is not allowed
	 * @param {boolean|string} [oConstraints.nullable=true]
	 *   if <code>true</code>, the value <code>null</code> is accepted
	 * @param {int|string} [oConstraints.precision=Infinity]
	 *   the maximum number of digits allowed
	 * @param {int|string} [oConstraints.scale=0]
	 *   the maximum number of digits allowed to the right of the decimal point; the number must be
	 *   less than or equal to <code>precision</code> (if given). As a special case, "variable" is
	 *   supported.
	 *
	 *   The number of digits to the right of the decimal point may vary from zero to
	 *   <code>scale</code>, and the number of digits to the left of the decimal point may vary
	 *   from one to <code>precision</code> minus <code>scale</code>. If <code>scale</code> is equal
	 *   to <code>precision</code>, a single zero has to precede the decimal point.
	 *
	 *   The number is always displayed with exactly <code>scale</code> digits to the right of the
	 *   decimal point (unless <code>scale</code> is "variable").
	 * @throws {Error} If the <code>oFormatOptions.decimalPadding</code> is set but is not allowed
	 * @public
	 * @since 1.27.0
	 */
	var Decimal = ODataType.extend("sap.ui.model.odata.type.Decimal", {
				constructor : function (oFormatOptions, oConstraints) {
					ODataType.apply(this, arguments);
					this.oFormatOptions = oFormatOptions;
					setConstraints(this, oConstraints);
					this.checkParseEmptyValueToZero();
				}
			}
		);

	/**
	 * Formats the given value to the given target type. When formatting to "string" the type's
	 * constraint <code>scale</code> is taken into account.
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
	 * @public
	 */
	Decimal.prototype.formatValue = function (sValue, sTargetType) {
		if (sValue === null || sValue === undefined) {
			return null;
		}
		switch (this.getPrimitiveType(sTargetType)) {
			case "any":
				return sValue;
			case "float":
				return parseFloat(sValue);
			case "int":
				return Math.floor(parseFloat(sValue));
			case "string":
				return this.getFormat().format(removeTrailingZeroes(String(sValue)));
			default:
				throw new FormatException("Don't know how to format " + this.getName() + " to "
					+ sTargetType);
		}
	};

	/**
	 * @override
	 */
	Decimal.prototype.getFormat = function () {
		if (!this.oFormat) {
			var oFormatOptions = {
					groupingEnabled : true,
					maxIntegerDigits : Infinity
				},
				iScale = getScale(this);
			if (iScale !== Infinity) {
				oFormatOptions.minFractionDigits = oFormatOptions.maxFractionDigits = iScale;
			}
			var oTypeFormatOptions = this.oFormatOptions || {};
			if (oTypeFormatOptions.style !== "short" && oTypeFormatOptions.style !== "long") {
				oFormatOptions.preserveDecimals = true;
			}
			Object.assign(oFormatOptions, this.oFormatOptions);
			oFormatOptions.parseAsString = true;
			delete oFormatOptions.parseEmptyValueToZero;
			this.oFormat = NumberFormat.getFloatInstance(oFormatOptions);
		}

		return this.oFormat;
	};

	/**
	 * Parses the given value, which is expected to be of the given type, to a decimal in
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
	 * @throws {sap.ui.model.ParseException}
	 *   if <code>sSourceType</code> is unsupported or if the given string cannot be parsed to a
	 *   Decimal
	 * @public
	 */
	Decimal.prototype.parseValue = function (vValue, sSourceType) {
		var vEmptyValue = this.getEmptyValue(vValue);
		if (vEmptyValue !== undefined) {
			return vEmptyValue;
		}

		var sResult;
		switch (this.getPrimitiveType(sSourceType)) {
			case "string":
				sResult = this.getFormat().parse(vValue);
				if (!sResult) {
					throw new ParseException(Library.getResourceBundleFor("sap.ui.core")
						.getText("EnterNumber"));
				}
				// NumberFormat.parse does not remove trailing decimal zeroes and separator
				sResult = removeTrailingZeroes(sResult);
				break;
			case "int":
			case "float":
				sResult = NumberFormat.getFloatInstance({
					maxIntegerDigits: Infinity,
					decimalSeparator: ".",
					groupingEnabled: false
				}).format(vValue);
				break;
			default:
				throw new ParseException("Don't know how to parse " + this.getName() + " from "
					+ sSourceType);
		}
		return sResult;
	};

	/**
	 * Called by the framework when any localization setting changed.
	 * @private
	 */
	Decimal.prototype._handleLocalizationChange = function () {
		this.oFormat = null;
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
	Decimal.prototype.validateValue = function (sValue) {
		var iFractionDigits, iIntegerDigits, aMatches, sMaximum, bMaximumExclusive, sMinimum,
			bMinimumExclusive, iPrecision, iScale;

		if (sValue === null && (!this.oConstraints || this.oConstraints.nullable !== false)) {
			return;
		}
		if (typeof sValue !== "string") {
			throw new ValidateException(getText("EnterNumber"));
		}
		aMatches = rDecimal.exec(sValue);
		if (!aMatches) {
			throw new ValidateException(getText("EnterNumber"));
		}

		iIntegerDigits = aMatches[1].length;
		iFractionDigits = (aMatches[2] || "").length;
		iScale = getScale(this);
		iPrecision = (this.oConstraints && this.oConstraints.precision) || Infinity;
		sMinimum = this.oConstraints && this.oConstraints.minimum;
		sMaximum = this.oConstraints && this.oConstraints.maximum;
		if (iFractionDigits > iScale) {
			if (iScale === 0) {
				throw new ValidateException(getText("EnterInt"));
			} else if (iIntegerDigits + iScale > iPrecision) {
				if (iScale !== iPrecision) {
					throw new ValidateException(getText("EnterNumberIntegerFraction",
						[iPrecision - iScale, iScale]));
				}
				if (aMatches[1] !== "0") {
					throw new ValidateException(getText("EnterNumberFractionOnly", [iScale]));
				}
			}
			throw new ValidateException(getText("EnterNumberFraction", [iScale]));
		}
		if (iScale === Infinity) {
			if (iIntegerDigits + iFractionDigits > iPrecision) {
				throw new ValidateException(getText("EnterNumberPrecision", [iPrecision]));
			}
		} else if (iIntegerDigits > iPrecision - iScale) {
			if (iScale !== iPrecision) {
				if (iScale) {
					throw new ValidateException(getText("EnterNumberInteger",
						[iPrecision - iScale]));
				}
				throw new ValidateException(getText("EnterMaximumOfDigits", [iPrecision]));
			}
			if (aMatches[1] !== "0") {
				throw new ValidateException(getText("EnterNumberFractionOnly", [iScale]));
			}
		}
		if (sMinimum) {
			bMinimumExclusive = this.oConstraints.minimumExclusive;
			if (BaseODataUtils.compare(sMinimum, sValue, true) >= (bMinimumExclusive ? 0 : 1)) {
				throw new ValidateException(
					getText(bMinimumExclusive
						? "EnterNumberMinExclusive"
						: "EnterNumberMin",
					[this.formatValue(sMinimum, "string")]));
			}
		}
		if (sMaximum) {
			bMaximumExclusive = this.oConstraints.maximumExclusive;
			if (BaseODataUtils.compare(sMaximum, sValue, true) <= (bMaximumExclusive ? 0 : -1)) {
				throw new ValidateException(
					getText(bMaximumExclusive
						? "EnterNumberMaxExclusive"
						: "EnterNumberMax",
					[this.formatValue(sMaximum, "string")]));
			}
		}
	};

	/**
	 * Returns the type's name.
	 *
	 * @returns {string}
	 *   the type's name
	 * @public
	 */
	Decimal.prototype.getName = function () {
		return "sap.ui.model.odata.type.Decimal";
	};

	return Decimal;
});