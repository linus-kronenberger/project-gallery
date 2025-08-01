/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides class sap.ui.model.SelectionModel
sap.ui.define(['sap/ui/base/EventProvider', "sap/base/assert"],
	function(EventProvider, assert) {
	"use strict";




	/**
	 * Constructs an instance of an sap.ui.model.SelectionModel.
	 *
	 * @class
	 * This artefact is used by the table controls for handling selections. It is not associated with the model layer of UI5.
	 * @extends sap.ui.base.EventProvider
	 *
	 * @author SAP SE
	 * @version 1.138.0
	 *
	 * @param {int} iSelectionMode <code>sap.ui.model.SelectionModel.SINGLE_SELECTION</code> or <code>sap.ui.model.SelectionModel.MULTI_SELECTION</code>
	 *
	 * @public
	 * @alias sap.ui.model.SelectionModel
	 */
	var SelectionModel = EventProvider.extend("sap.ui.model.SelectionModel", /** @lends sap.ui.model.SelectionModel.prototype */ {

		constructor : function(iSelectionMode) {
			EventProvider.apply(this);

			this.iSelectionMode = iSelectionMode || SelectionModel.SINGLE_SELECTION;

			this.aSelectedIndices = [];
			this.iLeadIndex = -1;

			this.fnSort = function(a, b) {
				return a - b;
			};
			this.fnSortReverse = function(a, b) {
				return b - a;
			};

		}

	});

	/**
	 * SelectionMode: Single Selection
	 * @public
	 * @readonly
	 * @type {int}
	 */
	SelectionModel.SINGLE_SELECTION = 0;

	/**
	 * SelectionMode: Multi Selection
	 * @public
	 * @readonly
	 * @type {int}
	 */
	SelectionModel.MULTI_SELECTION = 1;


	/**
	 * Returns the current selection mode.
	 * @return {int} the current selection mode
	 * @public
	 */
	SelectionModel.prototype.getSelectionMode = function() {
		return this.iSelectionMode;
	};

	/**
	 * Sets the selection mode. The following list describes the accepted
	 * selection modes:
	 * <ul>
	 * <li><code>sap.ui.model.SelectionModel.SINGLE_SELECTION</code> -
	 *   Only one list index can be selected at a time. In this mode,
	 *   <code>setSelectionInterval</code> and <code>addSelectionInterval</code> are
	 *   equivalent, both replacing the current selection with the index
	 *   represented by the second argument (the "lead").
	 * <li><code>sap.ui.model.SelectionModel.MULTI_SELECTION</code> -
	 *   In this mode, there's no restriction on what can be selected.
	 * </ul>
	 *
	 * @param {int} iSelectionMode selection mode
	 * @public
	 */
	SelectionModel.prototype.setSelectionMode = function(iSelectionMode) {
		this.iSelectionMode = iSelectionMode || SelectionModel.SINGLE_SELECTION;
	};

	/**
	 * Returns true if the specified index is selected.
	 * @param {int} iIndex
	 * @return {boolean} true if the specified index is selected.
	 * @public
	 */
	SelectionModel.prototype.isSelectedIndex = function(iIndex) {
		return this.aSelectedIndices.indexOf(iIndex) !== -1;
	};

	/**
	 * Return the second index argument from the most recent call to
	 * setSelectionInterval(), addSelectionInterval() or removeSelectionInterval().
	 * @return {int} lead selected index
	 * @public
	 */
	SelectionModel.prototype.getLeadSelectedIndex = function() {
		return this.iLeadIndex;
	};

	/**
	 * Set the lead selection index.
	 * @param {int} iLeadIndex sets the lead selected index
	 * @return {this} <code>this</code> to allow method chaining
	 * @private
	 */
	SelectionModel.prototype.setLeadSelectedIndex = function(iLeadIndex) {
		assert(typeof iLeadIndex === "number", "iLeadIndex must be an integer");
		// TODO: do we want to have a specific behavior for the lead selection so
		//       that it could be handled in another way? if yes we should consider
		//       also to rework the dataset which is using this method
		//this.iLeadIndex = iLeadIndex;
		this.setSelectionInterval(iLeadIndex, iLeadIndex);
		return this;
	};


	/**
	 * Returns the first selected index or -1 if the selection is empty.
	 * @return {int} first selected index or -1
	 * @private
	 */
	SelectionModel.prototype.getMinSelectionIndex = function() {
		if (this.aSelectedIndices.length > 0) {
			var aIndices = this.aSelectedIndices.sort(this.fnSort);
			return aIndices[0];
		} else {
			return -1;
		}
	};

	/**
	 * Returns the last selected index or -1 if the selection is empty.
	 * @return {int} last selected index or -1
	 * @private
	 */
	SelectionModel.prototype.getMaxSelectionIndex = function() {
		if (this.aSelectedIndices.length > 0) {
			var aIndices = this.aSelectedIndices.sort(this.fnSortReverse);
			return aIndices[0];
		} else {
			return -1;
		}
	};


	/**
	 * Returns the selected indices as array.
	 *
	 * @return {int[]} array of selected indices
	 * @public
	 */
	SelectionModel.prototype.getSelectedIndices = function() {
		var aIndices = this.aSelectedIndices.sort(this.fnSort);
		return aIndices;
	};


	/**
	 * Changes the selection to be equal to the range <code>iFromIndex</code> and <code>iToIndex</code>
	 * inclusive. If <code>iFromIndex</code> is smaller than <code>iToIndex</code>, both parameters are swapped.
	 *
	 * In <code>SINGLE_SELECTION</code> selection mode, only <code>iToIndex</code> is used.
	 *
	 * If this call results in a change to the current selection, then a
	 * <code>SelectionChanged</code> event is fired.
	 *
	 * @param {int} iFromIndex one end of the interval.
	 * @param {int} iToIndex other end of the interval
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.setSelectionInterval = function(iFromIndex, iToIndex) {
		assert(typeof iFromIndex === "number", "iFromIndex must be an integer");
		assert(typeof iToIndex === "number", "iToIndex must be an integer");

		if (this.iSelectionMode === SelectionModel.SINGLE_SELECTION) {
			iFromIndex = iToIndex;
		}

		var iFrom = Math.min(iFromIndex, iToIndex);
		var iTo = Math.max(iFromIndex, iToIndex);

		// set new selection range, determine set of changed indices
		var aOldSelectedRowIndices = this.aSelectedIndices.slice();

		// build a lookup map
		var mLookup = {};
		var aChangedRowIndices = [];
		for (var i = 0; i < aOldSelectedRowIndices.length; i++) {
			mLookup[aOldSelectedRowIndices[i]] = true;
			if (aOldSelectedRowIndices[i] < iFromIndex || aOldSelectedRowIndices[i] > iToIndex) {
				// the old index will be deselected when it's not in the range of the new interval, therefore it's a changed index
				aChangedRowIndices.push(aOldSelectedRowIndices[i]);
			}
		}

		var aSelectedIndices = [];
		for (var iIndex = iFrom; iIndex <= iTo; iIndex++) {
			aSelectedIndices.push(iIndex);
			// if the index was not selected before it is now selected and therefore part of changed indices
			if (!mLookup[iIndex]) {
				aChangedRowIndices.push(iIndex);
			}
		}

		this._update(aSelectedIndices, iToIndex, aChangedRowIndices);
		return this;
	};

	/**
	 * Changes the selection to be the union of the current selection
	 * and the range between <code>iFromIndex</code> and <code>iToIndex</code> inclusive.
	 * If <code>iFromIndex</code> is smaller than <code>iToIndex</code>, both parameters are swapped.
	 *
	 * In <code>SINGLE_SELECTION</code> selection mode, this is equivalent
	 * to calling <code>setSelectionInterval</code>, and only the second index
	 * is used.
	 *
	 * If this call results in a change to the current selection or lead selection, then a
	 * <code>SelectionChanged</code> event is fired.
	 *
	 * @param {int} iFromIndex one end of the interval.
	 * @param {int} iToIndex other end of the interval
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.addSelectionInterval = function(iFromIndex, iToIndex) {
		assert(typeof iFromIndex === "number", "iFromIndex must be an integer");
		assert(typeof iToIndex === "number", "iToIndex must be an integer");

		if (this.iSelectionMode === SelectionModel.SINGLE_SELECTION) {
			return this.setSelectionInterval(iFromIndex, iToIndex);
		}

		var iFrom = Math.min(iFromIndex, iToIndex);
		var iTo = Math.max(iFromIndex, iToIndex);

		var aChangedRowIndices = [];
		var aSelectedIndices = this.aSelectedIndices;

		for (var iIndex = iFrom; iIndex <= iTo; iIndex++) {
			if (aSelectedIndices.indexOf(iIndex) === -1) {
				aSelectedIndices.push(iIndex);
				aChangedRowIndices.push(iIndex);
			}
		}
		this._update(aSelectedIndices, iTo, aChangedRowIndices);
		return this;
	};

	/**
	 * Moves all selected indices starting at the position <code>iStartIndex</code> <code>iMove</code>
	 * items.
	 *
	 * This can be used if new items are inserted to the item set and you want to keep the selection.
	 * To handle a deletion of items use <code>sliceSelectionInterval</code>.
	 *
	 * If this call results in a change to the current selection or lead selection, then a
	 * <code>SelectionChanged</code> event is fired.
	 *
	 * @param {int} iStartIndex start at this position
	 * @param {int} iMove
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.moveSelectionInterval = function(iStartIndex, iMove) {
		assert(typeof iStartIndex === "number", "iFromIndex must be an integer");
		assert(typeof iMove === "number", "iToIndex must be an integer");

		var aChangedRowIndices = [];
		var aSelectedIndices = this.aSelectedIndices;
		var iLeadIndex = this.iLeadIndex;
		for (var i = 0; i < aSelectedIndices.length; i++) {
			var iIndex = aSelectedIndices[i];
			if (iIndex >= iStartIndex) {
				aChangedRowIndices.push(aSelectedIndices[i]);
				aSelectedIndices[i] += iMove;
				aChangedRowIndices.push(aSelectedIndices[i]);
				if (iIndex === this.iLeadIndex) {
					iLeadIndex += iMove;
				}
			}
		}
		this._update(aSelectedIndices, iLeadIndex, aChangedRowIndices);
		return this;
	};

	/**
	 * Changes the selection to be the set difference of the current selection
	 * and the indices between <code>iFromIndex</code> and <code>iToIndex</code> inclusive.
	 * If <code>iFromIndex</code> is smaller than <code>iToIndex</code>, both parameters are swapped.
	 *
	 * If the range of removed selection indices includes the current lead selection,
	 * then the lead selection will be unset (set to -1).
	 *
	 * If this call results in a change to the current selection or lead selection, then a
	 * <code>SelectionChanged</code> event is fired.
	 *
	 * @param {int} iFromIndex one end of the interval.
	 * @param {int} iToIndex other end of the interval
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.removeSelectionInterval = function(iFromIndex, iToIndex) {
		assert(typeof iFromIndex === "number", "iFromIndex must be an integer");
		assert(typeof iToIndex === "number", "iToIndex must be an integer");

		if (this.iSelectionMode === SelectionModel.SINGLE_SELECTION) {
			iFromIndex = iToIndex;
		}

		var iFrom = Math.min(iFromIndex, iToIndex);
		var iTo = Math.max(iFromIndex, iToIndex);

		var aChangedRowIndices = [];
		var aSelectedIndices = this.aSelectedIndices;
		var iLeadIndex = this.iLeadIndex;
		for (var iIndex = iFrom; iIndex <= iTo; iIndex++) {
			var iIndexToRemove = aSelectedIndices.indexOf(iIndex);
			if (iIndexToRemove > -1) {
				aSelectedIndices.splice(iIndexToRemove, 1);
				aChangedRowIndices.push(iIndex);
			}
			if (iIndex === this.iLeadIndex) {
				iLeadIndex = -1;
			}
		}
		this._update(aSelectedIndices, iLeadIndex, aChangedRowIndices);
		return this;
	};

	/**
	 * Slices a the indices between the two indices from the selection.
	 * If <code>iFromIndex</code> is smaller than <code>iToIndex</code>, both parameters are swapped.
	 *
	 * If the range of removed selection indices includes the current lead selection,
	 * then the lead selection will be unset (set to -1).
	 *
	 * If this call results in a change to the current selection or lead selection, then a
	 * <code>SelectionChanged</code> event is fired.
	 *
	 * @param {int} iFromIndex one end of the interval.
	 * @param {int} iToIndex other end of the interval
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.sliceSelectionInterval = function(iFromIndex, iToIndex) {
		assert(typeof iFromIndex === "number", "iFromIndex must be an integer");
		assert(typeof iToIndex === "number", "iToIndex must be an integer");

		var iFrom = Math.min(iFromIndex, iToIndex);
		var iTo = Math.max(iFromIndex, iToIndex);

		var aChangedRowIndices = [];
		var aRemovedIndices = [];
		var aOldSelectedIndices = this.aSelectedIndices.slice(0);
		var aSelectedIndices = this.aSelectedIndices;
		var iLeadIndex = this.iLeadIndex;
		var iRange = iTo - iFrom + 1;

		//Check for each item in the range if is selected, if this is the case remove it from the list
		for (var iIndex = iTo; iIndex >= iFrom; iIndex--) {
			var iIndexToRemove = aSelectedIndices.indexOf(iIndex);
			if (iIndexToRemove > -1) {
				aSelectedIndices.splice(iIndexToRemove, 1);
				//Store removed indices to calculate changed indices later
				aRemovedIndices.push(iIndex);
			}
			//if the lead index is removed it is reset
			if (iIndex === this.iLeadIndex) {
				iLeadIndex = -1;
			}
		}

		//For all entries in the selected indices list, that are behind the removed section decrease the index by the number of removed items
		for (var iIndex = 0; iIndex < aSelectedIndices.length; iIndex++) {
			var iOldIndex = aSelectedIndices[iIndex];
			if (iOldIndex >= iFrom) {
				var iNewIndex = aSelectedIndices[iIndex] - iRange;
				if (iOldIndex === iLeadIndex) {
					iLeadIndex = iNewIndex;
				}
				aSelectedIndices[iIndex] = iNewIndex;
				if (aOldSelectedIndices.indexOf(iNewIndex) === -1) {
					aChangedRowIndices.push(iNewIndex);
				}
			}
		}

		//Get the last x indices from the old list and remove them, because this amount of indices was sliced
		for (var i = 0; i < aRemovedIndices.length; i++) {
			var iIndex = aOldSelectedIndices[aOldSelectedIndices.length - 1 - i];
			if (aChangedRowIndices.indexOf(iIndex) === -1) {
				aChangedRowIndices.push(iIndex);
			}
		}
		for (var i = 0; i < aRemovedIndices.length; i++) {
			if (aSelectedIndices.indexOf(aRemovedIndices[i]) === -1 && aChangedRowIndices.indexOf(aRemovedIndices[i]) === -1) {
				aChangedRowIndices.push(aRemovedIndices[i]);
			}
		}

		this._update(aSelectedIndices, iLeadIndex, aChangedRowIndices);
		return this;
	};

	/**
	 * Change the selection to the empty set and clears the lead selection.
	 *
	 * If this call results in a change to the current selection or lead selection, then a
	 * <code>SelectionChanged</code> event is fired.
	 *
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.clearSelection = function() {
		if (this.aSelectedIndices.length > 0 || this.iLeadIndex !== -1 ) {
			this._update([], -1, this.aSelectedIndices.slice());
		}
		return this;
	};


	/**
	 * Attaches event handler <code>fnFunction</code> to the {@link #event:selectionChanged selectionChanged} event of this
	 * <code>sap.ui.model.SelectionModel</code>.
	 *
	 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code>
	 * if specified, otherwise it will be bound to this <code>sap.ui.model.SelectionModel</code> itself.
	 *
	 * @param {object}
	 *            [oData] An application-specific payload object that will be passed to the event handler
	 *            along with the event object when firing the event
	 * @param {function}
	 *            fnFunction The function to be called, when the event occurs
	 * @param {object}
	 *            [oListener] Context object to call the event handler with. Defaults to this
	 *            <code>SelectionModel</code> itself
	 *
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.attachSelectionChanged = function(oData, fnFunction, oListener) {
		this.attachEvent("selectionChanged", oData, fnFunction, oListener);
		return this;
	};

	/**
	 * Detaches event handler <code>fnFunction</code> from the {@link #event:selectionChanged selectionChanged} event of this
	 * <code>sap.ui.model.SelectionModel</code>.
	 *
	 * The passed function and listener object must match the ones used for event registration.
	 *
	 * @param {function}
	 *            fnFunction The function to be called, when the event occurs
	 * @param {object}
	 *            [oListener] Context object on which the given function had to be called
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.detachSelectionChanged = function(fnFunction, oListener) {
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
	 * @protected
	 */
	SelectionModel.prototype.fireSelectionChanged = function(oParameters) {
		this.fireEvent("selectionChanged", oParameters);
		return this;
	};

	/**
	 * Updates the selection models selected indices and the lead selection. Finally
	 * it notifies the listeners with an array of changed row indices which can
	 * either be removed or added to the selection model.
	 *
	 * @param {int[]} aSelectedIndices selected row indices
	 * @param {int} iLeadSelection lead selection index
	 * @param {int[]} aChangedRowIndices changed row indices
	 * @param {boolean} bSelectAll indicator if all rows are selected
	 * @private
	 */
	SelectionModel.prototype._update = function(aSelectedIndices, iLeadSelection, aChangedRowIndices, bSelectAll) {

		// create the event parameters with the changed row indices (sorted!)
		var mParams = {
			rowIndices: aChangedRowIndices && aChangedRowIndices.sort(this.fnSort),
			selectAll: bSelectAll
		};

		// update the selected indices
		this.aSelectedIndices = aSelectedIndices; // TODO: sorting here could avoid additional sorts in min/max and get

		mParams.oldIndex = this.iLeadIndex;

		// update lead selection (in case of removing the lead selection it is -1)
		if (this.iLeadIndex !== iLeadSelection) {
			this.iLeadIndex = iLeadSelection;
			mParams.leadIndex = this.iLeadIndex;
		}

		// fire change event
		if ( aChangedRowIndices.length > 0 || typeof mParams.leadIndex !== "undefined" ) {
			this.fireSelectionChanged( mParams );
		}

	};

	/**
	 * Selects all rows up to the <code>iToIndex</code>.
	 *
	 * If this call results in a change to the current selection, then a
	 * <code>SelectionChanged</code> event is fired.
	 *
	 * @param {int} iToIndex end of the interval
	 * @return {this} <code>this</code> to allow method chaining
	 * @public
	 */
	SelectionModel.prototype.selectAll = function(iToIndex) {

		assert(typeof iToIndex === "number", "iToIndex must be an integer");

		// set new selection range, determine set of changed indices
		var aOldSelectedRowIndices = this.aSelectedIndices.slice();

		// build a lookup map
		var mLookup = {};
		var aChangedRowIndices = [];
		var aSelectedIndices = [];
		var i = 0;

		for (i = 0; i < aOldSelectedRowIndices.length; i++) {
			mLookup[aOldSelectedRowIndices[i]] = true;
			if (aOldSelectedRowIndices[i] > iToIndex) {
				// the old index will be deselected when it's not in the range of the new interval, therefore it's a changed index
				aChangedRowIndices.push(aOldSelectedRowIndices[i]);
			}
		}

		for (i = 0; i <= iToIndex; i++) {
			aSelectedIndices.push(i);
			// if the index was not selected before it is now selected and therefore part of changed indices
			if (!mLookup[i]) {
				aChangedRowIndices.push(i);
			}
		}

		// 0 will be used as leadIndex. It more likely that in oData case the index 0 is already loaded than that the last index is loaded.
		// The leadIndex will be used to determine the leadContext in the selectionChange event.
		// If not yet loaded it would need to be request. To avoid unnecessary roundtrips the lead index is set to 0.
		this._update(aSelectedIndices, 0, aChangedRowIndices, true);

		return this;

	};

	return SelectionModel;

});