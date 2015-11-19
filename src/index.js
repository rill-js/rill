var http       = require("@rill/http");
var chain      = require("@rill/chain");
var HttpError  = require("@rill/error");
var match      = require("./match");
var Context    = require("./context");
var respond    = require("./respond");
var rill       = Rill.prototype;
Rill.HttpError = HttpError;
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
	this.locals          = {};
	this.base            = {};
	this.servers         = [];
	this._stack          = [];
}

/**
 * Allow setting a local variable in the fluent api.
 *
 * @param {String} key
 * @param {*} val
 * @return {Rill}
 */
rill.set = function set (key, val) {
	this.locals[key] = val;
	return this;
};

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
		if (fn == null) continue;
		if (fn.constructor === Rill) fn = bindApp(this, fn);
		result.push(fn);
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
	var app = this;
	var fn  = chain(this.stack());

	return function handleIncommingMessage (req, res) {
		var ctx = new Context(app, req, res);

		fn(ctx)
			.catch(function handleError (err) { try {
				if (Number(ctx.res.status) === 404) ctx.res.status = 500;
				if (!(err instanceof HttpError)) console.error(err && err.stack || err);
			} catch (_) {}})
			.then(function () { respond(ctx) });
	};
}

/**
 * Starts a node/rill server.
 *
 * @return {Server}
 */
rill.listen = function listen () {
	// todo: accept a url string and parse out protocol, port and ip.
	var server = http.createServer(this.handler());
	this.servers.push(server);
	return server.listen.apply(server, arguments);
};

/**
 * Close a node/rill server.
 *
 * @return {Server}
 */
rill.close = function close () {
	if (!this.server || !this.server.length) {
		throw new Error("Rill: Unable to close. No servers started.")
	}

	for (var i = this.servers.length; i--;) {
		this.servers[i].close();
	}

	this.servers = [];
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
 * Use middleware at a specific pathname.
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
 * Use middleware at a specific hostname.
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
 * Use middleware for a specific method / pathname.
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

/**
 * TODO: Make this a seperate utility.
 *
 * Utility to ensure that nested routers receive the appropriate app.
 * Works by modifying ctx.app on the upstream and downstream of the request.
 *
 * @param {Rill} base - the app being mounted to.
 * @param {Rill} app - the app being mounted.
 */
function bindApp (root, app) {
	var downstream = chain(app.stack());

	return function mount (ctx, upstream) {
		ctx.app = app;
		return downstream(ctx, function next () {
			ctx.app = root;
			return upstream().then(function () { ctx.app = app; });
		}).then(function () { ctx.app = root; });
	}
}