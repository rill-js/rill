'use strict'

var URL = require('url')
var cookie = require('cookie')
var statuses = require('statuses')
var toField = require('header-field')

module.exports = Response

/**
 * Wrapper around nodejs `ServerResponse`.
 *
 * @constructor
 * @param {Context} ctx - The context for the request.
 * @param {ServerResponse} res - The original node response.
 */
function Response (ctx, res) {
  this.ctx = ctx
  this.original = res
  this.status = res.statusCode
  this.body = undefined
  this.headers = {}
  res.once('finish', function () { ctx.res.finished = true })
}
var response = Response.prototype

/**
 * Appends to the current set-cookie header, adding a new cookie with options.
 *
 * @param {String} key - the name of the cookie.
 * @param {*} val - the value for the cookie.
 * @param {Object} opts - options for the cookie.
 */
response.cookie = function (key, val, opts) {
  this.append('Set-Cookie', cookie.serialize(key, val, opts))
}

/**
 * Deletes a cookie.
 *
 * @param {String} key - the name of the cookie.
 * @param {Object} opts - options for the cookie.
 */
response.clearCookie = function (key, opts) {
  opts = opts || {}
  opts.expires = new Date()
  this.append('Set-Cookie', cookie.serialize(key, '', opts))
}

/**
 * Attaches relative location headers to perform a redirect.
 * Will redirect to the referrer if "back" is supplied as a url.
 *
 * @param {String} url - The url to redirect too or "back".
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
response.redirect = function redirect (url, alt) {
  var req = this.ctx.req

  // Back uses request referrer header as a url.
  url = (url === 'back') ? req.get('Referrer') : url
  // Default url to alternative.
  url = url || alt

  if (!url) {
    throw new TypeError('Rill#ctx.res.redirect: Cannot redirect, url not specified and alternative not provided.')
  }

  if (!statuses.redirect[this.status]) this.status = 302

  this.set('Location', URL.resolve(req.href, url))
}

/**
 * Attaches relative refresh headers to perform a timed refresh.
 * Will refresh to the referrer if "back" is supplied as a url.
 *
 * @param {String} delay - Delays the refresh by `delay` seconds.
 * @param {String} url - The url to refresh or "back".
 * @param {String} alt - Used if the url is empty or "back" does not exist.
 */
response.refresh = function refresh (delay, url, alt) {
  var req = this.ctx.req

  delay = delay || 0
  // Back uses request referrer header as a url.
  url = (url === 'back') ? req.get('Referrer') : url
  // Default url to alternative.
  url = url || alt || req.href

  this.set('Refresh', delay + '; url=' + URL.resolve(req.href, url))
}

/**
 * Utility to retrieve a header for the response.
 *
 * @param {String} field
 * @return {Array|String}
 */
response.get = function get (field) {
  return this.headers[toField(field)]
}

/**
 * Utility to set a header for the response.
 *
 * @param {String} field
 * @param {Array|String} val
 */
response.set = function set (field, val) {
  this.headers[toField(field)] = val
}

/**
 * Utility to append to an existing header for the response.
 *
 * @param {String} field
 * @param {Array|String} val
 */
response.append = function append (field, val) {
  field = toField(field)
  var headers = this.headers
  var cur = this.headers[field]

  if (cur == null) cur = []
  else if (!Array.isArray(cur)) cur = [cur]

  headers[field] = cur.concat(val)
}

/**
 * Utility to delete an existing header on the response.
 *
 * @param {String} field
 */
response.remove = function remove (field) {
  delete this.headers[toField(field)]
}
