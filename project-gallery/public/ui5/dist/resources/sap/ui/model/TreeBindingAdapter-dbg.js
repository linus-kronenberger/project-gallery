/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides class sap.ui.model.odata.TreeBindingAdapter
sap.ui.define([
	'sap/ui/model/TreeBinding',
	'sap/ui/model/TreeAutoExpandMode',
	'sap/ui/model/ChangeReason',
	'sap/ui/model/TreeBindingUtils',
	"sap/base/assert",
	"sap/base/Log",
	"sap/base/util/each",
	"sap/base/util/isEmptyObject"
],
	function(
		TreeBinding,
		TreeAutoExpandMode,
		ChangeReason,
		TreeBindingUtils,
		assert,
		Log,
		each,
		isEmptyObject
	) {
		"use strict";

		/**
		 * Adapter for {@link sap.ui.model.TreeBinding} to add the list binding functionality and use the tree structure
		 * in list based controls.
		 *
		 * @alias sap.ui.model.TreeBindingAdapter
		 * @namespace
		 *
		 * @private
		 * @ui5-restricted sap.ui.model.ClientTreeBindingAdapter, sap.ui.model.odata.v2.ODataTreeBindingAdapter
		 */
		var TreeBindingAdapter = function() {

			// ensure only TreeBindings are enhanced which have not been enhanced yet
			if (!(this instanceof TreeBinding) || this._bIsAdapted) {
				return;
			}

			// apply the methods of the adapters prototype to the TreeBinding instance
			for (var fn in TreeBindingAdapter.prototype) {
				if (TreeBindingAdapter.prototype.hasOwnProperty(fn)) {
					this[fn] = TreeBindingAdapter.prototype[fn];
				}
			}

			// make sure we have a parameter object
			this.mParameters = this.mParameters || {};

			// initialize the contexts
			this._aRowIndexMap = [];

			//Store length and threshold for all requests
			this._iThreshold = 0;
			this._iPageSize = 0;

			//set the default auto expand mode
			this.setAutoExpandMode(this.mParameters.autoExpandMode || TreeAutoExpandMode.Sequential);

			//default value for collapse recursive
			if (this.mParameters.collapseRecursive === undefined) {
				this.bCollapseRecursive = true;
			} else {
				this.bCollapseRecursive = !!this.mParameters.collapseRecursive;
			}

			//create general tree structure
			this._createTreeState();

			this._bIsAdapted = true;
		};

		/**
		 * Returns a tree state handle to encapsulate the actual tree state.
		 *
		 * This function is exposed in the sub-classes/adapters (e.g. ODataTreeBindingAdapter) if
		 * necessary/possible.
		 *
		 * @returns {object} The current tree state
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype.getCurrentTreeState = function () {
			var sDelimiter = ";",
				sGroupID;

			//expanded
			var mExpandedEntriesGroupIDs = {};
			for (sGroupID in this._mTreeState.expanded) {
				mExpandedEntriesGroupIDs[sGroupID] = true;
			}

			//collapsed
			var mCollapsedEntriesGroupIDs = {};
			for (sGroupID in this._mTreeState.collapsed) {
				mCollapsedEntriesGroupIDs[sGroupID] = true;
			}

			//selected
			var mSelectedEntriesGroupIDs = {};
			for (sGroupID in this._mTreeState.selected) {
				mSelectedEntriesGroupIDs[sGroupID] = true;
			}

			return {
				_getExpandedList: function () {
					return Object.keys(mExpandedEntriesGroupIDs).join(sDelimiter);
				},
				_getCollapsedList: function () {
					return Object.keys(mCollapsedEntriesGroupIDs).join(sDelimiter);
				},
				_getSelectedList: function () {
					return Object.keys(mSelectedEntriesGroupIDs).join(sDelimiter);
				},
				_isExpanded: function (sGroupID) {
					return !!mExpandedEntriesGroupIDs[sGroupID];
				},
				_isCollapsed: function (sGroupID) {
					return !!mCollapsedEntriesGroupIDs[sGroupID];
				},
				_remove: function (sGroupID) {
					delete mExpandedEntriesGroupIDs[sGroupID];
					delete mCollapsedEntriesGroupIDs[sGroupID];
					delete mSelectedEntriesGroupIDs[sGroupID];
				}
			};
		};

		/**
		 * Sets the given as a start point for the tree.
		 * Only in OperationMode.Client.
		 *
		 * @param {object} oTreeState Only valid tree states from the same binding are accepted
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype.setTreeState = function (oTreeState) {
			this._oInitialTreeState = oTreeState;
		};

		/**
		 * Sets the auto expand mode for this Adapter. Default is "Bundled".
		 *
		 * @param {sap.ui.model.TreeAutoExpandMode} sAutoExpandMode The new auto expand mode to set
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype.setAutoExpandMode = function (sAutoExpandMode) {
			this._autoExpandMode = sAutoExpandMode;
		};

		/**
		 * Returns the number of entries in the tree.
		 *
		 * @return {number} Returns the number of entries in the tree
		 *
		 * @public
		 */
		TreeBindingAdapter.prototype.getLength = function() {
			if (!this._oRootNode) {
				return 0;
			}

			// The length is the sum of the trees magnitue
			return this._oRootNode.magnitude;
		};

		/**
		 * Gets the context of the node at the given index.
		 *
		 * @param {number} iIndex
		 *   The index of the node
		 *
		 * @returns {sap.ui.model.Context|undefined}
		 *   The context of the node at the given index or <code>undefined</code> if the binding is
		 *   initial or no node was found at the given index
		 *
		 * @private
		 * @ui5-restricted sap.gantt.GanttChart,
		 * sap.suite.ui.generic.template.lib.presentationControl.SmartTableHandler,
		 * sap.ui.table.AnalyticalTable, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.getContextByIndex = function (iIndex) {
			//step out if the binding is initial (as long as the metadata is not yet loaded)
			if (this.isInitial()) {
				return undefined;
			}

			var oNode = this.findNode(iIndex);
			return oNode ? oNode.context : undefined;
		};

		/*
		 * @private
		 * @ui5-restricted sap.m.TreeItemBase, sap.ui.table.AnalyticalTable, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.getNodeByIndex = function(iIndex) {
			//step out if the binding is initial (as long as the metadata is not yet loaded)
			if (this.isInitial()) {
				return undefined;
			}

			// if the requested index is bigger than the magnitude of the tree, the index can never
			// be inside the tree.
			if (iIndex >= this.getLength()) {
				return undefined;
			}

			return this.findNode(iIndex);
		};

		/**
		 * Gets the tree node matching the given search parameters. However, if there are sum rows
		 * cached (meaning, they are currently displayed), these will also be returned.
		 *
		 * @param {number} iRowIndex
		 *   The row index of the node
		 *
		 * @returns {object|undefined}
		 *   The found node or <code>undefined</code> if the binding is initial or no node is found
		 *
		 * @private
		 * @ui5-restricted sap.gantt.simple.GanttPrinting,
		 * sap.suite.ui.generic.template.listTemplates.controller.DetailController
		 */
		TreeBindingAdapter.prototype.findNode = function (iRowIndex) {

			//step out if the binding is initial (as long as the metadata is not yet loaded)
			if (this.isInitial()) {
				return undefined;
			}

			var sParameterType = typeof iRowIndex;
			var oFoundNode;

			var aSearchResult = [];

			//if the parameter is an index -> first check the cache, and then search the tree if necessary
			if (sParameterType === "number") {
				oFoundNode = this._aRowIndexMap[iRowIndex];

				if (!oFoundNode) {
					var iIndexCounter = -1;
					this._match(this._oRootNode, aSearchResult, 1, function (oNodeToCheck) {
						if (iIndexCounter === iRowIndex) {
							return true;
						}
						iIndexCounter += 1;

						return false;
					});

					oFoundNode = aSearchResult[0];
				}

			}
			/*else if (sParameterType === "string" || sParameterType === "object") {
			 // match auf group id
			 // oFoundNode = aSearchResult[0];
			 }*/

			return oFoundNode;
		};

		/*
		 * @private
		 */
		TreeBindingAdapter.prototype._createTreeState = function (bReset) {
			if (!this._mTreeState || bReset) {
				//general tree status information, the nodes are referenced by their groupID
				this._mTreeState = {
					expanded: {}, // a map of all expanded nodes
					collapsed: {}, // a map of all collapsed nodes
					selected: {}, // a map of all selected nodes
					deselected : {} // a map of all deselected nodes (due to user interaction)
				};
			}
		};

		/*
		 * @private
		 */
		TreeBindingAdapter.prototype._updateTreeState = function (mParameters) {
			mParameters = mParameters || {};

			//get the source and target list
			var oTargetStateObject = mParameters.expanded ? this._mTreeState.expanded : this._mTreeState.collapsed;
			var oSourceStateObject = mParameters.expanded ? this._mTreeState.collapsed : this._mTreeState.expanded;

			// get the current node state, or create a new one
			var oNodeStateInSource = this._getNodeState(mParameters.groupID);
			// if no node state exists -> create it
			if (!oNodeStateInSource) {
				oNodeStateInSource = mParameters.fallbackNodeState || this._createNodeState({
					groupID: mParameters.groupID,
					expanded: mParameters.expanded,
					sum: mParameters.sum
				});
			}

			//move from the source state to the target state
			delete oSourceStateObject[mParameters.groupID];
			oTargetStateObject[mParameters.groupID] = oNodeStateInSource;

			//keep track of the expanded status on the node state
			oNodeStateInSource.expanded = mParameters.expanded;

			return oNodeStateInSource;
		};


		/**
		 * Creates a new node state using supplied parameters.
		 *
		 * @param {object} mParameters
		 *   Parameters for the new node state
		 *
		 * @returns {object|undefined}
		 *   The created node state or <code>undefined</code> if no group id is given
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._createNodeState = function (mParameters) {
			if (!mParameters.groupID) {
				assert(false, "To create a node state a group ID is mandatory!");
				return undefined;
			}

			// check if the tree has an initial expansion state for the given groupID
			var bInitiallyExpanded;
			var bInitiallyCollapsed;
			if (this._oInitialTreeState) {
				bInitiallyExpanded = this._oInitialTreeState._isExpanded(mParameters.groupID);
				bInitiallyCollapsed = this._oInitialTreeState._isCollapsed(mParameters.groupID);

				this._oInitialTreeState._remove(mParameters.groupID);
			}

			// check the expansion state which should be set
			// the given values have precedence over the initially set values, false is the fallback
			var bIsExpanded = mParameters.expanded || bInitiallyExpanded || false;
			var bIsSelected = mParameters.selected || false;

			var oNodeState = {
				groupID: mParameters.groupID,
				expanded: bIsExpanded,
				//a fresh node state has to have a single page with the current pagesize
				sections: mParameters.sections || [{startIndex: 0, length: this._iPageSize}],
				sum: mParameters.sum || false,
				selected: bIsSelected
			};

			// track initally modified nodes in the global treeState
			if (bInitiallyExpanded || bInitiallyCollapsed) {
				this._updateTreeState({groupID: mParameters.groupID, fallbackNodeState: oNodeState, expanded: bInitiallyExpanded, collapsed: bInitiallyCollapsed});
			}

			return oNodeState;
		};

		/*
		 * @private
		 */
		TreeBindingAdapter.prototype._getNodeState = function (sGroupID) {
			var oExpanded = this._mTreeState.expanded[sGroupID];
			var oCollapsed = this._mTreeState.collapsed[sGroupID];
			var oSelected = this._mTreeState.selected[sGroupID];
			var oDeselected = this._mTreeState.deselected[sGroupID];

			//return one or the other
			//may be undefined if no sections loaded yet
			return oExpanded || oCollapsed || oSelected || oDeselected;
		};

		/**
		 * Merges the new section with all currently known sections.
		 * Makes sure that only non overlapping sections are kept.
		 *
		 * @param {string} sGroupID
		 *   The group ID of the node below which the new section should be merged
		 * @param {object} oNewSection
		 *   The new section to merge
		 *
		 * @returns {object|undefined}
		 *   The merged sections
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._updateNodeSections = function (sGroupID, oNewSection) {
			var oNodeState = this._getNodeState(sGroupID);

			if (!oNodeState) {
				assert(false, "No Node State for Group ID '" + sGroupID + "' found!");
				return undefined;
			} else if (!oNewSection) {
				assert(false, "No Section given!");
				return undefined;
			} else if (oNewSection.length <= 0) {
				assert(false, "The length of the given section must be positive greater than 0.");
				return undefined;
			} else if (oNewSection.startIndex < 0) {
				assert(false, "The sections start index must be greater/equal to 0.");
				return undefined;
			}

			// Iterate over all known/loaded sections of the node
			oNodeState.sections = TreeBindingUtils.mergeSections(oNodeState.sections, oNewSection);

			return oNodeState.sections;
		};

		/**
		 * Increases the section length of all sections of all nodes in the tree. This is necessary in case the page size increases between requests.
		 * Otherwise unnecessary requests would be performed, because the section length does not match the requested page size.
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._increaseSections = function() {
			var fnIncreaseSections = function (oNode) {
				if (!oNode) {
					return;
				}
				var iMaxGroupSize = this._getMaxGroupSize(oNode);

				// adapt node sections if the page size increased since the last getcontexts call
				// and only if we do not already have a count for the group
				var oNodeState = oNode.nodeState;
				if (iMaxGroupSize === undefined) {
					var aNewSections = [];
					for (var i = 0; i < oNodeState.sections.length; i++) {
						var oCurrentSection = oNodeState.sections[i];
						oCurrentSection.length = Math.max(oCurrentSection.length, this._iPageSize);
						aNewSections = TreeBindingUtils.mergeSections(aNewSections, oCurrentSection);
					}
					oNodeState.sections = aNewSections;
				}
			};

			this._map(this._oRootNode, fnIncreaseSections);
		};

		/**
		 * Calculates the maximum possible group-size for a given node.
		 * Not the same as the direct number of children.
		 *
		 * @param {object} oNode The node to calculate the group-size for
		 *
		 * @returns {number} The maximum possible group-size
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._getMaxGroupSize = function (oNode) {
			var iMaxGroupSize = 0;
			if (oNode.isArtificial) {
				// When displaying the root node, the magnitude will always be at least 1:
				// Except: if we are bound to a list/collection (e.g. Employees), there will be no single root node
				// so we retrieve the regular groupSize instead
				var bIsList = this.oModel.isList(this.sPath, this.getContext());
				if (this.bDisplayRootNode && !bIsList && !this._bRootMissing) {
					iMaxGroupSize = 1;
				} else {
					iMaxGroupSize = this._getGroupSize(oNode) || 0;
				}
			} else {
				iMaxGroupSize = this.nodeHasChildren(oNode) ? this._getGroupSize(oNode) : 0;
			}
			return iMaxGroupSize;
		};

		/**
		 * Gets an array of contexts for the requested part of the tree.
		 *
		 * @param {number} [iStartIndex=0]
		 *   The index of the first requested context
		 * @param {number} [iLength]
		 *   The maximum number of returned contexts; if not given the model's size limit is used;
		 *   see {@link sap.ui.model.Model#setSizeLimit}
		 * @param {number} [iThreshold=0]
		 *   The maximum number of contexts to read to read additionally as buffer
		 * @return {sap.ui.model.Context[]}
		 *   The requested tree contexts
		 *
		 * @protected
		 */
		TreeBindingAdapter.prototype.getContexts = function (iStartIndex, iLength, iThreshold) {
			return this._getContextsOrNodes(false, iStartIndex, iLength, iThreshold);
		};

		/**
		 * Gets an array of either node objects or contexts for the requested part of the tree.
		 *
		 * @param {boolean} bReturnNodes
		 *   Whether to return node objects or contexts
		 * @param {number} [iStartIndex=0]
		 *   The index of the first requested node or context
		 * @param {number} [iLength]
		 *   The maximum number of returned nodes or contexts; if not given the model's size limit
		 *   is used; see {@link sap.ui.model.Model#setSizeLimit}
		 * @param {number} [iThreshold=0]
		 *   The maximum number of nodes or contexts to read additionally as buffer
		 * @return {object[]|sap.ui.model.Context[]}
		 *   The requested tree nodes or contexts
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._getContextsOrNodes = function (bReturnNodes, iStartIndex,
				iLength, iThreshold) {
			var mMissingSections, oNode,
				aContexts = [],
				aNodes = [];

			if (!this.isResolved() || this.isInitial()) {
				return [];
			}

			iStartIndex = iStartIndex || 0;
			iLength = iLength || this.oModel.iSizeLimit;
			iThreshold = iThreshold || 0;

			// test if the pagesize has increased -> used to optimise "too small" node sections, see _loadChildContexts
			if (iLength > this._iPageSize) {
				this._iPageSize = iLength;
				this._increaseSections();
			}

			this._iThreshold = Math.max(this._iThreshold, iThreshold);

			// clear the overall rowIndex to tree node map
			this._aRowIndexMap = [];

			this._buildTree(iStartIndex, iLength);

			// retrieve the requested section of nodes from the tree
			if (this._oRootNode) {
				aNodes = this._retrieveNodeSection(this._oRootNode, iStartIndex, iLength);
			}

			// keep a map between Table.RowIndex and tree nodes
			this._updateRowIndexMap(aNodes, iStartIndex);

			//find missing sections
			for (var i = 0; i < aNodes.length; i++) {
				oNode = aNodes[i];
				// we found a gap because the node is empty (context is undefined)
				if (!oNode.context) {
					mMissingSections = mMissingSections || {};
					// check if we already build a missing section
					var oParentNode = oNode.parent;

					mMissingSections[oParentNode.groupID] = oParentNode;

					this._updateNodeSections(oParentNode.groupID, {startIndex: oNode.positionInParent, length: 1});
				}

				aContexts.push(oNode.context);
			}

			// trigger load for nodes with missing sections
			if (mMissingSections) {
				var that = this;

				//if we have a missing section inside a subtree, we need to reload this subtree
				each(mMissingSections, function (sGroupID, oNode) {
					// reset the root of the subtree
					oNode.magnitude = 0;
					oNode.numberOfTotals = 0;

					that._loadChildContexts(oNode);
				});

				// try to fill gaps in our return array if we already have new data (thanks to thresholding)
				aContexts = [];
				for (var j = 0; j < aNodes.length; j++) {
					oNode = aNodes[j];
					aContexts.push(oNode.context);
				}
			}

			if (bReturnNodes) {
				return aNodes;
			} else {
				return aContexts;
			}
		};

		/**
		 * Gets an array of nodes for the requested part of the tree.
		 *
		 * @param {number} iStartIndex
		 *   The index of the first requested node
		 * @param {number} iLength
		 *   The maximum number of returned nodes; if not given the model's size limit is used; see
		 *   {@link sap.ui.model.Model#setSizeLimit}
		 * @param {number} [iThreshold=0]
		 *   The maximum number of nodes to read additionally as buffer
		 * @return {object[]}
		 *   The requested tree nodes
		 *
		 * @protected
		 * @ui5-restricted sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.getNodes = function (iStartIndex, iLength, iThreshold) {
			return this._getContextsOrNodes(true, iStartIndex, iLength, iThreshold);
		};

		/**
		 * Updates a node section from the tree with our RowIndex Mapping table.
		 *
		 * @param {object[]} aNodes The nodes to update
		 * @param {number} iStartIndex The position where the update should start
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._updateRowIndexMap = function (aNodes, iStartIndex) {
			//throw away the old mapping index
			this._aRowIndexMap = [];

			for (var i = 0; i < aNodes.length; i++) {
				this._aRowIndexMap[iStartIndex + i] = aNodes[i];
			}
		};

		/**
		 * Depth-First traversal of a sub-tree object structure starting with the given node as the
		 * root. Retrieves all found nodes (including gaps). Gaps will be filled with placeholder
		 * nodes. These placeholders are later used to automatically update the tree after
		 * invalidating and refreshing the sub-tree(s) containing the gaps.
		 *
		 * @param {object} oNode
		 *   Ignored; the root node is always used as starting point
		 * @param {number} iStartIndex
		 *   The start of the tree section which should be retrieved
		 * @param {number} iLength
		 *   The length of the tree section which should be retrieved
		 *
		 * @return {object[]} An array containing all collected nodes, for which the absolute node
		 *   index is greater than iStartIndex; the length of the array will be iLength (or less if
		 *   the tree does not have that many nodes).
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._retrieveNodeSection = function (oNode, iStartIndex, iLength) {

			var iNodeCounter = -1;
			var aNodes = [];

			this._match(this._oRootNode, [], iLength, function (oNode, iPositionInParent, oParentNode) {
				//make sure to exclude the artificial root node from being counted
				if (!oNode || !oNode.isArtificial) {
					iNodeCounter++;
				}

				if (iNodeCounter >= iStartIndex && iNodeCounter < iStartIndex + iLength) {
					//node does not exist -> a gap in the tree, fill up with placeholder node
					if (!oNode) {
						oNode = this._createNode({parent: oParentNode, positionInParent: iPositionInParent});
						oParentNode.children[iPositionInParent] = oNode;
					}
					aNodes.push(oNode);
					return true;
				}

				return false;
			});

			return aNodes;
		};

		/**
		 * Builds the tree from start index with the specified number of nodes.
		 *
		 * @param {int} iStartIndex Index from which the tree shall be built
		 * @param {int} iLength Number of Nodes
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._buildTree = function(iStartIndex, iLength) {
			//throw away our tree
			this._oRootNode = undefined;

			//the artificial root hast no context
			var oRootContext = null;

			var sRootGroupID = this._calculateGroupID({context: oRootContext, parent: null});

			var oRootNodeState = this._getNodeState(sRootGroupID);

			// create root node state if none exists
			if (!oRootNodeState) {

				oRootNodeState = this._createNodeState({
					groupID: sRootGroupID,
					sum: true,
					sections: [{
						startIndex: iStartIndex,
						length: iLength
					}]
				});

				//the root node is expanded by default under the following conditions:
				// 1: root node is artifical/should not be displayed OR we have an autoExpand situation (numberOfExpandedLevels > 0)
				// 2: the root node was not previously collapsed by the user
				this._updateTreeState({
					groupID: oRootNodeState.groupID,
					fallbackNodeState: oRootNodeState,
					expanded: true
				});

			}

			//create the root node
			this._oRootNode = this._createNode({
				context: oRootContext,
				parent: null,
				level: this.bDisplayRootNode && !(oRootContext === null) ? 0 : -1,
				nodeState: oRootNodeState,
				isLeaf: false,
				autoExpand: this.getNumberOfExpandedLevels() + 1
			});
			//flag the root node as artificial in case we have no real root context (but only children)
			this._oRootNode.isArtificial = true;

			//expanded the root node if requested
			if (this._mTreeState.expanded[this._oRootNode.groupID]) {
				this._loadChildContexts(this._oRootNode);
			}

		};

		/**
		 * Calculate the request length based on the given information.
		 *
		 * @param {number} iMaxGroupSize The maximum group size
		 * @param {object} oSection The information of the current section
		 *
		 * @returns {number} The calculated request length
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._calculateRequestLength = function(iMaxGroupSize, oSection) {
			var iRequestedLength;

			if (!iMaxGroupSize) {
				iRequestedLength = oSection.length;
			} else {
				//the maximum entries we can request is the groupSize
				iRequestedLength = Math.max(Math.min(oSection.length, iMaxGroupSize - oSection.startIndex), 0);
			}

			return iRequestedLength;
		};

		/*
		 * @private
		 */
		TreeBindingAdapter.prototype._loadChildContexts = function (oNode) {
			var oNodeState = oNode.nodeState;

			// calculate magnitude/groupsize of (artificial) root node seperately
			var iMaxGroupSize = this._getMaxGroupSize(oNode);

			// make sure the children array gets at least the requested length
			if (iMaxGroupSize > 0) {
				if (!oNode.children[iMaxGroupSize - 1]) {
					oNode.children[iMaxGroupSize - 1] = undefined;
				}

				oNodeState.leafCount = iMaxGroupSize;
			}

			// if the binding is running in the OperationMode "Client", make sure the node sections are optimised to load everything
			if (this.bClientOperation) {
				oNodeState.sections = [{
					startIndex: 0,
					length: iMaxGroupSize
				}];
			}

			//iterate all loaded (known) sections
			for (var i = 0; i < oNodeState.sections.length; i++) {

				var oCurrentSection = oNodeState.sections[i];

				var iRequestedLength = this._calculateRequestLength(iMaxGroupSize, oCurrentSection);

				//if we are in the autoexpand mode "bundled", suppress additional requests during the tree traversal
				//paging is handled differently
				if (oNode.autoExpand >= 0 && this._autoExpandMode === TreeAutoExpandMode.Bundled) {
					iRequestedLength = Math.max(0, iMaxGroupSize);
				}

				//try to load the contexts for this sections (may be [])
				var aChildContexts;
				if (oNode.isArtificial) {
					aChildContexts = this.getRootContexts(oCurrentSection.startIndex, iRequestedLength, this._iThreshold);
				} else {
					aChildContexts = this.nodeHasChildren(oNode) ? this.getNodeContexts(oNode.context, oCurrentSection.startIndex, iRequestedLength, this._iThreshold) : [];
				}

				//for each child context we create a new node
				for (var j = 0; j < aChildContexts.length; j++) {
					var oChildContext = aChildContexts[j];

					// in case the binding does return a gap in the data (a.k.a. undefined) we skip this child
					// it will be collected as a missing section later in getContexts()
					if (!oChildContext) {
						continue;
					}

					// calculate the index of the child node in the children array
					// the offset in the children array is the section start index
					var iChildIndex = j + oCurrentSection.startIndex;

					var oChildNode = oNode.children[iChildIndex];

					//the updated node data after this tree building cycle
					var oUpdatedNodeData = {
						context: aChildContexts[j],
						parent: oNode,
						level: oNode.level + 1,
						positionInParent: iChildIndex,
						autoExpand: Math.max(oNode.autoExpand - 1, -1)
					};

					// if we already have a child node reuse it, otherwise create a new one
					// Using an object reference allows us to automatically update our "snapshot" of the tree, we retrieve in getContexts
					if (oChildNode) {
						oChildNode.context = oUpdatedNodeData.context;
						oChildNode.parent = oUpdatedNodeData.parent;
						oChildNode.level = oUpdatedNodeData.level;
						oChildNode.positionInParent = oUpdatedNodeData.positionInParent;
						oChildNode.magnitude = 0;
						oChildNode.numberOfTotals = 0;
						oChildNode.autoExpand = oUpdatedNodeData.autoExpand;
						//calculate the group id for the given context
						//if we reach this point, the binding returned a context from which we can calculate the group id
						var sGroupIDForChild;
						if (oChildContext) {
							sGroupIDForChild = this._calculateGroupID(oChildNode);
						}
						oChildNode.groupID = sGroupIDForChild;
					} else {
						//create a node one level deeper (missing a group ID and a context)
						oChildNode = this._createNode(oUpdatedNodeData);
					}

					//retrieve the node state OR create one if necessary
					oChildNode.nodeState = this._getNodeState(oChildNode.groupID);
					if (!oChildNode.nodeState) {
						oChildNode.nodeState = this._createNodeState({
							groupID: oChildNode.groupID,
							expanded: false // a new node state is never expanded (EXCEPT during auto expand!)
						});
					}

					oChildNode.nodeState.parentGroupID = oNode.groupID;

					// if the table is grouped: a leaf is a node 1 level deeper than the number of grouped columns
					// otherwise if the table is (fully) ungrouped every node is a leaf
					oChildNode.isLeaf = !this.nodeHasChildren(oChildNode);

					oNode.children[iChildIndex] = oChildNode;

					if (oChildNode.isLeaf) {
						oNode.numberOfLeafs += 1;
					}

					//if the parent node is in selectAllMode, select this child node
					if (oChildNode.parent.nodeState.selectAllMode && !this._mTreeState.deselected[oChildNode.groupID]) {
						this.setNodeSelection(oChildNode.nodeState, true);
					}

					// if the child node was previously expanded, it has to be expanded again after we rebuilt our tree
					// --> recursion
					// but only if we have at least 1 group (otherwise we have a flat list and not a tree)
					if ((oChildNode.autoExpand > 0 || oChildNode.nodeState.expanded) && this.isGrouped() ) {

						if (!this._mTreeState.collapsed[oChildNode.groupID] && !oChildNode.isLeaf) {
							this._updateTreeState({groupID: oChildNode.nodeState.groupID, fallbackNodeState: oChildNode.nodeState , expanded: true});
							this._loadChildContexts(oChildNode);
						}
						// sum up the magnitude/sumRows when moving up in the recursion
						oNode.magnitude += Math.max(oChildNode.magnitude || 0, 0);
						oNode.numberOfLeafs += oChildNode.numberOfLeafs;
					}
				}
			}

			// add up the sum of all sub-tree magnitudes
			oNode.magnitude += Math.max(iMaxGroupSize || 0, 0);

		};

		/**
		 * Returns if the Binding is grouped, default is true.
		 * AnalyticalBindings might differ.
		 *
		 * @returns {boolean} true
		 *
		 * @private
		 * @ui5-restricted unified.shell.override, sap.ca.scfld.md.controller.BaseMasterController,
		 * sap.m.GrowingEnablement, sap.m.ListBase, sap.m.UploadCollection, sap.m.UploadSet
		 */
		TreeBindingAdapter.prototype.isGrouped = function () {
			return true;
		};

		/**
		 * Hook which needs to be implemented by subclasses
		 * Calculates a unique group ID for a given node
		 * @param {Object} oNode Node of which the group ID shall be calculated
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._calculateGroupID = function (oNode) {
			Log.error("TreeBindingAdapter#_calculateGroupID: Not implemented. Needs to be implemented in respective sub-classes.");
		};

		/**
		 * Creates a new tree node with valid default values
		 * @param {object} mParameters a set of parameters which might differ from the default values
		 * @returns {object} a newly created tree node
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._createNode = function (mParameters) {
			mParameters = mParameters || {};

			var oContext = mParameters.context;
			var iLevel = mParameters.level || 0;

			var oNode = {
				context: oContext,
				level: iLevel,
				children: mParameters.children || [],
				parent: mParameters.parent,
				nodeState: mParameters.nodeState,
				isLeaf: mParameters.isLeaf || false,
				//the relative position of the node inside its parents children array
				positionInParent: mParameters.positionInParent,
				//the sum of all child nodes in the sub-tree (below this node)
				magnitude: mParameters.magnitude || 0,
				//the total number of sum rows in the sub-tree
				numberOfTotals: mParameters.numberOfTotals || 0,
				//the total number of leafs in the sub-tree
				numberOfLeafs: mParameters.numberOfLeafs || 0,
				autoExpand: mParameters.autoExpand || 0,
				absoluteNodeIndex: mParameters.absoluteNodeIndex || 0,
				totalNumberOfLeafs: 0
			};
			//calculate the group id
			if (oContext !== undefined) {
				oNode.groupID = this._calculateGroupID(oNode);
			}

			return oNode;
		};

		/**
		 * Expand the tree node sitting at the given index.
		 * @param {int} iIndex the absolute row index
		 * @param {boolean} bSuppressChange if set to true, no change event will be fired
		 *
		 * @private
		 * @ui5-restricted sap.gantt.simple.GanttPrinting, sap.m.Tree,
		 * sap.ui.documentation.sdk.controller.App.controller, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.expand = function(iIndex, bSuppressChange) {
			var oNode = this.findNode(iIndex);

			if (!oNode) {
				assert(false, "No node found for index " + iIndex);
				return;
			}

			this._updateTreeState({groupID: oNode.nodeState.groupID, fallbackNodeState: oNode.nodeState, expanded: true});

			if (!bSuppressChange) {
				this._fireChange({reason: ChangeReason.Expand});
			}
		};

		/**
		 * Expands the tree to the given level.
		 * Change-Event is fired.
		 * @param {int} iLevel the level to which the data should be expanded
		 *
		 * @private
		 * @ui5-restricted sap.m.Tree, sap.ui.table.AnalyticalTable, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.expandToLevel = function (iLevel) {
			this._mTreeState.collapsed = {};
			this.setNumberOfExpandedLevels(iLevel);
			this._fireChange({reason: ChangeReason.Expand});
		};

		/**
		 * Retrieves the expanded state of the row sitting at the given index.
		 *
		 * @param {number} iIndex The index for which the expansion state should be retrieved
		 *
		 * @returns {boolean} Whether the node at the given index is expanded
		 *
		 * @private
		 * @ui5-restricted sap.gantt.simple.GanttPrinting, sap.m.Tree, sap.m.TreeItemBase,
		 * sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.isExpanded = function (iIndex) {
			var oNode = this.findNode(iIndex);
			return oNode && oNode.nodeState ? oNode.nodeState.expanded : false;
		};

		/**
		 * Collapses the given node, identified via an absolute row index.
		 * @param {int} vParam the row index of the tree node
		 * @param {boolean} bSuppressChange if set to true, no change event will be fired
		 *
		 * @private
		 * @ui5-restricted sap.gantt.simple.GanttPrinting, sap.m.Tree, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.collapse = function(vParam, bSuppressChange) {
			var oNodeStateForCollapsingNode;
			var that = this;

			//check if the Parameter is a node state object
			if (typeof vParam === "object") {
				oNodeStateForCollapsingNode = vParam;
			} else if (typeof vParam === "number") {
				var oNode = this.findNode(vParam);
				if (!oNode) {
					assert(false, "No node found for index " + vParam);
					return;
				}
				oNodeStateForCollapsingNode = oNode.nodeState;
			}

			this._updateTreeState({groupID: oNodeStateForCollapsingNode.groupID, fallbackNodeState: oNodeStateForCollapsingNode, expanded: false});

			// remove selectAllMode if necessary
			oNodeStateForCollapsingNode.selectAllMode = false;

			if (this.bCollapseRecursive) {
				var sGroupIDforCollapsingNode = oNodeStateForCollapsingNode.groupID;

				// Collapse all subsequent child nodes, this is determined by a common groupID prefix, e.g.: "/A100-50/" is the parent of "/A100-50/Finance/"
				// All expanded nodes which start with 'sGroupIDforCollapsingNode', are basically children of it and also need to be collapsed
				each(this._mTreeState.expanded, function (sGroupID, oNodeState) {
					if (typeof sGroupIDforCollapsingNode == "string" && sGroupIDforCollapsingNode.length > 0 && sGroupID.startsWith(sGroupIDforCollapsingNode)) {
						that._updateTreeState({groupID: sGroupID, expanded: false});
					}
				});

				var aDeselectedNodeIds = [];

				// always remove selections from child nodes of the collapsed node
				each(this._mTreeState.selected, function (sGroupID, oNodeState) {
					if (typeof sGroupIDforCollapsingNode == "string" && sGroupIDforCollapsingNode.length > 0 && sGroupID.startsWith(sGroupIDforCollapsingNode) && sGroupID !== sGroupIDforCollapsingNode) {
						//removes the selectAllMode from child nodes
						oNodeState.selectAllMode = false;
						that.setNodeSelection(oNodeState, false);
						aDeselectedNodeIds.push(sGroupID);
					}
				});

				if (aDeselectedNodeIds.length) {
					var selectionChangeParams = {
						rowIndices: []
					};
					// Collect the changed indices
					var iNodeCounter = -1;
					this._map(this._oRootNode, function (oNode) {
						if (!oNode || !oNode.isArtificial) {
							iNodeCounter++;
						}

						if (oNode && aDeselectedNodeIds.indexOf(oNode.groupID) !== -1) {
							if (oNode.groupID === this._sLeadSelectionGroupID) {
								// Lead selection got deselected
								selectionChangeParams.oldIndex = iNodeCounter;
								selectionChangeParams.leadIndex = -1;
							}
							selectionChangeParams.rowIndices.push(iNodeCounter);
						}
					});

					this._publishSelectionChanges(selectionChangeParams);
				}
			}

			if (!bSuppressChange) {
				this._fireChange({reason: ChangeReason.Collapse});
			}
		};

		/**
		 * Collape all nodes up to level "iLevel".
		 * If iLevel is undefined: the tree will be collapsed up to the first child level of the root node.
		 * @param {int} iLevel the level to which all lower sub-trees should be collapsed
		 *
		 * @private
		 * @ui5-restricted sap.m.Tree, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.collapseToLevel = function(iLevel) {
			//default level is 1, meaning all sub nodes of the root will be collapsed (to the top)
			if (!iLevel || iLevel < 0) {
				iLevel = 0;
			}

			//collapse all expanded nodes if they sit on the same level as the one the user wants to collapse to
			var that = this;
			each(this._mTreeState.expanded, function (sGroupID, oNodeState) {
				var iNodeLevel = that._getGroupIdLevel(sGroupID) - 1;
				if (iNodeLevel === iLevel) {
					that.collapse(oNodeState, true);
				}
			});

			if (this.bCollapseRecursive) {
				this.setNumberOfExpandedLevels(iLevel);
			}

			this._fireChange({reason: ChangeReason.Collapse});
		};

		/**
		 * Calls a function on every child node in the sub tree with root "oNode".
		 * Inside the map function "this" is bound to the TreeBindingAdapter instance.
		 *
		 * @param {object} oNode the starting node for the function mapping
		 * @param {function} fnMapFunction the function which should be mapped for each node in the sub-tree
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._map = function (oNode, fnMapFunction) {

			fnMapFunction.call(this, oNode);

			//if the node is not defined: there is a missing section in our tree
			if (!oNode) {
				return;
			}

			for (var i = 0; i < oNode.children.length; i++) {
				var oChildNode = oNode.children[i];
				this._map(oChildNode, fnMapFunction);
			}

			if (this._afterMapHook) {
				this._afterMapHook(oNode, fnMapFunction);
			}
		};

		/**
		 * Calls the given matching function on every child node in the sub tree with root "oNode".
		 * Inside the map function "this" is bound to the TreeBindingAdapter instance. The matching
		 * function must return "true" if the node should be collected as a match, and false
		 * otherwise.
		 *
		 * @param {object} oNode
		 *   The starting node of the sub-tree which will be traversed, handed to the
		 *   fnMatchFunction
		 * @param {array} aResults
		 *   The collected nodes for which the matching function returns true
		 * @param {number} iMaxNumberOfMatches
		 *   The maximum number of matched nodes, _match() will stopp if this boundary is reached
		 * @param {function} fnMatchFunction
		 *   The match function is called for every traversed nodes
		 * @param {number} [iPositionInParent]
		 *   The relative position of the oNode parameter to its parent nodes children array, handed
		 *   to the fnMatchFunction
		 * @param {object} [oParentNode]
		 *   The parent node of the oNode parameter, handed to the fnMatchFunction
		 *
		 * @returns {boolean}
		 *   Whether the <code>iMaxNumberOfMatches</code> has been reached
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._match = function (oNode, aResults, iMaxNumberOfMatches, fnMatchFunction, iPositionInParent, oParentNode) {

			// recursion end if max number of matches have been collected
			// if iMaxNumberOfMatches is undefined -> the whole tree is searched.
			if (aResults.length === iMaxNumberOfMatches) {
				return true;
			}

			// push the node if it matches the criterium
			var bNodeMatches = fnMatchFunction.call(this, oNode, iPositionInParent, oParentNode);
			if (bNodeMatches) {
				aResults.push(oNode);
			}

			//if the node is not defined: there is a missing section in our tree
			if (!oNode) {
				return false;
			}

			for (var i = 0; i < oNode.children.length; i++) {
				var oChildNode = oNode.children[i];
				var bMaxNumberReached = this._match(oChildNode, aResults, iMaxNumberOfMatches, fnMatchFunction, i, oNode);
				//break recursion if enough nodes where collected
				if (bMaxNumberReached) {
					return true;
				}
			}

			//check if an after match hook is defined on sub-adapters
			return this._afterMatchHook ? this._afterMatchHook(oNode, aResults, iMaxNumberOfMatches, fnMatchFunction, iPositionInParent, oParentNode) : false;
		};


		/**
		 * Toggles the tree node sitting at the given index.
		 * @param {int} iIndex the absolute row index
		 *
		 * @private
		 * @ui5-restricted sap.m.Tree, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.toggleIndex = function(iIndex) {
			var oNode = this.findNode(iIndex);

			if (!oNode) {
				assert(false, "There is no node at index " + iIndex + ".");
				return;
			}

			if (oNode.nodeState.expanded) {
				this.collapse(iIndex);
			} else {
				this.expand(iIndex);
			}
		};

		/**
		 * A group ID starts and ends with a "/".
		 *
		 * @param {string} sGroupID The group ID to get the level from
		 *
		 * @returns {number} The level of the group ID
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._getGroupIdLevel = function (sGroupID) {
			if (sGroupID == null) {
				Log.warning("assertion failed: no need to determine level of group ID = null");
				return -1;
			}
			return sGroupID.split("/").length - 2;
		};

		/**
		 * Determines the size of a group.
		 *
		 * @param {object} oNode The node to determine the size of
		 *
		 * @returns {number} The child count of the given node
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._getGroupSize = function (oNode) {
			return this.getChildCount(oNode.context);
		};

		//*************************************************
		//*               Selection-Handling              *
		//************************************************/

		/**
		 * Sets the selection state of the given node.
		 * @param {object} oNodeState the node state for which the selection should be changed
		 * @param {boolean} bIsSelected the selection state for the given node
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype.setNodeSelection = function (oNodeState, bIsSelected) {

			if (!oNodeState.groupID) {
				assert(false, "NodeState must have a group ID!");
				return;
			}

			oNodeState.selected = bIsSelected;

			// toggles the selection state based on bIsSelected
			if (bIsSelected) {
				this._mTreeState.selected[oNodeState.groupID] = oNodeState;
				delete this._mTreeState.deselected[oNodeState.groupID];
			} else {
				delete this._mTreeState.selected[oNodeState.groupID];
				this._mTreeState.deselected[oNodeState.groupID] = oNodeState;
			}
		};

		/**
		 * Returns the selection state for the node at the given index.
		 *
		 * @param {number} iRowIndex The row index to check for selection state
		 *
		 * @returns {boolean} Whether the node at the given index is selected
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.isIndexSelected = function (iRowIndex) {
			var oNode = this.getNodeByIndex(iRowIndex);
			return oNode && oNode.nodeState ? oNode.nodeState.selected : false;
		};

		/**
		 * Returns whether the node at the given index is selectable.
		 * In the AnalyticalTable only nodes with isLeaf = true are selectable.
		 *
		 * @param {number} iRowIndex The row index which should be checked for "selectability"
		 *
		 * @returns {boolean} Whether the node at the given index is selectable
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.isIndexSelectable = function (iRowIndex) {
			var oNode = this.getNodeByIndex(iRowIndex);
			return this._isNodeSelectable(oNode);
		};

		/**
		 * Checks if the given node can be selected. Always true for TreeTable controls, except when
		 * the node is not defined.
		 *
		 * @param {object} oNode The node to check
		 *
		 * @returns {boolean} Whether the node can be selected
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._isNodeSelectable = function (oNode) {
			return !!oNode && !oNode.isArtificial;
		};

		/**
		 * Marks a single TreeTable node sitting on iRowIndex as selected.
		 * Also sets the lead selection index to this node.
		 * @param {int} iRowIndex the absolute row index which should be selected
		 *
		 * @private
		 * @ui5-restricted sap.m.TreeItemBase, sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.setSelectedIndex = function (iRowIndex) {
			var oNode = this.findNode(iRowIndex);

			if (oNode && this._isNodeSelectable(oNode)) {
				// clear and fetch the changes on the selection
				var oChanges = this._clearSelection();

				// if the selected row index was already selected before -> remove it from the changed Indices from the clearSection() call
				var iChangedIndex = oChanges.rowIndices.indexOf(iRowIndex);
				if (iChangedIndex >= 0) {
					oChanges.rowIndices.splice(iChangedIndex, 1);
				} else {
					// the newly selcted index is missing and also has to be propagated via the event params
					oChanges.rowIndices.push(iRowIndex);
				}

				//set the new lead index
				oChanges.leadGroupID = oNode.groupID;
				oChanges.leadIndex = iRowIndex;

				this.setNodeSelection(oNode.nodeState, true);

				this._publishSelectionChanges(oChanges);
			} else {
				Log.warning("TreeBindingAdapter: The selection was ignored. Please make sure to only select rows, for which data has been fetched to the client. For AnalyticalTables, some rows might not be selectable at all.");
			}
		};

		/**
		 * Retrieves the "Lead-Selection-Index". Normally this is the last selected node/table row.
		 *
		 * @return {number} Returns the lead selection index or -1 if none is set
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.getSelectedIndex = function () {
			//if we have no nodes selected, the lead selection index is -1
			if (!this._sLeadSelectionGroupID || isEmptyObject(this._mTreeState.selected)) {
				return -1;
			}

			// find the first selected entry -> this is our lead selection index
			var iNodeCounter = -1;
			var nodeFound = false;
			var fnMatchFunction = function (oNode) {
				if (!oNode || !oNode.isArtificial) {
					iNodeCounter++;
				}

				if (oNode) {
					if (oNode.groupID === this._sLeadSelectionGroupID) {
						nodeFound = true;

						return true;
					}
				}

				return false;
			};
			this._match(this._oRootNode, [], 1, fnMatchFunction);

			if (nodeFound) {
				return iNodeCounter;
			}
			// If a parent of the lead selected node has been collapsed,
			//	we might not be able to find it in the current tree.
			// This can only happen if recursive collapse is not active
			//	(recursive collapse always removes the selection of a collapsed nodes' children)
			return -1;
		};

		/**
		 * Returns an array with all selected row indices.
		 * Only absolute row indices for nodes known to the client will can be retrieved this way
		 * @return {int[]} an array with all selected indices
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.getSelectedIndices = function () {
			var aResultIndices = [];
			var that = this;

			//if we have no nodes selected, the selection indices are empty
			if (isEmptyObject(this._mTreeState.selected)) {
				return aResultIndices;
			}

			// maximum number of possibly selected nodes
			var iNumberOfNodesToSelect = Object.keys(this._mTreeState.selected).length;

			// collect the indices of all selected nodes
			var iNodeCounter = -1;
			var fnMatchFunction = function (oNode) {
				if (!oNode || !oNode.isArtificial) {
					iNodeCounter++;
				}

				if (oNode) {
					if (oNode.nodeState && oNode.nodeState.selected && !oNode.isArtificial) {
						aResultIndices.push(iNodeCounter);
						// cache the selected node for subsequent findNode/getContextByIndex calls
						that._aRowIndexMap[iNodeCounter] = oNode;
						return true;
					}
				}

				return false;
			};

			this._match(this._oRootNode, [], iNumberOfNodesToSelect, fnMatchFunction);

			return aResultIndices;
		};

		/**
		 * Returns the number of selected nodes (including not-yet loaded).
		 *
		 * @returns {number} The count of selected nodes
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.getSelectedNodesCount = function () {
			var iSelectedNodes;

			if (this._oRootNode && this._oRootNode.nodeState.selectAllMode) {
				var sGroupId, iVisibleDeselectedNodeCount, oParent, oGroupNodeState;

				var oContext, aVisibleGroupIds = [];
				if (this.filterInfo && this.oCombinedFilter) {
					// If we are filtering, we need to map the filtered (visible) contexts to group IDs.
					// With that we can check whether a node state is actually a visible node
					for (var i = this.filterInfo.aFilteredContexts.length - 1; i >= 0; i--) {
						oContext = this.filterInfo.aFilteredContexts[i];
						aVisibleGroupIds.push(this._calculateGroupID({
							context: oContext
						}));
					}
				}

				iVisibleDeselectedNodeCount = 0;
				// If we implicitly deselect all nodes under a group node,
				//	we need to count them as "visible deselected nodes"
				for (sGroupId in this._mTreeState.expanded) {
					if (!this.oCombinedFilter || aVisibleGroupIds.indexOf(sGroupId) !== -1) { // Not filtering or part of the visible nodes if filtering
						oGroupNodeState = this._mTreeState.expanded[sGroupId];
						if (!oGroupNodeState.selectAllMode && oGroupNodeState.leafCount !== undefined) {
							iVisibleDeselectedNodeCount += oGroupNodeState.leafCount;
						}
					}
				}

				// Except those who got explicitly selected after the parent got collapsed
				//	and expanded again (and while the root is still in select-all mode)
				for (sGroupId in this._mTreeState.selected) {
					if (!this.oCombinedFilter || aVisibleGroupIds.indexOf(sGroupId) !== -1) { // Not filtering or part of the visible nodes if filtering
						oGroupNodeState = this._mTreeState.selected[sGroupId];
						oParent = this._mTreeState.expanded[oGroupNodeState.parentGroupID];
						if (oParent && !oParent.selectAllMode) {
							iVisibleDeselectedNodeCount--;
						}
					}
				}

				// Add those which are explicitly deselected and whose parents *are* in selectAllMode (not covered by the above)
				for (sGroupId in this._mTreeState.deselected) {
					if (!this.oCombinedFilter || aVisibleGroupIds.indexOf(sGroupId) !== -1) { // Not filtering or part of the visible nodes if filtering
						oGroupNodeState = this._mTreeState.deselected[sGroupId];
						oParent = this._mTreeState.expanded[oGroupNodeState.parentGroupID];
						// If parent is expanded check if its in select all mode
						if (oParent && oParent.selectAllMode) {
							iVisibleDeselectedNodeCount++;
						}
					}
				}

				iSelectedNodes = this._getSelectableNodesCount(this._oRootNode) - iVisibleDeselectedNodeCount;
			} else {
				iSelectedNodes = Object.keys(this._mTreeState.selected).length;
			}
			return iSelectedNodes;
		};

		/**
		 * Returns the number of currently selectable nodes (with respect to the current
		 * expand/collapse state).
		 *
		 * @param {object} [oNode] The node to get the selectable nodes count from
		 *
		 * @returns {int} Number of currently selectable nodes
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._getSelectableNodesCount = function (oNode) {
			if (oNode) {
				return oNode.magnitude;
			} else {
				return 0;
			}
		};

		/**
		 * Returns an array containing all selected contexts, ordered by their appearance in the
		 * tree.
		 *
		 * @return {sap.ui.model.Context[]}
		 *   An array containing the binding contexts for all selected nodes
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype.getSelectedContexts = function () {
			var aResultContexts = [];
			var that = this;

			//if we have no nodes selected, the selection indices are empty
			if (isEmptyObject(this._mTreeState.selected)) {
				return aResultContexts;
			}

			// maximum number of possibly selected nodes
			var iNumberOfNodesToSelect = Object.keys(this._mTreeState.selected).length;

			// collect the indices & contexts of all selected nodes
			var iNodeCounter = -1;
			var fnMatchFunction = function (oNode) {
				if (!oNode || !oNode.isArtificial) {
					iNodeCounter++;
				}

				if (oNode) {
					if (oNode.nodeState && oNode.nodeState.selected && !oNode.isArtificial) {
						aResultContexts.push(oNode.context);
						// cache the selected node for subsequent findNode/getContextByIndex calls
						that._aRowIndexMap[iNodeCounter] = oNode;

						return true;
					}
				}

				return false;
			};

			this._match(this._oRootNode, [], iNumberOfNodesToSelect, fnMatchFunction);

			return aResultContexts;
		};

		/**
		 * Sets the selection to the range from iFromIndex to iToIndex (including boundaries).
		 * e.g. <code>setSelectionInterval(1,3)</code> marks the rows 1,2 and 3. All currently
		 * selected rows will be deselected in the process. A <code>selectionChanged</code> event is
		 * fired.
		 *
		 * @param {number} iFromIndex The first index to select
		 * @param {number} iToIndex The last index to select
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.setSelectionInterval = function (iFromIndex, iToIndex) {
			var i, iIndex,
				// clears the selection but suppresses the selection change event
				mClearParams = this._clearSelection(),
				mIndicesFound = {},
				aRowIndices = [],
				// the addSelectionInterval function takes care of the selection change event
				mSetParams = this._setSelectionInterval(iFromIndex, iToIndex, true);

			// flag all cleared indices as changed
			for (i = 0; i < mClearParams.rowIndices.length; i++) {
				iIndex = mClearParams.rowIndices[i];
				mIndicesFound[iIndex] = true;
			}

			// now merge the changed indices after clearing with the newly selected
			// duplicate indices mean, that the index was previously selected and is now still selected -> remove it from the changes
			for (i = 0; i < mSetParams.rowIndices.length; i++) {
				iIndex = mSetParams.rowIndices[i];
				if (mIndicesFound[iIndex]) {
					delete mIndicesFound[iIndex];
				} else {
					mIndicesFound[iIndex] = true;
				}
			}
			// transform the changed index MAP into a real array of indices
			for (iIndex in mIndicesFound) {
				if (mIndicesFound[iIndex]) {
					aRowIndices.push(parseInt(iIndex));
				}
			}

			//and fire the event
			this._publishSelectionChanges({
				rowIndices: aRowIndices,
				oldIndex: mClearParams.oldIndex,
				leadIndex: mSetParams.leadIndex,
				leadGroupID: mSetParams.leadGroupID
			});
		};

		/**
		 * Sets the value inside the given range to the value given with 'bSelectionValue'.
		 *
		 * @param {number} iFromIndex
		 *   The starting index of the selection range
		 * @param {number} iToIndex
		 *   The end index of the selection range, which will be included in the selection
		 * @param {boolean} bSelectionValue
		 *   The selection state which should be applied to all indices between 'from' and 'to'
		 *   index
		 *
		 * @returns {object}
		 *   A map containing info about the changed selection
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._setSelectionInterval = function (iFromIndex, iToIndex, bSelectionValue) {
			//make sure the "From" Index is always lower than the "To" Index
			var iNewFromIndex = Math.min(iFromIndex, iToIndex);
			var iNewToIndex = Math.max(iFromIndex, iToIndex);

			//find out how many nodes should be selected, this is a termination condition for the match function
			var aNewlySelectedNodes = [];
			var aChangedIndices = [];
			var iNumberOfNodesToSelect = Math.abs(iNewToIndex - iNewFromIndex) + 1; //+1 because the boundary indices are included

			// the old lead index, might be undefined -> publishSelectionChanges() will set it to -1
			var iOldLeadIndex;

			// loop through all nodes and select them if necessary
			var iNodeCounter = -1;
			var fnMatchFunction = function (oNode) {

				// do not count the artificial root node
				if (!oNode || !oNode.isArtificial) {
					iNodeCounter++;
				}

				if (oNode) {
					//if the node is inside the range -> select it
					if (iNodeCounter >= iNewFromIndex && iNodeCounter <= iNewToIndex) {

						if (this._isNodeSelectable(oNode)) {
							// fetch the node index if its selection state changes
							if (oNode.nodeState.selected !== !!bSelectionValue) {
								aChangedIndices.push(iNodeCounter);
							}

							// remember the old lead selection index if we encounter it
							// (might not happen if the lead selection is outside the newly set range)
							if (oNode.groupID === this._sLeadSelectionGroupID) {
								iOldLeadIndex = iNodeCounter;
							}

							// select/deselect node, but suppress the selection change event
							this.setNodeSelection(oNode.nodeState, !!bSelectionValue);
						}

						return true;
					}
				}

				return false;
			};

			this._match(this._oRootNode, aNewlySelectedNodes, iNumberOfNodesToSelect, fnMatchFunction);

			var mParams = {
				rowIndices: aChangedIndices,
				oldIndex: iOldLeadIndex,
				//if we found a lead index during tree traversal and we deselected it -> the new lead selection index is -1
				leadIndex: iOldLeadIndex && !bSelectionValue ? -1 : undefined
			};

			// set new lead selection node if necessary
			if (aNewlySelectedNodes.length > 0 && bSelectionValue){
				var oLeadSelectionNode = aNewlySelectedNodes[aNewlySelectedNodes.length - 1];
				mParams.leadGroupID = oLeadSelectionNode.groupID;
				mParams.leadIndex = iNewToIndex;
			}

			return mParams;
		};

		/**
		 * Marks a range of tree nodes as selected/deselected, starting with <code>iFromIndex</code>
		 * going to <code>iToIndex</code>. The TreeNodes are referenced via their absolute row
		 * index. Please be aware, that the absolute row index only applies to the tree which is
		 * visualized by the TreeTable. Invisible nodes (collapsed child nodes) will not be
		 * regarded.
		 *
		 * @param {number} iFromIndex The first index to mark
		 * @param {number} iToIndex The last index to mark
		 *
		 * @private
		 * @ui5-restricted sap.m.TreeItemBase, sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.addSelectionInterval = function (iFromIndex, iToIndex) {
			var mParams = this._setSelectionInterval(iFromIndex, iToIndex, true);
			this._publishSelectionChanges(mParams);
		};

		/**
		 * Removes the selections inside the given range (including boundaries).
		 *
		 * @param {number} iFromIndex The first index to remove the selection from
		 * @param {number} iToIndex The last index to remove the selection from
		 *
		 * @private
		 * @ui5-restricted sap.m.TreeItemBase, sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.removeSelectionInterval = function (iFromIndex, iToIndex) {
			var mParams = this._setSelectionInterval(iFromIndex, iToIndex, false);
			this._publishSelectionChanges(mParams);
		};

		/**
		 * Selects all avaliable nodes
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.selectAll = function () {

			// remove all deselected nodes
			this._mTreeState.deselected = {};

			var mParams = {
				rowIndices: [],
				oldIndex: -1,
				selectAll: true
			};

			// recursion variables
			var iNodeCounter = -1;

			this._map(this._oRootNode, function (oNode) {

				if (!oNode || !oNode.isArtificial) {
					iNodeCounter++;
				}

				if (oNode) {

					//if we find the old lead selection index -> keep it, safes some performance later on
					if (oNode.groupID === this._sLeadSelectionGroupID) {
						mParams.oldIndex = iNodeCounter;
					}

					if (this._isNodeSelectable(oNode)) {
						//if a node is NOT selected (and is not our artificial root node...)
						if (oNode.nodeState.selected !== true) {
							mParams.rowIndices.push(iNodeCounter);
						}
						this.setNodeSelection(oNode.nodeState, true);

						// keep track of the last selected node -> this will be the new lead index
						mParams.leadGroupID = oNode.groupID;
						mParams.leadIndex = iNodeCounter;
					}

					//propagate select all mode to all expanded nodes (including the root node)
					// child nodes will inherit the selection state it in the process (see _buildTree/_loadChildContexts)
					if (oNode.nodeState.expanded) {
						oNode.nodeState.selectAllMode = true;
					}
				}
			});

			this._publishSelectionChanges(mParams);
		};

		/**
		 * Removes the selection from all nodes.
		 *
		 * @returns {object} An object containing information about the new selection state
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._clearSelection = function () {
			var iNodeCounter = -1;
			var iOldLeadIndex = -1;
			var iMaxNumberOfMatches;

			var aChangedIndices = [];

			// The following optimization is not used when selectAllMode was activated.
			//
			// In selectAllMode, a traverse through all nodes are needed because the
			// this._mTreeState.selected only contains the selectable (isNodeSelectable)
			// nodes but non-selectable nodes may also have the selectAllMode set with
			// true
			if (this._oRootNode && !this._oRootNode.nodeState.selectAllMode) {
				iMaxNumberOfMatches = 0;
				// Optimisation: find out how many nodes we have to check for deselection
				for (var sGroupID in this._mTreeState.selected) {
					if (sGroupID) {
						iMaxNumberOfMatches++;
					}
				}
			}

			// matches all selected nodes and retrieves their absolute row index
			var fnMatch = function (oNode) {

				// do not count the artifical root node
				if (!oNode || !oNode.isArtificial) {
					iNodeCounter++;
				}

				if (oNode) {
					// Always reset selectAllMode
					oNode.nodeState.selectAllMode = false;

					if (this._mTreeState.selected[oNode.groupID]) {
						// remember changed index, push it to the limit!
						if (!oNode.isArtificial) {
							aChangedIndices.push(iNodeCounter);
						}
						// deslect the node
						this.setNodeSelection(oNode.nodeState, false);

						//also remember the old lead index
						if (oNode.groupID === this._sLeadSelectionGroupID) {
							iOldLeadIndex = iNodeCounter;
						}

						return true;
					}
				}

				return false;
			};

			this._match(this._oRootNode, [], iMaxNumberOfMatches, fnMatch);

			// explicitly remove the selectAllMode from the root node
			if (this._oRootNode && this._oRootNode.nodeState && this._oRootNode.isArtificial) {
				this._oRootNode.nodeState.selectAllMode = false;
			}

			return {
				rowIndices: aChangedIndices,
				oldIndex: iOldLeadIndex,
				leadIndex: -1
			};
		};
		/**
		 * Removes the complete selection.
		 *
		 * @param {boolean} bSuppressSelectionChangeEvent
		 *   Whether to suppress the <code>selectionChange</code> event
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.plugins.BindingSelection
		 */
		TreeBindingAdapter.prototype.clearSelection = function (bSuppressSelectionChangeEvent) {
			var oChanges = this._clearSelection();

			// check if the selection change event should be suppressed
			if (!bSuppressSelectionChangeEvent) {
				this._publishSelectionChanges(oChanges);
			}
		};

		/**
		 * Fires a <code>selectionChanged</code> event with the given parameters. Also performs a
		 * sanity check on the parameters.
		 *
		 * @param {object} mParams
		 *   An object containing information about selection change
		 *
		 * @private
		 */
		TreeBindingAdapter.prototype._publishSelectionChanges = function (mParams) {

			// retrieve the current (old) lead selection and add it to the changed row indices if necessary
			mParams.oldIndex = mParams.oldIndex || this.getSelectedIndex();

			//sort row indices ascending
			mParams.rowIndices.sort(function(a, b) {
				return a - b;
			});

			//set the lead selection index
			if (mParams.leadIndex >= 0 && mParams.leadGroupID) {
				//keep track of a newly set lead index
				this._sLeadSelectionGroupID = mParams.leadGroupID;
			} else if (mParams.leadIndex === -1){
				// explicitly remove the lead index
				this._sLeadSelectionGroupID = undefined;
			} else {
				//nothing changed, lead and old index are the same
				mParams.leadIndex = mParams.oldIndex;
			}

			//only fire event if the selection actually changed somehow
			if (mParams.rowIndices.length > 0 || (mParams.leadIndex != undefined && mParams.leadIndex !== -1)) {
				this.fireSelectionChanged(mParams);
			}
		};

		/**
		 * Sets the node hierarchy to collapse recursive. When set to true, all child nodes will be
		 * collapsed as well.
		 *
		 * @param {boolean} bCollapseRecursive Whether to enable the recursive collapsing
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.AnalyticalTable, sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.setCollapseRecursive = function (bCollapseRecursive) {
			this.bCollapseRecursive = !!bCollapseRecursive;
		};

		/**
		 * Gets the collapsing behavior when parent nodes are collapsed.
		 *
		 * @returns {boolean} Whether recursive collapsing is enabled
		 *
		 * @private
		 * @ui5-restricted sap.ui.table.TreeTable
		 */
		TreeBindingAdapter.prototype.getCollapseRecursive = function () {
			return this.bCollapseRecursive;
		};

		//*********************************************
		//                   Events                   *
		//*********************************************

		/**
		 * Attaches event handler <code>fnFunction</code> to the {@link #event:selectionChanged selectionChanged} event of this
		 * <code>sap.ui.model.TreeBindingAdapter</code>.
		 *
		 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code>
		 * if specified, otherwise it will be bound to this <code>sap.ui.model.TreeBindingAdapter</code> itself.
		 *
		 * Event is fired if the selection of tree nodes is changed in any way.
		 *
		 * @param {object}
		 *            [oData] An application-specific payload object that will be passed to the event handler
		 *            along with the event object when firing the event
		 * @param {function}
		 *            fnFunction The function to be called, when the event occurs
		 * @param {object}
		 *            [oListener] Context object to call the event handler with. Defaults to this
		 *            <code>TreeBindingAdapter</code> itself
		 *
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 *
		 * @public
		 */
		TreeBindingAdapter.prototype.attachSelectionChanged = function(oData, fnFunction, oListener) {
			this.attachEvent("selectionChanged", oData, fnFunction, oListener);
			return this;
		};

		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:selectionChanged selectionChanged} event of this
		 * <code>sap.ui.model.TreeBindingAdapter</code>.
		 *
		 * The passed function and listener object must match the ones used for event registration.
		 *
		 * @param {function}
		 *            fnFunction The function to be called, when the event occurs
		 * @param {object}
		 *            [oListener] Context object on which the given function had to be called
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 *
		 * @public
		 */
		TreeBindingAdapter.prototype.detachSelectionChanged = function(fnFunction, oListener) {
			this.detachEvent("selectionChanged", fnFunction, oListener);
			return this;
		};

		/**
		 * Fires event {@link #event:selectionChanged selectionChanged} to attached listeners.
		 *
		 * Expects following event parameters:
		 * <ul>
		 * <li>'leadIndex' of type <code>int</code> Lead selection index.</li>
		 * <li>'rowIndices' of type <code>int[]</code> Other selected indices (if available)</li>
		 * </ul>
		 *
		 * @param {object} oParameters Parameters to pass along with the event.
		 * @param {int} oParameters.leadIndex Lead selection index
		 * @param {int[]} [oParameters.rowIndices] Other selected indices (if available)
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 *
		 * @protected
		 */
		TreeBindingAdapter.prototype.fireSelectionChanged = function(oParameters) {
			this.fireEvent("selectionChanged", oParameters);
			return this;
		};

		return TreeBindingAdapter;

	}, /* bExport= */ true);
