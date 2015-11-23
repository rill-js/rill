"use strict";

var URL       = require("url");
var toField   = require("header-field");
var HttpError = require("@rill/error");
var cookies   = require("@rill/cookies");

module.exports = Response;

/**
 * Wrapper around nodejs `ServerResponse`.
 *
 * @constructor
 * @param {Context} ctx - The context for the request.
 * @param {ServerResponse} res - The original node response.
 */
function Response (ctx, res) {
	this.ctx      = ctx;
	this.original = res;
	this.headers  = res.headers = { "x-powered-by": "Rill" };
	this.status   = 404;
	this.body     = undefined;

	res.once("finish", function () { ctx.res.finished = true; });
}
var response = Response.prototype;

/**
 * Appends to the current set-cookie header, adding a new cookie with options.
 *
 * @param {String} key - the name of the cookie.
 * @param {*} val - the value for the cookie.
 * @param {Object} opts - options for the cookie.
 */
response.cookie = function (key, val, opts) {
	this.append("Set-Cookie", cookies.serialize(key, val, opts))
};

/**
 * Deletes a cookie.
 *
 * @param {String} key - the name of the cookie.
 * @param {Object} opts - options for the cookie.
 */
response.clearCookie = function (key, opts) {
	opts = opts || {};
	opts.expires = new Date();
	this.append("Set-Cookie", cookies.serialize(key, "", opts));
};

/**
 * Attaches relative location headers to perform a redirect.
 * Will redirect to the referrer if "back" is supplied as a url.
 *
 * @param {String} url - The url to redirect too or "back".
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
response.redirect = function redirect (url, alt) {
	var req = this.ctx.req;

	url = (url === "back")
		? req.get("Referrer")
		: url;
	url = url || alt;

	if (!url)
		throw new TypeError("Rill#redirect: Cannot redirect, url not specified and alternative not provided.");

	this.set("Location", URL.resolve(req.href, url));
}

/**
 * Attaches relative refresh headers to perform a timed refresh.
 * Will refresh to the referrer if "back" is supplied as a url.
 *
 * @param {String} delay - Delays the refresh by `delay` seconds.
 * @param {String} url - The url to refresh or "back".
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
response.refresh = function refresh (delay, url, alt) {
	var req = this.ctx.req;

	delay = delay || 0;
	url = (url === "back")
		? req.get("Referrer")
		: url;
	url = url || alt || req.href;

	this.set("Refresh", delay + "; url=" + URL.resolve(req.href, url));
};

/**
 * Utility to retrieve a header for the response.
 *
 * @param {String} field
 * @return {Array|String}
 */
response.get = function get (field) {
	return this.headers[toField(field)];
};

/**
 * Utility to set a header for the response.
 *
 * @param {String} field
 * @param {Array|String} val
 */
response.set = function set (field, val) {
	this.headers[toField(field)] = val;
};

/**
 * Utility to append to an existing header for the response.
 *
 * @param {String} field
 * @param {Array|String} val
 */
response.append = function append (field, val) {
	field       = toField(field);
	var headers = this.headers;
	var cur     = this.headers[field];

	if (null == cur) cur = [];
	else if (cur.constructor !== Array) cur = [cur];

	headers[field] = cur.concat(val);
};

/**
 * Utility to delete an existing header on the response.
 *
 * @param {String} field
 */
response.remove = function remove (field) {
	delete this.headers[toField(field)];
};