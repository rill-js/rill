var toReg = require("path-to-regexp");
var join  = require("join-url");

module.exports = match;

function match (config, fn) {
	return function (app) {
		for (var type in config) {
			if (!(type in matches)) continue;
			fn = matches[type](app, config[type], fn);
		}

		return fn;
	};
}

var matches = {
	pathname: function (app, pathname, fn) {
		pathname = join.pathname(app.config.pathname, pathname);
		if (!pathname) return fn;

		var keys = [],
			reg = toReg(pathname, keys);

		return function matchPath (req, res, next) {		
			var matches = req.pathname.match(reg);
			if (!matches) return next();

			for (var key, match, i = keys.length; i--;) {
				key = keys[i];
				match = matches[i + 1];
				if (!key.optional && match == null) return next();
				req.params[key] = match;
			}

			return fn.call(this, req, res, next);
		}
	},

	hostname: function (app, hostname, fn) {
		hostname = join.hostname(app.config.hostname, hostname);
		if (!hostname) return fn;

		var keys = [],
			reg = toReg(hostname, keys);

		return function matchHost (req, res, next) {		
			var matches = req.hostname.match(reg);
			if (!matches) return next();

			for (var key, match, i = keys.length; i--;) {
				key = keys[i];
				match = matches[i + 1];
				if (!key.optional && match == null) return next();
				req.subdomains[key] = match;
			}

			return fn.call(this, req, res, next);
		}
	},

	method: function (app, method, fn) {
		if (app.config.method && method) {
			throw new Error(
				"Rill: cannot attach with method " +
				method + ". Function(" +
				fn.name +
				") is already mounted using " + app.config.method + "."
			);
		}

		method = app.config.method || method;
		if (!method) return fn;
		method = method.toUpperCase();

		return function matchMethod (req, res, next) {		
			if (req.method !== method) return next();
			return fn.call(this, req, res, next);

		}
	}
};