[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Join the chat at https://gitter.im/rill-js/rill](https://badges.gitter.im/rill-js/rill.svg)](https://gitter.im/rill-js/rill?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
![npm](https://img.shields.io/npm/dm/rill.svg)

![Rill](https://raw.githubusercontent.com/rill-js/rill/master/Rill-Logo.jpg)

Expressive HTTP middleware for nodejs and the browser.
Rill brings cascading middleware to the browser and enables fully universal web applications.
It makes apps enjoyable to write with a simpler top down mental model of your app and free progressive enhancement.

Rill provides the minimum for abstractions over node and the browser enabling things like routing (with redirecting, refreshes and more), cookies, and middleware with the same api.

# Installation


#### Npm
```console
npm install rill
```

#### Bower
```console
bower install rill
```

#### [Download](https://raw.githubusercontent.com/rill-js/rill/master/dist/rill.js)
```html
<script type="text/javascript" src="rill.js"></script>
<script>
    define(['rill'], function (rill) {...}) // AMD
    window.rill // Global rill if no module system in place.
</script>
```

# Community

* [API](https://github.com/rill-js/rill/blob/master/docs/api) documentation.
* [Examples](https://github.com/rill-js/todomvc)
* [Middleware](https://github.com/rill-js/rill/wiki) list
* [Wiki](https://github.com/rill-js/rill/wiki)
* [Reddit Community](https://www.reddit.com/r/Rill)

# Articles

* [Isomorphic Javascript, let’s make it easier.](https://medium.com/@pierceydylan/isomorphic-javascript-it-just-has-to-work-b9da5b0c8035)

# Example

### Create an app

```javascript
/**
 * The following code can run 100% in the browser or in nodejs.
 * Examples use es2015/2016 with Babel but this is optional.
 */

import Rill from 'rill'
const app = Rill()
```

### Setup middleware

```javascript
// Logger
app.use(async ({ req }, next)=> {
	const start = new Date

	// Rill uses promises for control flow.
	// ES2016 async functions work great as well!
	await next()

	const ms = new Date - start
	console.log(`${req.method} ${req.url} - ${ms}`)
})

// Universal react rendering middleware.
app.use(require('@rill/react')())
```

### Setup routes

```javascript
// Respond to a GET request.
app.get('/todos', ({ locals, res })=> {
	// Directly set React virtual dom to the body thanks to @rill/react.
	// (Checkout @rill/html for universal html diffing).
	res.body = (
		<html>
			<head>
				<title>My App</title>
				<meta name="description" content="Rill Application">
			</head>
			<body>
				{{locals.todos.map(renderTodo)}}
				<script src="/app.js"/>
			</body>
		</html>
	)
})
```

### Start app

```javascript
// Start a regular http server.
// In the browser any form submissions or link clicks will intercepted by @rill/http.
app.listen({ port: 80 })
```

### Contributions

* Use `npm test` to run tests.

Please feel free to create a PR!
