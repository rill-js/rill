// @ts-check
/** Type Definitions */
/** @module rill */
/** @typedef {(app: Rill) => any} TransformFunction */
/** @typedef {TransformFunction|false|void} TransformArg */
/** @typedef {(ctx: Context, next: function?) => any} MiddlewareFunction */
/** @typedef {MiddlewareFunction|Rill|false|void} MiddlewareArg */
/**
 * @typedef {object} listenOptions
 * @property {string} [ip] - The interface to listen on.
 * @property {number} [port] - The port to listen on.
 * @property {number} [backlog] - The maximum length of the queue of pending connections.
 * @property {object} [tls] - Accepts options from tls.createServer() and tls.createSecureContext().
 */
'use strict'

var pathToRegExp = require('path-to-regexp')
var http = require('@rill/http')
var https = require('@rill/https')
var chain = require('@rill/chain')
var HttpError = require('@rill/error')
var Context = require('./context')
var respond = require('./respond')
/* istanbul ignore next */
var attachDocument = require('./attach')
var parse = pathToRegExp.parse
var tokensToRegExp = pathToRegExp.tokensToRegExp
var slice = Array.prototype.slice
module.exports = Rill['default'] = Rill

/**
 * Creates a universal app that will run middleware for a incoming request.
 *
 * @example
 * const app = Rill()
 *
 * @constructor
 */
function Rill () {
  if (!(this instanceof Rill)) return new Rill()
  /** @type {MiddlewareArg[]} */
  this.stack = []
}

/**
 * Takes the current middleware stack, chains it together and
 * returns a valid handler for a node js style server request.
 *
 * @example
 * const app = Rill()
 * app.use(...)
 * require('http').createServer(app.handler()).listen()
 *
 * @return {(req: http.IncomingMessage, res: http.ServerResponse) => void}
 */
Rill.prototype.handler = function () {
  var fn = chain(this.stack)

  /**
   * Handles a node js server request and pushes it through a rill server.
   *
   * @param {http.IncomingMessage} req - The http request.
   * @param {http.ServerResponse} res - The http response.
   * @return {void}
   */
  return function handleIncomingMessage (req, res) {
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
        /* istanbul ignore next */
        console && console.error && console.error(err)
      }
    }

    function finish () { respond(ctx) }
  }
}

/**
 * Creates a node server from the Rill server.
 *
 * @example
 * app.createServer().listen(3000)
 *
 * @param {object} [tls] - Node https TLS options.
 * @return {http.Server}
 */
Rill.prototype.createServer = function (tls) {
  var handler = this.handler()
  var server = tls ? https.createServer(tls, handler) : http.createServer(handler)
  // Setup link hijacking in the browser.
  /* istanbul ignore next */
  attachDocument(server)
  return server
}

/**
 * Creates a node server from the current Rill server and starts listening for http requests.
 *
 * @example
 * rill().use(...).listen({ port: 3000 })
 *
 * @param {listenOptions} [options] - Options to configure the node server.
 * @param {function} [onListening] - A function to be called once the server is listening for requests.
 * @returns {http.Server}
 */
Rill.prototype.listen = function (options, onListening) {
  // Make options optional.
  if (typeof options === 'function') {
    onListening = options
    options = null
  }

  options = options || {}
  options.port = options.port != null ? options.port : 0
  return this.createServer(options.tls).listen(options.port, options.ip, options.backlog, onListening)
}

/**
 * Append new middleware to the current rill application stack.
 *
 * @example
 * rill.use(fn1, fn2)
 *
 * @param {...MiddlewareArg} [middleware] - A middleware to attach.
 * @return {Rill}
 */
