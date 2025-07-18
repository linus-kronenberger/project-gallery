/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/ui/test/actions/Action",
	"sap/ui/thirdparty/jquery"
], function (Action, $) {
	"use strict";

	/**
	 * @class
	 * The <code>Drag</code> action is used to simulate a drag interaction with a
	 * control. The control should be draggable, as defined by its dnd aggregation configuration.
	 * The drop location will be defined by a consequtive {@link sap.ui.test.actions.Drop} action.
	 *
	 * The <code>Drag</code> action targets the DOM focus reference of the control.
	 *
	 * @param {string}
	 *            [sId] Optional ID for the new instance; generated automatically if
	 *            no non-empty ID is given. Note: this can be omitted, no matter
	 *            whether <code>mSettings</code> are given or not!
	 * @param {object}
	 *            [mSettings] Optional object with initial settings for the new instance
	 * @extends sap.ui.test.actions.Action
	 * @public
	 * @alias sap.ui.test.actions.Drag
	 * @author SAP SE
	 * @since 1.76
	 */
	var Drag = Action.extend("sap.ui.test.actions.Drag", /** @lends sap.ui.test.actions.Drag.prototype */ {

		metadata : {
			publicMethods : [ "executeOn" ]
		},

		/**
		 * Starts a drag event sequence for this control.
		 * To finish the drag, and drop the control on a specified target, trigger a {@link sap.ui.test.actions.Drop} action on the target.
		 * Logs an error if control is not visible (i.e. has no DOM representation)
		 *
		 * @param {sap.ui.core.Control} oControl the control on which the drag events are triggered
		 * @public
		 */
		executeOn: function (oControl) {
			var oActionDomRef = this.$(oControl)[0];
			if (oActionDomRef) {
				this._tryOrSimulateFocusin($(oActionDomRef), oControl);
				this._createAndDispatchMouseEvent("mousedown", oActionDomRef);
				this._createAndDispatchDragEvent("dragstart", oActionDomRef);
				this._createAndDispatchDragEvent("drag", oActionDomRef);
			} else {
				this.oLogger.debug("Cannot drag control " + oControl + ": control has no DOM focus reference");
			}
		}
	});

	return Drag;
});
