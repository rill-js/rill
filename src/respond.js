var byteLength   = require("byte-length");
var STATUS_CODES = require("@rill/http").STATUS_CODES;
var isType       = require("@rill/is-type");

module.exports = respond;

var htmlReg  = /^\s*</;
var statuses = {
	redirect: {	
		"300": true,
		"301": true,
		"302": true,
		"303": true,
		"305": true,
		"307": true,
		"308": true
	},
	empty: {
		"204": true,
		"205": true,
		"304": true
	}
};

/**
 * Runs general clean up on a request before ending it.
 */
function respond (req, res) {
	// Skip request ended externally.
	if (this.res.headersSent) return;

	// Ensure redirect status.
	if (res.headers["location"]) res.status = res.status || 302;

	// Default the status to 200 if there is substance to the response.
	if (Number(res.status) === 404 && res.body) res.status = 200;
	res.statusText = res.statusText || STATUS_CODES[res.status];

	switch (true) {
		case statuses.empty[res.status] || res.body == null:
			delete res.headers["content-type"];
			break;

		case isType.String(res.body):
			if (!res.headers["content-type"])
				res.headers["content-type"] = "text/" + (
					htmlReg.test(res.body)
						? "html"
						: "plain"
				) + "; charset=UTF-8";
			break;

		case isType.Buffer(res.body):
			res.headers["content-length"] = res.body.length;
			break;

		case isType.Stream(res.body):
			if (!res.headers["content-type"])
				res.headers["content-type"] = "application/octet-stream";
			break;

		default:
			try {
				res.body = JSON.stringify(res.body);
				if (!res.headers["content-type"])
					res.headers["content-type"] = "application/json; charset=UTF-8";
			} catch (_) {}
			break;
	}

	this.res.writeHead(res.status, res.statusText, res.headers);

	if (isType.Stream(res.body)) {
		res.body.pipe(this.res);
	} else {
		this.res.end(("HEAD" === req.method)
			? undefined
			: res.body
		)
	}
}