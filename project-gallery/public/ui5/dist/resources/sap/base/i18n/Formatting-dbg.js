/*!
* OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
*/
sap.ui.define([
	"sap/base/assert",
	"sap/base/config",
	"sap/base/Eventing",
	"sap/base/Log",
	"sap/base/i18n/Localization",
	"sap/base/i18n/LanguageTag",
	"sap/base/i18n/date/CalendarType",
	"sap/base/i18n/date/CalendarWeekNumbering",
	"sap/base/util/deepEqual",
	"sap/base/util/extend",
	"sap/base/util/isEmptyObject"
], (
	assert,
	BaseConfig,
	Eventing,
	Log,
	Localization,
	LanguageTag,
	CalendarType,
	CalendarWeekNumbering,
	deepEqual,
	extend,
	isEmptyObject
) => {
	"use strict";

	const oEventing = new Eventing();
	const oWritableConfig = BaseConfig.getWritableInstance();
	const mSettings = {};
	let mChanges;
	let aCustomIslamicCalendarData;
	let bInitialized = false;

	const M_ABAP_DATE_FORMAT_PATTERN = {
		"" : {pattern: null},
		"1": {pattern: "dd.MM.yyyy"},
		"2": {pattern: "MM/dd/yyyy"},
		"3": {pattern: "MM-dd-yyyy"},
		"4": {pattern: "yyyy.MM.dd"},
		"5": {pattern: "yyyy/MM/dd"},
		"6": {pattern: "yyyy-MM-dd"},
		"7": {pattern: "Gyy.MM.dd"},
		"8": {pattern: "Gyy/MM/dd"},
		"9": {pattern: "Gyy-MM-dd"},
		"A": {pattern: "yyyy/MM/dd"},
		"B": {pattern: "yyyy/MM/dd"},
		"C": {pattern: "yyyy/MM/dd"}
	};

	const M_ABAP_TIME_FORMAT_PATTERN = {
		"" : {"short": null,      medium:  null,        dayPeriods: null},
		"0": {"short": "HH:mm",   medium: "HH:mm:ss",   dayPeriods: null},
		"1": {"short": "hh:mm a", medium: "hh:mm:ss a", dayPeriods: ["AM", "PM"]},
		"2": {"short": "hh:mm a", medium: "hh:mm:ss a", dayPeriods: ["am", "pm"]},
		"3": {"short": "KK:mm a", medium: "KK:mm:ss a", dayPeriods: ["AM", "PM"]},
		"4": {"short": "KK:mm a", medium: "KK:mm:ss a", dayPeriods: ["am", "pm"]}
	};

	const M_ABAP_NUMBER_FORMAT_SYMBOLS = {
		"" : {groupingSeparator: null, decimalSeparator: null},
		" ": {groupingSeparator: ".", decimalSeparator: ","},
		"X": {groupingSeparator: ",", decimalSeparator: "."},
		"Y": {groupingSeparator: " ", decimalSeparator: ","}
	};

	function check(bCondition, sMessage) {
		if ( !bCondition ) {
			throw new TypeError(sMessage);
		}
	}

	function _set(sKey, oValue) {
		// Invalidating the BaseConfig is necessary, because Formatting.getLanguageTag
		// does defaulting depending on the mSettings. In case no specifc LaguageTag was
		// set the default would become applied and cached. If the mSettings are changed
		// inbetween the cache would not become invalidated because there is no direct
		// change to the Configuration and therefore the cached value would be wrong.
		BaseConfig._.invalidate();
		const oOldValue = mSettings[sKey];
		if (oValue != null) {
			mSettings[sKey] = oValue;
		} else {
			delete mSettings[sKey];
		}
		// report a change only if old and new value differ (null/undefined are treated as the same value)
		if ((oOldValue != null || oValue != null) && !deepEqual(oOldValue, oValue)) {
			const bFireEvent = !mChanges;
			mChanges ??= {};
			mChanges[sKey] = oValue;
			if (bFireEvent) {
				fireChange();
			}
		}
	}

	/**
	 * Helper that creates a LanguageTag object from the given language
	 * or, throws an error for non BCP-47 compliant languages.
	 *
	 * @param {string|module:sap/base/i18n/LanguageTag} vLanguageTag A BCP-47 compliant language tag
	 * @returns {module:sap/base/i18n/LanguageTag} The resulting LanguageTag
	 * @private
	 * @since 1.116.0
	 */
	function createLanguageTag(vLanguageTag) {
		let oLanguageTag;
		if (vLanguageTag && typeof vLanguageTag === 'string') {
			try {
				oLanguageTag = new LanguageTag(vLanguageTag);
			} catch (e) {
				// ignore
			}
		} else if (vLanguageTag instanceof LanguageTag) {
			oLanguageTag = vLanguageTag;
		}
		return oLanguageTag;
	}

	/**
	 * Configuration for formatting specific parameters
	 * @public
	 * @alias module:sap/base/i18n/Formatting
	 * @namespace
	 * @since 1.120
	 */
	const Formatting = {
		/**
		 * The <code>change</code> event is fired, when the configuration options are changed.
		 * For the event parameters please refer to {@link module:sap/base/i18n/Formatting$ChangeEvent
		 * Formatting$ChangeEvent}.
		 *
		 * @name module:sap/base/i18n/Formatting.change
		 * @event
		 * @param {module:sap/base/i18n/Formatting$ChangeEvent} oEvent
		 * @public
		 * @since 1.120
		 */

		/**
		 * The formatting change event. Contains only the parameters which were changed.
		 *
		 * The list below shows the possible combinations of parameters available as part of the change event.
		 *
		 * <ul>
		 * <li>{@link module:sap/base/i18n/Formatting.setLanguageTag Formatting.setLanguageTag}:
		 * <ul>
		 * <li><code>languageTag</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setCustomIslamicCalendarData Formatting.setCustomIslamicCalendarData}:
		 * <ul>
		 * <li><code>customIslamicCalendarData</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setCalendarWeekNumbering Formatting.setCalendarWeekNumbering}:
		 * <ul>
		 * <li><code>calendarWeekNumbering</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setCalendarType Formatting.setCalendarType}:
		 * <ul>
		 * <li><code>calendarType</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.addCustomCurrencies Formatting.addCustomCurrencies} / {@link module:sap/base/i18n/Formatting.setCustomCurrencies Formatting.setCustomCurrencies}:
		 * <ul>
		 * <li><code>currency</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setABAPDateFormat Formatting.setABAPDateFormat} (all parameters listed below):
		 * <ul>
		 * <li><code>ABAPDateFormat</code></li>
		 * <li><code>"dateFormats-short"</code></li>
		 * <li><code>"dateFormats-medium"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setABAPTimeFormat Formatting.setABAPTimeFormat} (all parameters listed below):
		 * <ul>
		 * <li><code>ABAPTimeFormat</code></li>
		 * <li><code>"timeFormats-short"</code></li>
		 * <li><code>"timeFormats-medium"</code></li>
		 * <li><code>"dayPeriods-format-abbreviated"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setABAPNumberFormat Formatting.setABAPNumberFormat} (all parameters listed below):
		 * <ul>
		 * <li><code>ABAPNumberFormat</code></li>
		 * <li><code>"symbols-latn-group"</code></li>
		 * <li><code>"symbols-latn-decimal"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setDatePattern Formatting.setDatePattern} (one of the parameters listed below):
		 * <ul>
		 * <li><code>"dateFormats-short"</code></li>
		 * <li><code>"dateFormats-medium"</code></li>
		 * <li><code>"dateFormats-long"</code></li>
		 * <li><code>"dateFormats-full"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setTimePattern Formatting.setTimePattern} (one of the parameters listed below):
		 * <ul>
		 * <li><code>"timeFormats-short"</code></li>
		 * <li><code>"timeFormats-medium"</code></li>
		 * <li><code>"timeFormats-long"</code></li>
		 * <li><code>"timeFormats-full"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setNumberSymbol Formatting.setNumberSymbol} (one of the parameters listed below):
		 * <ul>
		 * <li><code>"symbols-latn-group"</code></li>
		 * <li><code>"symbols-latn-decimal"</code></li>
		 * <li><code>"symbols-latn-plusSign"</code></li>
		 * <li><code>"symbols-latn-minusSign"</code></li>
		 * </ul>
		 * </li>
		 * </ul>
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting$ChangeEvent
		 * @property {string} [languageTag] The formatting language tag.
		 * @property {string} [ABAPDateFormat] The ABAP date format.
		 * @property {string} [ABAPTimeFormat] The ABAP time format.
		 * @property {string} [ABAPNumberFormat] The ABAP number format.
		 * @property {object[]} [legacyDateCalendarCustomizing] The legacy date calendar customizing.
		 * @property {object} [calendarWeekNumbering] The calendar week numbering.
		 * @property {object} [calendarType] The calendar type.
		 * @property {string} ["dateFormats-short"] The short date format.
		 * @property {string} ["dateFormats-medium"] The medium date format.
		 * @property {string} ["dateFormats-long"] The long date format.
		 * @property {string} ["dateFormats-full"] The full date format.
		 * @property {string} ["timeFormats-short"] The short time format.
		 * @property {string} ["timeFormats-medium"] The medium time format.
		 * @property {string} ["timeFormats-long"] The long time format.
		 * @property {string} ["timeFormats-full"] The full time format.
		 * @property {string} ["symbols-latn-group"] The latin symbols group.
		 * @property {string} ["symbols-latn-decimal"] The latin symbols decimal.
		 * @property {string} ["symbols-latn-plusSign"] The latin symbols plusSign.
		 * @property {string} ["symbols-latn-minusSign"] The latin symbols minusSign.
		 * @property {Object<string,string>} [currency] The currency.
		 * @property {string[]} ["dayPeriods-format-abbreviated"] The abbreviated day periods format.
		 * @public
		 * @since 1.120
		 */

		/**
		 * Attaches the <code>fnFunction</code> event handler to the {@link #event:change change} event
		 * of <code>module:sap/base/i18n/Formatting</code>.
		 *
		 * @param {function(module:sap/base/i18n/Formatting$ChangeEvent)} fnFunction
		 *   The function to be called when the event occurs
		 * @public
		 * @since 1.120
		 */
		attachChange(fnFunction) {
			oEventing.attachEvent("change", fnFunction);
		},

		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:change change} event of
		 * this <code>module:sap/base/i18n/Formatting</code>.
		 *
		 * @param {function(module:sap/base/i18n/Formatting$ChangeEvent)} fnFunction Function to be called when the event occurs
		 * @public
		 * @since 1.120
		 */
		detachChange(fnFunction) {
			oEventing.detachEvent("change", fnFunction);
		},

		/**
		 * Returns the LanguageTag to be used for formatting.
		 *
		 * If no such LanguageTag has been defined, this method falls back to the language,
		 * see {@link module:sap/base/i18n/Localization.getLanguage Localization.getLanguage()}.
		 *
		 * If any user preferences for date, time or number formatting have been set,
		 * and if no format LanguageTag has been specified, then a special private use subtag
		 * is added to the LanguageTag, indicating to the framework that these user preferences
		 * should be applied.
		 *
		 * @returns {module:sap/base/i18n/LanguageTag} the format LanguageTag
		 * @public
		 * @since 1.120
		 */
		getLanguageTag() {
			function fallback() {
				let oLanguageTag = new LanguageTag(Localization.getLanguage());
				// if any user settings have been defined, add the private use subtag "sapufmt"
				if (!isEmptyObject(mSettings)
						|| Formatting.getCalendarWeekNumbering() !== CalendarWeekNumbering.Default) {
					let l = oLanguageTag.toString();
					if ( l.indexOf("-x-") < 0 ) {
						l += "-x-sapufmt";
					} else if ( l.indexOf("-sapufmt") <= l.indexOf("-x-") ) {
						l += "-sapufmt";
					}
					oLanguageTag = new LanguageTag(l);
				}
				return oLanguageTag;
			}
			return oWritableConfig.get({
				name: "sapUiFormatLocale",
				type: function(sFormatLocale) {return new LanguageTag(sFormatLocale);},
				defaultValue: fallback,
				external: true
			});
		},

		/**
		 * Sets a new language tag to be used from now on for retrieving language
		 * specific formatters. Modifying this setting does not have an impact on
		 * the retrieval of translated texts!
		 *
		 * Can either be set to a concrete value (a BCP47 or Java locale compliant
		 * language tag) or to <code>null</code>. When set to <code>null</code> (default
		 * value) then locale specific formatters are retrieved for the current language.
		 *
		 * After changing the format locale, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * <b>Note</b>: When a language tag is set, it has higher priority than a number,
		 * date or time format defined with a call to <code>setABAPNumberFormat</code>,
		 * <code>setABAPDateFormat</code> or <code>setABAPTimeFormat</code>.
		 *
		 * <b>Note</b>: See documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for restrictions.
		 *
		 * @param {string|module:sap/base/i18n/LanguageTag|null} vLanguageTag the new BCP47 compliant language tag;
		 *   case doesn't matter and underscores can be used instead of dashes to separate
		 *   components (compatibility with Java Locale IDs)
		 * @throws {TypeError} When <code>sLanguageTag</code> is given, but is not a valid BCP47 language
		 *   tag or Java locale identifier
		 * @public
		 * @since 1.120
		 */
		setLanguageTag(vLanguageTag) {
			const oLanguageTag = createLanguageTag(vLanguageTag);
			check(vLanguageTag == null || oLanguageTag, "vLanguageTag must be a BCP47 language tag or Java Locale id or null");
			const oOldLanguageTag = Formatting.getLanguageTag();
			oWritableConfig.set("sapUiFormatLocale", oLanguageTag?.toString());
			const oCurrentLanguageTag = Formatting.getLanguageTag();
			if (oOldLanguageTag.toString() !== oCurrentLanguageTag.toString()) {
				const bFireEvent = !mChanges;
				mChanges ??= {};
				mChanges.languageTag = oCurrentLanguageTag.toString();
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * @deprecated As of Version 1.120
		 */
		_set: _set,

		/**
		 * Definition of a custom unit.
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting.CustomUnit
		 * @property {string} displayName
		 *   The unit's display name
		 * @property {string} ["unitPattern-count-zero"]
		 *   The unit pattern for the plural form "zero"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-one"]
		 *   The unit pattern for the plural form "one"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-two"]
		 *   The unit pattern for the plural form "two"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-few"]
		 *   The unit pattern for the plural form "few"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-many"]
		 *   The unit pattern for the plural form "many"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} "unitPattern-count-other"
		 *   The unit pattern for all other numbers which do not match the plural forms of the other given patterns;
		 *   <code>{0}</code> in the pattern is replaced by the number
		 * @public
		 * @see {@link sap.ui.core.LocaleData#getPluralCategories}
		 */

		/**
		 * Gets the custom units that have been set via {@link #.addCustomUnits Formatting.addCustomUnits} or
		 * {@link #.setCustomUnits Formatting.setCustomUnits}.
		 *
		 * @returns {Object<string,module:sap/base/i18n/Formatting.CustomUnit>|undefined}
		 *   A map with the unit code as key and a custom unit definition containing a display name and different unit
		 *   patterns as value; or <code>undefined</code> if there are no custom units
		 *
		 * @public
		 * @example <caption>A simple custom type "BAG" for which the value <code>1</code> is formatted as "1 bag", for
		 *   example in locale 'en', while <code>2</code> is formatted as "2 bags"</caption>
		 * {
		 *   "BAG": {
		 *     "displayName": "Bag",
		 *     "unitPattern-count-one": "{0} bag",
		 *     "unitPattern-count-other": "{0} bags"
		 *   }
		 * }
		 * @since 1.123
		 */
		getCustomUnits() {
			return mSettings["units"]?.["short"];
		},

		/**
		 * Replaces existing custom units by the given custom units.
		 *
		 * <b>Note:</b> Setting custom units affects all applications running with the current UI5 core instance.
		 *
		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomUnit>} [mUnits]
		 *   A map with the unit code as key and a custom unit definition as value; <code>mUnits</code> replaces the
		 *   current custom units; if not given, all custom units are deleted; see
		 *   {@link #.getCustomUnits Formatting.getCustomUnits} for an example
		 *
		 * @public
		 * @see {@link module:sap/base/i18n/Formatting.addCustomUnits Formatting.addCustomUnits}
		 * @since 1.123
		 */
		setCustomUnits(mUnits) {
			// add custom units, or remove the existing ones if none are given
			let mUnitsshort = null;
			if (mUnits) {
				mUnitsshort = {
					"short": mUnits
				};
			}
			_set("units", mUnitsshort);
		},

		/**
		 * Adds custom units.
		 *
		 * <b>Note:</b> Adding custom units affects all applications running with the current UI5 core instance.
		 *
		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomUnit>} mUnits
		 *   A map with the unit code as key and a custom unit definition as value; already existing custom units are
		 *   replaced, new ones are added; see {@link #.getCustomUnits Formatting.getCustomUnits} for an example
		 *
		 * @public
		 * @since 1.123
		 */
		addCustomUnits(mUnits) {
			const mExistingUnits = Formatting.getCustomUnits();
			if (mExistingUnits){
				mUnits = extend({}, mExistingUnits, mUnits);
			}
			Formatting.setCustomUnits(mUnits);
		},

		/**
		 * Sets custom unit mappings.
		 * Unit mappings contain key value pairs (both strings)
		 * * {string} key: a new entry which maps to an existing unit key
		 * * {string} value: an existing unit key
		 *
		 * Example:
		 * <code>
		 * {
		 *  "my": "my-custom-unit",
		 *  "cm": "length-centimeter"
		 * }
		 * </code>
		 * Note: It is possible to create multiple entries per unit key.
		 * Call with <code>null</code> to delete unit mappings.
		 * @param {object} mUnitMappings unit mappings
		 * @private
		 * @since 1.116.0
		 */
		setUnitMappings(mUnitMappings) {
			_set("unitMappings", mUnitMappings);
		},

		/**
		 * Adds unit mappings.
		 * Similar to {@link .setUnitMappings} but instead of setting the unit mappings, it will add additional ones.
		 * @param {object} mUnitMappings unit mappings
		 * @see {@link module:sap/base/i18n/Formatting.setUnitMappings}
		 * @private
		 * @since 1.116.0
		 */
		addUnitMappings(mUnitMappings) {
			// add custom units, or remove the existing ones if none are given
			const mExistingUnits = Formatting.getUnitMappings();
			if (mExistingUnits){
				mUnitMappings = extend({}, mExistingUnits, mUnitMappings);
			}
			Formatting.setUnitMappings(mUnitMappings);
		},

		/**
		 * Retrieves the unit mappings.
		 * These unit mappings are set by {@link .setUnitMappings} and {@link .addUnitMappings}
		 * @private
		 * @returns {object} unit mapping object
		 * @see {@link module:sap/base/i18n/Formatting.setUnitMappings}
		 * @see {@link module:sap/base/i18n/Formatting.addUnitMappings}
		 * @since 1.116.0
		 */
		getUnitMappings() {
			return mSettings["unitMappings"];
		},

		/**
		 * Returns the currently set date pattern or undefined if no pattern has been defined.
		 * @param {"short"|"medium"|"long"|"full"} sStyle The date style (short, medium, long or full)
		 * @returns {string} The resulting date pattern
		 * @public
		 * @since 1.120
		 */
		getDatePattern(sStyle) {
			assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			return mSettings["dateFormats-" + sStyle];
		},

		/**
		 * Defines the preferred format pattern for the given date format style.
		 *
		 * Calling this method with a null or undefined pattern removes a previously set pattern.
		 *
		 * If a pattern is defined, it will be preferred over patterns derived from the current locale.
		 *
		 * See class {@link sap.ui.core.format.DateFormat DateFormat} for details about the pattern syntax.
		 *
		 * After changing the date pattern, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link module:sap/base/i18n/Localization.setLanguage
		 * Localization.setLanguage()} for details and restrictions.
		 *
		 * @param {"short"|"medium"|"long"|"full"} sStyle must be one of short, medium, long or full.
		 * @param {string} sPattern the format pattern to be used in LDML syntax.
		 * @public
		 * @since 1.120
		 */
		setDatePattern(sStyle, sPattern) {
			check(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			_set("dateFormats-" + sStyle, sPattern);
		},

		/**
		 * Returns the currently set time pattern or undefined if no pattern has been defined.
		 * @param {"short"|"medium"|"long"|"full"} sStyle The time style (short, medium, long or full)
		 * @returns {string} The resulting time pattern
		 * @public
		 * @since 1.120
		 */
		getTimePattern(sStyle) {
			assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			return mSettings["timeFormats-" + sStyle];
		},

		/**
		 * Defines the preferred format pattern for the given time format style.
		 *
		 * Calling this method with a null or undefined pattern removes a previously set pattern.
		 *
		 * If a pattern is defined, it will be preferred over patterns derived from the current locale.
		 *
		 * See class {@link sap.ui.core.format.DateFormat DateFormat} for details about the pattern syntax.
		 *
		 * After changing the time pattern, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {"short"|"medium"|"long"|"full"} sStyle must be one of short, medium, long or full.
		 * @param {string} sPattern the format pattern to be used in LDML syntax.
		 * @public
		 * @since 1.120
		 */
		setTimePattern(sStyle, sPattern) {
			check(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			_set("timeFormats-" + sStyle, sPattern);
		},

		/**
		 * Returns the currently set number symbol of the given type or undefined if no symbol has been defined.
		 *
		 * @param {"group"|"decimal"|"plusSign"|"minusSign"} sType the type of symbol
		 * @returns {string} A non-numerical symbol used as part of a number for the given type,
		 *   e.g. for locale de_DE:
		 *     <ul>
		 *       <li>"group": "." (grouping separator)</li>
		 *       <li>"decimal": "," (decimal separator)</li>
		 *       <li>"plusSign": "+" (plus sign)</li>
		 *       <li>"minusSign": "-" (minus sign)</li>
		 *     </ul>
		 * @public
		 * @since 1.120
		 */
		getNumberSymbol(sType) {
			assert(["group", "decimal", "plusSign", "minusSign"].includes(sType), "sType must be decimal, group, plusSign or minusSign");
			return mSettings["symbols-latn-" + sType];
		},

		/**
		 * Defines the string to be used for the given number symbol.
		 *
		 * Calling this method with a null or undefined symbol removes a previously set symbol string.
		 * Note that an empty string is explicitly allowed.
		 *
		 * If a symbol is defined, it will be preferred over symbols derived from the current locale.
		 *
		 * See class {@link sap.ui.core.format.NumberFormat NumberFormat} for details about the symbols.
		 *
		 * After changing the number symbol, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {"group"|"decimal"|"plusSign"|"minusSign"} sType the type of symbol
		 * @param {string} sSymbol will be used to represent the given symbol type
		 * @public
		 * @since 1.120
		 */
		setNumberSymbol(sType, sSymbol) {
			check(["group", "decimal", "plusSign", "minusSign"].includes(sType), "sType must be decimal, group, plusSign or minusSign");
			_set("symbols-latn-" + sType, sSymbol);
		},

		/**
		 * Definition of a custom currency.
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting.CustomCurrency
		 * @property {int} digits
		 *   The number of decimal digits to be used for the currency
		 * @public
		 */

		/**
		 * Gets the custom currencies that have been set via
		 * {@link #.addCustomCurrencies Formatting.addCustomCurrencies} or
		 * {@link #.setCustomCurrencies Formatting.setCustomCurrencies}.
		 * There is a special currency code named "DEFAULT" that is optional. If it is set it is used for all
		 * currencies not contained in the list, otherwise currency digits as defined by the CLDR are used as a
		 * fallback.
		 *
		 * @returns {Object<string,module:sap/base/i18n/Formatting.CustomCurrency>|undefined}
		 *   A map with the currency code as key and a custom currency definition containing the number of decimals as
		 *   value; or <code>undefined</code> if there are no custom currencies
		 *
		 * @public
	 	 * @example <caption>A simple example for custom currencies that uses CLDR data but overrides single
		 *   currencies</caption>
		 * {
		 *   "EUR3": {"digits": 3}
		 *   "MYD": {"digits": 4}
		 * }
		 *
	 	 * @example <caption>A simple example for custom currencies that overrides all currency information from the
		 *   CLDR</caption>
		 * {
		 *   "DEFAULT": {"digits": 2},
		 *   "ADP": {"digits": 0},
		 *   ...
		 *   "EUR3": {"digits": 3}
		 *   "MYD": {"digits": 4},
		 *   ...
		 *   "ZWD": {"digits": 0}
		 * }
		 * @since 1.120
		 */
		getCustomCurrencies() {
			return mSettings["currency"];
		},

		/**
		 * Replaces existing custom currencies by the given custom currencies. There is a special currency code named
		 * "DEFAULT" that is optional. In case it is set, it is used for all currencies not contained in the list,
		 * otherwise currency digits as defined by the CLDR are used as a fallback.
		 *
		 * <b>Note:</b> Setting custom units affects all applications running with the current UI5 core instance.
		 *
		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomCurrency>} [mCurrencies]
		 *   A map with the currency code as key and a custom currency definition as value;  the custom currency code
		 *   must contain at least one non-digit character, so that the currency part can be distinguished from the
		 *   amount part; <code>mCurrencies</code> replaces the current custom currencies; if not given, all custom
		 *   currencies are deleted; see {@link #.getCustomCurrencies Formatting.getCustomCurrencies} for an example
		 *
		 * @public
		 * @see {@link module:sap/base/i18n/Formatting.addCustomCurrencies Formatting.addCustomCurrencies}
		 * @since 1.120
		 */
		setCustomCurrencies(mCurrencies) {
			check(typeof mCurrencies === "object" || mCurrencies == null, "mCurrencyDigits must be an object");
			Object.keys(mCurrencies || {}).forEach(function(sCurrencyDigit) {
				check(typeof sCurrencyDigit === "string");
				check(typeof mCurrencies[sCurrencyDigit] === "object");
			});
			_set("currency", mCurrencies);
		},

		/**
		 * Adds custom currencies. There is a special currency code named "DEFAULT" that is optional. In case it is set
		 * it is used for all currencies not contained in the list, otherwise currency digits as defined by the CLDR are
		 * used as a fallback.
		 *
		 * <b>Note:</b> Adding custom currencies affects all applications running with the current UI5 core instance.

		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomCurrency>} [mCurrencies]
		 *   A map with the currency code as key and a custom currency definition as value; already existing custom
		 *   currencies are replaced, new ones are added; the custom currency code must contain at least one non-digit
		 *   character, so that the currency part can be distinguished from the amount part; see
		 *   {@link #.getCustomCurrencies Formatting.getCustomCurrencies} for an example
		 *
		 * @public
		 * @since 1.120
		 */
		addCustomCurrencies(mCurrencies) {
			const mExistingCurrencies = Formatting.getCustomCurrencies();
			if (mExistingCurrencies){
				mCurrencies = extend({}, mExistingCurrencies, mCurrencies);
			}
			Formatting.setCustomCurrencies(mCurrencies);
		},

		_setDayPeriods(sWidth, aTexts) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide", "sWidth must be narrow, abbreviated or wide");
			_set("dayPeriods-format-" + sWidth, aTexts);
		},

		/**
		 * Returns the currently set ABAP date format (its id) or undefined if none has been set.
		 *
		 * @returns {"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"A"|"B"|"C"|undefined} ID of the ABAP date format,
		 *   if not set or set to <code>""</code>, <code>undefined</code> will be returned
		 * @public
		 * @since 1.120
		 */
		getABAPDateFormat() {
			const sABAPDateFormat = oWritableConfig.get({
				name: "sapUiABAPDateFormat",
				type: BaseConfig.Type.String,
				/**
				 * @deprecated As of Version 1.120
				 */
				defaultValue: oWritableConfig.get({
					name: "sapUiLegacyDateFormat",
					type: BaseConfig.Type.String,
					external: true
				}),
				external: true
			});
			return sABAPDateFormat ? sABAPDateFormat.toUpperCase() : undefined;
		},

		/**
		 * Allows to specify one of the ABAP date formats.
		 *
		 * This method modifies the date patterns for 'short' and 'medium' style with the corresponding ABAP
		 * format. When called with a null or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the date format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"A"|"B"|"C"} [sFormatId=""] ID of the ABAP date format,
		 *   <code>""</code> will reset the date patterns for 'short' and 'medium' style to the
		 *   locale-specific ones.
		 * @public
		 * @since 1.120
		 */
		setABAPDateFormat(sFormatId) {
			sFormatId = sFormatId ? String(sFormatId).toUpperCase() : "";
			check(M_ABAP_DATE_FORMAT_PATTERN.hasOwnProperty(sFormatId), "sFormatId must be one of ['1','2','3','4','5','6','7','8','9','A','B','C'] or empty");
			const bFireEvent = !mChanges;
			const sOldFormat = Formatting.getABAPDateFormat();
			if (sOldFormat !== sFormatId || !bInitialized) {
				mChanges ??= {};
				oWritableConfig.set("sapUiABAPDateFormat", sFormatId);
				mChanges.ABAPDateFormat = sFormatId;
				Formatting.setDatePattern("short", M_ABAP_DATE_FORMAT_PATTERN[sFormatId].pattern);
				Formatting.setDatePattern("medium", M_ABAP_DATE_FORMAT_PATTERN[sFormatId].pattern);
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * Returns the currently set ABAP time format (its id) or undefined if none has been set.
		 *
		 * @returns {"0"|"1"|"2"|"3"|"4"|undefined} ID of the ABAP date format,
		 *   if not set or set to <code>""</code>, <code>undefined</code> will be returned
		 * @public
		 * @since 1.120
		 */
		getABAPTimeFormat() {
			const sABAPTimeFormat = oWritableConfig.get({
				name: "sapUiABAPTimeFormat",
				type: BaseConfig.Type.String,
				/**
				 * @deprecated As of Version 1.120
				 */
				defaultValue: oWritableConfig.get({
					name: "sapUiLegacyTimeFormat",
					type: BaseConfig.Type.String,
					external: true
				}),
				external: true
			});
			return sABAPTimeFormat ? sABAPTimeFormat.toUpperCase() : undefined;
		},

		/**
		 * Allows to specify one of the ABAP time formats.
		 *
		 * This method sets the time patterns for 'short' and 'medium' style to the corresponding ABAP
		 * formats and sets the day period texts to "AM"/"PM" or "am"/"pm" respectively. When called
		 * with a null or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the time format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {""|"0"|"1"|"2"|"3"|"4"} [sFormatId=""] ID of the ABAP time format,
		 *   <code>""</code> will reset the time patterns for 'short' and 'medium' style and the day
		 *   period texts to the locale-specific ones.
		 * @public
		 * @since 1.120
		 */
		setABAPTimeFormat(sFormatId) {
			sFormatId = sFormatId || "";
			check(M_ABAP_TIME_FORMAT_PATTERN.hasOwnProperty(sFormatId), "sFormatId must be one of ['0','1','2','3','4'] or empty");
			const bFireEvent = !mChanges;
			const sOldFormat = Formatting.getABAPTimeFormat();
			if (sOldFormat !== sFormatId || !bInitialized) {
				mChanges ??= {};
				oWritableConfig.set("sapUiABAPTimeFormat", sFormatId);
				mChanges.ABAPTimeFormat = sFormatId;
				Formatting.setTimePattern("short", M_ABAP_TIME_FORMAT_PATTERN[sFormatId]["short"]);
				Formatting.setTimePattern("medium", M_ABAP_TIME_FORMAT_PATTERN[sFormatId]["medium"]);
				Formatting._setDayPeriods("abbreviated", M_ABAP_TIME_FORMAT_PATTERN[sFormatId].dayPeriods);
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * Returns the currently set ABAP number format (its id) or undefined if none has been set.
		 *
		 * @returns {" "|"X"|"Y"|undefined} ID of the ABAP number format,
		 *   if not set or set to <code>""</code>, <code>undefined</code> will be returned
		 * @public
		 * @since 1.120
		 */
		getABAPNumberFormat() {
			const sABAPNumberFormat = oWritableConfig.get({
				name: "sapUiABAPNumberFormat",
				type: BaseConfig.Type.String,
				/**
				 * @deprecated As of Version 1.120
				 */
				defaultValue: oWritableConfig.get({
					name: "sapUiLegacyNumberFormat",
					type: BaseConfig.Type.String,
					external: true
				}),
				external: true
			});
			return sABAPNumberFormat ? sABAPNumberFormat.toUpperCase() : undefined;
		},

		/**
		 * Allows to specify one of the ABAP number format.
		 *
		 * This method will modify the 'group' and 'decimal' symbols. When called with a null
		 * or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the number format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {""|" "|"X"|"Y"} [sFormatId=""] ID of the ABAP number format set,
		 *   <code>""</code> will reset the 'group' and 'decimal' symbols to the locale-specific
		 *   ones.
		 * @public
		 * @since 1.120
		 */
		setABAPNumberFormat(sFormatId) {
			sFormatId = sFormatId ? sFormatId.toUpperCase() : "";
			check(M_ABAP_NUMBER_FORMAT_SYMBOLS.hasOwnProperty(sFormatId), "sFormatId must be one of [' ','X','Y'] or empty");
			const bFireEvent = !mChanges;
			const sOldFormat = Formatting.getABAPNumberFormat();
			if (sOldFormat !== sFormatId || !bInitialized) {
				mChanges ??= {};
				oWritableConfig.set("sapUiABAPNumberFormat", sFormatId);
				mChanges.ABAPNumberFormat = sFormatId;
				Formatting.setNumberSymbol("group", M_ABAP_NUMBER_FORMAT_SYMBOLS[sFormatId].groupingSeparator);
				Formatting.setNumberSymbol("decimal", M_ABAP_NUMBER_FORMAT_SYMBOLS[sFormatId].decimalSeparator);
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 *
		 * Customizing data for the support of Islamic calendar.
		 * Represents one row of data from Table TISLCAL.
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting.CustomIslamicCalendarData
		 *
		 * @property {"A"|"B"} dateFormat The date format. Column DATFM in TISLCAL.
		 * @property {string} islamicMonthStart The Islamic date in format: 'yyyyMMdd'. Column ISLMONTHSTART in TISLCAL.
		 * @property {string} gregDate The corresponding Gregorian date format: 'yyyyMMdd'. Column GREGDATE in TISLCAL.
		 *
		 * @public
		 */

		/**
		 * Allows to specify the customizing data for Islamic calendar support
		 *
		 * See: {@link module:sap/base/i18n/Formatting.CustomIslamicCalendarData}
		 *
		 * @param {module:sap/base/i18n/Formatting.CustomIslamicCalendarData[]} aCustomCalendarData Contains the customizing data for the support of Islamic calendar.
		 * One JSON object in the array represents one row of data from Table TISLCAL
		 * @public
		 * @since 1.120
		 */
		setCustomIslamicCalendarData(aCustomCalendarData) {
			check(Array.isArray(aCustomCalendarData), "aCustomCalendarData must be an Array");
			const bFireEvent = !mChanges;
			mChanges ??= {};
			aCustomIslamicCalendarData = mChanges.customIslamicCalendarData = aCustomCalendarData.slice();
			if (bFireEvent) {
				fireChange();
			}
		},

		/**
		 * Returns the currently set customizing data for Islamic calendar support.
		 *
		 * See: {@link module:sap/base/i18n/Formatting.CustomIslamicCalendarData}
		 *
		 * @returns {module:sap/base/i18n/Formatting.CustomIslamicCalendarData[]|undefined} Returns an array that contains the customizing data. Each element in the array has properties: dateFormat, islamicMonthStart, gregDate. For details, please see {@link #.setCustomIslamicCalendarData}
		 * @public
		 * @since 1.120
		 */
		getCustomIslamicCalendarData() {
			return aCustomIslamicCalendarData?.slice() ?? undefined;
		},

		/**
		 * Define whether the NumberFormatter shall always place the currency code after the numeric value, with
		 * the only exception of right-to-left locales, where the currency code shall be placed before the numeric value.
		 * Default configuration setting is <code>true</code>.
		 *
		 * When set to <code>false</code> the placement of the currency code is done dynamically, depending on the
		 * configured locale using data provided by the Unicode Common Locale Data Repository (CLDR).
		 *
		 * Each currency instance ({@link sap.ui.core.format.NumberFormat.getCurrencyInstance
		 * NumberFormat.getCurrencyInstance}) will be created with this setting unless overwritten on instance level.
		 *
		 * @param {boolean} bTrailingCurrencyCode Whether currency codes shall always be placed after the numeric value
		 * @public
		 * @since 1.120
		 */
		setTrailingCurrencyCode(bTrailingCurrencyCode) {
			check(typeof bTrailingCurrencyCode === "boolean", "bTrailingCurrencyCode must be a boolean");
			oWritableConfig.set("sapUiTrailingCurrencyCode", bTrailingCurrencyCode);
		},

		/**
		 * Returns current trailingCurrencyCode configuration for new NumberFormatter instances
		 *
		 * @return {boolean} Whether currency codes shall always be placed after the numeric value
		 * @public
		 * @since 1.120
		 */
		getTrailingCurrencyCode() {
			return oWritableConfig.get({
				name: "sapUiTrailingCurrencyCode",
				type: BaseConfig.Type.Boolean,
				defaultValue: true,
				external: true
			});
		},

		/**
		 * Returns a live object with the current settings
		 * TODO this method is part of the facade to be accessible from LocaleData, but it shouldn't be
		 *
		 * @returns {object} The custom LocaleData settings object
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.116.0
		 */
		getCustomLocaleData() {
			return mSettings;
		},

		/**
		 * Returns the calendar week numbering algorithm used to determine the first day of the week
		 * and the first calendar week of the year, see {@link module:sap/base/i18n/date/CalendarWeekNumbering
		 * CalendarWeekNumbering}.
		 *
		 * @returns {module:sap/base/i18n/date/CalendarWeekNumbering} The calendar week numbering algorithm
		 *
		 * @public
		 * @since 1.120
		 */
		getCalendarWeekNumbering() {
			let oCalendarWeekNumbering = CalendarWeekNumbering.Default;

			try {
				oCalendarWeekNumbering = oWritableConfig.get({
					name: "sapUiCalendarWeekNumbering",
					type: CalendarWeekNumbering,
					defaultValue: CalendarWeekNumbering.Default,
					external: true
				});
			} catch  (err) {
				//nothing to do, return default;
			}
			return oCalendarWeekNumbering;
		},

		/**
		 * Sets the calendar week numbering algorithm which is used to determine the first day of the week
		 * and the first calendar week of the year, see {@link module:sap/base/i18n/date/CalendarWeekNumbering
		 * CalendarWeekNumbering}.
		 *
		 * @param {module:sap/base/i18n/date/CalendarWeekNumbering} sCalendarWeekNumbering
		 *   The calendar week numbering algorithm
		 * @throws {TypeError}
		 *   If <code>sCalendarWeekNumbering</code> is not a valid calendar week numbering algorithm,
		 *   defined in {@link module:sap/base/i18n/date/CalendarWeekNumbering CalendarWeekNumbering}
		 *
		 * @public
		 * @since 1.120
		 */
		setCalendarWeekNumbering(sCalendarWeekNumbering) {
			BaseConfig._.checkEnum(CalendarWeekNumbering, sCalendarWeekNumbering, "calendarWeekNumbering");
			const sCurrentWeekNumbering = oWritableConfig.get({
				name: "sapUiCalendarWeekNumbering",
				type: CalendarWeekNumbering,
				defaultValue: CalendarWeekNumbering.Default,
				external: true
			});
			if (sCurrentWeekNumbering !== sCalendarWeekNumbering) {
				const bFireEvent = !mChanges;
				mChanges ??= {};
				oWritableConfig.set("sapUiCalendarWeekNumbering", sCalendarWeekNumbering);
				mChanges.calendarWeekNumbering = sCalendarWeekNumbering;
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * Returns the calendar type which is being used in locale dependent functionality.
		 *
		 * When it's explicitly set by calling <code>setCalendarType</code>, the set calendar type is returned.
		 * Otherwise, the calendar type is determined by checking the format settings and current locale.
		 *
		 * @returns {module:sap/base/i18n/date/CalendarType} the current calendar type, e.g. <code>Gregorian</code>
		 * @public
		 * @since 1.120
		 */
		getCalendarType() {
			let sName,
				sCalendarType = oWritableConfig.get({
					name: "sapUiCalendarType",
					type: BaseConfig.Type.String,
					external: true
				});

			sCalendarType ??= null;

			if (sCalendarType) {
				for (sName in CalendarType) {
					if (sName.toLowerCase() === sCalendarType.toLowerCase()) {
						return sName;
					}
				}
				Log.warning("Parameter 'calendarType' is set to " + sCalendarType + " which isn't a valid value and therefore ignored. The calendar type is determined from format setting and current locale");
			}

			const sABAPDateFormat = Formatting.getABAPDateFormat();

			switch (sABAPDateFormat) {
				case "1":
				case "2":
				case "3":
				case "4":
				case "5":
				case "6":
					return CalendarType.Gregorian;
				case "7":
				case "8":
				case "9":
					return CalendarType.Japanese;
				case "A":
				case "B":
					return CalendarType.Islamic;
				case "C":
					return CalendarType.Persian;
				default:
					return Localization.getPreferredCalendarType();
			}
		},

		/**
		 * Sets the new calendar type to be used from now on in locale dependent functionality (for example,
		 * formatting, translation texts, etc.).
		 *
		 * @param {module:sap/base/i18n/date/CalendarType|null} sCalendarType the new calendar type. Set it with null to clear the calendar type
		 *   and the calendar type is calculated based on the format settings and current locale.
		 * @public
		 * @since 1.120
		 */
		setCalendarType(sCalendarType) {
			const sOldCalendarType = Formatting.getCalendarType();
			oWritableConfig.set("sapUiCalendarType", sCalendarType);
			const sCurrentCalendarType = Formatting.getCalendarType();
			if (sOldCalendarType !== sCurrentCalendarType) {
				const bFireEvent = !mChanges;
				mChanges ??= {};
				mChanges.calendarType = sCurrentCalendarType;
				if (bFireEvent) {
					fireChange();
				}
			}
		}
	};

	function fireChange() {
		oEventing.fireEvent("change", mChanges);
		mChanges = undefined;
	}

	function init() {
		// init ABAP formats
		const sABAPDateFormat = Formatting.getABAPDateFormat();
		if (sABAPDateFormat !== undefined) {
			Formatting.setABAPDateFormat(sABAPDateFormat);
		}
		const sABAPNumberFormat = Formatting.getABAPNumberFormat();
		if (sABAPNumberFormat !== undefined) {
			Formatting.setABAPNumberFormat(sABAPNumberFormat);
		}
		const sABAPTimeFormat = Formatting.getABAPTimeFormat();
		if (sABAPTimeFormat !== undefined) {
			Formatting.setABAPTimeFormat(sABAPTimeFormat);
		}
		bInitialized = true;
	}

	init();

	return Formatting;
});
