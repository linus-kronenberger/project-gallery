/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([],function(){"use strict";var t={apiVersion:2};t.render=function(t,e){var r=e._sSymbolId,a=e.getDecorative();t.openStart("svg",e);t.class("sapMIllustration");t.accessibilityState(e);if(a){t.attr("role","presentation");t.attr("aria-hidden","true")}t.openEnd();t.openStart("use");t.attr("href","#"+r);t.attr("width","100%");t.attr("height","100%");t.openEnd();t.close("use");t.close("svg")};return t},true);
//# sourceMappingURL=IllustrationRenderer.js.map