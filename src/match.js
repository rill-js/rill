"use strict";

var slice = Array.prototype.slice;
var URL   = require("url");
var toReg = require("path-to-regexp");
var chain = require("@rill/chain");

module.exports = matches;

// Matches for individual middleware.
var matches = {
	/**
	 * Creates a function that will match a path name before executing middleware.
	 *
	 * @param {String} pathname - The pathname (converted to regex) to match.
	 * @param {Function...} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	pathname: function (pathname) {
		var keys = [],
			reg = toReg(pathname, keys),
			fn  = chain(normalize(slice.call(arguments, 1)));

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

			// Set _pathname path for nested routes.
			if (ctx._pathname == null) ctx._pathname = req.pathname;
			ctx._pathname = ctx._pathname.replace(reg, "");

			// Run middleware.
			return fn(ctx, next);
		}
	},

	/**
	 * Creates a function that will match a host name before executing middleware.
	 *
	 * @param {String} hostname - The hostname (converted to regex) to match.
	 * @param {Function...} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	hostname: function (hostname) {
		var keys = [],
			reg = toReg(hostname, keys, { strict: true }),
			fn  = chain(normalize(slice.call(arguments, 1)));

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

			// Set _hostname path for nested routes.
			if (ctx._hostname == null) ctx._hostname = req.hostname;
			ctx._hostname = ctx._hostname.replace(reg, "");

			// Run middleware.
			return fn(ctx, next);
		}
	},

	/**
	 * Creates a function that will match a method before executing middleware.
	 *
	 * @param {String} method - The http method to match.
	 * @param {Function...} fn - The function that will run after the match passes.
	 * @return {Function}
	 */
	method: function (method) {
		var fn = chain(normalize(slice.call(arguments, 1)));
		method = method.toUpperCase();

		return function matchMethod (ctx, next) {
			var req = ctx.req;
			if (req.method !== method) return next();
			return fn(ctx, next);
		}
	}
};

function normalize (args, acc) {
	acc = acc || [];
	if (!args) return acc;
	for (var cur, i = 0, len = args.length; i < len; i++) {
		cur = args[i];
		if (!cur) continue;
		if (Array.isArray(cur)) flat(cur, acc);
		else if (typeof cur.stack === "function") flat(cur.stack(), acc);
		else acc.push(cur);
	}
}
