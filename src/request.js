var URL = require("url");

module.exports = Request;

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

	var parsed = URL.parse(URL.format({
		path: req.url,
		host: req.headers["x-forwarded-host"] || req.headers["host"],
		protocol: (req.connection.encrypted)
			? "https"
			: "http"
	}));

	for (var key in parsed) {
		if (typeof parsed[key] === "function") continue;
		this[key] = parsed[key];
	}

	this.subdomains = (this.hostname || "")
		.split(".")
		.reverse()
		.slice(ctx.app.subdomainOffset);
}