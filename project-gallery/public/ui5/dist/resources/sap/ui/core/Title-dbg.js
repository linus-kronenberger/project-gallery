/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides control sap.ui.core.Title.
sap.ui.define(['./Element', './library'],
	function(Element, library) {
	"use strict";


	// shortcut for enum(s)
	var TitleLevel = library.TitleLevel;


	/**
	 * Constructor for a new Title.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * Represents a title element that can be used for aggregation with other controls.
	 * @extends sap.ui.core.Element
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @public
	 * @since 1.16.0
	 * @alias sap.ui.core.Title
	 */
	var Title = Element.extend("sap.ui.core.Title", /** @lends sap.ui.core.Title.prototype */ { metadata : {

		library : "sap.ui.core",
		properties : {

			/**
			 * Defines the title text
			 */
			text : {type : "string", group : "Data", defaultValue : null},

			/**
			 * Defines the URL for icon display
			 */
			icon : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null},

			/**
			 * Defines the level of the title. If set to auto the level of the title is chosen by the control rendering the title.
			 *
			 * Currently not all controls using the Title.control supporting this property.
			 */
			level : {type : "sap.ui.core.TitleLevel", group : "Appearance", defaultValue : TitleLevel.Auto},

			/**
			 * If set the title is displayed emphasized.
			 * This feature is nor supported by all controls using the Title.control.
			 */
			emphasized : {type : "boolean", group : "Appearance", defaultValue : false}
		}
	}});



	return Title;

});
