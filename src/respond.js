var byteLength   = require("byte-length");
var checkType    = require("content-check");
var STATUS_CODES = require("@rill/http").STATUS_CODES;

module.exports = respond;

var empty = {
	"204": true,
	"205": true,
	"304": true
};

/**
 * Runs general clean up on a request and ends it.
 */
function respond (ctx) {
	var req = ctx.req;
	var res = ctx.res;
	var isStream = res.body && typeof res.body.pipe === "function";

	// Skip request ended externally.
	if (res.original.headersSent) return;

	if (Number(res.status) === 404) {
		// Ensure redirect status.
		if (res.headers["location"]) res.status = 302;
		// Default the status to 200 if there is substance to the response.
		else if (res.body) res.status = 200;
	}

	// Default status message based on status code.
	res.statusMessage = res.statusMessage || STATUS_CODES[res.status];

	if (res.headers["content-type"] != null) {
		// Ensure no content-type for empty responses.
		if (empty[res.status] || res.body == null) {
			res.body = null;
			delete res.headers["content-type"];
		}
	} else {
		// Attempt to guess content type.
		res.headers["content-type"] = checkType(res.body);
	}

	if (res.headers["content-length"] == null || isStream) {
		delete res.headers["content-length"];
	} else {
		// Auto set content-length.
		res.headers["content-length"] = byteLength(res.body);
	}

	// Send off headers.
	res.original.writeHead(res.status, res.statusMessage, res.headers);

	if (isStream) {
		// Attempt to pipe streams.
		res.body.pipe(res.original);
	} else {
		res.original.end(req.method === "HEAD"
			? undefined
			: res.body
		);
	}
}