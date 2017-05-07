(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.rill = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'
module.exports = chain

/**
 * Chain a stack of rill middleware into one composed function.
 *
 * @param {Array<Function>}
 * @return {Function}
 */
function chain (stack) {
  if (!Array.isArray(stack)) throw new TypeError('Rill: Middleware stack must be an array.')
  var fns = normalize(stack, [])

  return function chained (ctx, next) {
    var index = -1 // Last called middleware.
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('Rill: next() called multiple times.'))

      var fn = fns[i] || next
      index = i

      if (!fn) {
        return Promise.resolve()
      }

      try {
        return Promise.resolve(fn(ctx, function next () {
          return dispatch(i + 1)
        }))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}

/**
 * Utility to normalize a middleware stack and check for validity.
 *
 * @param {Array<Function>}
 * @throws {TypeError}
 */
function normalize (stack, fns) {
  var fn
  var len = stack.length
  for (var i = 0; i < len; i++) {
    fn = stack[i]
    if (!fn) continue
    else if (typeof fn === 'function') fns.push(fn)
    else if (Array.isArray(fn)) normalize(fn, fns)
    else if (Array.isArray(fn.stack)) normalize(fn.stack, fns)
    else throw new TypeError('Rill: Middleware must be an functions. Got a [' + fn.constructor.name + '].')
  }

  return fns
}

},{}],2:[function(require,module,exports){
'use strict'
var STATUS_CODES = require('@rill/http').STATUS_CODES
HttpError.prototype = new Error
HttpError.fail = fail
HttpError.assert = assert
module.exports = HttpError

/**
 * Creates a Rill HttpError.
 *
 * @param {String|Number} code - The status code for the error.
 * @param {String} [message] - Optional status message.
 * @param {Object} [meta] - Optional object to merge onto the error.
 */
function HttpError (code, message, meta) {
  if (typeof code !== 'number') throw new TypeError('Rill#HttpError.fail: Status code must be a number.')

  this.name = 'HttpError'
  this.code = code
  this.message = message || STATUS_CODES[code]

  for (var key in meta) this[key] = meta[key]
  if (Error.captureStackTrace) Error.captureStackTrace(this, HttpError)
  else Error.call(this)
}

/**
 * Throw an http error.
 *
 * @param {String|Number} code - The status code for the error.
 * @param {String} [message] - Optional status message.
 * @param {Object} [meta] - Optional object to merge onto the error.
 * @throws HttpError
 */
function fail (code, message, meta) {
  throw new HttpError(code, message, meta)
}

/**
 * Throw an http error if a value is not truthy.
 *
 * @param {*} val - The value to test for truthyness.
 * @param {String|Number} code - The status code for the error.
 * @param {String} [message] - Optional status message.
 * @param {Object} [meta] - Optional object to merge onto the error.
 * @throws HttpError
 */
function assert (val, code, message, meta) {
  if (!val) fail(code, message, meta)
}

},{"@rill/http":5}],3:[function(require,module,exports){
'use strict'

var window = require('global')
var URL = require('mini-url')
var parseForm = require('parse-form')
var QS = require('mini-querystring')
var location = require('get-loc')()
var IncomingMessage = require('../client/incoming-message')
var ServerResponse = require('../client/server-response')
var history = window.history
var document = window.document

// Expose browser hijacker.
attachBrowser.fetch = fetch
module.exports = attachBrowser['default'] = attachBrowser

/**
 * Emulates node js http server in the browser by hijacking links and forms.
 *
 * @param {Server} server - The @rill/http server to attach to.
 * @param {boolean} [initialize=true] - If there should be an initial request.
 * @return {Server}
 */
function attachBrowser (server, initialize) {
  server._referrer = document && document.referrer
  server._initialize = initialize !== false
  server._pending_refresh = null
  // Setup link/form hijackers.
  server._onHistory = onHistory.bind(server)
  server._onSubmit = onSubmit.bind(server)
  server._onClick = onClick.bind(server)
  // Register link/form hijackers.
  server.prependListener('listening', onListening)
  // Teardown link/form hijackers
  server.prependListener('close', onClosing)
  return server
}

/**
 * Add event listeners to the browser once the server has started listening.
 *
 * @return {void}
 */
function onListening () {
  window.addEventListener('popstate', this._onHistory)
  window.addEventListener('submit', this._onSubmit)
  window.addEventListener('click', this._onClick)
  this.prependListener('request', onRequest)
  // Trigger initial load event.
  this._pending_load = this._initialize && setTimeout(this._onHistory, 0)
}

/**
 * Removes any attached event listeners once a server closes.
 *
 * @return {void}
 */
function onClosing () {
  window.removeEventListener('popstate', this._onHistory)
  window.removeEventListener('submit', this._onSubmit)
  window.removeEventListener('click', this._onClick)
  this.removeListener('request', onRequest)
  clearTimeout(this._pending_load)
  clearTimeout(this._pending_refresh)
}

/**
 * Handle incomming requests and add a listener for when it is complete.
 *
 * @param {IncomingMessage} req - The mock server request.
 * @param {ServerResponse} res - The mock server response.
 * @return {void}
 */
function onRequest (req, res) {
  // Set referrer automatically.
  req.headers.referer = req.headers.referer || req.socket.server._referrer
  // Trigger cleanup on request finish.
  res.once('finish', onFinish.bind(null, req, res))
}

/**
 * Handle completed requests by updating location, scroll, cookies, etc.
 *
 * @param {IncomingMessage} req - The mock server request.
 * @param {ServerResponse} res - The mock server response.
 * @return {void}
 */
function onFinish (req, res) {
  var parsed = req._options.parsed
  var server = req.socket.server

  // Any navigation during a 'refresh' will cancel the refresh.
  clearTimeout(server._pending_refresh)

  // Check if we should set some cookies.
  var cookies = res.getHeader('set-cookie')
  if (cookies && cookies.length) {
    if (typeof cookies === 'string') {
      // Set a single cookie.
      document.cookie = cookies
    } else {
      // Set multiple cookie header.
      for (var i = 0; i < cookies.length; i++) {
        document.cookie = cookies[i]
      }
    }
  }

  // Check to see if a refresh was requested.
  var refresh = res.getHeader('refresh')
  if (refresh) {
    var parts = refresh.split(' url=')
    var timeout = parseInt(parts[0], 10) * 1000
    var redirectURL = parts[1]
    // This handles refresh headers similar to browsers by waiting a timeout, then navigating.
    server._pending_refresh = setTimeout(
      fetch.bind(null, server, { url: redirectURL }),
      timeout
    )
  }

  // We don't do hash scrolling or a url update unless it is a GET request.
  if (req.method !== 'GET') return

  // We don't do hash scrolling or a url update on redirects.
  /* istanbul ignore next */
  if (res.getHeader('location')) return

  /*
   * When navigating a user will be brought to the top of the page.
   * If the urls contains a hash that is the id of an element (a target) then the target will be scrolled to.
   * This is similar to how browsers handle page transitions natively.
   */
  /* istanbul ignore next */
  if (req._scroll !== false) {
    if (parsed.hash === '') window.scrollTo(0, 0)
    else {
      var target = document.getElementById(parsed.hash.slice(1))
      /* istanbul ignore next */
      if (target && target.scrollIntoView) {
        target.scrollIntoView({
          block: 'start',
          // Only use smooth scrolling if we are on the page already.
          behavior: (
            location.pathname === parsed.pathname &&
            (location.search || '') === (parsed.search || '')
          ) ? 'smooth' : 'auto'
        })
      }
    }
  }

  // Don't push the same url twice.
  /* istanbul ignore next */
  if (req.headers.referer === parsed.href) return
  else server._referrer = parsed.href

  // Update the href in the browser.
  /* istanbul ignore next */
  if (req._history !== false) {
    history.pushState(null, document.title, req.url)
  }
}

/**
 * Handles history state changes (back or startup) and pushes them through the server.
 *
 * @return {void}
 */
function onHistory () {
  fetch(this, { url: location.href, scroll: false, history: false })
}

/**
 * Handles intercepting forms and pushes them through the server.
 *
 * @param {object} e - The <form> submit event.
 * @return {void}
 */
function onSubmit (e) {
  // Ignore canceled events.
  if (e.defaultPrevented) return

  // Get the <form> element.
  var el = e.target
  /* istanbul ignore next */
  var action = el.action || el.getAttribute('action') || ''
  // Parse out host and protocol.
  var parsed = URL.parse(action, location.href)

  // Ignore the click if the element has a target.
  if (el.target && el.target !== '_self') return
  // Ignore links from different host.
  if (parsed.host !== location.host) return
  // Ignore links from different protocol.
  if (parsed.protocol !== location.protocol) return

  // Prevent default request.
  e.preventDefault()

  // Submit the form to the server.
  /* istanbul ignore next */
  fetch(this, { url: action, method: el.method || el.getAttribute('method'), form: el })

  // Check for special data-noreset option (disables Automatically resetting the form.)
  // This is not a part of the official API because I hate the name data-reset and I feel like there should be a better approach to this.
  /* istanbul ignore next */
  if (!el.hasAttribute('data-noreset')) el.reset()
}

/**
 * Handle intercepting link clicks and pushes them through the server.
 *
 * @param {object} e - The <a> click event.
 * @return {void}
 */
function onClick (e) {
  // Ignore canceled events, modified clicks, and right clicks.
  if (
    e.defaultPrevented ||
    e.button ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey
  ) return

  // Get the clicked element.
  var el = e.target
  // Find an <a> element that may have been clicked.
  while (el != null && el.nodeName !== 'A') el = el.parentNode

  // Ignore if we couldn't find a link.
  if (!el) return
  // Ignore clicks from linkless elements.
  if (!el.href) return
  // Ignore the click if the element has a target.
  if (el.target && el.target !== '_self') return
  // Ignore 'rel="external"' links.
  if (el.rel && el.rel === 'external') return
  // Ignore download links
  if (el.hasAttribute('download')) return
  // Ignore links from different host.
  if (el.host && el.host !== location.host) return
  // Ignore links from different protocol.
  if (el.protocol && el.protocol !== ':' && el.protocol !== location.protocol) return

  // Attempt to navigate internally.
  e.preventDefault()
  fetch(this, el.href)
}

/**
 * Like native window.fetch but requests from a local mock server.
 *
 * @param {Server} server - The local server to fetch from.
 * @param {object} opts - Options about the request.
 * @param {boolean} opts.url - The url to navigate to.
 * @param {object} [opts.body] - An request body to pass through as is.
 * @param {HTMLElement} [opts.form] - A form to parse and pass through as the request body.
 * @param {boolean} [opts.scroll] - Should the request trigger a page scroll.
 * @param {boolean} [opts.history] - Should the request update the page url.
 * @param {string|false} [opts.redirect='follow'] - Should we follow any redirects.
 * @api private
 */
function fetch (server, url, options) {
  // Allow for both url string or { url: '...' } object.
  if (typeof url === 'object') {
    options = url
  } else if (typeof url === 'string') {
    options = options || {}
    options.url = url
  }

  // Ensure url was a string.
  if (!options || typeof options.url !== 'string') return Promise.reject(new TypeError('@rill/http/adapter/browser#fetch: url must be a string.'))

  // Parse url parts into an object.
  var parsed = options.parsed = URL.parse(options.url, location.href)

  // Return a 'fetch' style response as a promise.
  return new Promise(function (resolve, reject) {
    // Create a nodejs style req and res.
    var incomingMessage = IncomingMessage._createIncomingMessage(server, options)
    var serverResponse = ServerResponse._createServerResponse(incomingMessage)
    var form = options.form

    // Handle special form option.
    if (form) {
      // Copy content type from form.
      incomingMessage.headers['content-type'] = (
        form.enctype ||
        /* istanbul ignore next */
        form.getAttribute('enctype') ||
        /* istanbul ignore next */
        'application/x-www-form-urlencoded'
      )

      // Parse form data and override options.
      var formData = parseForm(form)
      options.body = formData.body
      options.files = formData.files
    }

    if (incomingMessage.method === 'GET') {
      // On get requests with bodies we update the query string.
      var query = options.query || options.body
      if (query) {
        parsed = options.parsed = URL.parse(
          parsed.pathname + '?' + QS.stringify(query, true) + parsed.hash,
          location.href
        )
      }
    } else {
      // Otherwise we pass through body data as is.
      incomingMessage.body = options.body
      incomingMessage.files = options.files
    }

    // Set some hidden browser specific options.
    incomingMessage._scroll = options.scroll
    incomingMessage._history = options.history

    // Set the request url.
    incomingMessage.url = parsed.pathname + parsed.search + parsed.hash

    // Wait for server response to be sent.
    serverResponse.once('finish', function handleResponseEnd () {
      // Marks incomming message as complete.
      incomingMessage.complete = true
      incomingMessage.emit('end')

      // Check to see if we should redirect.
      var redirect = serverResponse.getHeader('location')
      if (redirect) {
        // Follow redirect if needed.
        if (options.redirect === undefined || options.redirect === 'follow') {
          return resolve(fetch(server, { url: redirect, history: options.history, scroll: options.scroll }))
        }
      }

      // Send out final response data and meta data.
      // This format allows for new Response(...data) when paired with the fetch api.
      return resolve([serverResponse._body, {
        url: incomingMessage.url,
        headers: serverResponse.getHeaders(),
        status: serverResponse.statusCode,
        statusText: serverResponse.statusMessage
      }])
    })

    // Trigger request event on server (ensured async).
    setTimeout(server.emit.bind(server, 'request', incomingMessage, serverResponse), 0)
  })
}

},{"../client/incoming-message":4,"../client/server-response":6,"get-loc":16,"global":17,"mini-querystring":21,"mini-url":22,"parse-form":25}],4:[function(require,module,exports){
'use strict'

var EventEmitter = require('events-light')

// Expose module.
IncomingMessage._createIncomingMessage = createIncomingMessage
module.exports = IncomingMessage['default'] = IncomingMessage

/**
 * Emulates nodes IncomingMessage in the browser.
 * See: https://nodejs.org/api/http.html#http_class_http_incomingmessage
 *
 * @param {net.Socket} socket - An emulated node socket.
 * @constructor
 */
function IncomingMessage (socket) {
  this.headers = {}
  this.socket = this.connection = socket
}

// Extend EventEmitter.
IncomingMessage.prototype = Object.create(EventEmitter.prototype)

// Static properties and type definitions.
/** @type {number} */
IncomingMessage.prototype.httpVersionMajor = 1

/** @type {number} */
IncomingMessage.prototype.httpVersionMinor = 1

/** @type {string} */
IncomingMessage.prototype.httpVersion = IncomingMessage.prototype.httpVersionMajor + '.' + IncomingMessage.prototype.httpVersionMinor

/** @type {boolean} */
IncomingMessage.prototype.complete = false

/** @type {string} */
IncomingMessage.prototype.url = ''

/** @type {object} */
IncomingMessage.prototype.headers = {}

/** @type {string} */
IncomingMessage.prototype.method = 'GET'

/**
 * Creates a new incoming request and sets up some headers and other properties.
 *
 * @param {http.Server} server - The http server to create a request for.
 * @param {object} options - Options for the request.
 * @return {IncomingMessage}
 */
function createIncomingMessage (server, options) {
  var parsed = options.parsed
  var incommingMessage = new IncomingMessage({
    server: server,
    remoteAddress: '127.0.0.1',
    encrypted: parsed.protocol === 'https:'
  })

  // Set default headers.
  var headers = incommingMessage.headers
  headers['referer'] = headers['referer'] || headers['referrer']
  headers['date'] = (new Date()).toUTCString()
  headers['host'] = parsed.host
  headers['cookie'] = document.cookie
  headers['user-agent'] = navigator.userAgent
  headers['accept-language'] = navigator.language
  headers['connection'] = 'keep-alive'
  headers['cache-control'] = 'max-age=0'
  headers['accept'] = '*/*'

  // Attach headers from request
  var reqHeaders = normalizeHeaders(options.headers)
  for (var header in reqHeaders) headers[header] = reqHeaders[header]

  // Setup other properties.
  incommingMessage.method = options.method ? options.method.toUpperCase() : 'GET'
  incommingMessage._options = options

  return incommingMessage
}

/**
 * Converts a headers object to a regular object.
 *
 * @param {object} headers - The headers to normalize.
 * @return {object}
 */
function normalizeHeaders (headers) {
  if (headers == null || typeof headers.forEach !== 'function') return headers
  var result = {}
  headers.forEach(function (value, header) { result[header] = value })
  return result
}

},{"events-light":15}],5:[function(require,module,exports){
'use strict'

var Server = require('./server')
var IncomingMessage = require('./incoming-message')
var ServerResponse = require('./server-response')
var STATUS_CODES = require('statuses/codes.json')

/** @type {object} */
exports.STATUS_CODES = STATUS_CODES

/** @type {string[]} */
exports.METHODS = [
  'OPTIONS',
  'HEAD',
  'GET',
  'PUT',
  'POST',
  'PATCH',
  'DELETE'
]

/** @type {Server} */
exports.Server = Server

/** @type {IncomingMessage} */
exports.IncomingMessage = IncomingMessage

/** @type {ServerResponse} */
exports.ServerResponse = ServerResponse

/**
 * Creates a new mock http server in the browser.
 *
 * @return {Server}
 */
exports.createServer = function () {
  var onRequest = arguments[arguments.length - 1]
  return new Server(onRequest)
}

},{"./incoming-message":4,"./server":7,"./server-response":6,"statuses/codes.json":29}],6:[function(require,module,exports){
'use strict'

var EventEmitter = require('events-light')
var STATUS_CODES = require('statuses/codes.json')

// Expose module.
ServerResponse._createServerResponse = createServerResponse
module.exports = ServerResponse['default'] = ServerResponse

/**
 * Emulates nodes ServerResponse in the browser.
 * See: https://nodejs.org/api/http.html#http_class_http_serverresponse
 *
 * @param {IncomingMessage} incomingMessage - The request to the server.
 * @constructor
 */
function ServerResponse (incomingMessage) {
  this._headers = {}
  this.socket = this.connection = incomingMessage.socket
}

// Extend EventEmitter.
ServerResponse.prototype = Object.create(EventEmitter.prototype)

// Static properties and type definitions.
/** @type {number} */
ServerResponse.prototype.statusCode = null

/** @type {string} */
ServerResponse.prototype.statusMessage = null

/** @type {boolean} */
ServerResponse.prototype.sendDate = true

/** @type {boolean} */
ServerResponse.prototype.finished = false

/** @type {boolean} */
ServerResponse.prototype.headersSent = false

/** @type {Function} */
ServerResponse.prototype.writeContinue =

/** @type {Function} */
ServerResponse.prototype.setTimeout =

/** @type {Function} */
ServerResponse.prototype.addTrailers = function () {}

/**
 * Writes data to the current ServerResponse body.
 *
 * @param {Buffer|ArrayBuffer|string[]} chunk - The chunk of data to write.
 * @param {string} [encoding] - The encoding for the chunk.
 * @param {Function} [onFinish] - A function that will be called when the response has finished.
 */
ServerResponse.prototype.write = function (chunk, encoding, onFinish) {
  this._body.push(chunk)

  if (typeof encoding === 'function') {
    onFinish = encoding
    encoding = null
  }

  if (typeof onFinish === 'function') {
    this.once('finish', onFinish)
  }
}

/**
 * Write status, status message and headers to the current ServerResponse.
 *
 * @param {number} [statusCode] - The status code to write.
 * @param {string} [string] - The status message to write.
 * @param {object} [headers] - An object containing headers to write.
 */
ServerResponse.prototype.writeHead = function writeHead (statusCode, statusMessage, headers) {
  if (this.finished) return

  this.statusCode = statusCode
  this.headersSent = true
  if (statusMessage) {
    if (typeof statusMessage === 'object') {
      headers = statusMessage
    } else {
      this.statusMessage = statusMessage
    }
  }

  if (typeof headers === 'object') {
    for (var key in headers) {
      this.setHeader(key, headers[key])
    }
  }
}

/**
 * Get a shallow copy of all response header names.
 *
 * @return {object}
 */
ServerResponse.prototype.getHeaders = function getHeaders () {
  var clone = {}
  for (var key in this._headers) clone[key] = this._headers[key]
  return clone
}

/**
 * Get a list of current header names.
 *
 * @return {string[]}
 */
ServerResponse.prototype.getHeaderNames = function getHeaderNames () {
  return Object.keys(this._headers)
}

/**
 * Get a header from the current ServerResponse.
 *
 * @param {string} header - The name of the header to get.
 * @return {string[]|string|void}
 */
ServerResponse.prototype.getHeader = function getHeader (header) {
  return this._headers[header.toLowerCase()]
}

/**
 * Check if a header has been set.
 *
 * @param {string} header - The name of the header to check.
 * @return {boolean}
 */
ServerResponse.prototype.hasHeader = function hasHeader (header) {
  return header.toLowerCase() in this._headers
}

/**
 * Remove a header from the current ServerResponse.
 */
ServerResponse.prototype.removeHeader = function removeHeader (header) {
  delete this._headers[header.toLowerCase()]
}

/**
 * Write a header to the current ServerResponse.
 *
 * @param {string} header - The name of the header to set.
 * @param {string[]|string} - The value for the header.
 */
ServerResponse.prototype.setHeader = function setHeader (header, value) {
  this._headers[header.toLowerCase()] = value
}

/**
 * Handle event ending from the current ServerResponse.
 *
 * @param {Buffer|ArrayBuffer|string[]} [chunk] - A chunk of data to write.
 * @param {string} [encoding] - The encoding for the chunk.
 * @param {Function} [onFinish] - A function that will be called when the response has finished.
 */
ServerResponse.prototype.end = function end (chunk, encoding, onFinish) {
  if (this.finished) return

  if (typeof chunk === 'function') {
    onFinish = chunk
    chunk = null
  } else if (typeof encoding === 'function') {
    onFinish = encoding
    encoding = null
  }

  if (chunk != null) {
    this._body.push(chunk)
  }

  if (typeof onFinish === 'function') {
    this.once('finish', onFinish)
  }

  if (this.statusCode == null) {
    this.statusCode = 200
  }

  if (this.statusMessage == null) {
    this.statusMessage = STATUS_CODES[this.statusCode]
  }

  if (this.sendDate) {
    this._headers['date'] = (new Date()).toUTCString()
  }

  this._headers['status'] = this.statusCode
  this.headersSent = true
  this.finished = true
  this.emit('finish')
}

/**
 * Creates a new server response and sets up some properties.
 *
 * @param {IncomingMessage} incomingMessage - The request that is assosiated with the response.
 * @return {ServerResponse}
 */
function createServerResponse (incomingMessage) {
  var serverResponse = new ServerResponse(incomingMessage)
  serverResponse._body = []
  return serverResponse
}

},{"events-light":15,"statuses/codes.json":29}],7:[function(require,module,exports){
'use strict'

var EventEmitter = require('events-light')

// Expose module.
module.exports = Server['default'] = Server

/**
 * Emulates node js http server in the browser.
 *
 * @param {Function} [onRequest] - A function that will be called on every request.
 */
function Server (onRequest) {
  if (onRequest) this.on('request', onRequest)
}

// Extend EventEmitter.
Server.prototype = Object.create(EventEmitter.prototype)

/**
 * Starts a server and sets listening to true.
 * Adapters will hook into this to startup routers on individual platforms.
 *
 * @param {...any}
 * @param {Function} [onListening] - A function that will be called once the server is listening.
 * @return {this}
 */
Server.prototype.listen = function listen () {
  // Automatically add callback `listen` handler.
  var onListening = arguments[arguments.length - 1]
  if (typeof onListening === 'function') this.once('listening', onListening)

  // Ensure that listening is `async`.
  setTimeout(function () {
    // Mark server as listening.
    this.listening = true
    this.emit('listening')
  }.bind(this), 0)

  return this
}

/**
 * Closes the server and destroys all event listeners.
 *
 * @param {Function} [onClose] - A function that will be called once the server has closed.
 * @return {this}
 */
Server.prototype.close = function close (onClose) {
  // Automatically add callback `close` handler.
  if (typeof onClose === 'function') this.once('close', onClose)

  // Ensure that closing is `async`.
  setTimeout(function () {
    // Mark server as closed.
    this.listening = false
    this.emit('close')
  }.bind(this), 0)

  return this
}

},{"events-light":15}],8:[function(require,module,exports){
'use strict'

module.exports = require('@rill/http')

},{"@rill/http":5}],9:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
"use strict";

