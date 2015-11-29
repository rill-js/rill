"use strict";

var byteLength = require("byte-length");
var checkType  = require("content-check");
var statuses   = require("statuses");
var buffer     = global.Buffer || respond;

module.exports = respond;

/**
 * Runs general clean up on a request and ends it.
 */
function respond (ctx) {
	var req      = ctx.req;
	var res      = ctx.res;
	var body     = res.body;
	var original = res.original;
	var isStream = body && typeof body.pipe === "function";
	var isBuffer = body instanceof buffer;

	// Skip request ended externally.
	if (original.headersSent) return;

	// Apply default statuses.
	if (Number(res.status) === 404) {
		// Ensure redirect status.
		if (res.get("Location")) res.status = 302;
		// Default the status to 200 if there is substance to the response.
		else if (body) res.status = 200;
	}

	// Default status message based on status code.
	res.message = res.message || statuses[res.status];

	// Ensure no content-type for empty responses.
	if (req.method === "HEAD" || statuses.empty[res.status] || !body) {
		body = null;
		res.remove("Content-Type");
		res.remove("Content-Length");
	} else {
		// Stringify objects that are not buffers.
		if (typeof body === "object" && !isStream && !isBuffer) body = JSON.stringify(body);
		// Attempt to guess content type.
		if (!res.get("Content-Type")) res.set("Content-Type", checkType(res.body));
		// Attempt to guess content-length.
		if (!res.get("Content-Length") && !isStream) res.set("Content-Length", byteLength(body));
	}

	// Send off headers.
	original.writeHead(res.status, res.message, clean(res.headers));
	// Finish response.
	if (isStream) body.pipe(original);
	else original.end(body);
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

/**
 * Utility to check if a value is a node js stream.
 *
 * @param {*} val
 * @return {Boolean}
 */
function isStream (val) { return val && typeof val.pipe === "function"; }

/**
 * Utility to check if a value is a node js buffer.
 *
 * @param {*} val
 * @return {Boolean}
 */
function isBuffer (val) { return val instanceof buffer; }