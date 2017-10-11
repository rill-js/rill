// @ts-check
/** Type Definitions */
/** @module rill/Request */
/** @typedef {{ referrer?: string, referer?: string?, date?: string, host?: string, cookie?: string, 'user-agent'?: string, 'accept-language'?: string, connection?: string, 'cache-control'?: string, accept?: string, [x]: string|string[] }} Headers */
'use strict'

var URL = require('mini-url')
var QS = require('mini-querystring')
var cookie = require('cookie')
var toField = require('header-field')
var URL_PARTS = URL.parts
module.exports = Request['default'] = Request

/**
 * Wrapper around nodejs `IncommingMessage` that has pre parsed url
 * and other conveinences.
 *
 * @param {rill.Context} ctx - The context for the request.
 * @param {http.IncomingMessage} req - The original node request.
 *
 * @constructor
 */
function Request (ctx, req) {
  var conn = req.connection
  var secure = conn.encrypted
  var protocol = secure ? 'https' : 'http'
  var origin = protocol + '://' + req.headers.host
  /* istanbul ignore next */
  var parsed = process.browser ? req._options.parsed : URL.parse(req.url, origin)
  this.ctx = ctx
  this.original = req
  /** @type {string} */
  this.method = req.method
  /** @type {Headers} */
  this.headers = req.headers
  /** @type {object} */
  this.cookies = this.headers['cookie'] ? cookie.parse(this.headers['cookie']) : {}
  /** @type {string} */
  this.path = req.url
  /** @type {object} */
  this.params = {}
  /** @type {boolean} */
  this.secure = secure
  /** @type {string} */
  this.origin = origin
  /* istanbul ignore next */
  /** @type {string} */
  this.ip = (conn.remoteAddress || req.socket.remoteAddress || (conn.socket && conn.socket.remoteAddress))
  /** @type {object?} */
  this.body = undefined
  /** @type {object?} */
  this.files = undefined

  // Attach url parts.
  for (var part, i = URL_PARTS.length; i--;) {
    part = URL_PARTS[i]
    this[part] = parsed[part]
  }

  /** @type {string} */
  this.matchPath = this.pathname
  /** @type {string} */
  this.matchHost = this.hostname
  /** @type {string[]} */
  this.subdomains = String(this.hostname).split('.').reverse().slice(2)
  /** @type {object} */
  this.query = QS.parse(this.search, true)
}

/**
 * Utility to retrieve a header from the request.
 *
 * @example
 * request.get('Host') // -> 'test.com'
 *
 * @param {string} name - The header field to get from the request.
 * @return {string|string[]|void}
 */
Request.prototype.get = function (name) {
  return this.headers[toField(name)]
}
