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
	var wrapper = null;

	if (typeof fn === "function") {
		wrapper = matches;
	} else if (fn.stack) {
		wrapper = mounts;
	} else {
		throw new TypeError("Rill: Middleware must be an app, function, or null.");
	}

	return function (app) {
		for (var type in config) {
			if (type in wrapper) {
				fn = wrapper[type](app, config[type], fn);
			}
		}

		return fn;
	};
}

// Matches for individual middleware.
var matches = {
	/**
	 * Creates a function that will match a path name before executing a function.
	 *
	 * @param {Rill} app - The rill instance that this match will run against.
	 * @param {String} pathname - The pathname (converted to regex) to match.
	 * @param {Function} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	pathname: function (app, pathname, fn) {
		// Check to see if the app is mounted, and update the pathname.
		pathname = join.pathname(app.base.pathname, pathname);
		// Here we attempt to avoid running the match every time.
		if (!pathname) return fn;

		var keys = [],
			reg = toReg(pathname, keys);

		return function matchPath (req, res, next) {		
			var matches = req.pathname.match(reg);
			if (!matches) return next();

			// Check if params match.
			for (var key, match, i = keys.length; i--;) {
				key = keys[i];
				match = matches[i + 1];
				if (!key.optional && match == null) return next();
				req.params[key.name] = match;
			}

			return fn.call(this, req, res, next);
		}
	},

	/**
	 * Creates a function that will match a host name before executing a function.
	 *
	 * @param {Rill} app - The rill instance that this match will run against.
	 * @param {String} hostname - The hostname (converted to regex) to match.
	 * @param {Function} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	hostname: function (app, hostname, fn) {
		// Check to see if the app is mounted, and update the hostname.
		hostname = join.hostname(hostname, app.base.hostname);
		// Here we attempt to avoid running the match every time.
		if (!hostname) return fn;

		var keys = [],
			reg = toReg(hostname, keys, { strict: true });

		return function matchHost (req, res, next) {		
			var matches = req.hostname.match(reg);
			if (!matches) return next();

			// Here we check for the dynamically matched subdomains.
			for (var key, match, i = keys.length; i--;) {
				key = keys[i];
				match = matches[i + 1];
				if (!key.optional && match == null) return next();
				req.subdomains[key.name] = match;
			}

			return fn.call(this, req, res, next);
		}
	},

	/**
	 * Creates a function that will match a method before executing a function.
	 *
	 * @param {Rill} app - The rill instance that this match will run against.
	 * @param {String} method - The http method to match.
	 * @param {Function} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	method: function (app, method, fn) {
		// We cant allow both an instance method, and a middleware method.
		if (app.base.method && method) {
			throw new Error(
				"Rill: cannot attach with method " +
				method + ". Function(" +
				fn.name +
				") is already mounted using " + app.base.method + "."
			);
		}

		method = app.base.method || method;
		// Here we attempt to avoid running the match every time.
		if (!method) return fn;
		method = method.toUpperCase();

		return function matchMethod (req, res, next) {		
			if (req.method !== method) return next();
			return fn.call(this, req, res, next);

		}
	}
};

// Matches that mount another rill application.
var mounts = {
	/**
	 * Updates a rill instance to be mounted at a given pathname.
	 * If the instance is already mounted it is extended.
	 *
	 * @param {Rill} root - The rill instance that is being mounted to.
	 * @param {String} pathname - The pathname to match.
	 * @param {Rill} app - The rill instance that is being mounted.
	 */
	pathname: function (root, pathname, app) {
		pathname = join.pathname(root.base.pathname, pathname);
		if (pathname) app.base.pathname = pathname;
		return app;
	},

	/**
	 * Updates a rill instance to be mounted at a given hostname.
	 * If the instance is already mounted it is extended.
	 *
	 * @param {Rill} root - The rill instance that is being mounted to.
	 * @param {String} hostname - The hostname to match.
	 * @param {Rill} app - The rill instance that is being mounted.
	 */
	hostname: function (root, hostname, app) {
		hostname = join.hostname(hostname, root.base.hostname);
		if (hostname) app.base.hostname = hostname;
		return app;
	},

	/**
	 * Updates a rill instance to be mounted at a given http method.
	 *
	 * @param {Rill} root - The rill instance that is being mounted to.
	 * @param {String} method - The method to match.
	 * @param {Rill} app - The rill instance that is being mounted.
	 */
	method: function (root, method, app) {
		// An app cannot be mounted by method twice.
		if (root.base.method) {		
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