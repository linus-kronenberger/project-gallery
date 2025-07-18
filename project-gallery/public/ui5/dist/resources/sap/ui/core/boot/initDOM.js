/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/base/Log","sap/ui/Device","sap/base/i18n/Localization","sap/ui/dom/_ready"],function(e,t,n,o){"use strict";function a(){var t=n.getRTL()?"rtl":"ltr";document.documentElement.setAttribute("dir",t);e.info("Content direction set to '"+t+"'",null,"sap.ui.core.boot")}function i(){var n=document.documentElement;var o=t.browser;var a=o.name;if(a){if(a===o.BROWSER.SAFARI&&o.mobile){a="m"+a}a=a+(o.version===-1?"":Math.floor(o.version));n.dataset.sapUiBrowser=a;e.debug("Browser-Id: "+a,null,"sap.ui.core.boot")}}function r(){var e=document.documentElement;e.dataset.sapUiOs=t.os.name+t.os.versionStr;var n=null;if(t.os.name===t.os.OS.IOS){n="sap-ios"}else if(t.os.name===t.os.OS.ANDROID){n="sap-android"}if(n){e.classList.add(n)}}function s(e){var t=document.createElement("div");t.textContent="bootstrapping UI5...";t.style.color="transparent";document.body.append(t);e.ready().then(function(){document.body.removeChild(t)})}return{run:function(e){return o().then(function(){a();i();r();s(e)})}}});
//# sourceMappingURL=initDOM.js.map