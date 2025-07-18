/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// sap.ui.core.message.MessageMixin
sap.ui.define(["sap/ui/core/Element", "sap/ui/core/library", "sap/base/Log", "sap/ui/core/LabelEnablement"], function(Element, library, Log, LabelEnablement) {
	"use strict";

	// Marker for first visit of a gmessage
	const HANDLEDBYMIXIN = Symbol("sap.ui.core.message.MessageMixin");

	// shortcut for sap.ui.core.ValueState
	const ValueState = library.ValueState;

	/**
	 * Applying the MessageMixin to a Control's prototype augments the refreshDataState function to support Label-texts.
	 * For all messages, the additionalText property of the message will be set based on the associated Label-texts for the control instances.
	 *
	 * Please be aware, that only controls supporting a value state should apply this mixin to their prototype.
	 *
	 * @protected
	 * @alias sap.ui.core.message.MessageMixin
	 * @mixin
	 * @since 1.44.0
	 */
	var MessageMixin = function () {
		this.refreshDataState = refreshDataState;
		this.fnDestroy = this.destroy;
		this.destroy = destroy;
	};

	/**
	 * If messages are present:
	 * - Adds an additional text to the message from the label(s) of the corresponding control instance
	 * - Adds the control ID to the messages
	 * - Propagates the value state
	 */
	function refreshDataState (sName, oDataState) {
		if (oDataState.getChanges().messages && this.getBinding(sName) && this.getBinding(sName).isA("sap.ui.model.PropertyBinding")) {
			var aMessages = oDataState.getMessages();
			var aLabels = LabelEnablement.getReferencingLabels(this);
			var sLabelId = aLabels[0];
			var bForceUpdate = false;

			aMessages.forEach(function(oMessage) {
				if (aLabels && aLabels.length > 0) {
					// we simply take the first label text and ignore all others
					var oLabel = Element.getElementById(sLabelId);
					if (oLabel.getMetadata().isInstanceOf("sap.ui.core.Label") && oLabel.getText) {
						let sAdditionalText = oMessage.getAdditionalText() || '';
						const sLabel = oLabel.getText();
						if (!sAdditionalText.split(',').includes(sLabel)) {
							if (oMessage[HANDLEDBYMIXIN]) {
								sAdditionalText = sAdditionalText ? `${sAdditionalText}, ${sLabel}` : sLabel;
							} else {
								sAdditionalText = sLabel;
								oMessage[HANDLEDBYMIXIN] = true;
							}
							oMessage.setAdditionalText(sAdditionalText);
							bForceUpdate = true;
						}
					} else {
						Log.warning(
							"sap.ui.core.message.Message: Can't create labelText." +
							"Label with id " + sLabelId + " is no valid sap.ui.core.Label.",
							this
						);
					}
				}
				if (!oMessage.getControlIds().includes(this.getId())){
					oMessage.addControlId(this.getId());
					bForceUpdate = true;
				}
			}.bind(this));

			var Messaging = sap.ui.require("sap/ui/core/Messaging");
			if (Messaging) {
				// Update the model to apply the changes
				var oMessageModel = Messaging.getMessageModel();
				oMessageModel.checkUpdate(bForceUpdate, true);
			}
			// propagate messages
			if (aMessages && aMessages.length > 0) {
				var oMessage = aMessages[0];
				// check if the message type is a valid sap.ui.core.ValueState
				if (ValueState[oMessage.type]) {
					this.setValueState(oMessage.type);
					this.setValueStateText(oMessage.message);
				}
			} else {
				this.setValueState(ValueState.None);
				this.setValueStateText('');
			}
		}
	}

	function destroy() {
		//Remove control id from messages
		var sControlId = this.getId();
		function removeControlID(oMessage) {
			oMessage.removeControlId(sControlId);
		}
		for (var sName in this.mBindingInfos) {
			var oBindingInfo = this.mBindingInfos[sName];
			if (oBindingInfo.binding) {
				var oDataState = oBindingInfo.binding.getDataState();
				var aMessages = oDataState.getAllMessages();

				aMessages.forEach(removeControlID);
			}
		}
		this.fnDestroy.apply(this, arguments);
	}

	return MessageMixin;
}, /* bExport= */ true);