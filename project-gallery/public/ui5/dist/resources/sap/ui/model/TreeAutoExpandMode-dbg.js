/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides enumeration sap.ui.model.TreeAutoExpandMode
sap.ui.define([],
	function() {
	"use strict";

	/**
	 * Different modes for setting the auto expand mode on tree or analytical bindings.
	 *
	 * @version 1.138.0
	 * @enum {string}
	 * @alias sap.ui.model.TreeAutoExpandMode
	 * @protected
	 */
	var TreeAutoExpandMode = {

		/**
		 * Tree nodes will be expanded in sequence, level by level (Single requests are sent).
		 * @protected
		 */
		Sequential: "Sequential",

		/**
		 * If supported by a backend provider with analytical capabilities, the requests needed for an automatic
		 * node expansion are bundled.
		 * @protected
		 */
		Bundled: "Bundled"
	};

	return TreeAutoExpandMode;

}, /* bExport= */ true);