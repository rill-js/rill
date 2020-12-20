# Request

  A Rill `Request` object is an abstraction on top of node's vanilla request object, or [@rill/http](https://github.com/rill-js/http) in the browser.
  It provides additional functionality that is useful for every day development.

## API

### req.original

  Original nodejs/[@rill/http](https://github.com/rill-js/http) request object.

### req.ctx

  The current [context](https://github.com/rill-js/rill/blob/master/docs/api/context.md#context).

### req.headers

  Original request header object.

```js
ctx.req.headers // => { ... }
```

### req.cookies

  Parsed cookies for the request.

```js
ctx.req.cookies // => { ... }
```

### req.method

  HTTP method for the request.

 ```js
ctx.req.method // => GET
```

### req.href

  Full request URL. Includes `protocol`, `host` and `url`.

```js
ctx.req.href // => http://www.example.com/foo/bar?q=1#section
```

### req.origin

  Origin of the request (protocol, hostname and port).

```js
ctx.req.origin // => http://www.example.com
```

### req.protocol

  Protocol for the request.

```js
ctx.req.protocol // => http
```

### req.hostname

  Host name for the request.
  Use `ctx.req.matchHost` for the hostname being matched in a mounted app.

```js
ctx.req.hostname // => www.example.com
ctx.req.matchHost // => www.example.com
```

### req.port

  Port number for the request.

```js
ctx.req.port // => 80
```

### req.host

  Host for the request, including port.

```js
ctx.req.host // => www.example.com:80
```

### req.pathname

  Path section of the URL.
  Use `ctx.req.matchPath` for the pathname being matched in a mounted app.

```js
ctx.req.pathname // => /foo/bar
ctx.req.matchPath // => /foo/bar
```

### req.path

  Concatenated pathname and querystring of the URL.

```js
ctx.req.path // => /foo/bar?q=1
```

### req.search

  Raw query as a string including `?`.

```js
ctx.req.search // => '?q=1'
```

### req.query

  Parsed querystring object.

 ```js
ctx.req.query // => { q: '1' }
```

### req.hash

  Hash fragment of the URL including the pound-sign (only in browser).

```js
ctx.req.hash // => '#section'
```

### req.params

  Object containing the matches during a path middleware (ie: /users/:id).

```js
ctx.req.params // => {}
```

### req.secure

  Shorthand for `ctx.req.protocol === 'https'` to check if a request was
  issued via TLS.

```js
ctx.req.secure // => false
```

### req.ip

  Remote ip address for the request. Supports `X-Forwarded-For`.

```js
ctx.req.ip // => '127.0.0.1'
```

### req.subdomains

  Subdomains as an array.

  Subdomains are the dot-separated parts of the host before the main domain of
  the app. The domain of the app is assumed to be the last two parts of the host.

```js
ctx.req.subdomains // => ['www']
```

### req.get(field)

  Return specific request header (case insensitive).

```js
ctx.req.get('Cookie') // => '...'
```