Rill.prototype.use = function (middleware) {
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
 * @example
 * app.setup(self => {
 *  // Modify the current app.
 *  self.use(...)
 *  self.modified = true
 * })
 *
 * @param {...TransformArg} transformer - A function that will modify the rill instance.
 * @return {Rill}
 */
Rill.prototype.setup = function (transformer) {
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
 *
 * @example
 * app.at('/test', (ctx, next) => ...)
 *
 * @param {string} pathname - The pathname to match.
 * @param {...MiddlewareArg} [middleware] - A middleware to attach.
 * @return {Rill}
 */
Rill.prototype.at = function (pathname, middleware) {
  if (typeof pathname !== 'string') throw new TypeError('Rill#at: Path name must be a string.')

  var keys = []
  var reg = toReg(pathname, keys, { end: false, delimiter: '/' })
  var fn = chain(slice.call(arguments, 1))

  return this.use(function matchPathname (ctx, next) {
    var pathname = ctx.req.matchPath
    var matches = pathname.match(reg)
    // Check if we matched the whole path.
    if (!matches || matches[0] !== pathname) return next()

    // Check if params match.
    for (var key, match, i = keys.length; i--;) {
      key = keys[i]
      match = matches[i + 1]
      if (key.repeat) match = match == null ? [] : match.split('/')
      ctx.req.params[key.name] = match
    }

    // Update path for nested routes.
    var matched = matches[matches.length - 1] || ''
    if (ctx.req.matchPath !== matched) ctx.req.matchPath = '/' + matched

    // Run middleware.
    return fn(ctx, function () {
      // Reset nested pathname before calling later middleware.
      ctx.req.matchPath = pathname
      // Run sibling middleware.
      return next()
    })
  })
}

/**
 * Use middleware at a specific hostname.
 *
 * @example
 * app.host('test.com', (ctx, next) => ...)
 *
 * @param {string} hostname - The hostname to match.
 * @param {...MiddlewareArg} [middleware] - A middleware to attach.
 * @return {Rill}
 */
Rill.prototype.host = function host (hostname, middleware) {
  if (typeof hostname !== 'string') throw new TypeError('Rill#host: Host name must be a string.')

  var keys = []
  var reg = toReg(hostname, keys, { strict: true, delimiter: '.' })
  var fn = chain(slice.call(arguments, 1))

  return this.use(function matchHost (ctx, next) {
    var hostname = ctx.req.matchHost
    var matches = hostname.match(reg)

    // Check if we matched the whole hostname.
    if (!matches || matches[0] !== hostname) return next()

    // Here we check for the dynamically matched subdomains.
    for (var key, match, i = keys.length; i--;) {
      key = keys[i]
      match = matches[i + 1]
      if (key.repeat) match = match == null ? [] : match.split('.')
      ctx.req.subdomains[key.name] = match
    }

    // Update hostname for nested routes.
    var matched = matches[matches.length - 1] || ''
    if (ctx.req.matchHost !== matched) ctx.req.matchHost = matched

    // Run middleware.
    return fn(ctx, function () {
      // Reset nested hostname.
      ctx.req.matchHost = hostname
      // Run sibling middleware.
      return next()
    })
  })
}

// Attach all http verbs as shortcut methods.
http.METHODS.forEach(function (method) {
  var name = method.toLowerCase()
  /**
   * Use middleware on |method| requests at an (optional) pathname.
   *
   * @example
   * app.|method|('/test', ...)
   *
   * @param {string} [pathname] - A pathname to match.
   * @param {...MiddlewareArg} [middleware] - A middleware to attach.
   * @return {Rill}
   */
  Rill.prototype[name] = function (pathname, middleware) {
    var offset = typeof pathname === 'string' ? 1 : 0
    var fn = chain(slice.call(arguments, offset))
    if (offset === 1) return this.at(pathname, matchMethod)
    return this.use(matchMethod)

    function matchMethod (ctx, next) {
      if (ctx.req.method !== method) return next()
      return fn(ctx, next)
    }
  }
})

/**
 * Small wrapper around path to regexp that treats a splat param "/*" as optional.
 * This makes mounting easier since typically when you do a path like "/test/*" you also want to treat "/test" as valid.
 *
 * @param {string} pathname - The path to convert to a regexp.
 * @param {array} [keys] - A place to store matched param keys.
 * @param {object} [options] - Options passed to pathToRegExp.
 * @return {RegExp}
 */
function toReg (pathname, keys, options) {
  // First parse path into tokens.
  var tokens = parse(pathname)

  // Find the last token (checking for splat params).
  /** @type {object} */
  var splat = tokens[tokens.length - 1]

  // Check if the last token is a splat and make it optional.
  if (splat && splat.asterisk) splat.optional = true

  // Convert the tokens to a regexp.
  var re = tokensToRegExp(tokens, options)

  // Assign keys to from regexp.
  re.keys = keys
  for (var i = 0, len = tokens.length; i < len; i++) {
    if (typeof tokens[i] === 'object') keys.push(tokens[i])
  }

  return re
}
