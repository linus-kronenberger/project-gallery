/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides the base implementation for all model implementations
sap.ui.define([
	"sap/base/util/each",
	"sap/base/util/isEmptyObject",
	"sap/ui/core/Lib",
	"sap/ui/core/date/UI5Date",
	"sap/ui/core/format/DateFormat",
	"sap/ui/model/FormatException",
	"sap/ui/model/ParseException",
	"sap/ui/model/SimpleType",
	"sap/ui/model/ValidateException"
], function(each, isEmptyObject, Library, UI5Date, DateFormat, FormatException, ParseException, SimpleType, ValidateException) {
	"use strict";

	/**
	 * Constructor for a Date type.
	 *
	 * @class
	 * This class represents date simple types.
	 *
	 * @extends sap.ui.model.SimpleType
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @public
	 * @param {object} [oFormatOptions] Formatting options. For a list of all available options, see {@link sap.ui.core.format.DateFormat.getDateInstance DateFormat}.
	 * @param {object} [oFormatOptions.source] Additional set of options used to create a second <code>DateFormat</code> object for conversions between
	 *           string values in the data source (e.g. model) and <code>Date</code>. This second format object is used to convert from a model <code>string</code> to <code>Date</code> before
	 *           converting the <code>Date</code> to <code>string</code> with the primary format object. Vice versa, this 'source' format is also used to format an already parsed
	 *           external value (e.g. user input) into the string format that is expected by the data source.
	 *           For a list of all available options, see {@link sap.ui.core.format.DateFormat.getDateInstance DateFormat}.
	 *           In case an empty object is given, the default is the ISO date notation (yyyy-MM-dd).
	 * @param {object} [oConstraints] Value constraints
	 * @param {Date|string} [oConstraints.minimum] Smallest value allowed for this type. Values for constraints must use the same type as configured via <code>oFormatOptions.source</code>.
	 * @param {Date|string} [oConstraints.maximum] Largest value allowed for this type. Values for constraints must use the same type as configured via <code>oFormatOptions.source</code>.
	 * @alias sap.ui.model.type.Date
	 */
	var Date1 = SimpleType.extend("sap.ui.model.type.Date", /** @lends sap.ui.model.type.Date.prototype */ {

		constructor : function () {
			SimpleType.apply(this, arguments);
			this.sName = "Date";
		}

	});

	Date1.prototype.formatValue = function(oValue, sInternalType) {
		var oFormat;

		switch (this.getPrimitiveType(sInternalType)) {
			case "string":
			case "any":
				if (oValue == null) {
					return "";
				}

				if (this.oFormatOptions.source && this.oFormatOptions.source.pattern !== "timestamp" && oValue === "") {
					return "";
				}

				oFormat = this.getModelFormat();
				oValue = oFormat.parse(oValue);

				return this.oOutputFormat.format(oValue);
			default:
				throw new FormatException("Don't know how to format Date to " + sInternalType);
		}
	};

	Date1.prototype.parseValue = function(oValue, sInternalType) {
		var oResult, oBundle;
		switch (this.getPrimitiveType(sInternalType)) {
			case "string":
				if (oValue === "") {
					return null;
				}
				oResult = this.oOutputFormat.parse(oValue);
				if (!oResult) {
					oBundle = Library.getResourceBundleFor("sap.ui.core");
					throw new ParseException(oBundle.getText("Enter" + this.getName(),
						[this.oOutputFormat.format(this.oOutputFormat.getSampleValue()[0])]));
				}
				if (this.oInputFormat) {
					if (this.oFormatOptions.source.pattern == "timestamp") {
						oResult = oResult.getTime();
					} else {
						oResult = this.oInputFormat.format(oResult);
					}
				}
				return oResult;
			default:
				throw new ParseException("Don't know how to parse Date from " + sInternalType);
		}
	};

	Date1.prototype.validateValue = function(oValue) {
		if (this.oConstraints) {
			var oBundle = Library.getResourceBundleFor("sap.ui.core"),
				aViolatedConstraints = [],
				aMessages = [],
				oInputFormat = this.oInputFormat,
				sContent,
				that = this;

			// convert date into date object to compare
			if (oInputFormat && this.oFormatOptions.source.pattern != "timestamp") {
				oValue = oInputFormat.parse(oValue);
			}

			each(this.oConstraints, function(sName, oContent) {
				if (oInputFormat) {
					oContent = oInputFormat.parse(oContent);
				}
				sContent = that.oOutputFormat.format(oContent);

				switch (sName) {
					case "minimum":
						if (oValue < oContent) {
							aViolatedConstraints.push("minimum");
							aMessages.push(oBundle.getText(that.sName + ".Minimum", [sContent]));
						}
						break;
					case "maximum":
						if (oValue > oContent) {
							aViolatedConstraints.push("maximum");
							aMessages.push(oBundle.getText(that.sName + ".Maximum", [sContent]));
						}
						break;
					default: break;
				}
			});
			if (aViolatedConstraints.length > 0) {
				throw new ValidateException(this.combineMessages(aMessages), aViolatedConstraints);
			}
		}
	};

	var oTimestampInputFormat = {
		format: function(oValue) {
			if (oValue instanceof Date) {
				return oValue.getTime();
			}
			return null;
		},
		parse: function(oValue) {
			if (typeof (oValue) != "number") {
				if (isNaN(oValue)) {
					throw new FormatException("Cannot format date: " + oValue + " is not a valid Timestamp");
				} else {
					oValue = parseInt(oValue);
				}
			}
			oValue = UI5Date.getInstance(oValue);
			return oValue;
		}
	};

	Date1.prototype.getModelFormat = function() {
		if (this.oInputFormat) {
			if (this.oFormatOptions.source.pattern == "timestamp") {
				return oTimestampInputFormat;
			} else {
				return this.oInputFormat;
			}
		} else {
			return SimpleType.prototype.getModelFormat.call(this);
		}
	};
	Date1.prototype.setFormatOptions = function(oFormatOptions) {
		this.oFormatOptions = oFormatOptions;
		this._createFormats();
	};

	/**
	 * Returns the output pattern.
	 *
	 * @returns {string} The output pattern
	 *
	 * @see sap.ui.core.format.DateFormat.getDateInstance
	 * @protected
	 */
	Date1.prototype.getOutputPattern = function() {

		return this.oOutputFormat.oFormatOptions.pattern;

	};

	/**
	 * Called by the framework when any localization setting changed
	 * @private
	 */
	Date1.prototype._handleLocalizationChange = function() {
		// recreate formatters
		this._createFormats();
	};

	/**
	 * Create formatters used by this type
	 * @private
	 */
	Date1.prototype._createFormats = function() {
		var oSourceOptions = this.oFormatOptions.source;
		this.oOutputFormat = DateFormat.getInstance(this.oFormatOptions);
		if (oSourceOptions) {
			if (isEmptyObject(oSourceOptions)) {
				oSourceOptions = {pattern: "yyyy-MM-dd"};
			}
			this.oInputFormat = DateFormat.getInstance(oSourceOptions);
		}
	};

	/**
	 * Returns a language-dependent placeholder text such as "e.g. <sample value>" where <sample value> is formatted
	 * using this type.
	 *
	 * @returns {string|undefined}
	 *   The language-dependent placeholder text or <code>undefined</code> if the type does not offer a placeholder
	 *
	 * @public
	 */
	Date1.prototype.getPlaceholderText = function () {
		return this.oOutputFormat.getPlaceholderText();
	};

	return Date1;

});