# Installation

  Rill is supported in all recent versions of [nodejs](https://nodejs.org) and modern browsers including ie10.

  You can quickly install a supported version of node/iojs with your favorite version manager:

```bash
$ nvm install stable
$ npm i rill
$ node my-rill-app.js
```

# Application

  A Rill application is an object containing an array of middleware functions
  which are composed and executed in a stack-like manner upon request.
  Rill is similar to other nodejs frameworks such as Express, Hapi and Koa with
  one important distinction; It can run in the browser.

  Rill comes with many essential utilities for building modern web applications.
  This includes: Routing, redirection, cookies, and more. Typically an isomorphic
  rendering solution will also be used such as [@rill/react](https://github.com/rill-js/react)
  which allows full page react applications to work seamlessly on the server and
  in the browser.

```js
// Creating an application (new optional).
const Rill = require('rill');
const app = new Rill();
```

## app.listen({ port, host, backlog, tls }, callback)

  A Rill application is not a 1-to-1 representation of a HTTP server.
  One or more Rill applications may be mounted together to form larger
  applications and you can even listen to multiple ports with a single HTTP server.

  `listen` will start an HTTPS server if the `tls` option is provided.
  The tls options are the same as nodes [TLS](https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener) module.

  The `ip`, `port` and `backlog` options are optional and forwarded to `Server#listen()`. These are simply ignored in the browser.

  The following is a useless Rill application bound to port `3000`:

```js
app.listen({ port: 3000 });
```

  Or we can start a HTTPS server with the same API.

```js
var options = {
  key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
  cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
};

app.listen({ port: 8000, tls: options });
```

## app.handler()

  Return a callback function suitable for the `http.createServer()`
  method to handle a request.
  You may also use this callback function to mount your rill app in a
  Connect/Express app.

  This means you can spin up the same application as both HTTP and HTTPS
  or on multiple addresses:

```js
// For isomorphic use you can use @rill/http(s) instead of nodes http module.
http.createServer(app.handler()).listen(3000);
http.createServer(app.handler()).listen(3001);
```

## app.stack()

  Returns the current middleware stack for the application as an array.

## app.setup(function...)

  Simple syntactic sugar for middleware that wish do more than just add to the stack.
  This is useful for modifying/extending Rill and for other complex plugins.

```js
app.setup((myapp)=> {
  myapp === app; // true
  myapp.customMethod = ...;
  myapp.use(customMiddleware);
});
```

## app.use(function|application...)

  Add the given middleware function to this application. See [Middleware](https://github.com/rill-js/rill/wiki#middleware) for
  more information. In Rill you can also mount other applications.

```js
// Simple logging middleware.
app.use(async ({ req, res }, next)=> {
  const start = new Date;

  // Rill uses promises for control flow.
  // ES2016 async functions work great as well!
  await next();

  const ms = new Date - start;
  console.log(`${req.method} ${req.url} - ${ms}`);
});
```

## app.at(function|application...)

  Add a middleware that will only be ran if a path string is matched.
  Rill uses the same path matching library as Express and some other node frameworks. You can test out your own path regular expressions [here](http://forbeslindesay.github.io/express-route-tester/).

```js
// Match request for the route path.
app.at("/", ...);

// Params will also be provided under req.params
// For example using /api/user
app.at("/api/:resource", ({ req })=>
  req.params.resource === "user";
);
```

## app|METHOD|([path], function|application...)`

  Add a middleware that will only be ran if an optional path string is matched
  and the request has the used method.

```js
// Match all get requests.
app.get(...);

// Match request for the route path and uses the GET method.
app.get("/", ...);
```

## app.host(hostname, function|application...)

  Adds middleware that will only be ran if a hostname is matched. The hostname may use the same regular expression strings used in the other routing methods. You can test out your own hostname regular expressions [here](http://forbeslindesay.github.io/express-route-tester/).

```js
// Match request for a specific host.
app.host("test.com", ...);

// Subdomain matches will also be provided under req.subdomains
// For example using api.user.test.com
app.host("api.:resource.test.com", { req })=>
  res.subdomains.resource === "user";
  res.subdomains == ["api", "user"];
);
```

## Error Handling

  Rill defers error handling to the promises used within Rill middleware.
  In rill the `next` middleware will always return a promise.

```js
app.use(function (ctx, next) {
  // Catch errors later on in the stack.
  return next().catch(function (err) {
    log.error('server error', err);
  });
});
```
