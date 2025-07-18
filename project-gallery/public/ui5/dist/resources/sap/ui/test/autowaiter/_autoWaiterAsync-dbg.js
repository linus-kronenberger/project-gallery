/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/base/util/extend",
	"sap/ui/test/_OpaLogger",
	"sap/ui/test/_ParameterValidator",
	"sap/ui/test/autowaiter/_autoWaiter",
	"sap/ui/test/_LogCollector"
], function(extend, _OpaLogger, _ParameterValidator, _autoWaiter, _LogCollector) {
	"use strict";

	var oLogger = _OpaLogger.getLogger("sap.ui.test.autowaiter._autoWaiterAsync");
	// collects logs created when _autoWaiter hasPending is called
	// this includes only the final pending result logs without any intermediate advanced logs
	// final result logs are recognized by a component name suffix "#hasPending"
	var oLogCollector = _LogCollector.getInstance("^sap.ui.test.autowaiter.*#hasPending$");
	var oConfigValidator = new _ParameterValidator({
		errorPrefix: "sap.ui.test.autowaiter._autoWaiterAsync#extendConfig"
	});
	var bWaitStarted;
	var sLastAutoWaiterLog;
	var defaultConfig = {
		interval: 400, // milliseconds
		timeout: 15000 // milliseconds
	};
	var config = extend({}, defaultConfig);

	function extendConfig(oNewConfig) {
		validateConfig(oNewConfig);
		extend(config, oNewConfig);
		_autoWaiter.extendConfig(config);
	}

	function resetConfig() {
		config = extend({}, defaultConfig);
		_autoWaiter.extendConfig(config);
	}

	function waitAsync(fnCallback) {
		// start only one waiter at a time to prevent interference between the timeout detection of multiple waiters
		if (bWaitStarted) {
			notifyCallback({error: "waitAsync is already running and cannot be called again at this moment"});
			return;
		}

		var pollStartTime = Date.now();
		bWaitStarted = true;
		oLogger.debug("Start polling to check for pending asynchronous work");
		oLogCollector.start();
		fnCheck();

		function fnCheck() {
			var pollTimeElapsed = (Date.now() - pollStartTime);
			if (pollTimeElapsed <= config.timeout) {
				setTimeout(function() {
					if (_autoWaiter.hasToWait()) {
						sLastAutoWaiterLog = oLogCollector.getAndClearLog();
						fnCheck();
					} else {
						notifyCallback({log: "Polling finished successfully. There is no more pending asynchronous work for the moment"});
						bWaitStarted = false;
					}
				}, config.interval);
			} else {
				notifyCallback({error: "Polling stopped because the timeout of " + config.timeout +
					" milliseconds has been reached but there is still pending asynchronous work.\n" +
					"This is the last log of pending work:\n" + sLastAutoWaiterLog});
				bWaitStarted = false;
			}
		}

		function notifyCallback(mResult) {
			if (fnCallback) {
				fnCallback(mResult.error);
			}
			oLogger.debug(mResult.error || mResult.log);
			oLogCollector.destroy();
		}
	}

	function validateConfig(oConfig) {
		oConfigValidator.validate({
			allowUnknownProperties: true,
			inputToValidate: oConfig,
			validationInfo: {
				interval: "positivenumeric",
				timeout: "positivenumeric"
			}
		});
	}

	return {
		extendConfig: extendConfig,
		resetConfig: resetConfig,
		waitAsync: waitAsync
	};
}, true);