/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides the base implementation for all composite type implementations
sap.ui.define(['./SimpleType'],
	function (SimpleType) {
	"use strict";

	/**
	 * Constructor for a new CompositeType.
	 *
	 * @param {object} [oFormatOptions] Format options as defined by concrete subclasses
	 * @param {object} [oConstraints] Constraints as defined by concrete subclasses
	 *
	 * @abstract
	 * @alias sap.ui.model.CompositeType
	 * @author SAP SE
	 * @class
	 *   This is an abstract base class for composite types. Composite types have multiple parts
	 *   and know how to merge/split them upon formatting/parsing the value. Typical use cases are
	 *   currency or amount values.
	 *
	 *   Subclasses of <code>CompositeType</code> may set the following boolean properties in the
	 *   constructor:
	 *   <ul>
	 *     <li><code>bParseWithValues</code>: Whether the {@link #parseValue} method requires the
	 *       current binding values as a third parameter; defaults to <code>false</code></li>
	 *     <li><code>bUseInternalValues</code>: Whether the {@link #formatValue} and
	 *       {@link #parseValue} methods operate on the internal values; defaults to
	 *       <code>false</code></li>
	 *     <li><code>bUseRawValues</code>: Whether the {@link #formatValue} and {@link #parseValue}
	 *       methods operate on the raw model values; the types of embedded bindings are ignored;
	 *       defaults to <code>false</code></li>
	 *   </ul>
	 *   <code>bUseRawValues</code> and <code>bUseInternalValues</code> cannot be both
	 *   <code>true</code>.
	 * @extends sap.ui.model.SimpleType
	 * @public
	 * @version 1.138.0
	 */
	var CompositeType = SimpleType.extend("sap.ui.model.CompositeType", /** @lends sap.ui.model.CompositeType.prototype */ {

		constructor : function (oFormatOptions, oConstraints) {
			SimpleType.apply(this, arguments);
			this.sName = "CompositeType";
			this.bUseRawValues = false;
			this.bParseWithValues = false;
			this.bUseInternalValues = false;
		},

		metadata : {
			"abstract" : true
		}
	});

	/**
	 * Formats the given raw values to an output value of the given target type. This happens
	 * according to the format options if the target type is <code>string</code>. If
	 * <code>aValues</code> is not defined or <code>null</code>, <code>null</code> is returned.
	 *
	 * @param {any[]} aValues
	 *   The values to be formatted
	 * @param {string} sTargetType
	 *   The target type; see {@link topic:ac56d92162ed47ff858fdf1ce26c18c4 Allowed Property Types}
	 * @return {any}
	 *   The formatted output value
	 * @throws {sap.ui.model.FormatException}
	 *   If a conversion to the target type is not possible
	 *
	 * @abstract
	 * @function
	 * @name sap.ui.model.CompositeType.prototype.formatValue
	 * @public
	 */

	/**
	 * Parses an external value of the given source type to the corresponding values in model
	 * representation.
	 *
	 * @param {any} vValue
	 *   The value to be parsed
	 * @param {string} sSourceType
	 *   The source type (the expected type of <code>vValue</code>); see
	 *   {@link topic:ac56d92162ed47ff858fdf1ce26c18c4 Allowed Property Types}
	 * @param {array} [aCurrentValues]
	 *   The current values of all binding parts; required if {@link #getParseWithValues} returns
	 *   <code>true</code>
	 * @return {any[]|any}
	 *   An array of raw values or the raw value returned by the type's conversion object in case it
	 *   exists, see {@link sap.ui.model.SimpleType#getModelFormat SimpleType#getModelFormat}
	 * @throws {sap.ui.model.ParseException}
	 *   If parsing to the model type is not possible; the message of the exception is language
	 *   dependent as it may be displayed on the UI
	 *
	 * @abstract
	 * @function
	 * @name sap.ui.model.CompositeType.prototype.parseValue
	 * @public
	 */

	/**
	 * Validates whether the given raw values meet the defined constraints. This method does nothing
	 * if no constraints are defined.
	 *
	 * @param {any[]} aValues
	 *   The set of values to be validated
	 * @throws {sap.ui.model.ValidateException}
	 *   If at least one of the type constraints is not met; the message of the exception is
	 *   language dependent as it may be displayed on the UI
	 *
	 * @abstract
	 * @function
	 * @name sap.ui.model.CompositeType.prototype.validateValue
	 * @public
	 */

	/**
	 * Gets an array of indices that determine which parts of this type shall not propagate their
	 * model messages to the attached control. Prerequisite is that the corresponding binding
	 * supports this feature, see {@link sap.ui.model.Binding#supportsIgnoreMessages}.
	 *
	 * @return {int[]}
	 *   An array of indices that determine which parts of this type shall not propagate their model
	 *   messages to the attached control; an empty array is returned by default
	 *
	 * @public
	 * @see sap.ui.model.Binding#supportsIgnoreMessages
	 * @since 1.82.0
	 */
	CompositeType.prototype.getPartsIgnoringMessages = function () {
		return [];
	};

	/**
	 * Gets the indices of the binding parts of this composite type in order to determine those parts
	 * whose types are required for formatting. An empty array is returned by default. Subclasses need
	 * to overwrite this function if they are interested in type changes of the corresponding binding part.
	 *
	 * @returns {int[]}
	 *   The indices of the parts with a relevant type for this composite type
	 *
	 * @see #processPartTypes
	 */
	CompositeType.prototype.getPartsListeningToTypeChanges = function () {
		return [];
	};

	/**
	 * Returns whether the {@link #formatValue} and {@link #parseValue} methods operate on the raw
	 * model values instead of formatted values.
	 *
	 * @returns {boolean}
	 *   Whether the {@link #formatValue} and {@link #parseValue} methods operate on the raw model
	 *   values instead of formatted values
	 *
	 * @public
	 */
	CompositeType.prototype.getUseRawValues = function () {
		return this.bUseRawValues;
	};

	/**
	 * Returns whether the {@link #formatValue} and {@link #parseValue} methods operate on the
	 * internal, related native JavaScript values.
	 *
	 * @returns {boolean}
	 *   Whether the {@link #formatValue} and {@link #parseValue} methods operate on the internal,
	 *   related native JavaScript values
	 *
	 * @public
	 */
	CompositeType.prototype.getUseInternalValues = function () {
		return this.bUseInternalValues;
	};

	/**
	 * Returns whether the {@link #parseValue} method requires the current binding values as a third
	 * parameter.
	 *
	 * @returns {boolean}
	 *   Whether the {@link #parseValue} method requires the current binding values as a third
	 *   parameter
	 * @public
	 */
	CompositeType.prototype.getParseWithValues = function () {
		return this.bParseWithValues;
	};

	/**
	 * Processes the types of the parts of this composite type. A concrete composite type may
	 * override this method if it needs to derive information from the types of the parts.
	 *
	 * @param {sap.ui.model.SimpleType[]} aPartTypes Types of the composite binding's parts
	 *
	 * @protected
	 * @since 1.100.0
	 */
	CompositeType.prototype.processPartTypes = function (aPartTypes) {
	};

	return CompositeType;
});