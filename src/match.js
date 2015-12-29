"use strict";

var URL   = require("url");
var toReg = require("path-to-regexp");
var join  = require("join-url");
var noop  = function () {};

module.exports = match;

/**
 * Given a config such as
 * { pathname: "/test" }
 * Ensures that the matcher functions are invoked accoridingly.
 * Returns a thunk so that the matchers can be evaluated after the app has been initialized.
 *
 * @param {Object} config - url options to match before executing a function.
 * @param {Function} fn - The function that will run if all matches pass.
 * @return function
 */
function match (config, fn) {
	if (fn == null) return noop;
	if (config == null) config = {};

	var wrapper = null;
	if (typeof fn === "function") wrapper = matches;
	else if (fn.stack) wrapper = mounts;
	else throw new TypeError("Rill: Middleware must be an app, function, or null.");

	return function (base) {
		for (var type in wrapper) fn = wrapper[type](base, config[type], fn);
		return fn;
	};
}

// Matches for individual middleware.
var matches = {
	/**
	 * Creates a function that will match a path name before executing a function.
	 *
	 * @param {Object} base - Information about where the route is mounted.
	 * @param {String} pathname - The pathname (converted to regex) to match.
	 * @param {Function} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	pathname: function (base, pathname, fn) {
		// If there was no path name then we only match the begining of the base path.
		var end = pathname != null;
		// Check to see if the app is mounted, and update the pathname.
		pathname = join.pathname(base.pathname, pathname);
		// Here we attempt to avoid running the match every time.
		if (!pathname) return fn;

		var keys = [],
			reg = toReg(pathname, keys, { end: end });

		return function matchPath (ctx, next) {
			var req     = ctx.req;
			var matches = req.pathname.match(reg);
			if (!matches) return next();

			// Check if params match.
			for (var key, match, i = keys.length; i--;) {
				key = keys[i];
				match = matches[i + 1];
				if (!key.optional && match == null) return next();
				req.params[key.name] = match;
			}

			return fn(ctx, next);
		}
	},

	/**
	 * Creates a function that will match a host name before executing a function.
	 *
	 * @param {Object} base - Information about where the route is mounted.
	 * @param {String} hostname - The hostname (converted to regex) to match.
	 * @param {Function} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	hostname: function (base, hostname, fn) {
		// Check to see if the app is mounted, and update the hostname.
		hostname = join.hostname(hostname, base.hostname);
		// Here we attempt to avoid running the match every time.
		if (!hostname) return fn;

		var keys = [],
			reg = toReg(hostname, keys, { strict: true });

		return function matchHost (ctx, next) {
			var req     = ctx.req;
			var matches = req.hostname.match(reg);
			if (!matches) return next();

			// Here we check for the dynamically matched subdomains.
			for (var key, match, i = keys.length; i--;) {
				key = keys[i];
				match = matches[i + 1];
				if (!key.optional && match == null) return next();
				req.subdomains[key.name] = match;
			}

			return fn(ctx, next);
		}
	},

	/**
	 * Creates a function that will match a method before executing a function.
	 *
	 * @param {Object} base - Information about where the route is mounted.
	 * @param {String} method - The http method to match.
	 * @param {Function} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	method: function (base, method, fn) {
		// We cant allow both an instance method, and a middleware method.
		if (base.method && method) {
			throw new Error(
				"Rill: cannot attach with method " +
				method + ". Function(" +
				fn.name +
				") is already mounted using " + base.method + "."
			);
		}

		method = base.method || method;
		// Here we attempt to avoid running the match every time.
		if (!method) return fn;
		method = method.toUpperCase();

		return function matchMethod (ctx, next) {
			var req = ctx.req;
			if (req.method !== method) return next();
			return fn(ctx, next);

		}
	}
};

// Matches that mount another rill application.
var mounts = {
	/**
	 * Updates a rill instance to be mounted at a given pathname.
	 * If the instance is already mounted it is extended.
	 *
	 * @param {Object} base - Information about where the app is mounted.
	 * @param {String} pathname - The pathname to match.
	 * @param {Rill} app - The rill instance that is being mounted.
	 */
	pathname: function (base, pathname, app) {
		pathname = join.pathname(base.pathname, pathname);
		if (pathname) app.base.pathname = pathname;
		return app;
	},

	/**
	 * Updates a rill instance to be mounted at a given hostname.
	 * If the instance is already mounted it is extended.
	 *
	 * @param {Object} base - Information about where the app is mounted.
	 * @param {String} hostname - The hostname to match.
	 * @param {Rill} app - The rill instance that is being mounted.
	 */
	hostname: function (base, hostname, app) {
		hostname = join.hostname(hostname, base.hostname);
		if (hostname) app.base.hostname = hostname;
		return app;
	},

	/**
	 * Updates a rill instance to be mounted at a given http method.
	 *
	 * @param {Object} base - Information about where the app is mounted.
	 * @param {String} method - The method to match.
	 * @param {Rill} app - The rill instance that is being mounted.
	 */
	method: function (base, method, app) {
		// An app cannot be mounted by method twice.
		if (base.method) {
			throw new Error(
				"Rill: cannot mount with method " +
				method + ". App is already mounted using " +
				app.base.method + "."
			);
		}
		if (method) app.base.method = method;
		return app;
	}
};

function flat (arr, acc) {
	acc = acc || [];
	if (!arr) return acc;
	for (var cur, i = 0, len = arr.length; i < len; i++) {
		cur = arr[i];
		if (!cur) continue;
		if (Array.isArray(cur)) flat(cur, acc);
		else if (typeof cur.stack === "function") flat(cur.stack(), acc);
		else acc.push(cur);
	}
}
