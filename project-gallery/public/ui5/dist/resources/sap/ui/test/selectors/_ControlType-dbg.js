/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
    "sap/ui/test/selectors/_Selector"
], function (_Selector) {
	"use strict";

    var _ControlType = _Selector.extend("sap.ui.test.selectors._ControlType", {

        _generate: function () {
            // this empty object will be decorated with controlType and viewName by the base class.
            // while it is possible that some controls are unique of type, this very basic selector should be a last resort
            return {};
        }
    });

    return _ControlType;
});
