'use strict'

var URL = require('mini-url')
var QS = require('mini-querystring')
var cookie = require('cookie')
var toField = require('header-field')
var URL_PARTS = URL.parts

module.exports = Request

/**
 * Wrapper around nodejs `IncommingMessage` that has pre parsed url
 * and other conveinences.
 *
 * @constructor
 * @param {Context} ctx - The context for the request.
 * @param {IncommingMessage} req - The original node request.
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
  this.method = req.method
  this.headers = req.headers
  this.cookies = this.headers['cookie'] ? cookie.parse(this.headers['cookie']) : {}
  this.params = {}

  // Attach url parts.
  for (var part, i = URL_PARTS.length; i--;) {
    part = URL_PARTS[i]
    this[part] = parsed[part]
  }

  this.path = req.url
  this.secure = secure
  this.origin = origin
  this.matchPath = this.pathname
  this.matchHost = this.hostname
  this.subdomains = String(this.hostname).split('.').reverse().slice(2)
  this.query = QS.parse(this.search, true)
  /* istanbul ignore next */
  this.ip = (conn.remoteAddress || req.socket.remoteAddress || (conn.socket && conn.socket.remoteAddress))
}
var request = Request.prototype

/**
 * Utility to retrieve a header for the request.
 *
 * @param {String} field
 * @return {Array|String}
 */
request.get = function get (field) {
  return this.headers[toField(field)]
}
