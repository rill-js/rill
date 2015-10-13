var URL = require("url");

module.exports = Request;

function Request (ctx) {
	var req = ctx.req;

	this.method              = req.method || "GET";
	this.headers             = req.headers || {};
	this.headers["referrer"] = this.headers["referer"];
	this.files               = req.files || [];
	this.body                = req.body || {};
	this.params              = {};
	this.socket              = req.socket;
	this.ip                  = (
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress
	)

	var parsed = URL.parse(URL.format({
		path: this.url,
		host: this.headers["x-forwarded-host"] || this.headers["host"],
		protocol: (this.socket.encrypted)
			? "https"
			: "http"
	}));

	for (var key in parsed) {
		if (typeof parsed[key] === "function") continue;
		this[key] = parsed[key];
	}

	this.subdomains = (this.host || "")
		.split(".")
		.reverse()
		.slice(ctx.app.subdomainOffset);
}