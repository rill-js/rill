# Request

  A Rill `Request` object is an abstraction on top of node's vanilla request object,
  or @rill/http in the browser.
  It provides additional functionality that is useful for every day isomorphic development.

## API

### request.original
 
 Original nodejs request object.

### request.ctx

 The current [context](https://github.com/rill-js/rill/blob/master/docs/api/context.md).

### request.headers

 Request header object.

### request.method

 Request method.

### request.cookies

 Parsed cookies for the request.

### request.href

  Get full request URL, include `protocol`, `host` and `url`.

```js
ctx.req.href
// => http://example.com/foo/bar?q=1#section
```

### request.protocol

 Protocol for the request.

```js
ctx.req.protocol;
// => http
```

### request.hostname
  
 Host name for the request.

```js
ctx.req.hostname;
// => example.com
```

### request.port
  
 Port number for the request.

```js
ctx.req.port;
// => 80
```

### request.host
  
 Host for the request, including port.

```js
ctx.req.host;
// => example.com:80
```

### request.pathname

 The path section of the URL.

```js
ctx.req.pathname;
// => /foo/bar
```

### request.search

  Get raw query string void of `?`.

```js
ctx.req.search;
// => q=1
```

### request.path

 The concatenated pathname and querystring of the URL.

```js
ctx.req.path;
// => /foo/bar?q=1
```

### request.query

 A parsed querstring object.

 ```js
ctx.req.query;
// => { q: "1" }
```

### request.hash

 The hash fragment of the URL (only in browser).

```js
ctx.req.hash
// => section
```

### request.params

 An object containing the matches during a path middleware.

### request.secure

  Shorthand for `ctx.req.protocol == "https"` to check if a request was
  issued via TLS.

### request.ip

  Request remote address. Supports `X-Forwarded-For`.

### request.subdomains

  Return subdomains as an array.

  Subdomains are the dot-separated parts of the host before the main domain of
  the app. By default, the domain of the app is assumed to be the last two
  parts of the host. This can be changed by setting `app.subdomainOffset`.

  For example, if the domain is "tobi.ferrets.example.com":
  If `app.subdomainOffset` is not set, this.subdomains is `["ferrets", "tobi"]`.
  If `app.subdomainOffset` is 3, this.subdomains is `["tobi"]`.

### request.get(field)

  Return request header.