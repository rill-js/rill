// @ts-check
/** Type Definitions */
/** @module rill/respond */
'use strict'

var byteLength = require('byte-length')
var checkType = require('content-check')
var statuses = require('statuses')
var isType = require('is-typeof')
module.exports = respond['default'] = respond

/**
 * Runs general clean up on a request context and ends it with proper headers and status codes.
 *
 * @param {rill.Context} ctx - The context of the request.
 * @return {void}
 * @private
 */
function respond (ctx) {
  var req = ctx.req
  var res = ctx.res
  var body = res.body
  var original = res.original
  var isStream = isType.stream(body)
  var isBuffer = isType.buffer(body)

  // Allow skipping response.
  if (res.respond === false) return
  // Skip request ended externally.
  if (original.headersSent) return

  // Apply default statuses.
  if (Number(res.status) === 404) {
    // Ensure redirect status.
    if (res.get('Location')) res.status = 302
    // Default the status to 200 if there is substance to the response.
    else if (body) res.status = 200
  }

  // Default status message based on status code.
  res.message = res.message || statuses[res.status]

  // Ensure no content-type for empty responses.
  if (req.method === 'HEAD' || statuses.empty[res.status] || !body) {
    body = null
    res.remove('Content-Type')
    res.remove('Content-Length')
  } else {
    // Attempt to guess content type.
    if (!res.get('Content-Type')) res.set('Content-Type', checkType(body))
    // Stringify objects that are not buffers.
    if (typeof body === 'object' && !isStream && !isBuffer) body = JSON.stringify(body)
    // Attempt to guess content-length.
    if (!res.get('Content-Length') && !isStream) res.set('Content-Length', byteLength(body))
  }

  // Send off headers.
  original.writeHead(res.status, res.message, removeEmptyHeaders(res.headers))
  // Allow for requests to stay open.
  if (res.end === false) return
  // Finish response.
  if (isStream) body.pipe(original)
  else original.end(body)
}

/**
 * Utility to remove empty values from an object.
 *
 * @example
 * removeEmptyHeaders({ a: [], b: null, c: 0 }) // -> { c: 0 }
 *
 * @param {object} obj - The headers object to remove empties from.
 * @return {object}
 * @private
 */
function removeEmptyHeaders (obj) {
  for (var key in obj) {
    if (obj[key] == null || obj[key].length === 0) {
      delete obj[key]
    }
  }
  return obj
}
