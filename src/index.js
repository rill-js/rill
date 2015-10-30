var http      = require("@rill/http");
var chain     = require("@rill/chain");
var HttpError = require("@rill/error");
var match     = require("./match");
var Request   = require("./request");
var Response  = require("./response")
var Context   = require("./context");
var respond   = require("./respond");
var rill      = Rill.prototype;

module.exports = Rill;

/**
 * Creates an isomorphic app that will run middleware for a incomming request.
 *
 * @constructor 
 */
function Rill () {
	if (!(this instanceof Rill)) return new Rill();

	this.env             = process.env.NODE_ENV;
	this.subdomainOffset = 2;
	this.base            = {};
	this._stack          = [];
}

// Expose other constructors.
rill.Context   = Context;
rill.Request   = Request;
rill.Response  = Response;
rill.HttpError = HttpError;

/**
 * Function to create a valid set of middleware for the instance.
 * This is to allow lazy middleare generation.
 *
 * @return {Array}
 */
rill.stack = function stack () {
	var fns    = this._stack;
	var result = [];

	// Here we ensure each middleware function has an updated app instance.
	// This is to enabled lazy matching path, host and method.
	for (var i = 0, len = fns.length; i < len; i++) {
		fn = fns[i](this);

		if (fn == null) {
			continue;
		} else if (fn.constructor === Rill) {
			result = result.concat(fn.stack());
		} else if (typeof fn === "function") {
			result.push(fn);
		} else {
			throw new TypeError("Rill: Middleware must be an app, function, or null.");
		}
	}

	return result;
};

/**
 * Takes the current middleware stack, chains it together and
 * returns a valid handler for a node js style server request.
 *
 * @return {Function}
 */
rill.handler = function handler () {
	var self = this;
	var fn   = chain(this.stack());

	return function handleIncommingMessage (req, res) {
		var ctx = new Context(self, req, res);
		var end = function () { respond.call(ctx, ctx.request, ctx.response); };

		fn.call(ctx, ctx.request, ctx.response)
			.then(end)
			.catch(function handleError (err) {
				try {
					console.log("Rill: Unhandled error.");
					console.error(err && err.stack || err);
				} catch (_) {}

				res.status = 500;
				end();
			});
	};
}

/**
 * Starts a node/rill server.
 *
 * @return {Server}
 */
rill.listen = function listen () {
	// todo: accept a url string and parse out protocol, port and ip.
	this.server = http.createServer(this.handler());
	return this.server.listen.apply(this.server, arguments);
};

/**
 * Close a node/rill server.
 *
 * @return {Server}
 */
rill.close = function close () {
	if (!this.server) {
		throw new Error("Rill: Unable to close. Server not started.")
	}

	this.server.close();
	this.server = undefined;
	return this;
};

/**
 * Simple syntactic sugar for functions that
 * wish to modify the current rill instance.
 *
 * @param {Function...} transformers - Functions that will modify the rill instance.
 */
rill.setup = function setup () {
	for (var fn, i = arguments.length; i--;) {
		fn = arguments[i];

		if (typeof fn === "function") {
			fn(this);
		} else if (fn != null) {
			throw new TypeError("Rill#setup: Setup must be a function or null.");
		}
	}

	return this;
};

/**
 * Append new middleware to the current rill application stack.
 *
 * @example
 * rill.use(fn1, fn2);
 *
 * @param {Object} [config] - Optional config that must be matched for the middleware to run.
 * @param {Function...} middleware - Functions to run during an incomming request.
 */
rill.use = function use () {
	var start = this._stack.length;
	var end   = this._stack.length += arguments.length;

	for (var fn, i = end; start < i--;) {
		this._stack[i] = match(null, arguments[i - start]);
	}

	return this;
};

/**
 * Syntactic sugar for `rill.use({ pathname: config }, fns...);`
 */
rill.at = function at (pathname) {
	if (typeof pathname !== "string") throw new TypeError("Rill#at: Path name must be a string.");
	
	var config = { pathname: pathname };
	var offset = 1;
	var start  = this._stack.length;
	var end    = this._stack.length += arguments.length - offset;

	for (var fn, i = end; start < i--;) {
		this._stack[i] = match(config, arguments[i - start + offset]);
	}

	return this;
};

/**
 * Syntactic sugar for `rill.use({ hostname: config }, fns...);`
 */
rill.host = function host (hostname) {
	if (typeof hostname !== "string") throw new TypeError("Rill#host: Host name must be a string.");
	
	var config = { hostname: hostname };
	var offset = 1;
	var start  = this._stack.length;
	var end    = this._stack.length += arguments.length - offset;

	for (var fn, i = end; start < i--;) {
		this._stack[i] = match(config, arguments[i - start + offset]);
	}

	return this;
};

/**
 * Syntactic sugar for `rill.use({ method: method, pathname: config }, fns...);`
 */
http.METHODS.forEach(function (method) {
	var name = method.toLowerCase();

	rill[name] = Object.defineProperty(function (pathname) {
		var config = { method: method };
		var offset = 0;

		if (typeof pathname === "string") {
			config.pathname = pathname;
			offset++;
		}

		var start = this._stack.length;
		var end   = this._stack.length += arguments.length - offset;

		for (var fn, i = end; start < i--;) {
			this._stack[i] = match(config, arguments[i - start + offset]);
		}

		return this;
	}, "name", { value: name });;
});