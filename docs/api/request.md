# Request

  A Rill `Request` object is an abstraction on top of node's vanilla request object, or [@rill/http](https://github.com/rill-js/http) in the browser.
  It provides additional functionality that is useful for every day isomorphic development.

## API

### req.original

 Original nodejs request object.

### req.ctx

 The current [context](https://github.com/rill-js/rill/blob/master/docs/api/context.md).

### req.headers

 Request header object.

### req.cookies

 Parsed cookies for the request.

### req.method

 Request method.

 ```js
ctx.req.method
// => GET
```

### req.href

  Get full request URL, include `protocol`, `host` and `url`.

```js
ctx.req.href
// => http://example.com/foo/bar?q=1#section
```

### req.origin

  Get the origin of the request (protocol, hostmame and port).

```js
ctx.req.origin
// => http://example.com
```

### req.protocol

 Protocol for the request.

```js
ctx.req.protocol;
// => http
```

### req.hostname

 Host name for the request.

```js
ctx.req.hostname;
// => example.com
```

### req.port

 Port number for the request.

```js
ctx.req.port;
// => 80
```

### req.host

 Host for the request, including port.

```js
ctx.req.host;
// => example.com:80
```

### req.pathname

 The path section of the URL.

```js
ctx.req.pathname;
// => /foo/bar
```

### req.path

 The concatenated pathname and querystring of the URL.

```js
ctx.req.path;
// => /foo/bar?q=1
```

### req.search

  Get raw query string including `?`.

```js
ctx.req.search;
// => "?q=1"
```

### req.query

 A parsed querstring object.

 ```js
ctx.req.query;
// => { q: "1" }
```

### req.hash

 The hash fragment of the URL including the pound-sign (only in browser).

```js
ctx.req.hash
// => "#section"
```

### req.params

 An object containing the matches during a path middleware.

### req.secure

  Shorthand for `ctx.req.protocol == "https"` to check if a request was
  issued via TLS.

### req.ip

  Request remote address. Supports `X-Forwarded-For`.

### req.subdomains

  Return subdomains as an array.

  Subdomains are the dot-separated parts of the host before the main domain of
  the app. By default, the domain of the app is assumed to be the last two
  parts of the host. This can be changed by setting `app.subdomainOffset`.

  For example, if the domain is "tobi.ferrets.example.com":
  If `app.subdomainOffset` is not set, this.subdomains is `["ferrets", "tobi"]`.
  If `app.subdomainOffset` is 3, this.subdomains is `["tobi"]`.

### req.get(field)

  Return request header.
