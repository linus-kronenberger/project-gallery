/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides the base implementation for all model implementations
sap.ui.define(["sap/ui/core/Lib", 'sap/ui/model/SimpleType', 'sap/ui/model/FormatException', 'sap/ui/model/ParseException'],
	function(Library, SimpleType, FormatException, ParseException) {
	"use strict";


	/**
	 * Constructor for a Boolean type.
	 *
	 * @class
	 * This class represents boolean simple types.
	 *
	 * @extends sap.ui.model.SimpleType
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @public
	 * @param {object} [oFormatOptions]
	 *   Format options as defined in the interface of {@link sap.ui.model.SimpleType}; this
	 *   type ignores them, since it does not support any format options
	 * @param {object} [oConstraints]
	 *   Constraints as defined in the interface of {@link sap.ui.model.SimpleType}; this
	 *   type ignores them, since it does not support any constraints
	 * @alias sap.ui.model.type.Boolean
	 */
	var BooleanType = SimpleType.extend("sap.ui.model.type.Boolean", /** @lends sap.ui.model.type.Boolean.prototype */ {

		constructor : function () {
			SimpleType.apply(this, arguments);
			this.sName = "Boolean";
		}

	});

	BooleanType.prototype.formatValue = function(bValue, sInternalType) {
		if (bValue == undefined || bValue == null) {
			return null;
		}
		switch (this.getPrimitiveType(sInternalType)) {
			case "any":
			case "boolean":
				return bValue;
			case "string":
				return bValue.toString();
			default:
				throw new FormatException("Don't know how to format Boolean to " + sInternalType);
		}
	};

	BooleanType.prototype.parseValue = function(oValue, sInternalType) {
		var oBundle;
		switch (this.getPrimitiveType(sInternalType)) {
			case "boolean":
				return oValue;
			case "string":
				if (oValue.toLowerCase() == "true" || oValue == "X") {
					return true;
				}
				if (oValue.toLowerCase() == "false" || oValue == "" || oValue == " ") {
					return false;
				}
				oBundle = Library.getResourceBundleFor("sap.ui.core");
				throw new ParseException(oBundle.getText("Boolean.Invalid"));
			default:
				throw new ParseException("Don't know how to parse Boolean from " + sInternalType);
		}
	};

	BooleanType.prototype.validateValue = function() {};

	return BooleanType;
});
