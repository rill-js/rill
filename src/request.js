var URL     = require("url");
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
	this.ctx                 = ctx;
	this.original            = req;
	this.socket              = req.socket || {};
	this.connection          = req.connection || {};
	this.method              = req.method || "GET";
	this.headers             = req.headers || {};
	this.headers["referrer"] = this.headers["referer"];
	this.cookies             = cookies.parse(this.headers["cookie"]);
	this.params              = {};
	this.ip                  = (
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress
	)

	var host     = req.headers["x-forwarded-host"] || req.headers["host"];
	var protocol = (req.connection.encrypted) ? "https" : "http"
	var parsed   = URL.parse(protocol + "://" + host + req.url);

	for (var key in parsed) {
		if (typeof parsed[key] === "function") continue;
		this[key] = parsed[key];
	}

	if (this.protocol[this.protocol.length - 1] === ":") {
		this.protocol = this.protocol.slice(0, -1);
	}

	this.secure = this.protocol === "https";
	this.subdomains = (this.hostname || "")
		.split(".")
		.reverse()
		.slice(ctx.app.subdomainOffset);
}
var request = Request.prototype;

/**
 * Utility to retrieve a header for the request.
 *
 * @param {String} field
 * @return {Array|String}
 */
request.get = function get (field) {
	field = field.toLowerCase();
	if (field === "referrer") field = "referer";
	return this.headers[field] || "";
};