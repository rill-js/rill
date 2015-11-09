var byteLength = require("byte-length");
var checkType  = require("content-check");
var statuses   = require("statuses");

module.exports = respond;

/**
 * Runs general clean up on a request and ends it.
 */
function respond (ctx) {
	var req      = ctx.req;
	var res      = ctx.res;
	var body     = res.body;
	var original = res.original;
	var isStream = (body && typeof body.pipe === "function");

	// Skip request ended externally.
	if (original.headersSent) return;

	if (Number(res.status) === 404) {
		// Ensure redirect status.
		if (res.get("Location")) res.status = 302;
		// Default the status to 200 if there is substance to the response.
		else if (body) res.status = 200;
	}

	// Default status message based on status code.
	res.statusMessage = res.statusMessage || statuses[res.status];

	if (res.get("Content-Type")) {
		// Ensure no content-type for empty responses.
		if (statuses.empty[res.status] || !body) {
			res.body = null;
			res.remove("Content-Type");
		}
	} else {
		// Attempt to guess content type.
		res.set("Content-Type", checkType(body));
	}

	if (res.get("Content-Length")) {
		if (isStream) res.remove("Content-Length");
	} else {
		// Auto set content-length.
		res.set("Content-Length", byteLength(body));
	}

	// Send off headers.
	original.writeHead(res.status, res.statusMessage, clean(res.headers));

	if (isStream) {
		// Attempt to pipe streams.
		body.pipe(res.original);
	} else {
		original.end(req.method === "HEAD"
			? undefined
			: body
		);
	}
}

/**
 * Utility to remove empty values from an object.
 *
 * @param {Object} obj
 * @return {Object}
 */
function clean (obj) {
	for (var key in obj)
		if (obj[key] == null || obj[key].length === 0)
			delete obj[key]
	return obj;
}