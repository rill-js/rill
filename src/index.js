var http      = require("@rill/http");
var chain     = require("@rill/chain");
var HttpError = require("@rill/error");
var match     = require("./match");
var mount     = require("./mount");
var Context   = require("./context");
var respond   = require("./respond");
var app       = Rill.prototype;

module.exports = Rill;

/**
 * Creates an isomorphic app that will run middleware for a incomming request.
 *
 * @constructor 
 */
function Rill () {
	if (!(this instanceof Rill)) return new Rill();

	this.subdomainOffset = 2;
	this.url             = "/";
	this.env             = process.env.NODE_ENV;
	this.stack           = [];
	this.config          = {};
}

/**
 * Takes the current middleware stack, chains it together and
 * returns a valid handler for a node js style server request.
 *
 * @return {Function}
 */
app.handler = function handler () {
	var self        = this;
	var len         = this.stack.length;
	var middleware  = new Array(len + 1);
	
	// Here we ensure each middleware function has an updated app instance.
	// This is to enabled lazy matching.
	middleware[len]               = respond;
	while (len--) middleware[len] = this.stack[len](this)
	var fn                        = chain(middleware);

	return function handleIncommingMessage (req, res) {
		var ctx = new Context(self, req, res);

		fn.call(ctx, ctx.request, ctx.response)
			.then(respond.bind(ctx, ctx.request, ctx.response))
			.catch(function handleError (err) {
				try {
					console.log("Rill: Unhandled error.");
					console.error(err && err.stack || err);
				} catch (_) {}

				res.status = 500;
				respond.call(ctx, ctx.request, ctx.response);
			});
	};
}

/**
 * Starts a node/rill server.
 *
 * @return {Server}
 */
app.listen = function listen () {
	// todo: accept a url string and parse out protocol, port and ip.
	var server = http.createServer(this.handler());
	return server.listen.apply(server, arguments);
};

/**
 * Simple syntactic sugar for functions that
 * wish to modify the current rill instance.
 *
 * @param {Function...} transformers
 */
app.setup = function setup () {
	for (var fn, i = arguments.length; i--;) {
		fn = arguments[i];
		if (typeof fn === "function") fn(this);
		else if (fn != null) throw new TypeError("Rill#setup: Setup must be a function or null.");
	}

	return this;
};

/**
 * Append new middleware to the current rill application stack.
 * If the first param is an object it will run matches against the object.
 * (See ./match.js and ./mount.js)
 *
 * @example
 * app.use(fn1, fn2);
 * // Use functions when pathname is matched.
 * app.use({ pathname: "/test" }, fn1, fn2);
 * // Use functions when hostname is matched.
 * app.use({ hostname: "test.com" }, fn1, fn2);
 * // Use functions when method is matched.
 * app.use({ method: "GET" }, fn1, fn2);
 *
 * @param {Object} [config]
 * @param {Function...} middleware
 */
app.use = function use () {
	var fn, config, i = 0, len = arguments.length;

	if (typeof arguments[0] === "object") {
		i     += 1;
		config = arguments[0];
	} else {
		config = {};
	}

	for (;i < len; i++) {
		fn = arguments[i];
		if (fn == null) {
			continue;
		} else if (fn.constructor === Rill) {
			this.stack = this.stack.concat(mount(fn, config).stack);
		} else if (typeof fn === "function") {
			this.stack.push(match(config, fn));
		} else {
			throw new TypeError("Rill#use: Middleware must be an app, function, or null.");
		}
	}

	return this;
};

/**
 * Syntactic sugar for `app.use({ pathname: config }, fns...);`
 */
app.at = function at (config) {
	if (typeof config !== "string") throw new TypeError("Rill#at: Path name must be a string.");
	arguments[0] = { pathname: config }; 
	return this.use.apply(this, arguments);
};

/**
 * Syntactic sugar for `app.use({ hostname: config }, fns...);`
 */
app.host = function host (config) {
	if (typeof config !== "string") throw new TypeError("Rill#host: Host name must be a string.");
	arguments[0] = { hostname: config }; 
	return this.use.apply(this, arguments);
};

/**
 * Syntactic sugar for `app.use({ method: method, pathname: config }, fns...);`
 */
http.METHODS.forEach(function (config) {
	var name = config.toLowerCase();
	Object.defineProperty(method, "name", { value: name });

	function method (pathname) {
		var options = { method: config };
		var len     = arguments.length + 1;
		var arr     = new Array(len);

		if (typeof pathname === "string") {
			options.pathname = pathname;
			arguments[0]     = null;	
		}

		// Convert arguments to an array.
		arr[0]                 = options;
		while (--len) arr[len] = arguments[len - 1];

		return this.use.apply(this, arr);
	};

	app[name] = method;
});