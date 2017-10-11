// @ts-check
/** Type Definitions */
/** @module rill/Response */
'use strict'

var URL = require('mini-url')
var cookie = require('cookie')
var statuses = require('statuses')
var toField = require('header-field')
module.exports = Response['default'] = Response

/**
 * Wrapper around nodejs `ServerResponse`.
 *
 * @param {rill.Context} ctx - The context for the request.
 * @param {http.ServerResponse} res - The original node response.
 * @constructor
 */
function Response (ctx, res) {
  this.ctx = ctx
  this.original = res
  /** @type {number} */
  this.status = res.statusCode
  /** @type {string?} */
  this.message = undefined
  /** @type {object} */
  this.headers = {}
  /** @type {any} */
  this.body = undefined
  /** @type {boolean} */
  this.finished = false
  /** @type {boolean} */
  this.respond = true
  /** @type {boolean} */
  this.end = true
  res.once('finish', setFinished)
}

/**
 * Utility to retrieve a header from the response headers.
 *
 * @example
 * response.get('Content-Type')
 *
 * @param {string} name - The name of the header to get.
 * @return {string|string[]|void}
 */
Response.prototype.get = function (name) {
  return this.headers[toField(name)]
}

/**
 * Utility to overwrite a header on the response headers.
 *
 * @example
 * response.set('Content-Type', 'text/html')
 *
 * @param {string} name - The name of the header to set.
 * @param {string|string[]} value - The value for the header.
 */
Response.prototype.set = function (name, value) {
  this.headers[toField(name)] = value
}

/**
 * Utility to add or set a header on the response headers.
 *
 * @example
 * response.append('Set-Cookie', 'a=1')
 * response.append('Set-Cookie', 'b=1')
 * response.get('Set-Cookie') // -> ['a=1', 'b=1']
 *
 * @param {string} name - The name of the header to append to.
 * @param {string|string[]} - value The value to append.
 * return {void}
 */
Response.prototype.append = function (name, value) {
  name = toField(name)
  var headers = this.headers
  var cur = this.headers[name]

  if (cur == null) cur = []
  else if (!Array.isArray(cur)) cur = [cur]

  headers[name] = cur.concat(value)
}

/**
 * Utility to remove a header from the response headers.
 *
 * @example
 * response.remove('Content-Type')
 *
 * @param {string} name The name of the header to remove.
 * @return {void}
 */
Response.prototype.remove = function (name) {
  delete this.headers[toField(name)]
}

/**
 * Appends to the current set-cookie header, adding a new cookie with options.
 *
 * @example
 * response.cookie('auth-token', 'abc123', { httoOnly: true })
 *
 * @param {string} name - The name of the cookie.
 * @param {*} value - The value for the cookie.
 * @param {object} [options] - Options for the cookie.
 * @return {void}
 */
Response.prototype.cookie = function (name, value, options) {
  this.append('Set-Cookie', cookie.serialize(name, value, options))
}

/**
 * Deletes a cookie from the current set-cookie header.
 *
 * @example
 * response.clearCookie('auth-token')
 *
 * @param {string} name - The name of the cookie.
 * @param {object} [options] - Options for the cookie.
 * @return {void}
 */
Response.prototype.clearCookie = function (name, options) {
  options = options || {}
  options.expires = new Date()
  this.append('Set-Cookie', cookie.serialize(name, '', options))
}

/**
 * Attaches location headers relative to the current request to perform a redirect.
 * Will redirect to the referrer if "back" is supplied as a url.
 *
 * @example
 * response.redirect('/home') // redirect back to home page.
 *
 * @param {string} url - The url to redirect too or "back".
 * @param {string} [alt] - Used if the url is empty or "back" does not exist.
 * @return {void}
 */
Response.prototype.redirect = function (url, alt) {
  var req = this.ctx.req

  // Back uses request referrer header as a url.
  url = (url === 'back') ? req.get('Referrer') : url
  // Default url to alternative.
  url = url || alt

  if (!url) {
    throw new TypeError('Rill#ctx.res.redirect: Cannot redirect, url not specified and alternative not provided.')
  }

  if (!statuses.redirect[this.status]) this.status = 302

  this.set('Location', URL.parse(url, req.href).href)
}

/**
 * Attaches refresh headers relative to the current request to perform a timed refresh of the page.
 * Will refresh to the referrer if "back" is supplied as a url.
 *
 * @example
 * response.refresh(2, '/home') // redirect the user home after 2 seconds.
 *
 * @param {number|string} delay - Delays the refresh by `delay` seconds.
 * @param {string} url - The url to refresh or "back".
 * @param {string} alt - Used if the url is empty or "back" does not exist.
 * @return {void}
 */
Response.prototype.refresh = function (delay, url, alt) {
  var req = this.ctx.req

  delay = delay || 0
  // Back uses request referrer header as a url.
  url = (url === 'back') ? req.get('Referrer') : url
  // Default url to alternative.
  url = url || alt || req.href

  this.set('Refresh', delay + '; url=' + URL.parse(url, req.href).href)
}

/**
 * Marks a response as finished.
 *
 * @this Response
 * @return {void}
 */
function setFinished () {
  this.finished = true
}
