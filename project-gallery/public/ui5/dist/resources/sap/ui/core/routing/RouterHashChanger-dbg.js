/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	'./HashChangerBase'
], function(HashChangerBase) {
	"use strict";

	/**
	 * @class Class for manipulating and receiving changes of the relevant hash segment
	 * which belongs to a router. This Class doesn't change the browser hash directly,
	 * but informs its parent RouterHashChanger and finally changes the browser hash
	 * through the {@link sap.ui.core.routing.HashChanger}
	 *
	 * @protected
	 * @alias sap.ui.core.routing.RouterHashChanger
	 */
	var RouterHashChanger = HashChangerBase.extend("sap.ui.core.routing.RouterHashChanger", {

		constructor : function(mSettings) {
			if (!mSettings || !mSettings.parent) {
				throw new Error("sap.ui.core.routing.RouterHashChanger can't be instantiated without a parent");
			}

			this.parent = mSettings.parent;
			// if no hash is given in mSettings, the default value should be ""
			this.hash = mSettings.hash || "";
			this.subHashMap = mSettings.subHashMap;

			this.key = mSettings.key || "";

			HashChangerBase.apply(this);
		}
	});

	RouterHashChanger.InvalidHash = "SapUiCoreRoutingInvalidHash" + (new Date()).getTime();

	RouterHashChanger.prototype.init = function() {
		this.parent.init();
	};

	RouterHashChanger.prototype._generatePrefixedKey = function(sKey) {
		return this.key ? (this.key + "-" + sKey) : sKey;
	};

	/**
	 * Returns a managed instance of {@link sap.ui.core.routing.RouterHashChanger} associated with the current instance.
	 *
	 * This sub-instance handles a specific part of the URL hash. When the sub-instance modifies the hash,
	 * it notifies the parent instance, which then updates the browser’s hash accordingly.
	 * Likewise, when the relevant part of the hash changes externally, the parent instance notifies the sub-instance.
	 *
	 * The provided <code>sKey</code> is used as an identifier for caching the sub-instance.
	 * If this method is called again with the same key, the previously created instance is returned.
	 *
	 * @param {string} sKey A unique key used as the prefix for the sub RouterHashChanger.
	 * @returns {sap.ui.core.routing.RouterHashChanger} The corresponding sub RouterHashChanger instance.
	 * @protected
	 */
	RouterHashChanger.prototype.createSubHashChanger = function(sKey) {
		this.children = this.children || {};

		var sPrefixedKey = this._generatePrefixedKey(sKey);

		if (this.children[sPrefixedKey]) {
			return this.children[sPrefixedKey];
		}

		var oChild = new RouterHashChanger({
			key: sPrefixedKey,
			parent: this,
			subHashMap: this.subHashMap,
			hash: (this.subHashMap && this.subHashMap[sPrefixedKey]) || ""
		});

		oChild.attachEvent("hashSet", this._onChildHashChanged.bind(this, sPrefixedKey));
		oChild.attachEvent("hashReplaced", this._onChildHashChanged.bind(this, sPrefixedKey));
		this.children[sPrefixedKey] = oChild;

		return oChild;
	};

	/**
	 * Save the given hash and potentially fires a "hashChanged" event; may be extended to modify the hash before firing
	 * the event.
	 *
	 * @param {string} sHash the new hash of the browser
	 * @param {object} oSubHashMap the prefixes and hashes for the child RouterHashChangers
	 * @param {boolean} bUpdateHashOnly if this parameter is set to true, the given sHash is saved in the instance but
	 * no "hashChanged" event is fired.
	 * @protected
	 */
	RouterHashChanger.prototype.fireHashChanged = function(sHash, oSubHashMap, bUpdateHashOnly) {
		var aKeys,
			sOldHash = this.hash;

		this.hash = sHash;
		this.subHashMap = oSubHashMap;

		if (!bUpdateHashOnly && sHash !== sOldHash) {
			this.fireEvent("hashChanged", {
				newHash : sHash,
				oldHash : sOldHash
			});
		}

		if (this.children) {
			aKeys = Object.keys(this.children);

			aKeys.forEach(function(sChildKey) {
				var sChildHash = (oSubHashMap[sChildKey] === undefined ? "" : oSubHashMap[sChildKey]);
				this.children[sChildKey].fireHashChanged(sChildHash, oSubHashMap, bUpdateHashOnly);
			}.bind(this));
		}
	};

	RouterHashChanger.prototype._onChildHashChanged = function(sKey, oEvent) {
		var sChildKey = oEvent.getParameter("key") || sKey,
			sHash = oEvent.getParameter("hash"),
			aNestedHashInfo = oEvent.getParameter("nestedHashInfo"),
			aDeletePrefix = oEvent.getParameter("deletePrefix");

		if (this._bCollectMode) {
			// collect the hash
			this._collectHash(sChildKey, sHash, aDeletePrefix);
		} else {
			this.fireEvent(oEvent.getId(), {
				hash: sHash,
				key: sChildKey,
				nestedHashInfo: aNestedHashInfo,
				deletePrefix: aDeletePrefix
			});
		}
	};

	RouterHashChanger.prototype._collectHash = function(sKey, sHash, aDeletePrefix) {
		this._aCollectedHashInfo = this._aCollectedHashInfo || [];

		this._aCollectedHashInfo.push({
			key: sKey,
			hash: sHash,
			deletePrefix: aDeletePrefix
		});
	};

	RouterHashChanger.prototype._hasRouterAttached = function() {
		return this.hasListeners("hashChanged");
	};

	RouterHashChanger.prototype._collectActiveDescendantPrefix = function() {
		if (this.children) {
			var aKeys = Object.keys(this.children);
			return aKeys.reduce(function(aPrefix, sKey) {
				var oChild = this.children[sKey];

				if (oChild._hasRouterAttached()) {
					// oChild is active
					aPrefix.push(sKey);
					Array.prototype.push.apply(aPrefix, oChild._collectActiveDescendantPrefix());
				}

				return aPrefix;
			}.bind(this), []);
		} else {
			return [];
		}
	};

	/**
	 * Gets the current hash
	 *
	 * @return {string} the current hash
	 * @protected
	 */
	RouterHashChanger.prototype.getHash = function() {
		if (this._isUnderCollectMode()) {
			// If one ancestor of the current RouterHashChanger is in the collect mode,
			// this function needs to return an invalid hash marker to prevent the Router
			// from parsing the hash because a hashChange event will be fired immediately
			// after the collect mode which contains the correct hash for the Router
			return RouterHashChanger.InvalidHash;
		} else {
			return this.hash;
		}
	};

	/**
	 * In case a RouterHashChanger is shared by multiple routers, the router that is latest initialized is saved as the
	 * active router in the RouterHashChanger in order to allow it to do more actions (such as resetHash) to avoid the
	 * change from affecting the other routers.
	 *
	 * @param {sap.ui.core.routing.Router} oRouter the router that should be saved as the active router
	 * @returns {this} The 'this' instance to chain the call
	 * @private
	 */
	RouterHashChanger.prototype._setActiveRouter = function(oRouter) {
		if (oRouter.getHashChanger() === this) {
			this._oActiveRouter = oRouter;
		}
		return this;
	};

	/**
	 * Reset the hash if the given router is the active router that is saved in this RouterHashChanger
	 *
	 * This is needed for allowing to fire the hashChanged event with the previous hash again
	 * after displaying a Target without involving a Router.
	 *
	 * @param {sap.ui.core.routing.Router} oRouter the router from which the resetHash is started
	 * @return {this} The current RouterHashChanger for chaining the method
	 * @protected
	 */
	RouterHashChanger.prototype.resetHash = function(oRouter) {
		if (oRouter && this._oActiveRouter === oRouter) {
			this.hash = undefined;
		}
		return this;
	};

	/**
	 * Sets the hash to a certain value. When using this function, a browser history entry is written.
	 * If you do not want to have an entry in the browser history, please use the {@link #replaceHash} function.
	 *
	 * @param {string} sHash New hash
	 * @param {Promise} [pNestedHashChange] When this parameter is given, this RouterHashChanger switchs to collect
	 *  mode and all hash changes from its children will be collected. When this promise resolves, this
	 *  RouterHashChanger fires a "hashSet" event with its own hash and the hashes which are collected from the child
	 *  RouterHashChanger(s).
	 * @param {boolean} [bSuppressActiveHashCollect=false] Whether this RouterHashChanger shouldn't collect the prefixes
	 *  from its active child RouterHashChanger(s) and forward them as delete prefixes within the next "hashSet" event
	 * @returns {Promise|undefined} When <code>pNestedHashChange</code> is given as a Promise, this function also returns
	 *  a Promise which resolves after the given promise resolves. Otherwise it returns <code>undefined</code>.
	 * @protected
	 */
	RouterHashChanger.prototype.setHash = function(sHash, pNestedHashChange, bSuppressActiveHashCollect) {
		if (!(pNestedHashChange instanceof Promise)) {
			bSuppressActiveHashCollect = pNestedHashChange;
			pNestedHashChange = null;
		}

		return this._modifyHash(sHash, pNestedHashChange, bSuppressActiveHashCollect);
	};

	/**
	 * Replaces the hash with a certain value. When using the replace function, no browser history entry is written.
	 * If you want to have an entry in the browser history, please use the {@link #setHash} function.
	 *
	 * @param {string} sHash New hash
	 * @param {sap.ui.core.routing.HistoryDirection} sDirection The direction information for the hash replacement
	 * @param {Promise} [pNestedHashChange] When this parameter is given, this RouterHashChanger switchs to collect
	 *  mode and all hash changes from its children will be collected. When this promise resolves, this
	 *  RouterHashChanger fires a "hashReplaced" event with its own hash and the hashes which are collected from the child
	 *  RouterHashChanger(s).
	 * @param {boolean} [bSuppressActiveHashCollect=false] Whether this RouterHashChanger shouldn't collect the prefixes
	 *  from its active child RouterHashChanger(s) and forward them as delete prefixes within the next "hashReplaced" event
	 * @returns {Promise|undefined} When <code>pNestedHashChange</code> is given as a Promise, this function also returns
	 *  a Promise which resolves after the given promise resolves. Otherwise it returns <code>undefined</code>.
	 * @protected
	 */
	RouterHashChanger.prototype.replaceHash = function(sHash, sDirection, pNestedHashChange, bSuppressActiveHashCollect) {
		if (typeof sDirection !== "string") {
			bSuppressActiveHashCollect = pNestedHashChange;
			pNestedHashChange = sDirection;
			sDirection = undefined;
		}

		if (!(pNestedHashChange instanceof Promise)) {
			bSuppressActiveHashCollect = pNestedHashChange;
			pNestedHashChange = null;
		}

		return this._modifyHash(sHash, pNestedHashChange, bSuppressActiveHashCollect, /* bReplace */true, sDirection);
	};

	/**
	 * Collects all hash changes from the nested RouterHashChanger(s) when <code>pNestedHashChange</code> is given as a
	 * Promise. After the given promise resolves, it fires a "hashSet" or "hashReplaced" event depending on the
	 * <code>bReplace</code> parameter.
	 *
	 * If the <code>pNestedHashChange</code> isn't given as a Promise. The function fires the "hashSet" or
	 * "hashReplaced" event directly
	 *
	 * @param {string} sHash New hash
	 * @param {Promise} [pNestedHashChange] When this parameter is given, this RouterHashChanger switchs to collect
	 *  mode and all hash changes from its children will be collected. When this promise resolves, this
	 *  RouterHashChanger fires a "hashSet" or "hashReplaced" event with its own hash and the hashes which are collected
	 *  from the child RouterHashChanger(s).
	 * @param {boolean} [bSuppressActiveHashCollect=false] Whether this RouterHashChanger shouldn't collect the prefixes
	 *  from its active child RouterHashChanger(s) and forward them as delete prefixes within the next "hashReplaced" event
	 * @param {boolean} [bReplace=false] Whether a "hashReplace" or "hashSet" event should be fired at the end
	 * @param {sap.ui.core.routing.HistoryDirection} sDirection The direction information for the hash replacement.
	 * This is set only when the parameter <code>bReplace</code> is set to <code>true</code>.
	 * @returns {Promise|undefined} When <code>pNestedHashChange</code> is given as a Promise, this function also returns
	 *  a Promise which resolves after the given promise resolves. Otherwise it returns <code>undefined</code>.
	 *
	 * @private
	 */
	RouterHashChanger.prototype._modifyHash = function(sHash, pNestedHashChange, bSuppressActiveHashCollect, bReplace, sDirection) {
		var sEventName = bReplace ? "hashReplaced" : "hashSet",
			that = this,
			oParams = {
				hash: sHash
			};

		if (bReplace && sDirection) {
			oParams.direction = sDirection;
		}

		if (!bSuppressActiveHashCollect) {
			oParams.deletePrefix = this._collectActiveDescendantPrefix();
		}

		if (pNestedHashChange) {
			this._bCollectMode = true;

			return pNestedHashChange.then(function() {
				oParams.nestedHashInfo = that._aCollectedHashInfo;
				// fire hashSet or hashReplaced event with the collected info
				that.fireEvent(sEventName, oParams);

				// reset collected hash info and exit collect mode
				that._aCollectedHashInfo = null;
				that._bCollectMode = false;
			});
		} else {
			// fire hashSet or hashReplaced event
			this.fireEvent(sEventName, oParams);
		}
	};

	/*
	 * Checks whether one of its ancestors is currently in collect mode
	 *
	 * @returns {boolean} whether one of the ancestors is in collect mode
	 *
	 * @private
	 */
	RouterHashChanger.prototype._isUnderCollectMode = function() {
		// check whether one of its ancestors (RouterHashChanger) is in collect mode
		return this.parent instanceof RouterHashChanger && this.parent._isInCollectMode();
	};

	/**
	 * Checks whether the RouterHashChanger or one of its ancestors is in collect mode
	 *
	 * @returns {boolean} whether the RouterHashChanger or one of its ancestors is in collect mode
	 *
	 * @private
	 */
	RouterHashChanger.prototype._isInCollectMode = function() {
		return this._bCollectMode || (this.parent instanceof RouterHashChanger && this.parent._isInCollectMode());
	};

	RouterHashChanger.prototype.destroy = function() {
		this.parent.deregisterRouterHashChanger(this);

		if (this.children) {
			Object.keys(this.children).forEach(function(sKey) {
				var oChild = this.children[sKey];
				oChild.destroy();
			}.bind(this));
			delete this.children;
		}

		delete this.hash;
		delete this.subHashMap;
		delete this.parent;
		delete this.key;

		HashChangerBase.prototype.destroy.apply(this, arguments);
	};

	/**
	 * Removes the given RouterHashChanger from this instance as child
	 *
	 * @param {sap.ui.core.routing.RouterHashChanger} oRouterHashChanger the RouterHashChanger which is going to be removed
	 * @private
	 */
	RouterHashChanger.prototype.deregisterRouterHashChanger = function(oRouterHashChanger) {
		if (this.children) {
			Object.keys(this.children).some(function(sKey) {
				var oChild = this.children[sKey];
				if (oChild === oRouterHashChanger) {
					delete this.children[sKey];
					return true;
				}
			}.bind(this));
		}
	};

	return RouterHashChanger;

});
