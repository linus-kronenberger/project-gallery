/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.m.semantic.SemanticPage control
sap.ui.define([],
	function() {
	"use strict";

	return {
		aggregations : {
			content : {
				domRef : ":sap-domref > .sapMPage > section"
			},
			landmarkInfo: {
				ignore: true
			}
		}
	};

});