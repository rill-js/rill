'use strict'

var URL = require('url')
var QS = require('querystring')
var qSet = require('q-set')
var cookie = require('cookie')
var toField = require('header-field')

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
  var protocol = (req.connection.encrypted) ? 'https' : 'http'
  /* istanbul ignore next */
  var parsed = process.browser
    ? req._request.parsed
    : URL.parse(protocol + '://' + req.headers.host + req.url)
  var origin = protocol + '://' + parsed.host
  this.ctx = ctx
  this.original = req
  this.method = req.method
  this.headers = req.headers
  this.cookies = this.headers['cookie'] ? cookie.parse(this.headers['cookie']) : {}
  this.params = {}
  this.href = parsed.href
  this.protocol = protocol
  this.port = parsed.port
  this.host = parsed.host
  this.hostname = this.matchHost = parsed.hostname
  this.path = parsed.path
  this.pathname = this.matchPath = parsed.pathname
  this.search = parsed.search
  this.hash = parsed.hash
  this.query = {}
  this.origin = origin
  this.secure = protocol === 'https'
  this.subdomains = String(this.hostname).split('.').reverse().slice(2)
  /* istanbul ignore next */
  this.ip = (
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket && req.connection.socket.remoteAddress)
  )

  // Support nested querystrings.
  var query = parsed.query = QS.parse(parsed.query)
  for (var key in query) qSet(this.query, key, query[key])
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
