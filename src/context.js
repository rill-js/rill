'use strict'

var HttpError = require('@rill/error')
var Request = require('./request')
var Response = require('./response')

// Expose module.
module.exports =
Context['default'] = Context

/**
 * @constructor
 * @description
 * Creates an incomming message context.
 *
 * @example
 * require('http').createServer((req, res) => {
 *   const ctx = new Context(req, res)
 * })
 *
 * @param {http.IncommingMessage} req - A nodejs style request object.
 * @param {http.ServerResponse} res - A nodejs style response object.
 */
function Context (req, res) {
  this.req = new Request(this, req)
  this.res = new Response(this, res)
  this.fail = this.fail.bind(this)
  this.assert = this.assert.bind(this)
  this.locals = {}
}

/**
 * Throw an http during the current request and update the status and message on the response.
 *
 * @example
 * context.fail(400, 'Password is required')
 *
 * @param {number} code - The status code for the error.
 * @param {string} [message] - The status message to set on the response.
 * @param {object} [meta] - An object to merge onto the error.
 * @return {void}
 * @throws {HttpError}
 */
Context.prototype.fail = function (code, message, meta) {
  if (typeof code !== 'number') throw new TypeError('Rill#ctx.fail: Status code must be a number.')
  var error = new HttpError(code, message, meta)
  this.res.status = error.code
  this.res.message = error.message
  throw error
}

/**
 * If a value is falsey throw an http during the current request and update the status and message on the response.
 *
 * @example
 * context.assert(password.length > 5, 400, 'Password must be at least 5 characters long')
 *
 * @param {*} value - The value to test for truthyness.
 * @param {number} code - The status code for the error.
 * @param {string} [message] - The status message to set on the response.
 * @param {object} [meta] - An object to merge onto the error.
 * @return {void}
 * @throws {HttpError}
 */
Context.prototype.assert = function (value, code, message, meta) {
  if (typeof code !== 'number') throw new TypeError('Rill#ctx.assert: Status code must be a number.')
  if (!value) this.fail(code, message, meta)
}
