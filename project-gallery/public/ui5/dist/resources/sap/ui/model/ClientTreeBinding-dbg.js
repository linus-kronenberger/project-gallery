/*!
  * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides the client model implementation of a tree binding
sap.ui.define([
	"./ChangeReason",
	"./TreeBinding",
	"sap/base/util/each",
	"sap/ui/model/FilterProcessor",
	"sap/ui/model/FilterType",
	"sap/ui/model/SorterProcessor"
], function(ChangeReason, TreeBinding, each, FilterProcessor, FilterType, SorterProcessor) {
	"use strict";

	/**
	 * Creates a new ClientTreeBinding.
	 *
	 * This constructor should only be called by subclasses or model implementations, not by application or control code.
	 * Such code should use {@link sap.ui.model.Model#bindTree Model#bindTree} on the corresponding model implementation instead.
	 *
	 * @param {sap.ui.model.Model} oModel Model instance that this binding is created for and that it belongs to
	 * @param {string} sPath Binding path pointing to the tree / array that should be bound; syntax is defined by subclasses
	 * @param {sap.ui.model.Context} [oContext=null] Context object for this binding, mandatory when when a relative binding path is given
	 * @param {sap.ui.model.Filter[]|sap.ui.model.Filter} [aApplicationFilters=[]]
	 *   The filters to be used initially with type {@link sap.ui.model.FilterType.Application}; call {@link #filter} to
	 *   replace them
	 * @param {object} [mParameters=null] Additional model specific parameters as defined by subclasses; this class does not introduce any own parameters
	 * @param {sap.ui.model.Sorter[]|sap.ui.model.Sorter} [aSorters=[]]
	 *   The sorters used initially; call {@link #sort} to replace them
	 * @throws {Error} If one of the filters uses an operator that is not supported by the underlying model
	 *   implementation or if the {@link sap.ui.model.Filter.NONE} filter instance is contained in
	 *   <code>aApplicationFilters</code> together with other filters
	 *
	 * @class
	 * Tree binding implementation for client models.
	 *
	 * Note that a hierarchy's "state" (i.e. the information about expanded, collapsed, selected, and deselected nodes) may become
	 * inconsistent when the structure of the model data is changed at runtime. This is because each node is identified internally by its
	 * index position relative to its parent, plus its parent's ID. Therefore, inserting or removing a node in the model data will likely
	 * lead to a shift in the index positions of other nodes, causing them to lose their state and/or to gain the state of another node.

	 * <b>Note:</b> Tree bindings of client models do neither support
	 * {@link sap.ui.model.Binding#suspend suspend} nor {@link sap.ui.model.Binding#resume resume}.

	 *
	 * @alias sap.ui.model.ClientTreeBinding
	 * @extends sap.ui.model.TreeBinding
	 * @protected
	 */
	var ClientTreeBinding = TreeBinding.extend("sap.ui.model.ClientTreeBinding", /** @lends sap.ui.model.ClientTreeBinding.prototype */ {

		constructor : function(oModel, sPath, oContext, aApplicationFilters, mParameters, aSorters){
			TreeBinding.apply(this, arguments);
			if (!this.oContext) {
				this.oContext = "";
			}
			this._mLengthsCache = {};
			this.filterInfo = {
				aFilteredContexts : [],
				iMatches : 0,
				oParentContext : {}
			};
			this.oCombinedFilter = null;
			this.mNormalizeCache = {};

			if (aApplicationFilters) {
				this.oModel.checkFilter(aApplicationFilters);

				if (this.oModel._getObject(this.sPath, this.oContext)) {
					this.filter(aApplicationFilters, FilterType.Application);
				}
			}

		}

	});

	/**
	 * Return root contexts for the tree.
	 *
	 * @param {int} [iStartIndex=0] the index from which to start the retrieval of contexts
	 * @param {int} [iLength] determines how many contexts to retrieve, beginning from the start index. Defaults to the
	 *   model's size limit; see {@link sap.ui.model.Model#setSizeLimit}.
	 * @returns {sap.ui.model.Context[]} the context's array
	 *
	 * @protected
	 */
	ClientTreeBinding.prototype.getRootContexts = function(iStartIndex, iLength) {
		if (!iStartIndex) {
			iStartIndex = 0;
		}
		if (!iLength) {
			iLength = this.oModel.iSizeLimit;
		}

		var sResolvedPath = this.getResolvedPath(),
			that = this,
			aContexts,
			oContext,
			sContextPath;

		if (!sResolvedPath) {
			return [];
		}
		if (!this.oModel.isList(sResolvedPath)) {
			oContext = this.oModel.getContext(sResolvedPath);
			if (this.bDisplayRootNode) {
				aContexts = [oContext];
			} else {
				aContexts = this.getNodeContexts(oContext, iStartIndex, iLength);
			}
		} else {
			aContexts = [];
			sContextPath = this._sanitizePath(sResolvedPath);

			each(this.oModel._getObject(sContextPath), function(iIndex, oObject) {
				that._saveSubContext(oObject, aContexts, sContextPath, iIndex);
			});

			this._applySorter(aContexts);

			this._setLengthCache(sContextPath, aContexts.length);

			aContexts = aContexts.slice(iStartIndex, iStartIndex + iLength);
		}

		return aContexts;
	};

	/**
	 * Return node contexts for the tree.
	 *
	 * @param {sap.ui.model.Context} oContext to use for retrieving the node contexts
	 * @param {int} [iStartIndex=0] the index from which to start the retrieval of contexts
	 * @param {int} [iLength] determines how many contexts to retrieve, beginning from the start index. Defaults to the
	 *   model's size limit; see {@link sap.ui.model.Model#setSizeLimit}.
	 * @returns {sap.ui.model.Context[]} the context's array
	 *
	 * @protected
	 */
	ClientTreeBinding.prototype.getNodeContexts = function(oContext, iStartIndex, iLength) {
		if (!iStartIndex) {
			iStartIndex = 0;
		}
		if (!iLength) {
			iLength = this.oModel.iSizeLimit;
		}

		var sContextPath = this._sanitizePath(oContext.getPath());

		var aContexts = [],
			that = this,
			vNode = this.oModel._getObject(sContextPath),
			aArrayNames = this.mParameters && this.mParameters.arrayNames,
			aKeys;

		if (vNode) {
			if (Array.isArray(vNode)) {
				vNode.forEach(function(oSubChild, index) {
					that._saveSubContext(oSubChild, aContexts, sContextPath, index);
				});
			} else {
				// vNode is an object
				aKeys = aArrayNames || Object.keys(vNode);

				aKeys.forEach(function(sKey) {
					var oChild = vNode[sKey];
					if (oChild) {
						if (Array.isArray(oChild)) { // vNode is an object containing one or more arrays
							oChild.forEach(function(oSubChild, sSubName) {
								that._saveSubContext(oSubChild, aContexts, sContextPath, sKey + "/" + sSubName);
							});
						} else if (typeof oChild == "object") {
							that._saveSubContext(oChild, aContexts, sContextPath, sKey);
						}
					}
				});
			}
		}

		this._applySorter(aContexts);

		this._setLengthCache(sContextPath, aContexts.length);

		return aContexts.slice(iStartIndex, iStartIndex + iLength);
	};

	/**
	 * Returns if the node has child nodes.
	 *
	 * @param {sap.ui.model.Context} oContext the context element of the node
	 * @returns {boolean} <code>true</code> if the node has children
	 *
	 * @public
	 */
	ClientTreeBinding.prototype.hasChildren = function(oContext) {
		if (oContext == undefined) {
			return false;
		}
		return this.getChildCount(oContext) > 0;
	};

	/**
	 * Retrieves the number of children for the given context.
	 * Makes sure the child count is retrieved from the length cache, and fills the cache if necessary.
	 * Calling it with no arguments or 'null' returns the number of root level nodes.
	 *
	 * @param {sap.ui.model.Context} oContext the context for which the child count should be retrieved
	 * @returns {int} the number of children for the given context
	 *
	 * @public
	 * @override
	 */
	ClientTreeBinding.prototype.getChildCount = function(oContext) {
		//if oContext is null or empty -> root level count is requested
		var sPath = oContext ? oContext.sPath : this.getPath();

		if (this.oContext) {
			sPath = this.oModel.resolve(sPath, this.oContext);
		}
		sPath = this._sanitizePath(sPath);

		// if the length is not cached, call the get*Contexts functions to fill it
		if (this._mLengthsCache[sPath] === undefined) {
			if (oContext) {
				this.getNodeContexts(oContext);
			} else {
				this.getRootContexts();
			}
		}

		return this._mLengthsCache[sPath];
	};

	/**
	 * Makes sure the path is prepended and appended with a "/" if necessary.
	 *
	 * @param {string} sContextPath The path to be checked
	 *
	 * @returns {string} The sanitized path
	 */
	ClientTreeBinding.prototype._sanitizePath = function (sContextPath) {
		if (!sContextPath.endsWith("/")) {
			sContextPath = sContextPath + "/";
		}
		if (!sContextPath.startsWith("/")) {
			sContextPath = "/" + sContextPath;
		}
		return sContextPath;
	};

	ClientTreeBinding.prototype._saveSubContext = function(oNode, aContexts, sContextPath, sName) {
		// only collect node if it is defined (and not null), because typeof null == "object"!
		if (oNode && typeof oNode == "object") {
			var oNodeContext = this.oModel.getContext(sContextPath + sName);
			// check if there is a filter on this level applied
			if (this.oCombinedFilter && !this.bIsFiltering) {
				if (this.filterInfo.aFilteredContexts.indexOf(oNodeContext) != -1) {
					aContexts.push(oNodeContext);
				}
			} else {
				aContexts.push(oNodeContext);
			}
		}
	};


	/**
	 * Filters the tree according to the filter definitions.
	 *
	 * The filtering is applied recursively through the tree.
	 * The parent nodes of filtered child nodes will also be displayed if they don't match the filter conditions.
	 * All filters belonging to a group (=have the same path) are ORed and after that the
	 * results of all groups are ANDed.
	 *
	 * @param {sap.ui.model.Filter[]|sap.ui.model.Filter} [aFilters=[]]
	 *   The filters to use; in case of type {@link sap.ui.model.FilterType.Application} this replaces the filters given
	 *   in {@link sap.ui.model.ClientModel#bindTree}; a falsy value is treated as an empty array and thus removes all
	 *   filters of the specified type
	 * @param {sap.ui.model.FilterType} [sFilterType]
	 *   The type of the filter to replace; if no type is given, all filters previously configured with type
	 *   {@link sap.ui.model.FilterType.Application} are cleared, and the given filters are used as filters of type
	 *   {@link sap.ui.model.FilterType.Control}
	 * @returns {this} <code>this</code> to facilitate method chaining
	 * @throws {Error} If one of the filters uses an operator that is not supported by the underlying model
	 *   implementation or if the {@link sap.ui.model.Filter.NONE} filter instance is contained in
	 *   <code>aFilters</code> together with other filters
	 *
	 * @public
	 * @see sap.ui.model.TreeBinding.prototype.filter
	 */
	ClientTreeBinding.prototype.filter = function(aFilters, sFilterType){
		// The filtering is applied recursively through the tree and stores all filtered contexts and its parent contexts in an array.

		// wrap single filters in an array
		if (aFilters && !Array.isArray(aFilters)) {
			aFilters = [aFilters];
		}

		// check filter integrity
		this.oModel.checkFilter(aFilters);

		if (sFilterType == FilterType.Application) {
			this.aApplicationFilters = aFilters || [];
		} else if (sFilterType == FilterType.Control) {
			this.aFilters = aFilters || [];
		} else {
			//Previous behaviour
			this.aFilters = aFilters || [];
			this.aApplicationFilters = [];
		}


		this.oCombinedFilter = FilterProcessor.combineFilters(this.aFilters, this.aApplicationFilters);
		if (this.oCombinedFilter) {
			this.applyFilter();
		}
		this._mLengthsCache = {};
		this._fireChange({reason: "filter"});
		/** @deprecated As of version 1.11.0 */
		this._fireFilter({filters: aFilters});

		return this;
	};

	/**
	 * Apply the current defined filters on the existing dataset.
	 *
	 * @private
	 */
	ClientTreeBinding.prototype.applyFilter = function () {
		// reset previous stored filter contexts
		this.filterInfo.aFilteredContexts = [];
		this.filterInfo.iMatches = 0;
		this.filterInfo.oParentContext = {};
		this._applyFilterRecursive();
	};

	/**
	 * Filters the tree recursively.
	 * Performs the real filtering and stores all filtered contexts and its parent context into an array.
	 *
	 * @param {sap.ui.model.Context} [oParentContext] the context where to start. The children of this node context are
	 *   then filtered recursively.
	 *
	 * @private
	 */
	ClientTreeBinding.prototype._applyFilterRecursive = function(oParentContext){

		var that = this,
			aFilteredContexts = [];

		if (!this.oCombinedFilter) {
			return;
		}

		this.bIsFiltering = true;

		var aUnfilteredContexts;
		if (oParentContext) {
			aUnfilteredContexts = this.getNodeContexts(oParentContext, 0, Number.MAX_VALUE); // For client bindings: get *all* available contexts
		} else {
			// Root
			aUnfilteredContexts = this.getRootContexts(0, Number.MAX_VALUE);
		}

		this.bIsFiltering = false;

		if (aUnfilteredContexts.length > 0) {
			each(aUnfilteredContexts, function(i, oContext){
				// Add parentContext reference for later use (currently to calculate correct group IDs in the adapter)
				oContext._parentContext = oParentContext;
				that._applyFilterRecursive(oContext);
			});

			aFilteredContexts = FilterProcessor.apply(aUnfilteredContexts, this.oCombinedFilter, function (oContext, sPath) {
				return that.oModel.getProperty(sPath, oContext);
			}, this.mNormalizeCache);

			if (aFilteredContexts.length > 0) {
				this.filterInfo.aFilteredContexts =
					this.filterInfo.aFilteredContexts.concat(aFilteredContexts);
				this.filterInfo.aFilteredContexts.push(oParentContext);
				this.filterInfo.oParentContext = oParentContext;
				this.filterInfo.iMatches += aFilteredContexts.length;
			}
			// push additionally parentcontexts if any children are already included in filtered contexts
			if (aUnfilteredContexts.indexOf(this.filterInfo.oParentContext) != -1) {
				this.filterInfo.aFilteredContexts.push(oParentContext);
				// set the parent context which was added to be the new parent context
				this.filterInfo.oParentContext = oParentContext;
			}
		}
	};

	/**
	 * Sorts the contexts of this ClientTreeBinding.
	 * The tree will be sorted level by level. So the nodes are NOT sorted absolute, but relative to
	 * their parent node, to keep the hierarchy untouched.
	 *
	 * @param {sap.ui.model.Sorter[]|sap.ui.model.Sorter} [aSorters=[]]
	 *   The sorters to use; they replace the sorters given in {@link sap.ui.model.ClientModel#bindTree}; a falsy value
	 *   is treated as an empty array and thus removes all sorters
	 * @returns {this} Returns <code>this</code> to facilitate method chaining
	 *
	 * @public
	 */
	ClientTreeBinding.prototype.sort = function (aSorters) {
		aSorters = aSorters || [];
		this.aSorters = Array.isArray(aSorters) ? aSorters : [aSorters];

		this._fireChange({reason: ChangeReason.Sort});

		return this;
	};

	/**
	 * Internal function to apply this.aSorters to the given array of contexts.
	 *
	 * @param {sap.ui.model.Context[]} aContexts the context array which should be sorted (inplace)
	 */
	ClientTreeBinding.prototype._applySorter = function (aContexts) {
		var that = this;
		SorterProcessor.apply(aContexts, this.aSorters, function(oContext, sPath) {
			return that.oModel.getProperty(sPath, oContext);
		},
		function (oContext) {
			//the context path is used as a key for internal use in the SortProcessor.
			return oContext.getPath();
		});
	};

	/**
	 * Sets the length cache.
	 * Called by get*Contexts() to keep track of the child count (after filtering).
	 *
	 * @param {string} sKey The cache entry to set the length for
	 * @param {int} iLength The new length
	 */
	ClientTreeBinding.prototype._setLengthCache = function (sKey, iLength) {
		// keep track of the child count for each context (after filtering)
		this._mLengthsCache[sKey] = iLength;
	};

	/**
	 * Check whether this Binding would provide new values and in case it changed,
	 * inform interested parties about this.
	 *
	 * @param {boolean} [bForceupdate] Not used in this method
	 *
	 */
	ClientTreeBinding.prototype.checkUpdate = function(bForceupdate){
		// apply filter again
		this.applyFilter();
		this._mLengthsCache = {};
		this._fireChange();
	};

	/**
	 * Returns the count of entries in the tree, or <code>undefined</code> if it is unknown. If the
	 * tree is filtered, the count of all entries matching the filter conditions is returned. The
	 * entries required only for the tree structure are not counted.
	 *
	 * @returns {number|undefined} The count of entries in the tree, or <code>undefined</code> if
	 *   the binding is not resolved
	 *
	 * @public
	 * @since 1.108.0
	 */
	 ClientTreeBinding.prototype.getCount = function () {
		if (!this.isResolved()) {
			return undefined;
		}

		if (this.oCombinedFilter) {
			return this.filterInfo.iMatches;
		}

		return ClientTreeBinding._getTotalNodeCount(this.oModel.getObject(this.getResolvedPath()),
			this.mParameters && this.mParameters.arrayNames, true);
	};

	/**
	 * Returns the count of objects in the given data by iterating recursively over the given array
	 * names, or if not given over all object keys.
	 *
	 * @param {any} vData
	 *   The root of the data to count objects
	 * @param {string[]} [aArrayNames]
	 *   The array of property names to consider when counting the child objects in the given data
	 * @param {boolean} [bRoot]
	 *   Whether the given data is the root of the tree
	 * @returns {number}
	 *   The total count of objects in the given data
	 *
	 * @private
	 */
	ClientTreeBinding._getTotalNodeCount = function (vData, aArrayNames, bRoot) {
		if (vData === null || typeof vData !== "object") {
			return 0; // null and non-objects do not count
		}

		if (Array.isArray(vData)) {
			return vData.reduce(function (iCount, vItem) {
				return iCount + ClientTreeBinding._getTotalNodeCount(vItem, aArrayNames);
			}, 0);
		}

		return (aArrayNames || Object.keys(vData)).reduce(function (iCount, sKey) {
			return iCount + ClientTreeBinding._getTotalNodeCount(vData[sKey], aArrayNames);
		}, bRoot ? 0 /*root object doesn't count*/ : 1);
	};

	return ClientTreeBinding;
});