/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([],function(){"use strict";return{name:{singular:"PANEL_NAME",plural:"PANEL_NAME_PLURAL"},palette:{group:"CONTAINER",icons:{svg:"sap/m/designtime/Panel.icon.svg"}},actions:{remove:{changeType:"hideControl"},rename:function(e){if(e.getHeaderToolbar()){return}return{changeType:"rename",domRef:".sapMPanelHdr"}},reveal:{changeType:"unhideControl",getLabel:function(e){var a,n=e.getHeaderToolbar();if(n&&n.getTitleControl()){a=n.getTitleControl().getText()}else{a=e.getHeaderText()}return a||e.getId()}}},aggregations:{headerToolbar:{domRef:":sap-domref > .sapMPanelHeadingDiv .sapMPanelHeaderTB, :sap-domref > .sapMPanelHeadingDiv .sapMPanelWrappingDivTb .sapMPanelHeaderTB, :sap-domref > .sapUiDtEmptyHeader"},infoToolbar:{domRef:":sap-domref > .sapMPanelInfoTB, :sap-domref > .sapUiDtEmptyInfoToolbar"},content:{domRef:":sap-domref > .sapMPanelContent",show:function(){this.setExpanded(true)},actions:{move:"moveControls"}}},templates:{create:"sap/m/designtime/Panel.create.fragment.xml"}}});
//# sourceMappingURL=Panel.designtime.js.map