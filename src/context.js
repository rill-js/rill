var URL       = require("url");
var HttpError = require("@rill/error");
var Request   = require("./request");
var Response  = require("./response");

module.exports = Context;

/**
 * Creates an incomming message context.
 *
 * @constructor
 * @param {Rill} app - the App instance that created the message.
 * @param {IncommingMessage} req - A nodejs style request object.
 * @param {ServerResponse} res - A nodejs style response object.
 */
function Context (app, req, res) {
	this.app      = app;
	this.req      = req;
	this.res      = res;
	this.request  = new Request(this);
	this.response = new Response(this);
}

var context = Context.prototype;

/**
 * Throw an http error.
 *
 * @param {String|Number} code - The status code for the error.
 * @param {String} [message] - Optional status message.
 * @param {Object} [meta] - Optional object to merge onto the error.
 * @throws HttpError
 */
context.throw = function throwHttp (code, message, meta) {
	error = new HttpError(code, message, meta);
	this.response.status = error.code;
	throw error;
};

/**
 * Throw an http error if a value is not truthy.
 *
 * @param {*} val - The value to test for truthyness.
 * @param {String|Number} code - The status code for the error.
 * @param {String} [message] - Optional status message.
 * @param {Object} [meta] - Optional object to merge onto the error.
 * @throws HttpError
 */
context.assert = function assertHttp (val, code, message, meta) {
	if (!val) this.throw(code, message, meta);
};

/**
 * Attaches relative location headers to perform a redirect.
 * Will redirect to the referrer if "back" is supplied as a url.
 *
 * @param {String} url - The url to redirect too or "back".
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
context.redirect = function redirect (url, alt) {
	url = (url === "back")
		? this.request.headers["referer"]
		: url;
	url = url || alt;

	if (!url)
		throw new TypeError("Rill#redirect: Cannot redirect, url not specified and alternative not provided.");

	this.response.headers["location"] = URL.resolve(this.request.href, url);
}

/**
 * Attaches relative refresh headers to perform a timed refresh.
 * Will refresh to the referrer if "back" is supplied as a url.
 *
 * @param {String} url - The url to refresh or "back".
 * @param {String} delay - Delays the refresh by `delay` seconds.
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
context.refresh = function refresh (url, delay, alt) {
	delay = delay || 0;
	url = (url === "back")
		? this.request.headers["referer"]
		: url;
	url = URL.resolve(this.request.href, url || alt || this.request.href);

	this.response.headers["refresh"] = delay + "; url=" + url;
};