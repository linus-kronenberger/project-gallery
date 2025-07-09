//@ui5-bundle ui5/quickstart/Component-preload.js
sap.ui.predefine("ui5/quickstart/index", ["sap/m/Button","sap/m/MessageToast"],(e,s)=>{"use strict";new e({text:"Ready...",press(){s.show("Hello World!")}}).placeAt("content")});
sap.ui.require.preload({
	"ui5/quickstart/manifest.json":'{"_version":"1.58.0","sap.app":{"id":"ui5.quickstart"}}'
});
//# sourceMappingURL=Component-preload.js.map
