var URL     = require("url");
var qSet    = require("q-set");
var toField = require("header-field");
var cookies = require("@rill/cookies");

module.exports = Request;

/**
 * Wrapper around nodejs `IncommingMessage` that has pre parsed url
 * and other conveinences.
 *
 * @constructor
 * @param {Context} ctx - The context for the request.
 * @param {IncommingMessage} req - The original node request.
 */
function Request (ctx, req) {

	var host     = req.headers["x-forwarded-host"] || req.headers["host"];
	var protocol = (req.connection.encrypted) ? "https" : "http";
	var parsed   = URL.parse(protocol + "://" + host + req.url, true);
	

	this.ctx        = ctx;
	this.original   = req;
	this.method     = req.method || "GET";
	this.headers    = req.headers || {};
	this.cookies    = cookies.parse(this.headers["cookie"]);
	this.params     = {};
	this.href       = parsed.href;
	this.protocol   = protocol;
	this.port       = parsed.port;
	this.host       = parsed.host;
	this.hostname   = parsed.hostname;
	this.path       = parsed.path;
	this.pathname   = parsed.pathname;
	this.search     = parsed.search;
	this.hash       = parsed.hash;
	this.query      = {};
	this.secure     = this.protocol === "https";
	this.subdomains = (this.hostname || "")
		.split(".")
		.reverse()
		.slice(ctx.app.subdomainOffset);
	this.ip = (
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress
	)

	// Support nested querystrings.
	var query = parsed.query;
	for (var key in query) qSet(this.query, key, query[key]);

}
var request = Request.prototype;

/**
 * Utility to retrieve a header for the request.
 *
 * @param {String} field
 * @return {Array|String}
 */
request.get = function get (field) {
	return this.headers[toField(field)];
};