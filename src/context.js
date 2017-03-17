'use strict'

var HttpError = require('@rill/error')
var Request = require('./request')
var Response = require('./response')

module.exports = Context

/**
 * @constructor
 * @description
 * Creates an incomming message context.
 *
 * @param {http.IncommingMessage} req A nodejs style request object.
 * @param {http.ServerResponse} res A nodejs style response object.
 */
function Context (req, res) {
  this.req = new Request(this, req)
  this.res = new Response(this, res)
  this.fail = this.fail.bind(this)
  this.assert = this.assert.bind(this)
  this.locals = {}
}
var context = Context.prototype

/**
 * @description
 * Throw an http error on the current request.
 *
 * @example
 * context.fail(400, 'Password is required')
 *
 * @param {string|number} code The status code for the error.
 * @param {string} [message] The status message to set on the response.
 * @param {object} [meta] An object to merge onto the error.
 * @throws HttpError
 */
context.fail = function throwHttp (code, message, meta) {
  if (typeof code !== 'number') throw new TypeError('Rill#ctx.fail: Status code must be a number.')
  var error = new HttpError(code, message, meta)
  this.res.status = error.code
  this.res.message = error.message
  throw error
}

/**
 * @description
 * Throw an http error if a value is not truthy.
 *
 * @example
 * context.assert(password.length > 5, 400, 'Password must be at least 5 characters long')
 *
 * @param {*} val The value to test for truthyness.
 * @param {string|number} code The status code for the error.
 * @param {string} [message] The status message to set on the response.
 * @param {object} [meta] An object to merge onto the error.
 * @throws HttpError
 */
context.assert = function assertHttp (val, code, message, meta) {
  if (typeof code !== 'number') throw new TypeError('Rill#ctx.assert: Status code must be a number.')
  if (!val) this.fail(code, message, meta)
}
