/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'sap/m/p13n/Engine',
	'sap/m/p13n/modules/xConfigAPI'
], (Engine, xConfigAPI) => {
	"use strict";

	/**
	 * @class Utility class for generic mdc xConfig handling by utilizing the
	 * <code>sap.m.p13n.Engine</code> and its <code>Modificationhandler</code>.
	 * This class should be used to handle property changes that should be persisted
	 * as flex changes for MDC control while enabling preprocessing via customdata.
	 *
	 * @author SAP SE
	 * @private
	 * @alias sap.m.p13n.handler.xConfigHandler
	 */
	const xConfigHandler = {};

	const fnQueueChange = (oControl, fTask) => {
		const fCleanupPromiseQueue = (pOriginalPromise) => {
			if (oControl._pQueue === pOriginalPromise) {
				delete oControl._pQueue;
			}
		};

		oControl._pQueue = oControl._pQueue instanceof Promise ? oControl._pQueue.then(fTask) : fTask();
		oControl._pQueue.then(fCleanupPromiseQueue.bind(null, oControl._pQueue));

		return oControl._pQueue;
	};

	function fConfigModified(oControl, oChange) {

		if (oControl.isA) {
			Engine.getInstance().trace(oControl, {
				selectorElement: oControl,
				changeSpecificData: {
					changeType: oChange.getChangeType(),
					content: oChange.getContent()
				}
			});

			if (!oControl._pPendingModification) {
				oControl._pPendingModification = Engine.getInstance().waitForChanges(oControl).then(() => {
					Engine.getInstance().fireStateChange(oControl);
					Engine.getInstance().clearTrace(oControl);
					delete oControl._pPendingModification;
				});
			}
		}
	}

	function getOperationType(sChangeType) {
		const aChangeTypes = ["add", "remove", "move", "set"];

		return aChangeTypes.find((sType) => {
			return sChangeType.indexOf(sType) === 0;
		});

	}

	function getRevertOperationType(sChangeType) {
		const mOppositeType = {
			add: "remove",
			remove: "add",
			move: "move",
			set: "set"
		};
		const sType = getOperationType(sChangeType);
		return mOppositeType[sType];
	}

	/**
	 * Creates a changehandler specific to the provided aggregation and property name,
	 * to enhance the xConfig object for a given mdc control instance.
	 *
	 * The enhanced object can be accessed using <code>Engine#readAggregationConfig</code>.
	 *
	 * @param {object} mMetaConfig A map describing the metadata structure that is affected by this changehandler
	 * @param {boolean} mMetaConfig.aggregationBased Defines whether the aggregation space or the property space should be used in the xConfig object
	 * @param {string} mMetaConfig.property The property name (such as <code>width</code> or <code>label</code>)
	 * @param {string} mMetaConfig.aggregation The aggregation name
	 * @param {string} mMetaConfig.operation The operation to be executed by the handler (add, remove, move, set)
	 * @param {string[]} mMetaConfig.additionalProperties Property names of the change content that are added to the revert data
	 *
	 * @returns {object} The created changehandler object
	 */
	xConfigHandler.createHandler = (mMetaConfig) => {

		if (!mMetaConfig || !mMetaConfig.hasOwnProperty("property")) {
			throw new Error("Please provide a map containing the affected aggregation and property name!");
		}

		const sAffectedProperty = mMetaConfig.property;
		let sAffectedAggregation;

		return {
			"changeHandler": {
				applyChange: function (oChange, oControl, mPropertyBag) {
					const sChangePersistenceIdentifier = oChange.getContent().persistenceIdentifier;
					const oController = Engine.getInstance().getController(oControl, oChange.getChangeType(), sChangePersistenceIdentifier);
					if (sChangePersistenceIdentifier && oController.getPersistenceIdentifier() !== sChangePersistenceIdentifier) {
						return Promise.resolve(false);
					}

					return fnQueueChange(oControl, () => {
						return Engine.getInstance().readXConfig(oControl, {
							propertyBag: mPropertyBag
						})
							.then(async (oPriorAggregationConfig) => {
								const oChangeContent = oChange.getContent();
								const sOperation = getOperationType(oChange.getChangeType());
								sAffectedAggregation = oChangeContent.targetAggregation;

								const oRevertData = {
									key: oChangeContent.key
								};

								mMetaConfig.additionalProperties?.forEach((vProperty) => {
									if (typeof vProperty === "string" && oChangeContent[vProperty] !== undefined) {
										oRevertData[vProperty] = oChangeContent[vProperty];
									}
								});

								if (sChangePersistenceIdentifier) {
									oRevertData.persistenceIdentifier = sChangePersistenceIdentifier;
								}

								if (sOperation !== "set") {
									//In case there is a add/remove operation, flag the revert data as the opposite of the current action (add will be removed as revert and vice versa)
									oRevertData.value = sOperation !== "add";
								} else {
									oRevertData.value = null;
								}

								if ((!oPriorAggregationConfig || !(oPriorAggregationConfig?.aggregations?.[sAffectedAggregation]?.length > 0)) && typeof mMetaConfig.getCurrentState == "function") {
									const aCurrentState = await mMetaConfig.getCurrentState?.(oControl, oPriorAggregationConfig, sAffectedAggregation, oChange, mPropertyBag);
									if (aCurrentState) {
										const oStateItem = aCurrentState?.find((oItem, iIndex) => {
											return oItem.key === oChangeContent.key;
										});
										oRevertData.index = aCurrentState.indexOf(oStateItem);
									}
								}

								oRevertData.targetAggregation = oChangeContent.targetAggregation;

								const oAffectedItem = oPriorAggregationConfig?.aggregations?.[sAffectedAggregation]?.[oChangeContent.key];
								if (oAffectedItem) {
									if (oAffectedItem?.[sAffectedProperty]) {
										oRevertData.value = oPriorAggregationConfig.aggregations[sAffectedAggregation][oChangeContent.key][sAffectedProperty];
									}
									oRevertData.index = oPriorAggregationConfig.aggregations[sAffectedAggregation][oChangeContent.key].position !== undefined ? oPriorAggregationConfig.aggregations[sAffectedAggregation][oChangeContent.key].position : oRevertData.index;
								}

								oChange.setRevertData(oRevertData);

								const oConfig = {
									property: sAffectedProperty,
									key: oChangeContent.key,
									value: oChangeContent,
									operation: sOperation,
									changeType: oChange.getChangeType(),
									propertyBag: mPropertyBag,
									markAsModified: true
								};

								if (mMetaConfig.aggregationBased) {
									oConfig.controlMeta = {
										aggregation: sAffectedAggregation
									};
								}

								return Engine.getInstance().enhanceXConfig(oControl, oConfig);
							})
							.then((bConfigModified) => {
								if (!bConfigModified) {
									return;
								}
								fConfigModified(oControl, oChange);
							});
					});

				},
				completeChangeContent: function (oChange, mChangeSpecificInfo, mPropertyBag) {
					// Not used, but needs to be there
				},
				revertChange: function (oChange, oControl, mPropertyBag) {

					const sOperation = getRevertOperationType(oChange.getChangeType());

					sAffectedAggregation = oChange.getContent().targetAggregation;

					const oConfig = {
						controlMeta: {
							aggregation: sAffectedAggregation,
							property: sAffectedProperty
						},
						property: sAffectedProperty,
						operation: sOperation,
						changeType: oChange.getChangeType(),
						key: oChange.getRevertData().key,
						value: oChange.getRevertData(),
						propertyBag: mPropertyBag
					};

					if (mMetaConfig.aggregationBased) {
						oConfig.controlMeta = {
							aggregation: sAffectedAggregation
						};
					}

					return Engine.getInstance().enhanceXConfig(oControl, oConfig)
						.then((bConfigModified) => {
							if (!bConfigModified) {
								return;
							}
							oChange.resetRevertData();
							fConfigModified(oControl, oChange);
						});
				}
			},
			"layers": {
				"USER": true
			}
		};
	};

	return xConfigHandler;

});