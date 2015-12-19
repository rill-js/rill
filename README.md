![Rill](https://raw.githubusercontent.com/rill-js/rill/master/Rill-Logo.jpg)

Expressive HTTP middleware for node.js and the browser.
Rill brings cascading middleware to the browser and enables truly isomorphic web applications. It makes apps enjoyable to write with a simpler top down mental model of your app and free progressive enhancement.

Rill provides the minimum for abstractions over node and the browser enabling things like routing (with redirecting, refreshes and more), cookies, and middleware with the same api.

# Installation

[![Join the chat at https://gitter.im/rill-js/rill](https://badges.gitter.im/rill-js/rill.svg)](https://gitter.im/rill-js/rill?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

#### Npm
```console
npm install rill
```

#### Bower
```console
bower install rill
```

# Community

* [API](https://github.com/rill-js/rill/blob/master/docs/api/index.md) documentation.
* [Examples](https://github.com/rill-js/examples)
* [Middleware](https://github.com/rill-js/rill/wiki) list
* [Wiki](https://github.com/rill-js/rill/wiki)
* [Reddit Community](https://www.reddit.com/r/Rill)

# Example

```javascript
/**
 * The following code can run 100% in the browser or in node js.
 * Examples use es6/7 with Babel but this is optional.
 */

const Rill = require("rill");
const app  = Rill();

// Logger

app.use(async ({ req }, next)=> {
	const start = new Date;

	// Rill uses promises for control flow.
	// ES2016 async functions work great as well!
	await next();

	const ms = new Date - start;
	console.log(`${req.method} ${req.url} - ${ms}`);
});

// Response

app.use(({ res })=> {
	// Here we render a string,
	// check out middleware such as @rill/react
	// for isomorphic dom rendering.
	res.body = "Hello World";
});

// Start a regular http server.
app.listen({ port: 80, ip: "0.0.0.0" });

// Start an https server.
app.listen({ port: 8000, ip: "0.0.0.0", tls: {
	key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
	cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
}});

// Close both servers.
app.close();

```

### Contributions

* Use gulp to run tests.

Please feel free to create a PR!
