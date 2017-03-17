'use strict'

var pathToRegExp = require('path-to-regexp')
var http = require('@rill/http')
var https = require('@rill/https')
var chain = require('@rill/chain')
var HttpError = require('@rill/error')
var Context = require('./context')
var respond = require('./respond')
/* istanbul ignore next */
var adaptBrowser = process.browser && require('@rill/http/adapter/browser')
var parse = pathToRegExp.parse
var tokensToRegExp = pathToRegExp.tokensToRegExp
var slice = Array.prototype.slice
var rill = Rill.prototype

module.exports = Rill.default = Rill

/**
 * @constructor
 * @description
 * Creates a universal app that will run middleware for a incomming request.
 *
 * @example
 * const app = Rill()
 */
function Rill () {
  if (!(this instanceof Rill)) return new Rill()
  this.stack = []
}

/**
 * @description
 * Takes the current middleware stack, chains it together and
 * returns a valid handler for a node js style server request.
 *
 * @example
 * const app = Rill()
 * app.use(...)
 * require('http').createServer(app.handler()).listen()
 *
 * @return {function}
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
        /* istanbul ignore next */
        console && console.error && console.error(err)
      }
    }

    function finish () { respond(ctx) }
  }
}

/**
 * @description
 * Creates a node server from the rill server.
 *
 * @example
 * app.createServer().listen(3000)
 *
 * @param {object} [tls] Node https TLS options.
 * @return {http.Server}
 */
rill.createServer = function createServer (tls) {
  var handler = this.handler()
  var server = tls ? https.createServer(tls, handler) : http.createServer(handler)
  // Setup link hijacking in the browser.
  /* istanbul ignore next */
  if (process.browser) adaptBrowser(server)
  return server
}

/**
 * @description
 * Creates a node server from the current Rill server and starts listening for http requests.
 *
 * @example
 * rill().use(...).listen({ port: 3000 })
 *
 * @param {object} [options] Options to configure the node server.
 * @param {string} options.ip
 * @param {number} options.port
 * @param {number} options.backlog
 * @param {object} options.tls
 * @param {function} [onListening] function to be called once the server is listening for requests.
 * @returns {http.Server}
 */
rill.listen = function listen (options, onListening) {
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
 * @description
 * Append new middleware to the current rill application stack.
 *
 * @example
 * rill.use(fn1, fn2)
 *
 * @param {...function|Rill} [middleware] Functions or apps to run during an incomming request.
 * @return {Rill}
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
 * @description
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
 * @param {...function} transformer Function that will modify the rill instance.
 * @return {Rill}
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
 * @description
 * Use middleware at a specific pathname.
 *
 * @example
 * app.at('/test', (ctx, next) => ...)
 *
 * @param {string} pathname the pathname to match.
 * @param {...function|Rill} [middleware] a middleware to attach.
 */
rill.at = function at (pathname) {
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
 * @description
 * Use middleware at a specific hostname.
 *
 * @example
 * app.host('test.com', (ctx, next) => ...)
 *
 * @param {string} hostname the hostname to match.
 * @param {...function|Rill} [middleware] a middleware to attach.
 */
rill.host = function host (hostname) {
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

/**
 * @description
 * Use middleware for a specific method / pathname.
 *
 * @example
 * app.get('/test', ...)
 * app.post('/test', ...)
 *
 * @param {string} [pathname] the pathname to match.
 * @param {...function|Rill} [middleware] the middleware to run.
 * @return {Rill}
 */
http.METHODS.forEach(function (method) {
  var name = method.toLowerCase()
  rill[name] = function (pathname) {
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
 * @param {string} pathname the path to convert to a regexp.
 * @param {array} [keys] a place to store matched param keys.
 * @param {object} [options] options passed to pathToRegExp.
 * @return {RegExp}
 */
function toReg (pathname, keys, options) {
  // First parse path into tokens.
  var tokens = parse(pathname)

  // Find the last token (checking for splat params).
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
