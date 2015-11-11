var URL       = require("url");
var HttpError = require("@rill/error");
var Request   = require("./request");
var Response  = require("./response");

module.exports = Context;

/**
 * Creates an incomming message context.
 *
 * @constructor
 * @param {Rill} app - the App instance that created the message.
 * @param {IncommingMessage} req - A nodejs style request object.
 * @param {ServerResponse} res - A nodejs style response object.
 */
function Context (app, req, res) {
	this.app    = app;
	this.req    = new Request(this, req);
	this.res    = new Response(this, res);
	this.locals = {};
	for (var key in app.locals) this.locals[key] = app.locals[key];
}
var context = Context.prototype;

/**
 * Throw an http error.
 *
 * @param {String|Number} code - The status code for the error.
 * @param {String} [message] - Optional status message.
 * @param {Object} [meta] - Optional object to merge onto the error.
 * @throws HttpError
 */
context.throw = function throwHttp (code, message, meta) {
	error = new HttpError(code, message, meta);
	this.req.status = error.code;
	throw error;
};

/**
 * Throw an http error if a value is not truthy.
 *
 * @param {*} val - The value to test for truthyness.
 * @param {String|Number} code - The status code for the error.
 * @param {String} [message] - Optional status message.
 * @param {Object} [meta] - Optional object to merge onto the error.
 * @throws HttpError
 */
context.assert = function assertHttp (val, code, message, meta) {
	if (!val) this.throw(code, message, meta);
};