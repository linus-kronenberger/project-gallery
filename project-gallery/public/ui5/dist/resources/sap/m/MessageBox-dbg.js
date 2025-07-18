/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.m.MessageBox
sap.ui.define([
	'./Button',
	'./Dialog',
	'./Text',
	'./FormattedText',
	'./Link',
	'./MessageStrip',
	'./VBox',
	'sap/ui/core/IconPool',
	'sap/ui/core/ElementMetadata',
	"sap/ui/core/Lib",
	'sap/ui/core/library',
	'sap/ui/core/message/MessageType',
	'sap/ui/core/Control',
	'sap/m/library',
	"sap/ui/thirdparty/jquery"
], function(
	Button,
	Dialog,
	Text,
	FormattedText,
	Link,
	MessageStrip,
	VBox,
	IconPool,
	ElementMetadata,
	Library,
	coreLibrary,
	MessageType,
	Control,
	library,
	jQuery
) {
	"use strict";

	// shortcut for sap.m.DialogType
	var DialogType = library.DialogType;

	// shortcut for sap.m.DialogRoleType
	var DialogRoleType = library.DialogRoleType;

	// shortcut for sap.m.ButtonType
	var ButtonType = library.ButtonType;

	// shortcut for sap.m.TitleAlignment
	var TitleAlignment = library.TitleAlignment;

	// shortcut for sap.m.FlexRendertype
	var FlexRendertype = library.FlexRendertype;

	// shortcut for sap.m.FlexAlignItems
	var FlexAlignItems = library.FlexAlignItems;

	// shortcut for sap.m.LinkAccessibleRole
	var LinkAccessibleRole = library.LinkAccessibleRole;

	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;

	/**
	 * Provides easier methods to create sap.m.Dialog with type sap.m.DialogType.Message, such as standard alerts,
	 * confirmation dialogs, or arbitrary message dialogs.
	 *
	 * MessageBox provides several functions:
	 * <ul>
	 * <li><code>show()</code> - This is the generic way to open a message dialog. You can customize its contents through the <code>mOptions</code> parameter described below.</li>
	 * <li><code>alert()</code>, <code>confirm()</code>, <code>error()</code>, <code>information()</code>, <code>success()</code> and <code>warning()</code> - predefined templates of message dialogs. Each value type is coming with action buttons and an icon that are corresponding to its semantic. Although the full set of <code>mOptions</code> (applicable to <code>show()</code>) are available to them, it is recommended to only use the documented options.</li>
	 * </ul>
	 *
	 * <b>Note:</b> All options of show() are available for the other template functions as well, but it is recommended to use show() only in more specific scenarios.<br />
	 * <b>Note:</b> Due to the static nature of the <code>MessageBox</code> class, you cannot expect data binding support from its helper functions. If this is required you can use the <code>sap.m.Dialog</code> instead.<br />
	 * <b>Note:</b> When using the <code>MessageBox.Error</code> method, there is no emphasized action by design.
	 *
	 * Example:
	 * <pre>
	 *sap.ui.define(["sap/m/MessageBox"], function (MessageBox) {
	 *	MessageBox.show(
	 *		"This message should appear in the message box.", {
	 *			icon: MessageBox.Icon.INFORMATION,
	 *			title: "My message box title",
	 *			actions: [MessageBox.Action.YES, MessageBox.Action.NO],
	 *			emphasizedAction: MessageBox.Action.YES,
	 *			onClose: function (oAction) { / * do something * / }
	 *		}
	 *	);
	 *});
	 * </pre>
	 *
	 * When using the <code>sap.m.MessageBox</code> in SAP Quartz and Horizon themes, the breakpoints and layout paddings could be determined by the MessageBox' width. To enable this concept and add responsive paddings to an element of the MessageBox control, you have to add the following classes depending on your use case: <code>sapUiResponsivePadding--header</code>, <code>sapUiResponsivePadding--content</code>, <code>sapUiResponsivePadding--footer</code>.
	 *
	 * @namespace
	 * @alias sap.m.MessageBox
	 * @public
	 * @since 1.21.2
	 * @see {@link fiori:https://experience.sap.com/fiori-design-web/message-box/ Message Box}
	 */
	var MessageBox = {};

	/**
	 * Enumeration of supported actions in a MessageBox.
	 *
	 * Each action is represented as a button in the message box. The values of this enumeration are used for both,
	 * specifying the set of allowed actions as well as reporting back the user choice.
	 * @enum {string}
	 * @public
	 */
	MessageBox.Action = {

		/**
		 * Adds an "OK" button to the message box.
		 * @public
		 */
		OK: "OK",

		/**
		 * Adds a "Cancel" button to the message box.
		 * @public
		 */
		CANCEL: "CANCEL",

		/**
		 * Adds a "Yes" button to the message box.
		 * @public
		 */
		YES: "YES",

		/**
		 * Adds a "No" button to the message box.
		 * @public
		 */
		NO: "NO",

		/**
		 * Adds an "Abort" button to the message box.
		 * @public
		 */
		ABORT: "ABORT",

		/**
		 * Adds a "Retry" button to the message box.
		 * @public
		 */
		RETRY: "RETRY",

		/**
		 * Adds an "Ignore" button to the message box.
		 * @public
		 */
		IGNORE: "IGNORE",

		/**
		 * Adds a "Close" button to the message box.
		 * @public
		 */
		CLOSE: "CLOSE",

		/**
		 * Adds a "Delete" button to the message box.
		 * @public
		 */
		DELETE: "DELETE"
	};

	/**
	 * Enumeration of the pre-defined icons that can be used in a MessageBox.
	 * @enum {string}
	 * @public
	 */
	MessageBox.Icon = {

		/**
		 * Shows no icon in the message box.
		 * @public
		 */
		NONE: "NONE",

		/**
		 * Shows the information icon in the message box.
		 * @public
		 */
		INFORMATION: "INFORMATION",

		/**
		 * Shows the warning icon in the message box.
		 * @public
		 */
		WARNING: "WARNING",

		/**
		 * Shows the error icon in the message box.
		 * @public
		 */
		ERROR: "ERROR",

		/**
		 * Shows the success icon in the message box.
		 * @public
		 */
		SUCCESS: "SUCCESS",

		/**
		 * Shows the question icon in the message box.
		 * @public
		 */
		QUESTION: "QUESTION"
	};

	var Action = MessageBox.Action,
		Icon = MessageBox.Icon;

	function _verifyBundle() {
		if (MessageBox._rb !== Library.getResourceBundleFor("sap.m")) {
			MessageBox._rb = Library.getResourceBundleFor("sap.m");
		}
	}

	function _formatDetails(vDetails) {
		if (typeof vDetails === "object") {
			// Using stringify() with "tab" as space argument and escaping the JSON to prevent binding
			return "<pre>" + JSON.stringify(vDetails, null, "\t").replace(/{/gi, "&#x007B;") + "</pre>";
		}

		return vDetails;
	}

	function _getDetailsLayout(mOptions, oMessageText, oDialog, oInitialFocusFallback) {
		var oDetails, oViewDetails, oErrorMessage, oTryAgain, bFocusTryAgain = false,
			oVBox = new VBox({
				renderType: FlexRendertype.Bare,
				alignItems: FlexAlignItems.Start,
				items: [
					oMessageText
				]
			});

		if (!mOptions.details) {
			return oVBox;
		}

		function showDetails(vDetails) {
			// html text is set by purpose with setter. If it's set in the constructor, there would be issues with binding
			oDetails.setHtmlText(_formatDetails(vDetails));

			var oInitialFocus = oDialog.getInitialFocus();
			oDialog.addAriaLabelledBy(oDetails);

			oDetails.setVisible(true);
			oViewDetails.setVisible(false);

			// focus the dialog, so the screen readers can read the details text
			oDialog._setInitialFocus();

			if (!oInitialFocus || oInitialFocus === oViewDetails.getId()) {
				// if the initialFocus is not set or is set to the "Show details" link
				// focus the first action button
				oInitialFocusFallback.focus();
			}
		}

		function showDetailsAsync() {
			oViewDetails.setBusyIndicatorDelay(0).setBusy(true);
			oViewDetails.getDomRef("busyIndicator").focus();

			mOptions.details()
				.then(function (sData) {
					if (oDialog.isDestroyed()) {
						return;
					}

					showDetails(sData);
				})
				.catch(function () {
					if (oDialog.isDestroyed()) {
						return;
					}

					if (document.activeElement === oViewDetails.getDomRef("busyIndicator")) {
						bFocusTryAgain = true;
					}
					oViewDetails.setVisible(false);
					oErrorMessage.setVisible(true);
				});
		}

		oDetails = new FormattedText({
			visible: false
		});

		oViewDetails = new Link({
			accessibleRole: LinkAccessibleRole.Button,
			text: MessageBox._rb.getText("MSGBOX_LINK_TITLE"),
			press: function () {
				if (typeof mOptions.details === "function") {
					showDetailsAsync();
				} else {
					showDetails(mOptions.details);
				}
			}
		});

		oTryAgain = new Link({
			text: MessageBox._rb.getText("MSGBOX_DETAILS_RETRY_LOADING"),
			accessibleRole: LinkAccessibleRole.Button,
			press: function () {
				oViewDetails.setVisible(true);
				oErrorMessage.setVisible(false);
				var oDelegate = {
					onAfterRendering: function () {
						oViewDetails.removeEventDelegate(oDelegate);
						showDetailsAsync();
					}
				};
				oViewDetails.addEventDelegate(oDelegate);
			}
		});

		oTryAgain.addEventDelegate({
			onAfterRendering: function () {
				if (bFocusTryAgain) {
					oTryAgain.focus();
				}
				bFocusTryAgain = false;
			}
		});

		oErrorMessage = new MessageStrip({
			text: MessageBox._rb.getText("MSGBOX_DETAILS_LOAD_ERROR"),
			type: MessageType.Error,
			visible: false,
			link: oTryAgain
		});

		oViewDetails.addStyleClass("sapMMessageBoxLinkText");
		oErrorMessage.addStyleClass("sapMMessageBoxErrorText");
		oDetails.addStyleClass("sapMMessageBoxDetails");

		oVBox.addItem(oViewDetails);
		oVBox.addItem(oErrorMessage);
		oVBox.addItem(oDetails);

		return oVBox;
	}

	/**
	 * Creates and displays an sap.m.Dialog with type sap.m.DialogType.Message with the given text and buttons, and optionally other parts.
	 * After the user has tapped a button, the <code>onClose</code> function is invoked when given.
	 *
	 * The only mandatory parameter is <code>vMessage</code>.
	 *
	 * <pre>
	 * sap.m.MessageBox.show("This message should appear in the message box", {
	 *     icon: sap.m.MessageBox.Icon.NONE,                    // default
	 *     title: "",                                           // default
	 *     actions: sap.m.MessageBox.Action.OK,                 // default
	 *     emphasizedAction: sap.m.MessageBox.Action.OK,        // default
	 *     onClose: null,                                       // default
	 *     styleClass: "",                                      // default
	 *     initialFocus: null,                                  // default
	 *     textDirection: sap.ui.core.TextDirection.Inherit,    // default
	 *     dependentOn: null                                    // default
	 * });
	 * </pre>
	 *
	 * The created dialog is executed asynchronously. When it has been created and registered for rendering,
	 * this function returns without waiting for a user reaction.
	 *
	 * When applications have to react on the users choice, they have to provide a callback function and
	 * postpone any reaction on the user choice until that callback is triggered.
	 *
	 * The signature of the callback is
	 *
	 *   function (oAction);
	 *
	 * where <code>oAction</code> is the button that the user has tapped. For example, when the user has pressed the close button,
	 * an sap.m.MessageBox.Action.CLOSE is returned.
	 *
	 * @param {string} vMessage Message to be displayed in the alert dialog. The usage of sap.core.Control as vMessage is deprecated since version 1.30.4.
	 * @param {object} [mOptions] Other options (optional)
	 * @param {sap.m.MessageBox.Icon} [mOptions.icon] The icon to be displayed.
	 * @param {string} [mOptions.title] The title of the message box.
	 * @param {sap.m.MessageBox.Action|sap.m.MessageBox.Action[]|string|string[]} [mOptions.actions=sap.m.MessageBox.Action.OK] Either a single action, or an array of actions.
	 *      If no action(s) are given, the single action MessageBox.Action.OK is taken as a default for the parameter.
	 *      Custom action(s) string or an array can be provided, and then the translation
	 *      of custom actions needs to be done by the application.
	 * @param {sap.m.MessageBox.Action|string} [mOptions.emphasizedAction=sap.m.MessageBox.Action.OK] Added since version 1.75.0. Specifies which action of the created dialog will be emphasized. EmphasizedAction will apply only if the property <code>actions</code> is provided.
	 * @param {function} [mOptions.onClose] Function to be called when the user taps a button or closes the message box.
	 * @param {string} [mOptions.id] ID to be used for the dialog. Intended for test scenarios, not recommended for productive apps
	 * @param {string} [mOptions.styleClass] Added since version 1.21.2. CSS style class which is added to the dialog's root DOM node. The compact design can be activated by setting this to "sapUiSizeCompact"
	 * @param {string|sap.m.MessageBox.Action} [mOptions.initialFocus] Added since version 1.28.0. initialFocus, this option sets the action name, the text of the button or the control that gets the focus as first focusable element after the MessageBox is opened.
	 * The usage of sap.ui.core.Control to set initialFocus is deprecated since version 1.30.4.
	 * @param {sap.ui.core.TextDirection} [mOptions.textDirection] Added since version 1.28. Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
	 * @param {boolean} [mOptions.verticalScrolling] verticalScrolling is deprecated since version 1.30.4. VerticalScrolling, this option indicates if the user can scroll vertically inside the MessageBox when the content is larger than the content area.
	 * @param {boolean} [mOptions.horizontalScrolling] horizontalScrolling is deprecated since version 1.30.4. HorizontalScrolling, this option indicates if the user can scroll horizontally inside the MessageBox when the content is larger than the content area.
	 * @param {string|object|function():Promise<string|object>} [mOptions.details]
	 *      Added since version 1.28.0. If set, a link to view details is added. When the user clicks the link, the text area containing 'details' information is displayed.
	 *      The initial visibility is not configurable and the details are hidden by default.<br>
	 *      The following details can be used:
	 *      <ul>
	 *        <li><code>string</code> - text in HTML format. For full list of supported HTML tags see {@link sap.m.FormattedText}</li>
	 *        <li><code>object</code> - JSON object that will be serialized using <code>JSON.stringify</code></li>
	 *        <li><code>function</code> - since version 1.103, a callback function that fetches the details asynchronously. It should return a promise that resolves with a <code>string</code> value or an <code>object</code>, or rejects - in this case a default error message will be displayed</li>
	 *      <ul>
	 * @param {sap.ui.core.CSSSize} [mOptions.contentWidth] The width of the MessageBox
	 * @param {boolean} [mOptions.closeOnNavigation=true] Added since version 1.72.0. Whether the MessageBox will be closed automatically when a routing navigation occurs.
	 * @param {sap.ui.core.Element} [mOptions.dependentOn] Added since version 1.124.0. Specifies an element to which the dialog will be added as a dependent.
	 * @public
	 * @static
	 */
	MessageBox.show = function (vMessage, mOptions) {
		var oDialog, oMessageText, vMessageContent, oResult = null, aButtons = [], i,
				sIcon, sTitle, vActions, fnCallback, sDialogId, sClass,
				mDefaults = {
					id: ElementMetadata.uid("mbox"),
					initialFocus: null,
					textDirection: TextDirection.Inherit,
					verticalScrolling: true,
					horizontalScrolling: true,
					details: "",
					contentWidth: null
				},
				mClasses = {
					"INFORMATION": "sapMMessageBoxInfo",
					"WARNING": "sapMMessageBoxWarning",
					"ERROR": "sapMMessageBoxError",
					"SUCCESS": "sapMMessageBoxSuccess",
					"QUESTION": "sapMMessageBoxQuestion",
					"STANDARD":  "sapMMessageBoxStandard"
				},
				mIcons = {
					"INFORMATION": IconPool.getIconURI("information"),
					"WARNING": IconPool.getIconURI("alert"),
					"ERROR": IconPool.getIconURI("error"),
					"SUCCESS": IconPool.getIconURI("sys-enter-2"),
					"QUESTION": IconPool.getIconURI("sys-help-2")
				};

		_verifyBundle();

		if (typeof mOptions === "string" || arguments.length > 2) {
			// Old API compatibility
			// oIcon, sTitle, vActions, fnCallback, sDialogId, sStyleClass
			sIcon = arguments[1];
			sTitle = arguments[2];
			vActions = arguments[3];
			fnCallback = arguments[4];
			sDialogId = arguments[5];
			sClass = arguments[6];
			mOptions = {
				icon: sIcon,
				title: sTitle,
				actions: vActions,
				onClose: fnCallback,
				id: sDialogId,
				styleClass: sClass
			};
		}

		if (mOptions && mOptions.hasOwnProperty("details")) {
			mDefaults.icon = Icon.INFORMATION;
			mDefaults.emphasizedAction = Action.OK;
			mDefaults.actions = [Action.OK, Action.CANCEL];
			mOptions = jQuery.extend({}, mDefaults, mOptions);
		}

		mOptions = jQuery.extend({}, mDefaults, mOptions);

		// normalize the vActions array
		if (typeof mOptions.actions !== "undefined" && !Array.isArray(mOptions.actions)) {
			if (mOptions.emphasizedAction !== null) {
				mOptions.emphasizedAction = mOptions.actions;
			}
			mOptions.actions = [mOptions.actions];
		}

		if (!mOptions.actions || mOptions.actions.length === 0) {
			mOptions.emphasizedAction = Action.OK;
			mOptions.actions = [Action.OK];
		}

		/** creates a button for the given action */
		function button(sAction, sButtonType) {
			var sText;

			// Don't check in ResourceBundle library if the button is with custom text
			if (MessageBox.Action.hasOwnProperty(sAction)) {
				sText = MessageBox._rb.getText("MSGBOX_" + sAction);
			}

			var oButton = new Button({
				id: ElementMetadata.uid("mbox-btn-"),
				text: sText || sAction,
				type: sButtonType,
				press: function () {
					oResult = sAction;
					oDialog.close();
				}
			});
			return oButton;
		}

		var sButtonType;

		for (i = 0; i < mOptions.actions.length; i++) {
			sButtonType = mOptions.emphasizedAction === mOptions.actions[i] ? ButtonType.Emphasized : ButtonType.Default;
			aButtons.push(button(mOptions.actions[i], sButtonType));
		}

		function onclose() {
			if (typeof mOptions.onClose === "function") {
				mOptions.onClose(oResult);
			}
			oDialog.detachAfterClose(onclose);
			oDialog.destroy();
		}

		function getInitialFocusControl() {
			var i = 0;
			var oInitialFocusControl = null;
			if (mOptions.initialFocus) {
				if (mOptions.initialFocus instanceof Control) {//covers sap.ui.core.Control cases
					oInitialFocusControl = mOptions.initialFocus;
				}

				if (typeof mOptions.initialFocus === "string") {//covers string and MessageBox.Action cases
					for (i = 0; i < aButtons.length; i++) {
						if (MessageBox.Action.hasOwnProperty(mOptions.initialFocus)) {
							if (MessageBox._rb.getText("MSGBOX_" + mOptions.initialFocus).toLowerCase() === aButtons[i].getText().toLowerCase()) {
								oInitialFocusControl = aButtons[i];
								break;
							}
						} else {
							if (mOptions.initialFocus.toLowerCase() === aButtons[i].getText().toLowerCase()) {
								oInitialFocusControl = aButtons[i];
								break;
							}
						}
					}
				}
			}

			return oInitialFocusControl;
		}

		if (typeof (vMessage) === "string") {
			vMessageContent = new Text({
					textDirection: mOptions.textDirection
				}).setText(vMessage).addStyleClass("sapMMsgBoxText");

			// If we have only text we need to keep a reference to it and add it to the aria-labelledby attribute of the dialog.
			oMessageText = vMessageContent;
		} else if (vMessage instanceof Control) {
			vMessageContent = vMessage.addStyleClass("sapMMsgBoxText");
		}

		oDialog = new Dialog({
			id: mOptions.id,
			type: DialogType.Message,
			title: mOptions.title,
			titleAlignment: TitleAlignment.Auto,
			icon: mIcons[mOptions.icon],
			initialFocus: getInitialFocusControl(),
			verticalScrolling: mOptions.verticalScrolling,
			horizontalScrolling: mOptions.horizontalScrolling,
			afterClose: onclose,
			buttons: aButtons,
			ariaLabelledBy: oMessageText ? oMessageText.getId() : undefined,
			contentWidth: mOptions.contentWidth,
			closeOnNavigation: mOptions.closeOnNavigation
		}).addStyleClass("sapMMessageBox");

		// If we have additional details, we should wrap the content in a details layout.
		if (mOptions.hasOwnProperty("details") && mOptions.details !== "") {
			vMessageContent = _getDetailsLayout(mOptions, vMessageContent, oDialog, aButtons[0]);
		}

		oDialog.addContent(vMessageContent);
		oDialog.setProperty("role", DialogRoleType.AlertDialog);

		if (mClasses[mOptions.icon]) {
			oDialog.addStyleClass(mClasses[mOptions.icon]);
		} else {
			oDialog.addStyleClass(mClasses.STANDARD);
		}

		if (mOptions.styleClass) {
			oDialog.addStyleClass(mOptions.styleClass);
		}

		if (mOptions.dependentOn) {
			mOptions.dependentOn.addDependent(oDialog);
		}

		oDialog.open();
	};

	/**
	 * Displays an alert dialog with the given message and an OK button (no icons).
	 *
	 * <pre>
	 * sap.m.MessageBox.alert("This message should appear in the alert", {
	 *     title: "Alert",                                      // default
	 *     onClose: null,                                       // default
	 *     styleClass: "",                                      // default
	 *     actions: sap.m.MessageBox.Action.OK,                 // default
	 *     emphasizedAction: sap.m.MessageBox.Action.OK,        // default
	 *     initialFocus: null,                                  // default
	 *     textDirection: sap.ui.core.TextDirection.Inherit,    // default
	 *     dependentOn: null                                    // default
	 * });
	 * </pre>
	 *
	 * If a callback is given, it is called after the alert dialog has been closed
	 * by the user via the OK button. The callback is called with the following signature:
	 *
	 * <pre>
	 *   function (oAction)
	 * </pre>
	 *
	 * where <code>oAction</code> can be either sap.m.MessageBox.Action.OK when the alert dialog is closed by tapping on the OK button
	 *    or null when the alert dialog is closed by calling <code>sap.m.InstanceManager.closeAllDialogs()</code>.
	 *
	 * The alert dialog opened by this method is processed asynchronously.
	 * Applications have to use <code>fnCallback</code> to continue work after the
	 * user closed the alert dialog.
	 *
	 * @param {string} vMessage Message to be displayed in the alert dialog. The usage of sap.core.Control as vMessage is deprecated since version 1.30.4.
	 * @param {object} [mOptions] Other options (optional)
	 * @param {function} [mOptions.onClose] callback function to be called when the user closes the dialog
	 * @param {string} [mOptions.title='Alert'] Title to be displayed in the alert dialog
	 * @param {sap.m.MessageBox.Action|sap.m.MessageBox.Action[]|string|string[]} [mOptions.actions=sap.m.MessageBox.Action.OK] Either a single action, or an array of actions.
	 *      If no action(s) are given, the single action MessageBox.Action.OK is taken as a default for the parameter.
	 *      Custom action(s) string or an array can be provided, and then the translation
	 *      of custom actions needs to be done by the application.
	 * @param {sap.m.MessageBox.Action|string} [mOptions.emphasizedAction=sap.m.MessageBox.Action.OK] Added since version 1.75.0. Specifies which action of the created dialog will be emphasized. EmphasizedAction will apply only if the property <code>actions</code> is provided.
	 * @param {string} [mOptions.id] ID to be used for the alert dialog. Intended for test scenarios, not recommended for productive apps
	 * @param {string} [mOptions.styleClass] Added since version 1.21.2. CSS style class which is added to the alert dialog's root DOM node. The compact design can be activated by setting this to "sapUiSizeCompact"
	 * @param {string|sap.m.MessageBox.Action} [mOptions.initialFocus] Added since version 1.28.0. initialFocus, this option sets the action name, the text of the button or the control that gets the focus as first focusable element after the MessageBox is opened.
	 * The usage of sap.ui.core.Control to set initialFocus is deprecated since version 1.30.4.
	 * @param {sap.ui.core.TextDirection} [mOptions.textDirection] Added since version 1.28. Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
	 * @param {boolean} [mOptions.verticalScrolling] verticalScrolling is deprecated since version 1.30.4. VerticalScrolling, this option indicates if the user can scroll vertically inside the MessageBox when the content is larger than the content area.
	 * @param {boolean} [mOptions.horizontalScrolling] horizontalScrolling is deprecated since version 1.30.4. HorizontalScrolling, this option indicates if the user can scroll horizontally inside the MessageBox when the content is larger than the content area.
	 * @param {string|object|function():Promise<string|object>} [mOptions.details]
	 *      Added since version 1.28.0. If set, a link to view details is added. When the user clicks the link, the text area containing 'details' information is displayed.
	 *      The initial visibility is not configurable and the details are hidden by default.<br>
	 *      The following details can be used:
	 *      <ul>
	 *        <li><code>string</code> - text in HTML format. For full list of supported HTML tags see {@link sap.m.FormattedText}</li>
	 *        <li><code>object</code> - JSON object that will be serialized using <code>JSON.stringify</code></li>
	 *        <li><code>function</code> - since version 1.103, a callback function that fetches the details asynchronously. It should return a promise that resolves with a <code>string</code> value or an <code>object</code>, or rejects - in this case a default error message will be displayed</li>
	 *      <ul>
	 * @param {sap.ui.core.CSSSize} [mOptions.contentWidth] The width of the MessageBox
	 * @param {boolean} [mOptions.closeOnNavigation=true] Added since version 1.72.0. Whether the MessageBox will be closed automatically when a routing navigation occurs.
	 * @param {sap.ui.core.Element} [mOptions.dependentOn] Added since version 1.124.0. Specifies an element to which the dialog will be added as a dependent.
	 * @public
	 * @static
	 */
	MessageBox.alert = function (vMessage, mOptions) {
		_verifyBundle();

		var mDefaults = {
			icon: Icon.NONE,
			title: MessageBox._rb.getText("MSGBOX_TITLE_ALERT"),
			emphasizedAction: mOptions && mOptions.actions ? null : Action.OK,
			actions: Action.OK,
			id: ElementMetadata.uid("alert"),
			initialFocus: null
		}, fnCallback, sTitle, sDialogId, sStyleClass;

		if (typeof mOptions === "function" || arguments.length > 2) {
			// Old API Compatibility
			// fnCallback, sTitle, sDialogId, sStyleClass
			fnCallback = arguments[1];
			sTitle = arguments[2];
			sDialogId = arguments[3];
			sStyleClass = arguments[4];
			mOptions = {
				onClose: fnCallback,
				title: sTitle,
				id: sDialogId,
				styleClass: sStyleClass
			};
		}

		mOptions = jQuery.extend({}, mDefaults, mOptions);

		MessageBox.show(vMessage, mOptions);
	};

	/**
	 * Displays a confirmation dialog with the given message, a QUESTION icon, an OK button
	 * and a Cancel button. If a callback is given, it is called after the confirmation box
	 * has been closed by the user with one of the buttons.
	 *
	 * <pre>
	 * sap.m.MessageBox.confirm("This message should appear in the confirmation", {
	 *     title: "Confirm",                                    // default
	 *     onClose: null,                                       // default
	 *     styleClass: "",                                      // default
	 *     actions: [ sap.m.MessageBox.Action.OK,
	 *                sap.m.MessageBox.Action.CANCEL ],         // default
	 *     emphasizedAction: sap.m.MessageBox.Action.OK,        // default
	 *     initialFocus: null,                                  // default
	 *     textDirection: sap.ui.core.TextDirection.Inherit,    // default
	 *     dependentOn: null                                    // default
	 * });
	 * </pre>
	 *
	 * The callback is called with the following signature
	 *
	 * <pre>
	 *   function(oAction)
	 * </pre>
	 *
	 * where oAction is set by one of the following three values:
	 * 1. sap.m.MessageBox.Action.OK: OK (confirmed) button is tapped.
	 * 2. sap.m.MessageBox.Action.CANCEL: Cancel (unconfirmed) button is tapped.
	 * 3. null: Confirm dialog is closed by calling <code>sap.m.InstanceManager.closeAllDialogs()</code>
	 *
	 * The confirmation dialog opened by this method is processed asynchronously.
	 * Applications have to use <code>fnCallback</code> to continue work after the
	 * user closed the confirmation dialog
	 *
	 * @param {string} vMessage Message to be displayed in the alert dialog. The usage of sap.core.Control as vMessage is deprecated since version 1.30.4.
	 * @param {object} [mOptions] Other options (optional)
	 * @param {function} [mOptions.onClose] Callback to be called when the user closes the dialog
	 * @param {string} [mOptions.title='Confirmation'] Title to display in the confirmation dialog
	 * @param {sap.m.MessageBox.Action|sap.m.MessageBox.Action[]|string|string[]} [mOptions.actions=sap.m.MessageBox.Action.OK] Either a single action, or an array of actions.
	 *      If no action(s) are given, the single action MessageBox.Action.OK is taken as a default for the parameter.
	 *      Custom action(s) string or an array can be provided, and then the translation
	 *      of custom actions needs to be done by the application.
	 * @param {sap.m.MessageBox.Action|string} [mOptions.emphasizedAction=sap.m.MessageBox.Action.OK] Added since version 1.75.0. Specifies which action of the created dialog will be emphasized. EmphasizedAction will apply only if the property <code>actions</code> is provided.
	 * @param {string} [mOptions.id] ID to be used for the confirmation dialog. Intended for test scenarios, not recommended for productive apps
	 * @param {string} [mOptions.styleClass] Added since version 1.21.2. CSS style class which is added to the confirmation dialog's root DOM node. The compact design can be activated by setting this to "sapUiSizeCompact"
	 * @param {string|sap.m.MessageBox.Action} [mOptions.initialFocus] Added since version 1.28.0. initialFocus, this option sets the action name, the text of the button or the control that gets the focus as first focusable element after the MessageBox is opened.
	 * The usage of sap.ui.core.Control to set initialFocus is deprecated since version 1.30.4.
	 * @param {sap.ui.core.TextDirection} [mOptions.textDirection] Added since version 1.28. Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
	 * @param {boolean} [mOptions.verticalScrolling] verticalScrolling is deprecated since version 1.30.4. VerticalScrolling, this option indicates if the user can scroll vertically inside the MessageBox when the content is larger than the content area.
	 * @param {boolean} [mOptions.horizontalScrolling] horizontalScrolling is deprecated since version 1.30.4. HorizontalScrolling, this option indicates if the user can scroll horizontally inside the MessageBox when the content is larger than the content area.
	 * @param {string|object|function():Promise<string|object>} [mOptions.details]
	 *      Added since version 1.28.0. If set, a link to view details is added. When the user clicks the link, the text area containing 'details' information is displayed.
	 *      The initial visibility is not configurable and the details are hidden by default.<br>
	 *      The following details can be used:
	 *      <ul>
	 *        <li><code>string</code> - text in HTML format. For full list of supported HTML tags see {@link sap.m.FormattedText}</li>
	 *        <li><code>object</code> - JSON object that will be serialized using <code>JSON.stringify</code></li>
	 *        <li><code>function</code> - since version 1.103, a callback function that fetches the details asynchronously. It should return a promise that resolves with a <code>string</code> value or an <code>object</code>, or rejects - in this case a default error message will be displayed</li>
	 *      <ul>
	 * @param {sap.ui.core.CSSSize} [mOptions.contentWidth] The width of the MessageBox
	 * @param {boolean} [mOptions.closeOnNavigation=true] Added since version 1.72.0. Whether the MessageBox will be closed automatically when a routing navigation occurs.
	 * @param {sap.ui.core.Element} [mOptions.dependentOn] Added since version 1.124.0. Specifies an element to which the dialog will be added as a dependent.
	 * @public
	 * @static
	 */
	MessageBox.confirm = function (vMessage, mOptions) {
		_verifyBundle();

		var mDefaults = {
			icon: Icon.QUESTION,
			title: MessageBox._rb.getText("MSGBOX_TITLE_CONFIRM"),
			emphasizedAction: mOptions && mOptions.actions ? null : Action.OK,
			actions: [Action.OK, Action.CANCEL],
			id: ElementMetadata.uid("confirm"),
			initialFocus: null
		}, fnCallback, sTitle, sDialogId, sStyleClass;

		if (typeof mOptions === "function" || arguments.length > 2) {
			// Old API Compatibility
			// fnCallback, sTitle, sDialogId
			fnCallback = arguments[1];
			sTitle = arguments[2];
			sDialogId = arguments[3];
			sStyleClass = arguments[4];
			mOptions = {
				onClose: fnCallback,
				title: sTitle,
				id: sDialogId,
				styleClass: sStyleClass
			};
		}

		mOptions = jQuery.extend({}, mDefaults, mOptions);

		MessageBox.show(vMessage, mOptions);
	};

	/**
	 * Displays an error dialog with the given message, an ERROR icon, a CLOSE button..
	 * If a callback is given, it is called after the error box
	 * has been closed by the user with one of the buttons.
	 *
	 * <pre>
	 * sap.m.MessageBox.error("This message should appear in the error message box", {
	 *     title: "Error",                                      // default
	 *     onClose: null,                                       // default
	 *     styleClass: "",                                      // default
	 *     actions: sap.m.MessageBox.Action.CLOSE,              // default
	 *     emphasizedAction: null,                              // default
	 *     initialFocus: null,                                  // default
	 *     textDirection: sap.ui.core.TextDirection.Inherit,    // default
	 *     dependentOn: null                                    // default
	 * });
	 * </pre>
	 *
	 * The callback is called with the following signature
	 *
	 * <pre>
	 *   function (oAction)
	 * </pre>
	 *
	 * The error dialog opened by this method is processed asynchronously.
	 * Applications have to use <code>fnCallback</code> to continue work after the
	 * user closed the error dialog.
	 *
	 * @param {string} vMessage Message to be displayed in the alert dialog. The usage of sap.core.Control as vMessage is deprecated since version 1.30.4.
	 * @param {object} [mOptions] Other options (optional)
	 * @param {function} [mOptions.onClose] Callback when the user closes the dialog
	 * @param {string} [mOptions.title='Error'] Title of the error dialog
	 * @param {sap.m.MessageBox.Action|sap.m.MessageBox.Action[]|string|string[]} [mOptions.actions=sap.m.MessageBox.Action.OK] Either a single action, or an array of actions.
	 *      If no action(s) are given, the single action MessageBox.Action.OK is taken as a default for the parameter.
	 *      Custom action(s) string or an array can be provided, and then the translation
	 *      of custom actions needs to be done by the application.
	 * @param {sap.m.MessageBox.Action|string} [mOptions.emphasizedAction=sap.m.MessageBox.Action.OK] Added since version 1.75.0. Specifies which action of the created dialog will be emphasized. EmphasizedAction will apply only if the property <code>actions</code> is provided.
	 * @param {string} [mOptions.id] ID for the error dialog. Intended for test scenarios, not recommended for productive apps
	 * @param {string} [mOptions.styleClass] CSS style class which is added to the error dialog's root DOM node. The compact design can be activated by setting this to "sapUiSizeCompact"
	 * @param {string|sap.m.MessageBox.Action} [mOptions.initialFocus] This option sets the action name, the text of the button or the control that gets the focus as first focusable element after the MessageBox is opened.
	 * The usage of sap.ui.core.Control to set initialFocus is deprecated since version 1.30.4.
	 * @param {sap.ui.core.TextDirection} [mOptions.textDirection] Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
	 * @param {boolean} [mOptions.verticalScrolling] verticalScrolling is deprecated since version 1.30.4. VerticalScrolling, this option indicates if the user can scroll vertically inside the MessageBox when the content is larger than the content area.
	 * @param {boolean} [mOptions.horizontalScrolling] horizontalScrolling is deprecated since version 1.30.4. HorizontalScrolling, this option indicates if the user can scroll horizontally inside the MessageBox when the content is larger than the content area.
	 * @param {string|object|function():Promise<string|object>} [mOptions.details]
	 *      Added since version 1.28.0. If set, a link to view details is added. When the user clicks the link, the text area containing 'details' information is displayed.
	 *      The initial visibility is not configurable and the details are hidden by default.<br>
	 *      The following details can be used:
	 *      <ul>
	 *        <li><code>string</code> - text in HTML format. For full list of supported HTML tags see {@link sap.m.FormattedText}</li>
	 *        <li><code>object</code> - JSON object that will be serialized using <code>JSON.stringify</code></li>
	 *        <li><code>function</code> - since version 1.103, a callback function that fetches the details asynchronously. It should return a promise that resolves with a <code>string</code> value or an <code>object</code>, or rejects - in this case a default error message will be displayed</li>
	 *      <ul>
	 * @param {sap.ui.core.CSSSize} [mOptions.contentWidth] The width of the MessageBox
	 * @param {boolean} [mOptions.closeOnNavigation=true] Added since version 1.72.0. Whether the MessageBox will be closed automatically when a routing navigation occurs.
	 * @param {sap.ui.core.Element} [mOptions.dependentOn] Added since version 1.124.0. Specifies an element to which the dialog will be added as a dependent.
	 * @public
	 * @since 1.30
	 * @static
	 */
	MessageBox.error = function (vMessage, mOptions) {
		_verifyBundle();

		var mDefaults = {
			icon: Icon.ERROR,
			title: MessageBox._rb.getText("MSGBOX_TITLE_ERROR"),
			emphasizedAction: null, // null: no emphasized action by default
			actions: Action.CLOSE,
			id: ElementMetadata.uid("error"),
			initialFocus: null
		};

		mOptions = jQuery.extend({}, mDefaults, mOptions);

		MessageBox.show(vMessage, mOptions);
	};

	/**
	 * Displays an information dialog with the given message, an INFO icon, an OK button.
	 * If a callback is given, it is called after the info box
	 * has been closed by the user with one of the buttons.
	 *
	 * <pre>
	 * sap.m.MessageBox.information("This message should appear in the information message box", {
	 *     title: "Information",                                // default
	 *     onClose: null,                                       // default
	 *     styleClass: "",                                      // default
	 *     actions: sap.m.MessageBox.Action.OK,                 // default
	 *     emphasizedAction: sap.m.MessageBox.Action.OK,        // default
	 *     initialFocus: null,                                  // default
	 *     textDirection: sap.ui.core.TextDirection.Inherit,    // default
	 *     dependentOn: null                                    // default
	 * });
	 * </pre>
	 *
	 * The callback is called with the following signature
	 * <pre>
	 *   function (oAction)
	 * </pre>
	 *
	 * The information dialog opened by this method is processed asynchronously.
	 * Applications have to use <code>fnCallback</code> to continue work after the
	 * user closed the information dialog
	 *
	 * @param {string} vMessage Message to be displayed in the alert dialog. The usage of sap.core.Control as vMessage is deprecated since version 1.30.4.
	 * @param {object} [mOptions] Other options (optional)
	 * @param {function} [mOptions.onClose] Callback when the user closes the dialog
	 * @param {string} [mOptions.title='Information'] Title of the information dialog
	 * @param {sap.m.MessageBox.Action|sap.m.MessageBox.Action[]|string|string[]} [mOptions.actions=sap.m.MessageBox.Action.OK] Either a single action, or an array of actions.
	 *      If no action(s) are given, the single action MessageBox.Action.OK is taken as a default for the parameter.
	 *      Custom action(s) string or an array can be provided, and then the translation
	 *      of custom actions needs to be done by the application.
	 * @param {sap.m.MessageBox.Action|string} [mOptions.emphasizedAction=sap.m.MessageBox.Action.OK] Added since version 1.75.0. Specifies which action of the created dialog will be emphasized. EmphasizedAction will apply only if the property <code>actions</code> is provided.
	 * @param {string} [mOptions.id] ID for the information dialog. Intended for test scenarios, not recommended for productive apps
	 * @param {string} [mOptions.styleClass] CSS style class which is added to the information dialog's root DOM node. The compact design can be activated by setting this to "sapUiSizeCompact"
	 * @param {string|sap.m.MessageBox.Action} [mOptions.initialFocus] This option sets the action name, the text of the button or the control that gets the focus as first focusable element after the MessageBox is opened.
	 * The usage of sap.ui.core.Control to set initialFocus is deprecated since version 1.30.4.
	 * @param {sap.ui.core.TextDirection} [mOptions.textDirection] Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
	 * @param {boolean} [mOptions.verticalScrolling] verticalScrolling is deprecated since version 1.30.4. VerticalScrolling, this option indicates if the user can scroll vertically inside the MessageBox when the content is larger than the content area.
	 * @param {boolean} [mOptions.horizontalScrolling] horizontalScrolling is deprecated since version 1.30.4. HorizontalScrolling, this option indicates if the user can scroll horizontally inside the MessageBox when the content is larger than the content area.
	 * @param {string|object|function():Promise<string|object>} [mOptions.details]
	 *      Added since version 1.28.0. If set, a link to view details is added. When the user clicks the link, the text area containing 'details' information is displayed.
	 *      The initial visibility is not configurable and the details are hidden by default.<br>
	 *      The following details can be used:
	 *      <ul>
	 *        <li><code>string</code> - text in HTML format. For full list of supported HTML tags see {@link sap.m.FormattedText}</li>
	 *        <li><code>object</code> - JSON object that will be serialized using <code>JSON.stringify</code></li>
	 *        <li><code>function</code> - since version 1.103, a callback function that fetches the details asynchronously. It should return a promise that resolves with a <code>string</code> value or an <code>object</code>, or rejects - in this case a default error message will be displayed</li>
	 *      <ul>
	 * @param {sap.ui.core.CSSSize} [mOptions.contentWidth] The width of the MessageBox
	 * @param {boolean} [mOptions.closeOnNavigation=true] Added since version 1.72.0. Whether the MessageBox will be closed automatically when a routing navigation occurs.
	 * @param {sap.ui.core.Element} [mOptions.dependentOn] Added since version 1.124.0. Specifies an element to which the dialog will be added as a dependent.
	 * @public
	 * @since 1.30
	 * @static
	 */
	MessageBox.information = function (vMessage, mOptions) {
		_verifyBundle();

		var mDefaults = {
			icon: Icon.INFORMATION,
			title: MessageBox._rb.getText("MSGBOX_TITLE_INFO"),
			emphasizedAction: mOptions && mOptions.actions ? null : Action.OK,
			actions: Action.OK,
			id: ElementMetadata.uid("info"),
			initialFocus: null
		};

		mOptions = jQuery.extend({}, mDefaults, mOptions);

		MessageBox.show(vMessage, mOptions);
	};

	/**
	 * Displays a warning dialog with the given message, a WARNING icon, an OK button.
	 * If a callback is given, it is called after the warning box
	 * has been closed by the user with one of the buttons.
	 *
	 * <pre>
	 * sap.m.MessageBox.warning("This message should appear in the warning message box", {
	 *     title: "Warning",                                    // default
	 *     onClose: null,                                       // default
	 *     styleClass: "",                                      // default
	 *     actions: sap.m.MessageBox.Action.OK,                 // default
	 *     emphasizedAction: sap.m.MessageBox.Action.OK,        // default
	 *     initialFocus: null,                                  // default
	 *     textDirection: sap.ui.core.TextDirection.Inherit,    // default
	 *     dependentOn: null                                    // default
	 * });
	 * </pre>
	 *
	 * The callback is called with the following signature
	 * <pre>
	 *   function (oAction)
	 * </pre>
	 *
	 * The warning dialog opened by this method is processed asynchronously.
	 * Applications have to use <code>fnCallback</code> to continue work after the
	 * user closed the warning dialog
	 *
	 * @param {string} vMessage Message to be displayed in the alert dialog. The usage of sap.core.Control as vMessage is deprecated since version 1.30.4.
	 * @param {object} [mOptions] Other options (optional)
	 * @param {function} [mOptions.onClose] Callback when the user closes the dialog
	 * @param {string} [mOptions.title='Warning'] Title of the warning dialog
	 * @param {sap.m.MessageBox.Action|sap.m.MessageBox.Action[]|string|string[]} [mOptions.actions=sap.m.MessageBox.Action.OK] Either a single action, or an array of actions.
	 *      If no action(s) are given, the single action MessageBox.Action.OK is taken as a default for the parameter.
	 *      Custom action(s) string or an array can be provided, and then the translation
	 *      of custom actions needs to be done by the application.
	 * @param {sap.m.MessageBox.Action|string} [mOptions.emphasizedAction=sap.m.MessageBox.Action.OK] Added since version 1.75.0. Specifies which action of the created dialog will be emphasized. EmphasizedAction will apply only if the property <code>actions</code> is provided.
	 * @param {string} [mOptions.id] ID to for the warning dialog. Intended for test scenarios, not recommended for productive apps
	 * @param {string} [mOptions.styleClass] CSS style class which is added to the warning dialog's root DOM node. The compact design can be activated by setting this to "sapUiSizeCompact"
	 * @param {string|sap.m.MessageBox.Action} [mOptions.initialFocus] This option sets the action name, the text of the button or the control that gets the focus as first focusable element after the MessageBox is opened.
	 * The usage of sap.ui.core.Control to set initialFocus is deprecated since version 1.30.4.
	 * @param {sap.ui.core.TextDirection} [mOptions.textDirection] Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
	 * @param {boolean} [mOptions.verticalScrolling] verticalScrolling is deprecated since version 1.30.4. VerticalScrolling, this option indicates if the user can scroll vertically inside the MessageBox when the content is larger than the content area.
	 * @param {boolean} [mOptions.horizontalScrolling] horizontalScrolling is deprecated since version 1.30.4. HorizontalScrolling, this option indicates if the user can scroll horizontally inside the MessageBox when the content is larger than the content area.
	 * @param {string|object|function():Promise<string|object>} [mOptions.details]
	 *      Added since version 1.28.0. If set, a link to view details is added. When the user clicks the link, the text area containing 'details' information is displayed.
	 *      The initial visibility is not configurable and the details are hidden by default.<br>
	 *      The following details can be used:
	 *      <ul>
	 *        <li><code>string</code> - text in HTML format. For full list of supported HTML tags see {@link sap.m.FormattedText}</li>
	 *        <li><code>object</code> - JSON object that will be serialized using <code>JSON.stringify</code></li>
	 *        <li><code>function</code> - since version 1.103, a callback function that fetches the details asynchronously. It should return a promise that resolves with a <code>string</code> value or an <code>object</code>, or rejects - in this case a default error message will be displayed</li>
	 *      <ul>
	 * @param {sap.ui.core.CSSSize} [mOptions.contentWidth] The width of the MessageBox
	 * @param {boolean} [mOptions.closeOnNavigation=true] Added since version 1.72.0. Whether the MessageBox will be closed automatically when a routing navigation occurs.
	 * @param {sap.ui.core.Element} [mOptions.dependentOn] Added since version 1.124.0. Specifies an element to which the dialog will be added as a dependent.
	 * @public
	 * @since 1.30
	 * @static
	 */
	MessageBox.warning = function (vMessage, mOptions) {
		_verifyBundle();

		var mDefaults = {
			icon: Icon.WARNING ,
			title: MessageBox._rb.getText("MSGBOX_TITLE_WARNING"),
			emphasizedAction: mOptions && mOptions.actions ? null : Action.OK,
			actions: Action.OK,
			id: ElementMetadata.uid("warning"),
			initialFocus: null
		};

		mOptions = jQuery.extend({}, mDefaults, mOptions);

		MessageBox.show(vMessage, mOptions);
	};

	/**
	 * Displays a success dialog with the given message, a SUCCESS icon, an OK button.
	 * If a callback is given, it is called after the success box
	 * has been closed by the user with one of the buttons.
	 *
	 * <pre>
	 * sap.m.MessageBox.success("This message should appear in the success message box", {
	 *     title: "Success",                                    // default
	 *     onClose: null,                                       // default
	 *     styleClass: "",                                      // default
	 *     actions: sap.m.MessageBox.Action.OK,                 // default
	 *     emphasizedAction: sap.m.MessageBox.Action.OK,        // default
	 *     initialFocus: null,                                  // default
	 *     textDirection: sap.ui.core.TextDirection.Inherit,    // default
	 *     dependentOn: null                                    // default
	 * });
	 * </pre>
	 *
	 * The callback is called with the following signature
	 * <pre>
	 *   function(oAction)
	 * </pre>
	 *
	 * The success dialog opened by this method is processed asynchronously.
	 * Applications have to use <code>fnCallback</code> to continue work after the
	 * user closed the success dialog
	 *
	 * @param {string} vMessage Message to be displayed in the alert dialog. The usage of sap.core.Control as vMessage is deprecated since version 1.30.4.
	 * @param {object} [mOptions] Other options (optional)
	 * @param {function} [mOptions.onClose] Callback when the user closes the dialog
	 * @param {string} [mOptions.title='Success'] Title of the success dialog
	 * @param {sap.m.MessageBox.Action|sap.m.MessageBox.Action[]|string|string[]} [mOptions.actions=sap.m.MessageBox.Action.OK] Either a single action, or an array of actions.
	 *      If no action(s) are given, the single action MessageBox.Action.OK is taken as a default for the parameter.
	 *      Custom action(s) string or an array can be provided, and then the translation
	 *      of custom actions needs to be done by the application.
	 * @param {sap.m.MessageBox.Action|string} [mOptions.emphasizedAction=sap.m.MessageBox.Action.OK] Added since version 1.75.0. Specifies which action of the created dialog will be emphasized. EmphasizedAction will apply only if the property <code>actions</code> is provided.
	 * @param {string} [mOptions.id] ID for the success dialog. Intended for test scenarios, not recommended for productive apps
	 * @param {string} [mOptions.styleClass] CSS style class which is added to the success dialog's root DOM node. The compact design can be activated by setting this to "sapUiSizeCompact"
	 * @param {string|sap.m.MessageBox.Action} [mOptions.initialFocus] This option sets the action name, the text of the button or the control that gets the focus as first focusable element after the MessageBox is opened.
	 * The usage of sap.ui.core.Control to set initialFocus is deprecated since version 1.30.4.
	 * @param {sap.ui.core.TextDirection} [mOptions.textDirection] Specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the DOM.
	 * @param {boolean} [mOptions.verticalScrolling] verticalScrolling is deprecated since version 1.30.4. VerticalScrolling, this option indicates if the user can scroll vertically inside the MessageBox when the content is larger than the content area.
	 * @param {boolean} [mOptions.horizontalScrolling] horizontalScrolling is deprecated since version 1.30.4. HorizontalScrolling, this option indicates if the user can scroll horizontally inside the MessageBox when the content is larger than the content area.
	 * @param {string|object|function():Promise<string|object>} [mOptions.details]
	 *      Added since version 1.28.0. If set, a link to view details is added. When the user clicks the link, the text area containing 'details' information is displayed.
	 *      The initial visibility is not configurable and the details are hidden by default.<br>
	 *      The following details can be used:
	 *      <ul>
	 *        <li><code>string</code> - text in HTML format. For full list of supported HTML tags see {@link sap.m.FormattedText}</li>
	 *        <li><code>object</code> - JSON object that will be serialized using <code>JSON.stringify</code></li>
	 *        <li><code>function</code> - since version 1.103, a callback function that fetches the details asynchronously. It should return a promise that resolves with a <code>string</code> value or an <code>object</code>, or rejects - in this case a default error message will be displayed</li>
	 *      <ul>
	 * @param {sap.ui.core.CSSSize} [mOptions.contentWidth] The width of the MessageBox
	 * @param {boolean} [mOptions.closeOnNavigation=true] Added since version 1.72.0. Whether the MessageBox will be closed automatically when a routing navigation occurs.
	 * @param {sap.ui.core.Element} [mOptions.dependentOn] Added since version 1.124.0. Specifies an element to which the dialog will be added as a dependent.
	 * @public
	 * @since 1.30
	 * @static
	 */
	MessageBox.success = function (vMessage, mOptions) {
		_verifyBundle();

		var mDefaults = {
			icon: Icon.SUCCESS ,
			title: MessageBox._rb.getText("MSGBOX_TITLE_SUCCESS"),
			emphasizedAction: mOptions && mOptions.actions ? null : Action.OK,
			actions: Action.OK,
			id: ElementMetadata.uid("success"),
			initialFocus: null
		};

		mOptions = jQuery.extend({}, mDefaults, mOptions);

		MessageBox.show(vMessage, mOptions);
	};

	return MessageBox;
}, /* bExport= */ true);
