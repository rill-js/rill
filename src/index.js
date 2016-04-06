'use strict'

var toReg = require('path-to-regexp')
var http = require('@rill/http')
var https = require('@rill/https')
var chain = require('@rill/chain')
var HttpError = require('@rill/error')
var Context = require('./context')
var respond = require('./respond')
var slice = Array.prototype.slice
var rill = Rill.prototype

module.exports = Rill.default = Rill

/**
 * Creates an isomorphic app that will run middleware for a incomming request.
 *
 * @constructor
 */
function Rill () {
  if (!(this instanceof Rill)) return new Rill()
  this.stack = []
}

/**
 * Starts a node/rill server.
 *
 * @param {Object} opts
 * @param {String} opts.ip
 * @param {Number} opts.port
 * @param {Number} opts.backlog
 * @param {Object} opts.tls
 * @param {Function} cb
 * @return {Server}
 */
rill.listen = function listen (opts, cb) {
  opts = opts || {}
  var server = (opts.tls)
    ? https.createServer(opts.tls, this.handler())
    : http.createServer(this.handler())
  return server.listen(opts.port, opts.ip, opts.backlog, cb)
}

/**
 * Takes the current middleware stack, chains it together and
 * returns a valid handler for a node js style server request.
 *
 * @return {Function}
 */
rill.handler = function handler () {
  var fn = chain(this.stack)
  return function handleIncommingMessage (req, res) {
    res.statusCode = 404
    var ctx = new Context(req, res)

    fn(ctx)
      .catch(handleError)
      .then(finish)

    function handleError (err) {
      if (Number(ctx.res.status) === 404) {
        ctx.res.status = 500
      }
      if (!(err instanceof HttpError)) {
        console && console.error && console.error(err.stack || err)
      }
    }

    function finish () { respond(ctx) }
  }
}

/**
 * Append new middleware to the current rill application stack.
 *
 * @example
 * rill.use(fn1, fn2)
 *
 * @param {Object} [config] - Optional config that must be matched for the middleware to run.
 * @param {Function...} middleware - Functions to run during an incomming request.
 */
rill.use = function use () {
  var start = this.stack.length
  var end = this.stack.length += arguments.length

  for (var i = end; start < i--;) {
    this.stack[i] = arguments[i - start]
  }

  return this
}

/**
 * Simple syntactic sugar for functions that
 * wish to modify the current rill instance.
 *
 * @param {Function...} transformers - Functions that will modify the rill instance.
 */
rill.setup = function setup () {
  for (var fn, len = arguments.length, i = 0; i < len; i++) {
    fn = arguments[i]
    if (!fn) continue
    if (typeof fn === 'function') fn(this)
    else throw new TypeError('Rill#setup: Setup must be a function or falsey.')
  }

  return this
}

/**
 * Use middleware at a specific pathname.
 */
rill.at = function at (pathname) {
  if (typeof pathname !== 'string') throw new TypeError('Rill#at: Path name must be a string.')

  var keys = []
  var reg = toReg(pathname, keys, { end: false })
  var fn = chain(slice.call(arguments, 1))

  return this.use(function matchPath (ctx, next) {
    if (ctx._pathname == null) ctx._pathname = ctx.req.pathname
    var _pathname = ctx._pathname
    var matches = _pathname.match(reg)
    // Check if we matched the whole path.
    if (!matches || matches[0] !== _pathname) return next()

    // Check if params match.
    for (var key, match, i = keys.length; i--;) {
      key = keys[i]
      match = matches[i + 1]
      if (!key.optional && match == null) return next()
      if (key.repeat) match = match == null ? [] : match.split('/')
      ctx.req.params[key.name] = match
    }

    // Update path for nested routes.
    var updated = matches[matches.length - 1]
    if (updated !== _pathname) ctx._pathname = '/' + updated

    // Run middleware.
    return fn(ctx, function () {
      // Reset nested path.
      ctx._pathname = _pathname
      return next()
    })
  })
}

/**
 * Use middleware at a specific hostname.
 */
rill.host = function host (hostname) {
  if (typeof hostname !== 'string') throw new TypeError('Rill#host: Host name must be a string.')

  var keys = []
  var reg = toReg(hostname, keys, { strict: true })
  var fn = chain(slice.call(arguments, 1))

  return this.use(function matchHost (ctx, next) {
    if (ctx._hostname == null) ctx._hostname = ctx.req.hostname
    var _hostname = ctx._hostname
    var matches = _hostname.match(reg)

    // Check if we matched the whole hostname.
    if (!matches || matches[0] !== _hostname) return next()

    // Here we check for the dynamically matched subdomains.
    for (var key, match, i = keys.length; i--;) {
      key = keys[i]
      match = matches[i + 1]
      if (!key.optional && match == null) return next()
      if (key.repeat) match = match == null ? [] : match.split('.')
      ctx.req.subdomains[key.name] = match
    }

    // Update hostname for nested routes.
    ctx._hostname = matches[matches.length - 1]

    // Run middleware.
    return fn(ctx, function () {
      // Reset nested hostname.
      ctx._hostname = _hostname
      return next()
    })
  })
}

/**
 * Use middleware for a specific method / pathname.
 */
http.METHODS.forEach(function (method) {
  var name = method.toLowerCase()
  rill[name] = Object.defineProperty(function (pathname) {
    var offset = typeof pathname === 'string' ? 1 : 0
    var fn = chain(slice.call(arguments, offset))
    if (offset === 1) return this.at(pathname, matchMethod)
    return this.use(matchMethod)

    function matchMethod (ctx, next) {
      if (ctx.req.method !== method) return next()
      return fn(ctx, next)
    }
  }, 'name', { value: name })
})
