var URL = require("url");

module.exports = Request;

/**
 * Wrapper around nodejs `IncommingMessage` that has pre parsed url
 * and other conveinences.
 *
 * @constructor
 * @param {Context} ctx - The context for the request.
 */
function Request (ctx) {
	var req = ctx.req;

	this.originalUrl         = req.url;
	this.method              = req.method || "GET";
	this.headers             = req.headers || {};
	this.headers["referrer"] = this.headers["referer"];
	this.files               = req.files || [];
	this.body                = req.body || {};
	this.params              = {};
	this.socket              = req.socket || {};
	this.connection          = req.connection;
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

	this.subdomains = (this.hostname || "")
		.split(".")
		.reverse()
		.slice(ctx.app.subdomainOffset);

}