/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
    "sap/ui/test/selectors/_Selector",
    "sap/m/SelectList",
    "sap/ui/core/Item"
], function (_Selector, SelectList, Item) {
	"use strict";

    /**
     * Selector generator for item in a dropdown menu
     * @class Control selector generator: dropdown item
     * @extends sap.ui.test.selectors._Selector
     * @alias sap.ui.test.selectors._DropdownItem
     * @private
     */
	var _DropdownItem = _Selector.extend("sap.ui.test.selectors._DropdownItem", {

        /**
         * Generates control selector for sap.m.Select and sap.m.ComboBox items
         * @param {object} oControl the control for which to generate a selector
         * @param {object} mSelectorParts Options object
         * @param {object} mSelectorParts.ancestor the control selector for the parent dropdown
         * @returns {object} a plain object representation of a control. Contains the dropdown ancestor selector, item controlType and item key
         * Undefined, if the control is not a dropdown
         * @private
         */
        _generate: function (oControl, mSelectorParts) {
            if (mSelectorParts.ancestor) {
                var sSelectionKey = oControl.getKey();
                this._oLogger.debug("Control " + oControl + " with parent " + JSON.stringify(mSelectorParts.ancestor) +
                    " has selection key " + sSelectionKey);

                    return {
                        ancestor: mSelectorParts.ancestor,
                        properties: {
                            key: sSelectionKey
                        }
                    };
            } else {
                this._oLogger.debug("Control " + oControl + " is not inside a supported dropdown");
            }
        },

        _isAncestorRequired: function () {
            return true;
        },

        // if the control has a direct parent, which is a dropdown list, return the parent
        _getAncestor: function (oControl) {
            if (oControl instanceof Item) {
                var oSelectList = oControl.getParent();
                if (oSelectList && oSelectList instanceof SelectList) {
                    return oSelectList;
                }
            }
        }
    });

    return _DropdownItem;
});
