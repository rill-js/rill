# Response

  A Rill `Response` object is an abstraction on top of node's vanilla response object, or [@rill/http](https://github.com/rill-js/http) in the browser.
  It provides additional functionality that is useful for every day development.

## API

### res.original

 Original nodejs/[@rill/http](https://github.com/rill-js/http) response object.

### res.ctx

 The current [context](./context.md#context).

### res.headers

  Original response header object.

```js
ctx.res.headers // => { ... }
```

### res.status

  Get response status. By default, `ctx.res.status` is `404` unlike node's `res.statusCode` which defaults to `200`.

```js
ctx.res.status // => 200
```

### res.status=

  Set response status via numeric code:

  - 100 'continue'
  - 101 'switching protocols'
  - 102 'processing'
  - 200 'ok'
  - 201 'created'
  - 202 'accepted'
  - 203 'non-authoritative information'
  - 204 'no content'
  - 205 'reset content'
  - 206 'partial content'
  - 207 'multi-status'
  - 300 'multiple choices'
  - 301 'moved permanently'
  - 302 'moved temporarily'
  - 303 'see other'
  - 304 'not modified'
  - 305 'use proxy'
  - 307 'temporary redirect'
  - 400 'bad request'
  - 401 'unauthorized'
  - 402 'payment required'
  - 403 'forbidden'
  - 404 'not found'
  - 405 'method not allowed'
  - 406 'not acceptable'
  - 407 'proxy authentication required'
  - 408 'request time-out'
  - 409 'conflict'
  - 410 'gone'
  - 411 'length required'
  - 412 'precondition failed'
  - 413 'request entity too large'
  - 414 'request-uri too large'
  - 415 'unsupported media type'
  - 416 'requested range not satisfiable'
  - 417 'expectation failed'
  - 418 'i'm a teapot'
  - 422 'unprocessable entity'
  - 423 'locked'
  - 424 'failed dependency'
  - 425 'unordered collection'
  - 426 'upgrade required'
  - 428 'precondition required'
  - 429 'too many requests'
  - 431 'request header fields too large'
  - 500 'internal server error'
  - 501 'not implemented'
  - 502 'bad gateway'
  - 503 'service unavailable'
  - 504 'gateway time-out'
  - 505 'http version not supported'
  - 506 'variant also negotiates'
  - 507 'insufficient storage'
  - 509 'bandwidth limit exceeded'
  - 510 'not extended'
  - 511 'network authentication required'

### res.message

  Get response status message. By default, `res.message` is
  associated with `res.status`.

```js
ctx.res.message // => 'success'
```

### res.message=

  Set response status message to the given value.

### res.respond=

  Set `res.respond = false` to skip the automatic response built into Rill.

### res.end=

  Set `res.end = false` to only send response headers, but not end the request.

### res.body

  Get response body.

```js
ctx.res.body // => '<div>hello world</div>'
```

### res.body=

  Set response body to one of the following:

  - `String` written (sets text/html or text/plain automatically)
  - `Buffer` written
  - `Stream` piped
  - `Object` json-stringified
  - `null` no content response

If `res.status` has not been set, Rill will automatically set the status to `200` or `204`.

#### String

  The Content-Type is defaulted to text/html or text/plain, both with
  a default charset of utf-8. The Content-Length field is also set.

#### Buffer

  The Content-Type is defaulted to application/octet-stream, and Content-Length
  is also set.

#### Stream

  The Content-Type will be inferred from the file name and is defaulted to application/octet-stream.

#### Object

  The Content-Type is defaulted to application/json.

### res.get(field)

  Get a response header field value with case-insensitive `field`.

```js
const etag = res.get('ETag')
```

### res.set(field, value)

  Set response header `field` to `value`:

```js
res.set('Cache-Control', 'no-cache')
```

### res.append(field, value)
  Append additional header `field` with value `val`.

```js
res.append('Link', '<http://127.0.0.1/>')
```

### res.remove(field)

  Remove header `field`.

### res.cookie(key, value, [options])

  Appends a new cookie header.

```js
res.cookie('a', 1, { httpOnly: true })
```

### res.clearCookie(key)

  Expires an existing cookie.

```js
res.clearCookie('a')
```

### res.redirect(url, [alt])

  Perform a [302] redirect to `url`.

  The string 'back' is special-cased
  to provide Referrer support, when Referrer
  is not present `alt` or `ctx.req.href` is used.

```js
res.redirect('back')
res.redirect('back', '/index.html')
res.redirect('/login')
res.redirect('http://google.com')
```

  To alter the default status of `302`, simply assign the status
  before or after this call. To alter the body, assign it after this call:

```js
res.status = 301
res.redirect('/cart')
res.body = 'Redirecting to shopping cart'
```

### res.refresh(delay, [url], [alt])

  Sets the 'Refresh' header causing the browser to redirect the user after `delay` seconds. Using 'back' as a url will work the same as `res.redirect('back')`.

```js
// Refresh the browser after 1 second.
res.refresh(1)

// Refresh the browser after 2 seconds and go to the login page.
res.refresh(2, '/login')
```
