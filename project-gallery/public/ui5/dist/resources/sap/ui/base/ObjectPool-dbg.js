/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.base.ObjectPool
sap.ui.define(['./Object'],
	function(BaseObject) {
	"use strict";


	/**
	 * Creates an <code>ObjectPool</code> for maintaining instances of the given class <code>oObjectClass</code>.
	 *
	 * <code>oObjectClass</code> must implement the {@link sap.ui.base.Poolable} interface.
	 *
	 * @param {function(new:Object)} oObjectClass Constructor for the class of objects that this pool should manage
	 *
	 * @class Manages a pool of objects for reuse, all of the same type;
	 * the type has to be specified at construction time.
	 *
	 * Each pool maintains a list of free objects of the given type.
	 * If {@link sap.ui.base.ObjectPool.prototype.borrowObject} is called, an existing free object
	 * is taken from the pool. When no free object is available, a new instance is created by calling
	 * the constructor without any arguments. In either case, the {@link sap.ui.base.Poolable#init}
	 * method is called on the object to initialize it with the data for the current caller.
	 *
	 * When the object is no longer needed, it has to be returned to the pool by calling {@link #returnObject}.
	 * At that point in time, {@link sap.ui.base.Poolable#reset} is called on the object to remove all data
	 * from it. Then it is is added back to the list of free objects for future reuse.
	 *
	 * See {@link sap.ui.base.Poolable} for a description of the contract for poolable objects.
	 *
	 * Example:
	 * <pre>
	 *   sap.ui.define([
	 *     "sap/ui/base/Event",
	 *     "sap/ui/base/ObjectPool"
	 *   ], function(Event, ObjectPool) {
	 *
	 *     // create a pool for events
	 *     var oEventPool = new ObjectPool(Event);
	 *
	 *     ...
	 *
	 *     // borrow an instance and initialize it at the same time
	 *     var oEvent = oEventPool.borrowObject('myEvent', this, {foo: 'bar'});
	 *     // this internally calls oEvent.init('myEvent', this, {foo: 'bar'})
	 *
	 *     // return the borrowed object
	 *     oEventPool.returnObject(oEvent);
	 *     // this internally calls oEvent.reset()
	 *
	 *     ...
	 *
	 *   }});
	 * </pre>
	 *
	 * @extends sap.ui.base.Object
	 * @author SAP SE
	 * @version 1.138.0
	 * @alias sap.ui.base.ObjectPool
	 * @public
	 */
	var ObjectPool = BaseObject.extend("sap.ui.base.ObjectPool", /** @lends sap.ui.base.ObjectPool.prototype */ {
		constructor: function(oObjectClass) {

			BaseObject.call(this);

			this.oObjectClass = oObjectClass;

			this.aFreeObjects = [];
		//	this.aUsedObjects = []; //PERFOPT: Holding those is currently senseless.

		}
	});

	/**
	 * Borrows a free object from the pool. Any arguments to this method
	 * are forwarded to the init method of the borrowed object.
	 *
	 * @param {...any} [args] optional initialization parameters for the borrowed object
	 * @return {Object} The borrowed object of the same type that has been specified for this pool
	 * @public
	 */
	ObjectPool.prototype.borrowObject = function() {

		// PERFOPT: Reduced callstack
		var oObject = this.aFreeObjects.length == 0 ?
				new this.oObjectClass() :
					this.aFreeObjects.pop();
		oObject.init.apply(oObject, arguments);
	//	this.aUsedObjects.push(oObject); //PERFOPT: Holding those is currently senseless.

		return oObject;
	};

	/**
	 * Returns an object to the pool. The object must have been borrowed from this
	 * pool beforehand. The reset method is called on the object before it is added
	 * to the set of free objects.
	 *
	 * @param {Object} oObject The object to return to the pool
	 * @public
	 */
	ObjectPool.prototype.returnObject = function(oObject) {

		oObject.reset();
		// If the next line is ever activated again, ensure not simply the topmost object is popped but the one returned!!
	//	this.aUsedObjects.pop(); //PERFOPT: Holding those is currently senseless.
		this.aFreeObjects.push(oObject);

	};


	/**
	 * Contract for objects that can be pooled by an <code>ObjectPool</code>.
	 *
	 * Poolable objects must provide a no-arg constructor which is used by the pool
	 * to construct new, unused objects.
	 *
	 * To be more convenient to use, poolable objects should implement their constructor
	 * in a way that it either can be called with no arguments (used by the pool) or
	 * with the same signature as their {@link #init} method (to be used by applications).
	 *
	 * @name sap.ui.base.Poolable
	 * @interface
	 * @public
	 */

	/**
	 * Called by the <code>ObjectPool</code> when this instance will be activated for a caller.
	 *
	 * The same method will be called after a new instance has been created by an otherwise
	 * exhausted pool.
	 *
	 * If the caller provided any arguments to {@link sap.ui.base.ObjectPool#borrowObject},
	 * all arguments will be propagated to this method.
	 *
	 * @name sap.ui.base.Poolable.prototype.init
	 * @param {...any} [args] the arguments which were given to {@link sap.ui.base.ObjectPool#borrowObject}
	 * @function
	 * @protected
	 */

	/**
	 * Called by the object pool when an instance is returned to the pool.
	 *
	 * While no specific implementation is required, poolable objects in general
	 * should clean all caller specific state (set to null) in this method to
	 * avoid memory leaks and to enforce garbage collection of the caller state.
	 *
	 * @name sap.ui.base.Poolable.prototype.reset
	 * @function
	 * @protected
	 */

	return ObjectPool;

});
