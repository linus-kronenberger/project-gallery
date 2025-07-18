/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides an abstraction for tree bindings
sap.ui.define(['./Binding', './Filter', './Sorter'],
	function(Binding, Filter, Sorter) {
	"use strict";


	/**
	 * Constructor for TreeBinding.
	 *
	 * This constructor should only be called by subclasses or model implementations, not by application or control code.
	 * Such code should use {@link sap.ui.model.Model#bindTree Model#bindTree} on the corresponding model instead.
	 *
	 * @abstract
	 * @class
	 * The TreeBinding is a specific binding for trees in the model, which can be used
	 * to populate Trees.
	 *
	 * @param {sap.ui.model.Model}
	 *         oModel Model instance that this binding is created for and that it belongs to
	 * @param {string}
	 *         sPath Path pointing to the tree / array that should be bound
	 * @param {sap.ui.model.Context}
	 *         [oContext=null] Context object for this binding (optional)
	 * @param {sap.ui.model.Filter[]|sap.ui.model.Filter} [aFilters=[]]
	 *   The filters to be used initially with type {@link sap.ui.model.FilterType.Application}; call {@link #filter} to
	 *   replace them
	 * @param {object}
	 *         [mParameters=null] Additional model specific parameters (optional)
	 * @param {sap.ui.model.Sorter[]|sap.ui.model.Sorter} [aSorters=[]]
	 *   The sorters used initially; call {@link #sort} to replace them
	 * @throws {Error} If the {@link sap.ui.model.Filter.NONE} filter instance is contained in
	 *   <code>aFilters</code> together with other filters
	 *
	 * @public
	 * @alias sap.ui.model.TreeBinding
	 * @extends sap.ui.model.Binding
	 */
	var TreeBinding = Binding.extend("sap.ui.model.TreeBinding", /** @lends sap.ui.model.TreeBinding.prototype */ {

		constructor : function(oModel, sPath, oContext, aFilters, mParameters, aSorters){
			Binding.call(this, oModel, sPath, oContext, mParameters);
			this.aFilters = [];

			this.aSorters = makeArray(aSorters, Sorter);
			Filter.checkFilterNone(aFilters);
			this.aApplicationFilters = makeArray(aFilters, Filter);
			this.oCombinedFilter = null;

			this.bDisplayRootNode = mParameters && mParameters.displayRootNode === true;
		},

		metadata : {
			"abstract" : true,
			publicMethods : [
				"getRootContexts", "getNodeContexts", "hasChildren", "filter"
			]
		}

	});

	function makeArray(a, FNClass) {
		if ( Array.isArray(a) ) {
			return a;
		}
		return a instanceof FNClass ? [a] : [];
	}

	// the 'abstract methods' to be implemented by child classes
	/**
	 * Returns the current value of the bound target.
	 *
	 * @function
	 * @name sap.ui.model.TreeBinding.prototype.getRootContexts
	 * @param {int} [iStartIndex=0] the index from which to start the retrieval of contexts
	 * @param {int} [iLength] determines how many contexts to retrieve, beginning from the start index. Defaults to the
	 *   model's size limit; see {@link sap.ui.model.Model#setSizeLimit}.
	 * @returns {sap.ui.model.Context[]} the array of child contexts for the root node
	 *
	 * @public
	 */

	/**
	 * Returns the current value of the bound target.
	 *
	 * @function
	 * @name sap.ui.model.TreeBinding.prototype.getNodeContexts
	 * @param {sap.ui.model.Context} oContext the context element of the node
	 * @param {int} [iStartIndex=0] the index from which to start the retrieval of contexts
	 * @param {int} [iLength] determines how many contexts to retrieve, beginning from the start index. Defaults to the
	 *   model's size limit; see {@link sap.ui.model.Model#setSizeLimit}.
	 * @returns {sap.ui.model.Context[]} the array of child contexts for the given node
	 *
	 * @public
	 */

	/**
	 * Returns <code>true</code> if the node has child nodes.
	 *
	 * @function
	 * @name sap.ui.model.TreeBinding.prototype.hasChildren
	 * @param {sap.ui.model.Context} oContext the context element of the node
	 * @returns {boolean} <code>true</code> if the node has children
	 *
	 * @public
	 */

	/**
	 * Returns the number of child nodes of a specific context.
	 *
	 * @param {sap.ui.model.Context} oContext the context element of the node
	 * @returns {int} the number of children
	 *
	 * @public
	 */
	TreeBinding.prototype.getChildCount = function(oContext) {
		if (!oContext) {
			return this.getRootContexts().length;
		}
		return this.getNodeContexts(oContext).length;
	};

	/**
	 * Returns the count of entries in the tree, or <code>undefined</code> if it is unknown. If the
	 * tree is filtered, the count of all entries matching the filter conditions is returned. The
	 * entries required only for the tree structure are not counted.
	 *
	 * <b>Note:</b> The default implementation returns <code>undefined</code> and has to be
	 * overwritten by subclasses.
	 *
	 * @returns {number|undefined} The count of entries in the tree, or <code>undefined</code> if it
	 *   is unknown, for example because the binding is not resolved or because this feature is not
	 *   supported.
	 *
	 * @public
	 * @since 1.108.0
	 */
	TreeBinding.prototype.getCount = function () {
		return undefined;
	};

	/**
	 * Filters the tree according to the filter definitions.
	 *
	 * @function
	 * @name sap.ui.model.TreeBinding.prototype.filter
	 * @param {sap.ui.model.Filter[]|sap.ui.model.Filter} [aFilters=[]]
	 *   The filters to use; in case of type {@link sap.ui.model.FilterType.Application} this replaces the filters given
	 *   in {@link sap.ui.model.Model#bindTree}; a falsy value is treated as an empty array and thus removes all filters
	 *   of the specified type
	 * @param {sap.ui.model.FilterType} [sFilterType]
	 *   The type of the filter to replace; if no type is given, the behavior depends on the model implementation
	 *
	 * @public
	 */

	/**
	 * Sorts the tree according to the sorter definitions.
	 *
	 * @function
	 * @name sap.ui.model.TreeBinding.prototype.sort
	 * @param {sap.ui.model.Sorter[]} [aSorters=[]]
	 *   The sorters to use; they replace the sorters given in {@link sap.ui.model.Model#bindTree}; a falsy value is
	 *   treated as an empty array and thus removes all sorters
	 *
	 * @public
	 */

	/**
	 * Attaches event handler <code>fnFunction</code> to the {@link #event:_filter _filter} event of this
	 * <code>sap.ui.model.TreeBinding</code>.
	 *
	 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener</code> if specified,
	 * otherwise it will be bound to this <code>sap.ui.model.TreeBinding</code> itself.
	 *
	 * @param {function} fnFunction The function to be called, when the event occurs
	 * @param {object} [oListener] Context object to call the event handler with,
	 *            defaults to this <code>TreeBinding</code> itself
	 * @protected
	 * @deprecated As of version 1.11, use the <code>change</code> event. It now contains a parameter
	 *             <code>(reason : "filter")</code> when a filter event is fired.
	 */
	TreeBinding.prototype.attachFilter = function(fnFunction, oListener) {
		this.attachEvent("_filter", fnFunction, oListener);
	};

	/**
	 * Detaches event handler <code>fnFunction</code> from the {@link #event:_filter _filter} event of this
	 * <code>sap.ui.model.TreeBinding</code>.
	 *
	 * The passed function and listener object must match the ones used for event registration.
	 *
	 * @param {function} fnFunction The function to be called, when the event occurs
	 * @param {object} [oListener] Context object on which the given function had to be called
	 * @protected
	 * @deprecated As of version 1.11, use the <code>change</code> event.
	 */
	TreeBinding.prototype.detachFilter = function(fnFunction, oListener) {
		this.detachEvent("_filter", fnFunction, oListener);
	};

	/**
	 * Fires event {@link #event:_filter _filter} to attached listeners.
	 *
	 * @param {object} [oParameters] Parameters to pass along with the event
	 * @private
	 * @deprecated As of version 1.11, use the <code>change</code> event. It now contains a parameter
	 *             <code>(reason : "filter")</code> when a filter event is fired.
	 */
	TreeBinding.prototype._fireFilter = function(oParameters) {
		this.fireEvent("_filter", oParameters);
	};

	/**
	 * Return the filter information as an AST. The default implementation checks for this.oCombinedFilter,
	 * models not using this member may override the method.
	 * Consumers must not rely on the origin information to be available, future filter implementations will
	 * not provide this information.
	 *
	 * @param {boolean} bIncludeOrigin include information about the filter objects the tree has been created from
	 * @returns {object} The AST of the filter tree
	 * @private
	 * @ui5-restricted sap.ui.table, sap.ui.export
	 */
	TreeBinding.prototype.getFilterInfo = function(bIncludeOrigin) {
		if (this.oCombinedFilter) {
			return this.oCombinedFilter.getAST(bIncludeOrigin);
		}
		return null;
	};
	return TreeBinding;

});