/*
 * Calculate the byte lengths for utf8 encoded strings.
 *
 * @param {String} str
 * @return {Number}
 */
module.exports = function byteLength (str) {
  var i, len;
  if (!str) return 0;
  str = str.toString();

  for (i = len = str.length; i--;) {
    var code = str[i].charCodeAt();
    if (0xDC00 <= code && code <= 0xDFFF) i--;
    if (0x7f < code && code <= 0x7ff) len++;
    else if (0x7ff < code && code <= 0xffff) len += 2;
  }

  return len;
};

},{}],11:[function(require,module,exports){
"use strict";

// Don't check buffer type in browser.
module.exports = {
	Buffer: function () {}
};

},{}],12:[function(require,module,exports){
"use strict";

// We won't bother loading mime-types in the browser.
module.exports = {
	lookup: function () {}
};

},{}],13:[function(require,module,exports){
"use strict";

var htmlReg = /^\s*</;
var buffer  = require("buffer").Buffer;
var lookup  = require("mime-types").lookup;

/**
 * Function that attempts to guess the content type for a value.
 *
 * Supports:
 * * text/plain
 * * text/html
 * * application/octet-stream
 * * application/json
 */
module.exports = function checkContent (data) {
	if (data == null || typeof data === "function") return;

	if (typeof data === "object") {
		if (isBuffer(data)) {
			return "application/octet-stream";
		} else if (isStream(data)) {
			return lookup(data.path) || "application/octet-stream";
		} else if (isJSON(data)) {
			return "application/json; charset=UTF-8";
		}
	}

	return "text/" + (
		htmlReg.test(String(data))
			? "html"
			: "plain"
	) + "; charset=UTF-8";
};

/**
 * Test if a value is a node buffer.
 */
function isBuffer (val) {
	return val instanceof buffer;
}

/**
 * Test if a value is a node stream.
 */
function isStream (val) {
	return typeof val.pipe === "function";
}

/**
 * Test if a value can be json.
 */
function isJSON (val) {
	// Try to check if JSON without stringify.
	if (
		typeof val.toJSON === "function" ||
		val.constructor === Object ||
		val.constructor === Array
	) return true;

	try {
		JSON.stringify(val);
		return true;
	} catch (_) {
		return false;
	}
}

},{"buffer":11,"mime-types":12}],14:[function(require,module,exports){
/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module exports.
 * @public
 */

exports.parse = parse;
exports.serialize = serialize;

/**
 * Module variables.
 * @private
 */

var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 * @param {string} str
 * @param {object} [options]
 * @return {object}
 * @public
 */

function parse(str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  var obj = {}
  var opt = options || {};
  var pairs = str.split(pairSplitRegExp);
  var dec = opt.decode || decode;

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    var eq_idx = pair.indexOf('=');

    // skip things that don't look like key=value
    if (eq_idx < 0) {
      continue;
    }

    var key = pair.substr(0, eq_idx).trim()
    var val = pair.substr(++eq_idx, pair.length).trim();

    // quoted values
    if ('"' == val[0]) {
      val = val.slice(1, -1);
    }

    // only assign once
    if (undefined == obj[key]) {
      obj[key] = tryDecode(val, dec);
    }
  }

  return obj;
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 *
 * @param {string} name
 * @param {string} val
 * @param {object} [options]
 * @return {string}
 * @public
 */

function serialize(name, val, options) {
  var opt = options || {};
  var enc = opt.encode || encode;

  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }

  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  var value = enc(val);

  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  var str = name + '=' + value;

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;
    if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
    str += '; Max-Age=' + Math.floor(maxAge);
  }

  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }

    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }

    str += '; Path=' + opt.path;
  }

  if (opt.expires) {
    if (typeof opt.expires.toUTCString !== 'function') {
      throw new TypeError('option expires is invalid');
    }

    str += '; Expires=' + opt.expires.toUTCString();
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.sameSite) {
    var sameSite = typeof opt.sameSite === 'string'
      ? opt.sameSite.toLowerCase() : opt.sameSite;

    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

/**
 * Try decoding a string using a decoding function.
 *
 * @param {string} str
 * @param {function} decode
 * @private
 */

function tryDecode(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
}

},{}],15:[function(require,module,exports){
/* jshint newcap:false */
var slice = Array.prototype.slice;

function isFunction(arg) {
    return typeof arg === 'function';
}

function checkListener(listener) {
    if (!isFunction(listener)) {
        throw TypeError('Invalid listener');
    }
}

function invokeListener(ee, listener, args) {
    switch (args.length) {
        // fast cases
        case 1:
            listener.call(ee);
            break;
        case 2:
            listener.call(ee, args[1]);
            break;
        case 3:
            listener.call(ee, args[1], args[2]);
            break;
            // slower
        default:
            listener.apply(ee, slice.call(args, 1));
    }
}

function addListener(eventEmitter, type, listener, prepend) {
    checkListener(listener);

    var events = eventEmitter.$e || (eventEmitter.$e = {});

    var listeners = events[type];
    if (listeners) {
        if (isFunction(listeners)) {
            events[type] = prepend ? [listener, listeners] : [listeners, listener];
        } else {
            if (prepend) {
                listeners.unshift(listener);
            } else {
                listeners.push(listener);
            }
        }

    } else {
        events[type] = listener;
    }
    return eventEmitter;
}

function EventEmitter() {
    this.$e = this.$e || {};
}

EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype = {
    $e: null,

    emit: function(type) {
        var args = arguments;

        var events = this.$e;
        if (!events) {
            return;
        }

        var listeners = events && events[type];
        if (!listeners) {
            // If there is no 'error' event listener then throw.
            if (type === 'error') {
                var error = args[1];
                if (!(error instanceof Error)) {
                    var context = error;
                    error = new Error('Error: ' + context);
                    error.context = context;
                }

                throw error; // Unhandled 'error' event
            }

            return false;
        }

        if (isFunction(listeners)) {
            invokeListener(this, listeners, args);
        } else {
            listeners = slice.call(listeners);

            for (var i=0, len=listeners.length; i<len; i++) {
                var listener = listeners[i];
                invokeListener(this, listener, args);
            }
        }

        return true;
    },

    on: function(type, listener) {
        return addListener(this, type, listener, false);
    },

    prependListener: function(type, listener) {
        return addListener(this, type, listener, true);
    },

    once: function(type, listener) {
        checkListener(listener);

        function g() {
            this.removeListener(type, g);

            if (listener) {
                listener.apply(this, arguments);
                listener = null;
            }
        }

        this.on(type, g);

        return this;
    },

    // emits a 'removeListener' event iff the listener was removed
    removeListener: function(type, listener) {
        checkListener(listener);

        var events = this.$e;
        var listeners;

        if (events && (listeners = events[type])) {
            if (isFunction(listeners)) {
                if (listeners === listener) {
                    delete events[type];
                }
            } else {
                for (var i=listeners.length-1; i>=0; i--) {
                    if (listeners[i] === listener) {
                        listeners.splice(i, 1);
                    }
                }
            }
        }

        return this;
    },

    removeAllListeners: function(type) {
        var events = this.$e;
        if (events) {
            delete events[type];
        }
    },

    listenerCount: function(type) {
        var events = this.$e;
        var listeners = events && events[type];
        return listeners ? (isFunction(listeners) ? 1 : listeners.length) : 0;
    }
};

module.exports = EventEmitter;
},{}],16:[function(require,module,exports){
'use strict'

// Better global support (for web/service workers)≥
var window = require('global')

/**
 * Finds the location object, checking for polyfill and falling back to empty object.
 * @return {Object}
 */
module.exports = function getLocation () {
  return (window.history && window.history.location) || window.location || { href: '' }
}

},{"global":17}],17:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],18:[function(require,module,exports){
"use strict";

module.exports = field;

/**
 * Converts hyphenated headers like `Content-Type` into `content-type`.
 */
function field (str) {
	if (typeof str !== "string") throw new TypeError("Header Fields must be strings.");
	str = str.toLowerCase();
	if (str === "referrer") str = "referer";
	return str;
};

},{}],19:[function(require,module,exports){
(function (global){
'use strict'

var toString = Object.prototype.toString
var buffer = global.Buffer || noop
var typeClass = {
  string: '[object String]',
  number: '[object Number]',
  boolean: '[object Boolean]',
  date: '[object Date]',
  regexp: '[object RegExp]',
  error: '[object Error]',
  function: '[object Function]',
  arguments: '[object Arguments]',
  object: '[object Object]',
  array: '[object Array]'
}

module.exports = {
  string: isType('String'),
  number: isType('Number'),
  boolean: isType('Boolean'),
  date: isType('Date'),
  regexp: isType('RegExp'),
  error: isType('Error'),
  function: isType('Function'),
  arguments: isType('Arguments'),
  object: isType('Object'),
  array: isType('Array'),
  stream: function isStream (val) {
    return val != null && typeof val.pipe === 'function'
  },
  buffer: function isBuffer (val) {
    return val instanceof buffer
  },
  empty: function isEmpty (val) {
    /* eslint-disable */
    for (var key in val) return false
    /* eslint-enable */
    return true
  }
}

/**
 * Does nothing.
 */
function noop () {}

/*
 * Creates a type checker function based on the given type.
 *
 * @param {String} type
 * @api private
 */
function isType (name) {
  var type = name.toLowerCase()
  return function (val) {
    var _typeof = typeof val
    switch (_typeof) {
      case 'object':
      case 'function':
        return toString.call(val) === typeClass[type]
      default:
        return _typeof === type
    }
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],20:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],21:[function(require,module,exports){
'use strict'

var parseReg = /([^=?&]+)=?([^&]*)/g
var qFlat = require('q-flat')
var qSet = require('q-set')

/**
 * Converts an object to a query string and optionally flattens it.
 * @param  {Object} obj - the object to convert.
 * @return {String}
 */
exports.stringify = function stringify (obj, flat) {
  if (flat) obj = qFlat(obj)
  var keys = Object.keys(obj)
  if (!keys.length) return ''

  for (var i = 0, len = keys.length, key; i < len; i++) {
    key = keys[i]
    keys[i] = encodeURIComponent(key) + '=' + encodeURIComponent(obj[key])
  }

  return keys.join('&')
}

/**
 * Parses a query string and optionally unflattens it.
 * @param  {String} str - the query string to parse.
 * @param  {Boolean} [deep] - if true the query will be unflattened.
 * @return {Object}
 */
exports.parse = function (str, deep) {
  var set = deep ? qSet : qSet.flat
  var result = {}
  var part

  while ((part = parseReg.exec(str))) {
    set(result, decodeURIComponent(part[1]), decodeURIComponent(part[2]))
  }

  return result
}

},{"q-flat":27,"q-set":28}],22:[function(require,module,exports){
'use strict'

var URL = require('./src')
var parts = require('./src/parts')
var seperator = '~#~'
var cache = {}

// Expose parts for libraries built on top of this.
exports.parts = parts

// Expose cache for clearing.
exports.cache = cache

// Expose parser.
exports.parse = parse

// Expose stringify.
exports.stringify = stringify

/**
 * Exposes the url parsers and caches results.
 * @param  {String} path - the path for the url.
 * @param  {String} [base] - the base path for the url.
 * @return {URL}
 */
function parse (path, base) {
  var key = path + seperator + base
  var result = cache[key]
  if (!result) {
    // Parse url and cache result.
    var parsed = base
      ? new URL(path, base)
      : new URL(path)
    result = {}

    // Make each part default to empty string for consistency.
    for (var i = parts.length, part, data; i--;) {
      part = parts[i]
      data = parsed[part]
      if (data == null) data = ''
      result[part] = data
    }

    // Freeze object to maintain cache.
    result = cache[key] = Object.freeze(result)
  }
  return result
}

/**
 * Convertes a parsed url object into a string.
 * @param  {Object} parsed - the parsed url to convert to a string.
 * @return {String}
 */
function stringify (parsed) {
  if (typeof parsed !== 'object' || parsed == null) throw new TypeError('URL must be an object.')
  return (
    (parsed.protocol ? parsed.protocol + '//' : '') +
    (parsed.host || (parsed.hostname || '') + (parsed.port ? ':' + parsed.port : '')) +
    (parsed.pathname || '') +
    (parsed.search || '') +
    (parsed.hash || '')
  )
}

},{"./src":23,"./src/parts":24}],23:[function(require,module,exports){
'use strict'

var window = require('global')
var vendors = ['ms', 'moz', 'webkit', 'o']
var NativeURL = tryVendors(window, 'URL')
var supportsURL = false

// Check if browser supports native url parser.
try {
  supportsURL = Boolean(new NativeURL('', 'http://a'))
} catch (e) {}

// Try to use native url parser and fall back to <a> parser.
if (supportsURL) {
  module.exports = NativeURL
} else if (window.document) {
  // Load up a fake document to handle url resolution and parsing.
  var getLocation = require('get-loc')
  var parts = require('./parts')
  var doc = window.document.implementation.createHTMLDocument('parser')
  var $base = doc.head.appendChild(doc.createElement('base'))
  var $a = doc.createElement('a')

  /**
   * Creates a moch URL function using a link.
   * @param {[type]} path [description]
   * @param {[type]} base [description]
   */
  var URL = function URL (path, base) {
    $base.href = base || getLocation().href
    $a.href = path

    for (var i = parts.length, part; i--;) {
      part = parts[i]
      this[part] = $a[part] || ''
    }

    // Patch for ie9 which excludes leading slash.
    if (this.pathname[0] !== '/') {
      this.pathname = '/' + this.pathname
    }

    // Patch for browsers automatically adding default ports.
    if (this.port !== '') {
      var href = this.href
      var hostname = this.hostname
      var hostIndex = href.indexOf(hostname) + hostname.length + 1
      var expectedPort = href.slice(hostIndex, hostIndex + this.port.length)
      if (expectedPort !== this.port) {
        this.port = ''
        this.host = this.hostname
      }
    }
  }

  /**
   * Get the href for the url.
   * @return {String} the href for the url.
   */
  URL.prototype.toString = function toString () {
    return this.href
  }

  module.exports = URL
} else {
  throw new Error('URL parser not supported.')
}

/**
 * Check for vendored versions of function
 * @param  {Object} obj - the object to check in.
 * @param  {String} field - the field we are looking for.
 * @return {*|undefined}
 */
function tryVendors (obj, field) {
  if (obj[field]) return obj[field]
  for (var i = vendors.length, alias; i--;) {
    alias = obj[vendors[i] + field]
    if (alias) return alias
  }
}

},{"./parts":24,"get-loc":16,"global":17}],24:[function(require,module,exports){
'use strict'

/**
 * Parts of the url to extract.
 * @type {Array}
 */
module.exports = [
  'protocol',
  'hostname',
  'pathname',
  'search',
  'host',
  'port',
  'hash',
  'href'
]

},{}],25:[function(require,module,exports){
'use strict'

var qset = require('q-set')
var fset = qset.flat
var validTags = {
  INPUT: true,
  TEXTAREA: true,
  SELECT: true,
  BUTTON: true
}

/**
 * Tracks which button submitted a form last.
 */
var _clickTarget = null
window.addEventListener('click', function patchActiveElement (e) {
  // Ignore canceled events, modified clicks, and right clicks.
  if (
    e.defaultPrevented ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.button !== 0
    ) return
  var el = e.target
  // Find an <button> element that may have been clicked.
  while (el != null && (el.nodeName !== 'BUTTON' || el.type !== 'submit')) el = el.parentNode
  // Store the button that was clicked.
  _clickTarget = el
})

/**
 * Patch for document.activeElement for safari.
 */
function getActiveElement () {
  var el = document.activeElement === document.body
    ? _clickTarget
    : document.activeElement
  _clickTarget = null
  return el
}

/*
 * Serialize a html form as JS object.
 *
 * @param {<Form/>} form
 * @returns { Array<Array> }
 */
module.exports = function parseForm (form, flat) {
  if (!form || form.nodeName !== 'FORM') {
    throw new Error('Can only parse form elements.')
  }

  var set = flat ? fset : qset
  var isMultiPart = form.enctype === 'multipart/form-data'
  var nodes = form.elements
  var body = {}
  var files = isMultiPart ? {} : undefined

  for (var i = 0, len = nodes.length; i < len; i++) {
    var el = nodes[i]

    // Check if this el should be serialized.
    if (el.disabled || !(el.name && validTags[el.nodeName])) {
      continue
    }

    var name = el.name
    var options = el.options

    switch (el.type) {
      case 'submit':
        // We check if the submit button is active
        // otherwise all type=submit buttons would be serialized.
        if (el === getActiveElement()) set(body, name, el.value)
        break
      case 'checkbox':
      case 'radio':
        if (el.checked) set(body, name, el.value)
        break
      case 'select-one':
        if (el.selectedIndex >= 0) set(body, name, options[el.selectedIndex].value)
        break
      case 'select-multiple':
        var selected = []
        var option
        for (var _a = 0, _lenA = options.length; _a < _lenA; _a++) {
          option = options[_a]
          if (option && option.selected) selected.push(option.value)
        }

        set(body, name, selected)
        break
      case 'file':
        var fileList = el.files
        if (isMultiPart && fileList) {
          for (var _b = 0, _lenB = fileList.length; _b < _lenB; _b++) {
            set(files, name, fileList[_b])
          }
        }
        break
      default:
        set(body, name, el.value)
    }
  }

  return {
    body: body,
    files: files
  }
}

},{"q-set":28}],26:[function(require,module,exports){
var isarray = require('isarray')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
function parse (str, options) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var defaultDelimiter = options && options.delimiter || '/'
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    var next = str[index]
    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var modifier = res[6]
    var asterisk = res[7]

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var partial = prefix != null && next != null && next !== prefix
    var repeat = modifier === '+' || modifier === '*'
    var optional = modifier === '?' || modifier === '*'
    var delimiter = res[2] || defaultDelimiter
    var pattern = capture || group

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      asterisk: !!asterisk,
      pattern: pattern ? escapeGroup(pattern) : (asterisk ? '.*' : '[^' + escapeString(delimiter) + ']+?')
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @param  {Object=}            options
 * @return {!function(Object=, Object=)}
 */
function compile (str, options) {
  return tokensToFunction(parse(str, options))
}

/**
 * Prettier encoding of URI path segments.
 *
 * @param  {string}
 * @return {string}
 */
function encodeURIComponentPretty (str) {
  return encodeURI(str).replace(/[\/?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Encode the asterisk parameter. Similar to `pretty`, but allows slashes.
 *
 * @param  {string}
 * @return {string}
 */
function encodeAsterisk (str) {
  return encodeURI(str).replace(/[?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$')
    }
  }

  return function (obj, opts) {
    var path = ''
    var data = obj || {}
    var options = opts || {}
    var encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          // Prepend partial segment prefixes.
          if (token.partial) {
            path += token.prefix
          }

          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received `' + JSON.stringify(value) + '`')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encode(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received `' + JSON.stringify(segment) + '`')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = token.asterisk ? encodeAsterisk(value) : encode(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {!RegExp} re
 * @param  {Array}   keys
 * @return {!RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {!Array}  keys
 * @return {!RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array}   keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {!Array}  keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function stringToRegexp (path, keys, options) {
  return tokensToRegExp(parse(path, options), keys, options)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}          tokens
 * @param  {(Array|Object)=} keys
 * @param  {Object=}         options
 * @return {!RegExp}
 */
function tokensToRegExp (tokens, keys, options) {
  if (!isarray(keys)) {
    options = /** @type {!Object} */ (keys || options)
    keys = []
  }

  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = '(?:' + token.pattern + ')'

      keys.push(token)

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (!token.partial) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = prefix + '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  var delimiter = escapeString(options.delimiter || '/')
  var endsWithDelimiter = route.slice(-delimiter.length) === delimiter

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithDelimiter ? route.slice(0, -delimiter.length) : route) + '(?:' + delimiter + '(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithDelimiter ? '' : '(?=' + delimiter + '|$)'
  }

  return attachKeys(new RegExp('^' + route, flags(options)), keys)
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {(Array|Object)=}       keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
function pathToRegexp (path, keys, options) {
  if (!isarray(keys)) {
    options = /** @type {!Object} */ (keys || options)
    keys = []
  }

  options = options || {}

  if (path instanceof RegExp) {
    return regexpToRegexp(path, /** @type {!Array} */ (keys))
  }

  if (isarray(path)) {
    return arrayToRegexp(/** @type {!Array} */ (path), /** @type {!Array} */ (keys), options)
  }

  return stringToRegexp(/** @type {string} */ (path), /** @type {!Array} */ (keys), options)
}

},{"isarray":20}],27:[function(require,module,exports){
var toString       = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * @description
 * Go from regular object syntax to a querystring style object.
 *
 * @example
 * var result = unflatten({ a: { b: 1 }, c: { d: 1 } });
 * result; //-> { "a[b]": 1, "c[d]": 2 }
 *
 * @param {Object} obj
 */
function qFlat (obj, path, result) {
	var type = toString.call(obj);
	if (result == null) {
		if (type === "[object Object]") result = {};
		else if (type === "[object Array]") result = [];
		else return;
	}

	for (var key in obj) {
		var val = obj[key];
		if (val === undefined || !hasOwnProperty.call(obj, key)) continue;
		switch (toString.call(val)) {
			case "[object Array]":
			case "[object Object]":
				qFlat(val, join(path, key), result);
				break;
			default:
				result[join(path, key)] = val;
				break;
		}
	}

	return result;
}

function join (path, key) {
	return path != null
		? path + "[" + key + "]"
		: key;
}

module.exports = qFlat;

},{}],28:[function(require,module,exports){
"use strict";

var matchArray   = /[^\[\]]+|\[\]/g;
var matchInteger = /^\d+$/;
var temp         = [];

/*
 * @description
 * A setter for querystring style fields like "a[b][c]".
 * The setter will create arrays for repeat keys.
 *
 * @param {Object} obj
 * @param {String} path
 * @param {*} val
 */
function qSet (obj, path, val) {
	var keys = path === "" ? [""] : path.match(matchArray);
	var len  = keys.length;
	var cur  = obj;
	var key, prev, next, exist;

	for (var i = 0; i < len; i++) {
		prev = cur;
		key  = keys[i];
		next = keys[i + 1];
		if (key === "[]") key = cur.length;
		// Make path as we go.
		cur = (exist = typeof cur === "object" && key in cur)
			? cur[key]
			// Check if the next path is an explicit array.
			: cur[key] = (next === "[]" || matchInteger.test(next))
				? []
				: {};
	}

	prev[key] = exist ? temp.concat(cur, val) : val;

	return obj;
};

/**
 * Like qset but doesn't resolve nested params such as a[b][c].
 *
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 */
function fSet (obj, key, val) {
	key = arrayPushIndexes(obj, key);
	obj[key] = key in obj
		? temp.concat(obj[key], val)
		: val;
	return obj;
}

/**
 * Given a qs style key and an object will convert array push syntax to integers.
 * Eg: a[b][] -> a[b][0]
 *
 * @param {Object} obj
 * @param {String} key
 * @return {String}
 */
function arrayPushIndexes (obj, key) {
	var path = key.split("[]");
	if (path.length === 1) return key;
	var cur = path[0];
	var keys = Object.keys(obj);

	for (var i = 1, len = path.length; i < len; i++) {
		cur += "[" + findLastIndex(keys, cur) + "]" + path[i];
	}

	return cur;
}

/**
 * Given a path to push to will return the next valid index if possible.
 * Eg: a[b][] -> 0 // if array is empty.
 *
 * @param {Array} keys
 * @param {String} path
 * @return {Number}
 */
function findLastIndex (keys, path) {
	var last = -1;

	for (var key, i = keys.length; i--;) {
		key = keys[i];
		if (key.indexOf(path) !== 0) continue;
		key = key.replace(path, "");
		key = key.slice(1, key.indexOf("]"));
		if (key > last) last = Number(key);
	}

	return last + 1;
}

qSet.flat      = fSet;
module.exports = qSet;

},{}],29:[function(require,module,exports){
module.exports={
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "306": "(Unused)",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}
},{}],30:[function(require,module,exports){
/*!
 * statuses
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var codes = require('./codes.json')

/**
 * Module exports.
 * @public
 */

module.exports = status

// array of status codes
status.codes = populateStatusesMap(status, codes)

// status codes for redirects
status.redirect = {
  300: true,
  301: true,
  302: true,
  303: true,
  305: true,
  307: true,
  308: true
}

// status codes for empty bodies
status.empty = {
  204: true,
  205: true,
  304: true
}

// status codes for when you should retry the request
status.retry = {
  502: true,
  503: true,
  504: true
}

/**
 * Populate the statuses map for given codes.
 * @private
 */

function populateStatusesMap (statuses, codes) {
  var arr = []

  Object.keys(codes).forEach(function forEachCode (code) {
    var message = codes[code]
    var status = Number(code)

    // Populate properties
    statuses[status] = message
    statuses[message] = status
    statuses[message.toLowerCase()] = status

    // Add to array
    arr.push(status)
  })

  return arr
}

/**
 * Get the status code.
 *
 * Given a number, this will throw if it is not a known status
 * code, otherwise the code will be returned. Given a string,
 * the string will be parsed for a number and return the code
 * if valid, otherwise will lookup the code assuming this is
 * the status message.
 *
 * @param {string|number} code
 * @returns {number}
 * @public
 */

function status (code) {
  if (typeof code === 'number') {
    if (!status[code]) throw new Error('invalid status code: ' + code)
    return code
  }

  if (typeof code !== 'string') {
    throw new TypeError('code must be a number or string')
  }

  // '403'
  var n = parseInt(code, 10)
  if (!isNaN(n)) {
    if (!status[n]) throw new Error('invalid status code: ' + n)
    return n
  }

  n = status[code.toLowerCase()]
  if (!n) throw new Error('invalid status message: "' + code + '"')
  return n
}

},{"./codes.json":29}],31:[function(require,module,exports){
'use strict'

var HttpError = require('@rill/error')
var Request = require('./request')
var Response = require('./response')

// Expose module.
module.exports =
Context['default'] = Context

/**
 * Creates an incomming message context.
 *
 * @example
 * require('http').createServer((req, res) => {
 *   const ctx = new Context(req, res)
 * })
 *
 * @param {http.IncommingMessage} req - A nodejs style request object.
 * @param {http.ServerResponse} res - A nodejs style response object.
 * @constructor
 */
function Context (req, res) {
  this.req = new Request(this, req)
  this.res = new Response(this, res)
  this.fail = this.fail.bind(this)
  this.assert = this.assert.bind(this)
  this.locals = {}
}

/**
 * Throw an http during the current request and update the status and message on the response.
 *
 * @example
 * context.fail(400, 'Password is required')
 *
 * @param {number} code - The status code for the error.
 * @param {string} [message] - The status message to set on the response.
 * @param {object} [meta] - An object to merge onto the error.
 * @return {void}
 * @throws {HttpError}
 */
Context.prototype.fail = function (code, message, meta) {
  if (typeof code !== 'number') throw new TypeError('Rill#ctx.fail: Status code must be a number.')
  var error = new HttpError(code, message, meta)
  this.res.status = error.code
  this.res.message = error.message
  throw error
}

/**
 * If a value is falsey throw an http during the current request and update the status and message on the response.
 *
 * @example
 * context.assert(password.length > 5, 400, 'Password must be at least 5 characters long')
 *
 * @param {*} value - The value to test for truthyness.
 * @param {number} code - The status code for the error.
 * @param {string} [message] - The status message to set on the response.
 * @param {object} [meta] - An object to merge onto the error.
 * @return {void}
 * @throws {HttpError}
 */
Context.prototype.assert = function (value, code, message, meta) {
  if (typeof code !== 'number') throw new TypeError('Rill#ctx.assert: Status code must be a number.')
  if (!value) this.fail(code, message, meta)
}

},{"./request":33,"./response":35,"@rill/error":2}],32:[function(require,module,exports){
(function (process){
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

// Expose module.
module.exports =
Rill['default'] = Rill

/**
 * Creates a universal app that will run middleware for a incomming request.
 *
 * @example
 * const app = Rill()
 *
 * @constructor
 */
function Rill () {
  if (!(this instanceof Rill)) return new Rill()
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
 * @return {handleIncommingMessage}
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
  if (process.browser) adaptBrowser(server)
  return server
}

/**
 * Creates a node server from the current Rill server and starts listening for http requests.
 *
 * @example
 * rill().use(...).listen({ port: 3000 })
 *
 * @param {object} [options] - Options to configure the node server.
 * @param {string} options.ip
 * @param {number} options.port
 * @param {number} options.backlog
 * @param {object} options.tls
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
 * @param {...function|Rill|false} [middleware] - A middleware to attach.
 * @return {this}
 */
Rill.prototype.use = function () {
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
 * @param {...function|false} [transformer] - A function that will modify the rill instance.
 * @return {this}
 */
Rill.prototype.setup = function () {
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
 * @param {...function|Rill|false} [middleware] - A middleware to attach.
 * @return {this}
 */
Rill.prototype.at = function (pathname) {
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
 * @param {...function|Rill|false} [middleware] - A middleware to attach.
 * @return {this}
 */
Rill.prototype.host = function host (hostname) {
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
   * @param {...function|Rill|false} [middleware] - A middleware to attach.
   * @return {this}
   */
  Rill.prototype[name] = function (pathname) {
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

}).call(this,require('_process'))

},{"./context":31,"./respond":34,"@rill/chain":1,"@rill/error":2,"@rill/http":5,"@rill/http/adapter/browser":3,"@rill/https":8,"_process":9,"path-to-regexp":26}],33:[function(require,module,exports){
(function (process){
'use strict'

var URL = require('mini-url')
var QS = require('mini-querystring')
var cookie = require('cookie')
var toField = require('header-field')
var URL_PARTS = URL.parts

// Expose module.
module.exports =
Request['default'] = Request

/**
 * Wrapper around nodejs `IncommingMessage` that has pre parsed url
 * and other conveinences.
 *
 * @param {Context} ctx - The context for the request.
 * @param {http.IncommingMessage} req - The original node request.
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

/**
 * Utility to retrieve a header from the request.
 *
 * @example
 * request.get('Host') // -> 'test.com'
 *
 * @param {string} name - The header field to get from the request.
 * @return {string|string[]}
 */
Request.prototype.get = function (name) {
  return this.headers[toField(name)]
}

}).call(this,require('_process'))

},{"_process":9,"cookie":14,"header-field":18,"mini-querystring":21,"mini-url":22}],34:[function(require,module,exports){
'use strict'

var byteLength = require('byte-length')
var checkType = require('content-check')
var statuses = require('statuses')
var isType = require('is-typeof')

// Expose module.
module.exports =
respond['default'] = respond

/**
 * Runs general clean up on a request context and ends it with proper headers and status codes.
 *
 * @param {Context} ctx - The context of the request.
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

},{"byte-length":10,"content-check":13,"is-typeof":19,"statuses":30}],35:[function(require,module,exports){
'use strict'

var URL = require('mini-url')
var cookie = require('cookie')
var statuses = require('statuses')
var toField = require('header-field')

// Expose module.
module.exports =
Response['default'] = Response

/**
 * Wrapper around nodejs `ServerResponse`.
 *
 * @param {Context} ctx - The context for the request.
 * @param {http.ServerResponse} res - The original node response.
 * @constructor
 */
function Response (ctx, original) {
  this.ctx = ctx
  this.original = original
  this.status = original.statusCode
  this.headers = {}
  this.body = undefined
  original.once('finish', function () { ctx.res.finished = true })
}

/**
 * Utility to retrieve a header from the response headers.
 *
 * @example
 * response.get('Content-Type')
 *
 * @param {string} name - The name of the header to get.
 * @return {string|string[]}
 */
Response.prototype.get = function (name) {
  return this.headers[toField(name)]
}

/**
 * @description
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

},{"cookie":14,"header-field":18,"mini-url":22,"statuses":30}]},{},[32])(32)
});
//# sourceMappingURL=rill.map.js
