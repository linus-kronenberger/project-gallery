/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/*
 * This module should provide the foundation for tracing capabilities. There are three different namespaces.
 * <ul>
 * <li><code>jQuery.sap.interaction</code> - contains logic for the detection of interaction traces</li>
 * <li><code>jQuery.sap.fesr</code> - handles the creation and transmission of frontend-subrecords http-headers</li>
 * <li><code>jQuery.sap.passport</code> - handles the creation of the passport http-header, which is used by fesr and the
 * E2eTraceLib module</li>
 * </ul>
 * All measurement activities get recorded by jquery.sap.measure, which is located in jquery.sap.global. As the initial
 * interaction is the app startup, we need the measuring capability already before this module is loaded.
 */
sap.ui.define(['jquery.sap.global', 'sap/ui/performance/trace/Passport', 'sap/ui/performance/trace/Interaction', 'sap/ui/performance/trace/FESR', 'sap/base/Log', 'sap/base/config', 'sap/ui/Global'],
function(jQuery, Passport, Interaction, FESR, Log, BaseConfig/* ,Global */) {
	"use strict";


	function logSupportWarning() {
		// in case we do not have this API measurement is superfluous due to insufficient performance data
		if (!(performance && performance.getEntries)) {
			Log.warning("Interaction tracking is not supported on browsers with insufficient performance API");
		}
	}

	/**
	 * @namespace Provides base functionality for interaction detection heuristics & API<br>
	 * <p>
	 * Interaction detection works through the detection of relevant events and tracking of rendering activities.<br>
	 * An example:<br>
	 * The user clicks on a button<br>
	 * -> "click" event gets detected via notification (jQuery.sap.interaction.notifyEventStart)<br>
	 * -> a click handler is registered on the button, so this is an interaction start (jQuery.sap.interaction.notifyStepStart)<br>
	 * -> some requests are made and rendering has finished (jQuery.sap.interaction.notifyStepEnd)<br>
	 * </p>
	 * All measurement takes place in {@link jQuery.sap.measure}<br>.
	 *
	 * Namespace exists since 1.32 and became public API since 1.36.
	 *
	 * @name jQuery.sap.interaction
	 * @static
	 * @public
	 * @since 1.36
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Interaction} instead
	 */
	jQuery.sap.interaction = {};

	/**
	 * Enables the interaction tracking.
	 *
	 * @param {boolean} bActive state of the interaction detection
	 * @returns {Promise} When activtion is ready
	 * @public
	 * @since 1.36
	 */
	jQuery.sap.interaction.setActive = function(bActive) {
		logSupportWarning();
		return Interaction.setActive.apply(this, arguments);
	};

	/**
	 * Returns true if the interaction detection was enabled explicitly, or implicitly along with fesr.
	 *
	 * @return {boolean} bActive state of the interaction detection
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.interaction.getActive = () => { return Interaction.getActive(); };

	/**
	 * This method starts the actual interaction measurement when all criteria are met. As it is the starting point
	 * for the new interaction the creation of the FESR headers for the last interaction is triggered here, so that
	 * the headers can be sent with the first request of the current interaction.<br>
	 *
	 * @param {string} sEventId The Event id
	 * @param {sap.ui.core.Element} oElement Element on which the interaction has been triggered
	 * @param {boolean} bForce forces the interaction to start independently from a currently active browser event
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.interaction.notifyStepStart = (sEventId, oElement, bForce) => { Interaction.notifyStepStart(sEventId, oElement, bForce); };

	/**
	 * This method ends the started interaction measurement.
	 *
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.interaction.notifyStepEnd = () => { Interaction.notifyStepEnd(); };

	/**
	 * This method notifies if a relevant event has been triggered.
	 *
	 * @param {Event} oEvent event whose processing has started
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.interaction.notifyEventStart = (oEvent) => { Interaction.notifyEventStart(oEvent); };

	/**
	 * This method notifies if a scroll event has been triggered. Some controls require this special treatment,
	 * as the generic detection process via notifyEventStart is not sufficient.
	 *
	 * @param {Event} oEvent scroll event whose processing has started
	 * @private
	 * @since 1.36.2
	 */
	 jQuery.sap.interaction.notifyScrollEvent = (oEvent) => { Interaction.notifyScrollEvent(oEvent); };

	/**
	 * This method notifies if a relevant event has ended by detecting another interaction.
	 *
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.interaction.notifyEventEnd = () => { Interaction.notifyEventEnd(); };

	/**
	 * This method sets the component name for an interaction.
	 *
	 * @private
	 * @since 1.38.5
	 */
	jQuery.sap.interaction.setStepComponent = () => { Interaction.setStepComponent(); };


	/**
	 * @namespace FESR API, consumed by E2eTraceLib instead of former EppLib.js <br>
	 *<p>
	 * Provides functionality for creating the headers for the frontend-subrecords which will be sent with each
	 * first request of an interaction. The headers have a specific format, you may have a look at the createFESR
	 * methods.<br>
	 *</p><p>
	 * There is a special order in which things are happening: <br>
	 * 1. Interaction starts<br>
	 * 1.1. Request 1.1 sent<br>
	 * 1.2. Request 1.2 sent<br>
	 * 2. Interaction starts<br>
	 * 2.1 Creation of FESR for 1. interaction<br>
	 * 2.2 Request 2.1 sent with FESR header for 1. interaction<br>
	 * ...<br>
	 *</p>
	 * @name jQuery.sap.fesr
	 * @static
	 * @private
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/FESR} instead
	 */
	jQuery.sap.fesr = {};

	/**
	 * @param {boolean} bActive state of the FESR header creation
	 * @returns {Promise} Resolves when activation is ready
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.fesr.setActive = function(bActive) {
		logSupportWarning();
		return FESR.setActive.apply(this, arguments);
	};

	/**
	 * @return {boolean} state of the FESR header creation
	 * @private
	 * @since 1.36.2
	 */
	jQuery.sap.fesr.getActive = () => { return FESR.getActive(); };

	/**
	 * @return {string} ID of the currently processed transaction
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.fesr.getCurrentTransactionId = () => { return Passport.getTransactionId(); };

	/**
	 * @return {string} Root ID of the current session
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.fesr.getRootId = () => { return Passport.getRootId(); };


	/**
	 * @param {float} iDuration increase busy duration of pending interaction by this value
	 * @private
	 * @since 1.36.2
	 */
	jQuery.sap.fesr.addBusyDuration = (iDuration) => { Interaction.addBusyDuration(iDuration); };


	/**
	 * @namespace Passport implementation, former EppLib.js <br>
	 *
	 * Provides functionality which was former located in the EppLib.js, but as the PASSPORT header is mandatory
	 * for correct assignment of the FESR headers some functionality had to be moved to here. The actual tracing
	 * functionality of EppLib.js remained in the original file.
	 *
	 * @name jQuery.sap.passport
	 * @static
	 * @private
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Passport} instead
	 */
	jQuery.sap.passport = {};

	/**
	 * @param {boolean} bActive state of the Passport header creation
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.passport.setActive = Passport.setActive;


	/**
	 * @param {string} lvl tracing level to be calculated
	 * @return {int[]} Array with two int representation of characters for trace level
	 * @private
	 * @since 1.32
	 */
	jQuery.sap.passport.traceFlags = Passport.traceFlags;

	// activate FESR header generation
	FESR.setActive(BaseConfig.get({
		name: "sapUiFesr",
		type: BaseConfig.Type.Boolean,
		external: true,
		freeze: true
	}));

	// *********** Include E2E-Trace Scripts *************
	if (BaseConfig.get({
		name: "sapUiXxE2eTrace",
		type: BaseConfig.Type.Boolean,
		external: true,
		freeze: true
	})) {
		// jquery.sap.trace.js module gets loaded synchronous via stubbing layer
		sap.ui.requireSync("sap/ui/core/support/trace/E2eTraceLib"); // legacy-relevant
	}

	return jQuery;

});
