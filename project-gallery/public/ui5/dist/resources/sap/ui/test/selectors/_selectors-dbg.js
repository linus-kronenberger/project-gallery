/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//private
sap.ui.define([
    "sap/base/util/extend",
    "sap/ui/test/selectors/_BindingPath",
    "sap/ui/test/selectors/_DropdownItem",
    "sap/ui/test/selectors/_GlobalID",
    "sap/ui/test/selectors/_ControlType",
    "sap/ui/test/selectors/_LabelFor",
    "sap/ui/test/selectors/_Properties",
    "sap/ui/test/selectors/_Selector",
    "sap/ui/test/selectors/_TableRowItem",
    "sap/ui/test/selectors/_ViewID"
], function (extend) {
    "use strict";

    function getSelectorInstances() {
        // create an instance of every imported selector generator and save it in a common object
        return Array.prototype.slice.call(arguments, 1).reduce(function (mResult, Selector) {
            var mNewSelector = {};
            var sOwnName = Selector.getMetadata()._sClassName.split(".").pop();
            var sOwnNameLowCapital = sOwnName.charAt(1).toLowerCase() + sOwnName.substring(2);
            mNewSelector[sOwnNameLowCapital] = new Selector();
            return extend(mResult, mNewSelector);
        }, {});
    }

    return getSelectorInstances.apply(this, arguments);

});
