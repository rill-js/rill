var URL = require("url");

module.exports = Request;

function Request (ctx) {
	var req = ctx.req;

	this.method  = req.method || "GET";
	this.headers = req.headers || {};
	this.files   = req.files || [];
	this.body    = req.body || {};
	this.params  = {};
	this.socket  = req.socket;
	this.ip      = (
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress
	)

	this.headers["referrer"] = this.headers["referer"];

	var parsed = URL.parse(req.url)
	for (var key in parsed) {
		if (typeof parsed[key] === "function") continue;
		this[key] = parsed[key];
	}
}