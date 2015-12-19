"use strict";

var HttpError = require("@rill/error");
var Request   = require("./request");
var Response  = require("./response");

module.exports = Context;

/**
 * Creates an incomming message context.
 *
 * @constructor
 * @param {IncommingMessage} req - A nodejs style request object.
 * @param {ServerResponse} res - A nodejs style response object.
 */
function Context (req, res) {
	this.req    = new Request(this, req);
	this.res    = new Response(this, res);
	this.locals = {};
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
	var error = new HttpError(code, message, meta);
	this.res.status = error.code;
	this.res.message = error.message;
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
