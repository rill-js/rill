var URL       = require("url");
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

	res.once("finish", function () { ctx.response.finished = true; });
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
	if (!this.headers["set-cookie"]) {
		this.headers["set-cookie"] = [];
	}

	this.headers["set-cookie"].push(cookies.serialize(key, val, opts));
};

/**
 * Deletes a cookie.
 *
 * @param {String} key - the name of the cookie.
 * @param {Object} opts - options for the cookie.
 */
response.clearCookie = function (key, opts) {
	opts.expires = new Date();

	if (!this.headers["set-cookie"]) {
		this.headers["set-cookie"] = [];
	}

	this.headers["set-cookie"].push(cookies.serialize(key, "", opts));
};

/**
 * Attaches relative location headers to perform a redirect.
 * Will redirect to the referrer if "back" is supplied as a url.
 *
 * @param {String} url - The url to redirect too or "back".
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
response.redirect = function redirect (url, alt) {
	var req = this.ctx.request;

	url = (url === "back")
		? req.headers["referer"]
		: url;
	url = url || alt;

	if (!url)
		throw new TypeError("Rill#redirect: Cannot redirect, url not specified and alternative not provided.");

	this.headers["location"] = URL.resolve(req.href, url);
}

/**
 * Attaches relative refresh headers to perform a timed refresh.
 * Will refresh to the referrer if "back" is supplied as a url.
 *
 * @param {String} url - The url to refresh or "back".
 * @param {String} delay - Delays the refresh by `delay` seconds.
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
response.refresh = function refresh (url, delay, alt) {
	var req = this.ctx.request;

	delay = delay || 0;
	url = (url === "back")
		? req.headers["referer"]
		: url;
	url = URL.resolve(req.href, url || alt || req.href);

	this.headers["refresh"] = delay + "; url=" + url;
};