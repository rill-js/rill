var STATUS_CODES = require("@rill/http").STATUS_CODES;

module.exports = HttpError;

function HttpError (code, message, meta) {
	this.code    = code;
	this.message = message || STATUS_CODES[code]
	Error.call(this)
	if (Error.captureStackTrace) Error.captureStackTrace(this, HttpError)

	for (var key in meta) this[key] = meta[key];
}

HttpError.prototype = Object.create(Error);