/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/base/Log",
	"sap/base/i18n/LanguageFallback",
	"sap/base/i18n/Localization",
	"sap/ui/Device",
	"sap/ui/core/Element",
	"sap/ui/core/LabelEnablement",
	"sap/ui/core/Lib",
	"sap/ui/util/XMLHelper"
], function(Log, LanguageFallback, Localization, Device, Element, LabelEnablement, Library, XMLHelper) {
	"use strict";

	// Endpoints for sending messages
	const POST_MESSAGE_ENDPOINT_UPDATE = "sap.ui.interaction.UpdateDisplay";

	// Version number for the protocol
	const VERSION_NUMBER = "1.0.0";

	const oProtocol = {
		_version: VERSION_NUMBER,
		elements: [],
		docs: {}
	};

	// Cache to store loaded XML documents
	const oInteractionXMLCache = new Map();

	const getNormalizedShortcutString = (input) => {
		const allParts = input.split('+').map((p) => p.trim());

		const modifiers = {
			ctrl: false,
			alt: false,
			shift: false
		};

		let key = null;

		for (const part of allParts) {
			const lower = part.toLowerCase();
			if (lower === 'ctrl') {
				modifiers.ctrl = true;
			} else if (lower === 'alt') {
				modifiers.alt = true;
			} else if (lower === 'shift') {
				modifiers.shift = true;
			} else if (!key) {
				if (part.length === 1) {
					key = part.toUpperCase(); // Single character keys are transformed to uppercase
				} else {
					key = part;
				}
			}
		}

		const result = [];
		if (modifiers.ctrl) {
			result.push(Device.os.macintosh ? 'Cmd' : 'Ctrl');
		}
		if (modifiers.alt) {
			result.push('Alt');
		}
		if (modifiers.shift) {
			result.push('Shift');
		}
		if (key) {
			result.push(key);
		}

		return result.join('+');
	};

	/**
	* Translates a keyboard shortcut string by localizing each key segment.
	* The shortcut string is expected to use '+' as a delimiter (e.g., "Ctrl+Shift+S").
	* If a translation is not found, the original key is used.
	*
	* @param {string} shortcut The shortcut string
	* @return {string} The translated shortcut string
	*/
	const translateShortcut = (shortcut) => {
		const oResourceBundle = Library.getResourceBundleFor("sap.ui.core");
		return shortcut
			.split("+")
			.map((key) => {
				const sPropertiesKey = `Keyboard.Shortcut.${key.trim()}`;
				const sText = oResourceBundle.getText(sPropertiesKey);
				return sText === sPropertiesKey ? key.trim() : sText;
			}).join("+");
	};

	/**
	* Translates and annotates all <kbd> elements within given <description> node.
	* Sets the `data-sap-ui-kbd-raw` attribute on the <kbd> element.
	*
	* @param {Element} descriptionNode The DOM node containing the <kbd> elements
	* @return {Element} The same `descriptionNode`, modified with translated and annotated <kbd> elements.
	*/
	const annotateAndTranslateKbdTags = (descriptionNode) => {
		const kbds = descriptionNode.querySelectorAll("kbd");

		kbds.forEach((kbd) => {
			const sNormalized = getNormalizedShortcutString(kbd.textContent.trim());
			const sTranslated = translateShortcut(sNormalized);

			kbd.setAttribute("data-sap-ui-kbd-raw", sNormalized);
			kbd.textContent = sTranslated;
		});

		return descriptionNode;
	};

	/**
	 * Retrieves the command information for a given control.
	 * @param  {sap.ui.core.Control} oControl The control to analyze.
	 * @return {Array} List of command information objects.
	 */
	const getCommandInfosFor = (oControl) => {
		const aCommandInfos = [];
		const aDependents = oControl.getDependents?.() || [];

		for (const oDependent of aDependents) {
			if (oDependent.isA("sap.ui.core.CommandExecution") && oDependent.getVisible()) {
				const oCommandInfo = oDependent._getCommandInfo();
				const sKbd = getNormalizedShortcutString(oCommandInfo.shortcut);

				aCommandInfos.push({
					name: oDependent.getCommand(),
					kbd: [{
						raw: sKbd,
						translated: translateShortcut(sKbd)
					}],
					description: oCommandInfo.description
				});
			}
		}
		return aCommandInfos;
	};

	/**
	 * Attempts to retrieve a user-friendly label for a given control by examining associated field help,
	 * accessibility info, ARIA attributes, and a provided interaction XML document.
	 *
	 * The method follows this priority order:
	 * 1. Field help label via `getFieldHelpDisplay`.
	 * 2. Label metadata via `LabelEnablement._getLabelTexts`.
	 * 3. Control's accessibility info (`getAccessibilityInfo`).
	 * 4. Label from interaction XML (if matching control metadata is found).
	 * 5. ARIA `aria-labelledby` attribute from DOM or descendants.
	 * 6. Fallback to control metadata name if no label is found.
	 *
	 * @param  {sap.ui.core.Control} oControl The control to analayze.
	 * @param {XMLDocument} oInteractionXML The interaction document
	 * @return {string} The label associated with the control.
	 */
	const getLabelFor = (oControl, oInteractionXML) => {
		const sDisplayControlId = oControl.getFieldHelpDisplay();
		const oLabelControl = sDisplayControlId
			? Element.getElementById(sDisplayControlId)
			: oControl;

		// First, try to derive control label from field help, if available
		let sAccessibilityInfoLabel = LabelEnablement._getLabelTexts(oLabelControl)[0];

		// Then, try derive control label from accessibility info, if available
		if (!sAccessibilityInfoLabel) {
			const oAccessibilityInfo = oControl.getAccessibilityInfo?.();
			if (oAccessibilityInfo) {
				sAccessibilityInfoLabel = oAccessibilityInfo.description || oAccessibilityInfo.children?.[0]?.getAccessibilityInfo?.()?.description || null;
			}
		}

		const ARIA_LABELLED_BY_ATTR = "aria-labelledby";

		if (!sAccessibilityInfoLabel) {
			let sAriaLabelledById;
			let oCurrent = oControl;
			let bCheckedInteractionDoc = false;

			while (oCurrent && !sAriaLabelledById && !sAccessibilityInfoLabel) {
				const oDomRef = oControl.getDomRef();

				// Try to derive control label from DOM
				sAriaLabelledById = oDomRef?.getAttribute(ARIA_LABELLED_BY_ATTR);

				// Try interaction doc only once
				if (!sAriaLabelledById && !bCheckedInteractionDoc) {
					bCheckedInteractionDoc = true;

					const oInteractionDoc = oInteractionXML.documentElement;
					if (oInteractionDoc) {
						const aControlInteractionNodes = [...oInteractionDoc.querySelectorAll("control-interactions")];
						const oMatchingControl = aControlInteractionNodes.find((oNode) => {
							return Array.from(oNode.querySelectorAll(`control[name]`)).find((oNode) => {
								return oNode.getAttribute("name") === oControl.getMetadata().getName();
							});
						});

						sAccessibilityInfoLabel = oMatchingControl?.querySelector("control")?.querySelector("defaultLabel")?.textContent;
					}
				}

				// Try to find aria label from descendents
				if (!sAriaLabelledById && !sAccessibilityInfoLabel) {
					const oLabelledByElement = oDomRef.querySelector("[aria-labelledby]");
					sAriaLabelledById = oLabelledByElement?.getAttribute(ARIA_LABELLED_BY_ATTR);
				}

				oCurrent = oCurrent.getParent?.();
			}

			if (!sAccessibilityInfoLabel && sAriaLabelledById) {
				const oLabelElement = document.getElementById(sAriaLabelledById);
				sAccessibilityInfoLabel = oLabelElement?.textContent || null;
			}
		}

		return sAccessibilityInfoLabel || oControl.getMetadata().getName();
	};

	/**
	 * Load and access interaction-documentation for given control.
	 * @param {sap.ui.core.Control} oControl The control to load the interaction document for
	 * @param {string} sLibrary The library name if already available
	 * @return {Promise<null|XMLDocument>} The interaction document or 'null'.
	 */
	const loadInteractionXMLFor = async (oControl, sLibrary) => {
		let oCurrent = oControl;

		// Traverse up the control hierarchy to find the library name
		while (oCurrent && !sLibrary) {
			sLibrary = oCurrent.getMetadata().getLibraryName();
			oCurrent = oCurrent.getParent();
		}

		if (!sLibrary) {
			return null;
		}

		const oLibrary = Library._get(sLibrary);
		if (!oLibrary?.interactionDocumentation) {
			return null;
		}

		if (oInteractionXMLCache.has(sLibrary)) {
			return oInteractionXMLCache.get(sLibrary);
		}

		const sLanguage = Localization.getLanguage();
		const aFallbackChain = LanguageFallback.getFallbackLocales(sLanguage);
		let oInteractionXML = null;

		while (aFallbackChain.length) {
			const sLocale = aFallbackChain.shift();
			const sFileName = sLocale ? `interaction_${sLocale}.xml` : `interaction.xml`;
			const sResource = sap.ui.require.toUrl(`${sLibrary.replace(/\./g, "/")}/i18n/${sFileName}`);

			try {
				const oResponse = await fetch(sResource);
				if (!oResponse.ok) {
					const statusMessage = oResponse.statusText || `HTTP status ${oResponse.status}`;
					throw new Error(`Failed to load resource: ${sResource} - ${statusMessage}`);
				}
				const text = await oResponse.text();
				oInteractionXML = XMLHelper.parse(text);

				if (oInteractionXML) {
					// cache the loaded interaction document
					oInteractionXMLCache.set(sLibrary, oInteractionXML);
					break;
				}
			} catch (error) {
				Log.error(`Error loading interaction XML for library ${sLibrary}:`, error);
			}
		}

		return oInteractionXML;
	};

	/**
	 * Extracts interaction nodes from the given interaction document and retrieves "kbd" and "description" tags.
	 *
	 * @param  {string} sControlName The control name.
	 * @param  {XMLDocument} oInteractionXML The interaction document containing the interaction details.
	 * @return {Array} An array containing the control's interaction details, including "kbd" and "description".
	 */
	const getInteractions = (sControlName, oInteractionXML) => {
		const oInteractionDoc = oInteractionXML.documentElement;
		if (!oInteractionDoc) {
			return [];
		}

		const aControlInteractionNodes = [...oInteractionDoc.querySelectorAll("control-interactions")];
		const oMatchingControl = aControlInteractionNodes.find((oNode) => {
			return Array.from(oNode.querySelectorAll(`control[name]`)).find((oNode) => {
				return oNode.getAttribute("name") === sControlName;
			});
		});

		if (!oMatchingControl) {
			return [];
		}

		return [...oMatchingControl.querySelectorAll("interaction")].map((oInteractionNode) => {
			const kbdElements = Array.from(oInteractionNode.children).filter((child) => child.tagName === "kbd");
			const kbd = kbdElements.map((kbd) => {
				const raw = getNormalizedShortcutString(kbd.textContent);
				return {
					raw,
					translated: translateShortcut(raw)
				};
			});

			return {
				kbd,
				description: annotateAndTranslateKbdTags(oInteractionNode.querySelector("description"))?.innerHTML || ""
			};
		});
	};


	let oCurrentPort;
	let bThrottled = false;

	/**
	 * Initializes the keyboard interaction information gathering.
	 * @param  {Event} event The 'focusin' or 'focusout' event triggering the initialization.
	 */
	const init = async (event) => {
		if (bThrottled) {
			return;
		}
		bThrottled = true;

		setTimeout(() => {
			bThrottled = false;
		}, 300);

		const aControlTree = [];
		const docs = {};
		const oLabelMap = new Map();

		let oTargetElement;
		if (event) {
			oTargetElement = event.type === "focusin" ? event.target : event.relatedTarget;
		}
		oTargetElement ??= document.activeElement;

		const oTargetControl = Element.closestTo(oTargetElement);

		// get generic key interactions from sap.ui.core
		const oCoreXML = await loadInteractionXMLFor(null, "sap.ui.core");
		if (oCoreXML) {
			const oResourceBundle = Library.getResourceBundleFor("sap.ui.core");
			const sLabel = oResourceBundle.getText("Generic.Keyboard.Interaction.Text");
			docs["sap.ui.core.Control"] = {
				"interactions": getInteractions("sap.ui.core.Control", oCoreXML)
			};
			oLabelMap.set(sLabel, {
				"index": -1,
				"class": "sap.ui.core.Control",
				"label": sLabel,
				"interactions": [{
					"$ref": `docs/sap.ui.core.Control/interactions`
				}]
			});
		}

		let oCurrent = oTargetControl;
		while (oCurrent) {
			aControlTree.push(oCurrent);
			oCurrent = oCurrent.getParent();
		}

		for (let i = 0; i < aControlTree.length; i++) {
			const oControl = aControlTree[i];
			const sControlName = oControl.getMetadata().getName();

			// get command infos
			const aInteractions = getCommandInfosFor(oControl);

			// get interactions from interaction documentation
			const oInteractionXML = await loadInteractionXMLFor(oControl);
			const aDocs = oInteractionXML ? getInteractions(sControlName, oInteractionXML) : [];

			if (!aInteractions.length && !aDocs.length) {
				// no commands and no interaction documentation
				continue;
			}

			const sClassName = oControl.getMetadata().getName();
			if (aDocs.length > 0) {
				docs[sClassName] = {
					"interactions": aDocs
				};
				aInteractions.push({
					"$ref": `docs/${sClassName}/interactions`
				});
			}

			const sLabel = getLabelFor(oControl, oInteractionXML);
			if (!oLabelMap.has(sLabel)) {
				oLabelMap.set(sLabel, { interactions: [], label: sLabel });
			}

			const oMapEntry = oLabelMap.get(sLabel);
			oMapEntry.index = i;
			oMapEntry.id = oControl.getId();
			oMapEntry.class = sClassName;
			oMapEntry.interactions.unshift(...aInteractions.reverse());
		}

		// Update protocol with gathered elements and documentation
		oProtocol.elements = Array.from(oLabelMap.values())
			.sort((a, b) => {
				return a.index - b.index;
			})
			.map((oEntry) => {
				delete oEntry.index;
				return oEntry;
			});

		oProtocol.docs = docs;

		// Send protocol
		oCurrentPort?.postMessage(JSON.parse(JSON.stringify({
			service: POST_MESSAGE_ENDPOINT_UPDATE,
			type: "request",
			payload: { ...oProtocol }
		})));
	};

	/**
	 * Module that handles the gathering and sending of keyboard interaction information.
	 * When active, it starts listening for focusin and focusout event to collect the keyboard interaction data.
	 * The gathered data is then sent via a MessagePort to a connected entity.
	 *
	 * @private
	 */
	return {
		// Indicator if the interaction information gathering is active
		_isActive: false,

		/**
		 * Activates the keyboard interaction information gathering.
		 * This methods starts listening for focusin and focusout events to gather the keyboard interaction information.
		 *
		 * @param  {MessagePort} oPort The MessagePort used to send the keyboard interaction information.
		 * @private
		 */
		async activate(oPort) {
			oCurrentPort = oPort;

			if (this._isActive) { return; }

			this._isActive = true;
			await init();
			// need to register for both focusin and focusout event
			// Browser fires:
			//  * only focusin when focus is moved from <body> to a focusable element
			//  * only focusout when focus is moved from a focused element to <body>
			//  * first focusout then focusin when moved from a focused element to another focusable element
			document.addEventListener("focusin", init);
			document.addEventListener("focusout", init);
		},

		/**
		 * Deactivates the keyboard interaction information gathering
		 * This methods stops listening focusin and focusout events, effectively stopping the collection
		 * of the keyboard interaction information.
		 *
		 * @private
		 */
		deactivate() {
			if (!this._isActive) {
				return;
			}
			this._isActive = false;
			document.removeEventListener("focusin", init);
			document.removeEventListener("focusout", init);
		},

		/**
		 * Expose for testing.
		 * @private
		 */
		_: {
			getNormalizedShortcutString,
			translateShortcut,
			annotateAndTranslateKbdTags,
			getInteractions,
			getCommandInfosFor
		}
	};
});
