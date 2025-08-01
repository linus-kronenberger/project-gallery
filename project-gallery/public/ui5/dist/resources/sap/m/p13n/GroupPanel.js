/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["./QueryPanel","sap/m/HBox","sap/m/CheckBox","sap/ui/core/Lib","sap/ui/layout/Grid"],(e,t,n,o,r)=>{"use strict";const a=e.extend("sap.m.p13n.GroupPanel",{metadata:{library:"sap.m",properties:{title:{type:"string",defaultValue:o.getResourceBundleFor("sap.m").getText("p13n.DEFAULT_TITLE_GROUP")},enableShowField:{type:"boolean",defaultValue:false}}},renderer:{apiVersion:2}});a.prototype.PRESENCE_ATTRIBUTE="grouped";a.prototype.CHANGE_REASON_SHOWIFGROUPED="showifgrouped";a.prototype._createQueryRowGrid=function(e){const t=e.name;const n=this._createKeySelect(t);const o=new r({containerQuery:true,defaultSpan:this.getEnableShowField()?"XL4 L4 M4 S4":"XL6 L6 M6 S6",content:[n]}).addStyleClass("sapUiTinyMargin");if(this.getEnableShowField()){const t=this._createCheckBox(e);o.addContent(t)}return o};a.prototype._createCheckBox=function(e){const o=e.name;const r=new t({alignItems:"Center",items:[new n({enabled:o?true:false,wrapping:true,selected:e.hasOwnProperty("showIfGrouped")?e.showIfGrouped:true,select:e=>{const t=e.getSource().getParent().getParent().getParent().getParent().getParent().getParent();const n=e.oSource.getParent().getParent().getContent()[0].getSelectedItem().getKey();this._changeShowIfGrouped(n,e.getParameter("selected"));t.fireChange({reason:"change",item:{name:n,grouped:true,showIfGrouped:e.getParameter("selected")}})},text:this._getResourceText("p13n.GROUP_CHECKBOX")})]});return r};a.prototype._changeShowIfGrouped=function(e,t){const n=this._getP13nModel().getProperty("/items").filter(t=>t.name===e);n[0].showIfGrouped=t;this.fireChange({reason:this.CHANGE_REASON_SHOWIFGROUPED,item:n[0]})};a.prototype._getPlaceholderText=function(){return this._getResourceText("p13n.GROUP_PLACEHOLDER")};a.prototype._getRemoveButtonTooltipText=function(){return this._getResourceText("p13n.GROUP_REMOVEICONTOOLTIP")};a.prototype._getRemoveButtonAnnouncementText=function(){return this._getResourceText("p13n.GROUP_REMOVEICONANNOUNCE")};a.prototype._selectKey=function(t){e.prototype._selectKey.apply(this,arguments);const n=t.getParent().getParent();const o=t.getSelectedKey();const r=n.getContent()[0].getContent();r[1].getItems()[0].setEnabled(!!o)};return a});
//# sourceMappingURL=GroupPanel.js.map