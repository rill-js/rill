[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Join the chat at https://gitter.im/rill-js/rill](https://badges.gitter.im/rill-js/rill.svg)](https://gitter.im/rill-js/rill?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
![npm](https://img.shields.io/npm/dm/rill.svg)

![Rill](https://raw.githubusercontent.com/rill-js/rill/master/Rill-Logo.jpg)

Expressive HTTP middleware for [nodejs](https://nodejs.org) and the browser.
Rill brings cascading middleware to the browser and enables fully universal web applications.
It makes apps enjoyable to write with a simpler top down mental model of your app and free progressive enhancement.

Rill provides the minimum for abstractions over [nodejs](https://nodejs.org) and the browser enabling things like routing (with redirecting, refreshes and more), cookies, and middleware with the same api.

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

# Why Rill?
Rill is the answer to a simple question; Can I run my [Express](https://github.com/expressjs/express) style router in the browser? Turns out you can and it works awesome.

It brings a common interface to many typical app like features in both the browser and [nodejs](https://nodejs.org). Many isomorphic frameworks have crazy abstractions and learning curves but with Rill, if you understand [Express](https://github.com/expressjs/express) or [Koa](https://github.com/koajs/koa), you already know how the routing works! In Rill you get to program much of your application logic using the same api (client or server) including routing, rendering, data fetching and more are easily shared.

Rill also works perfectly as a stand alone [nodejs](https://nodejs.org) server or a stand alone browser framework. This allows for easy progressive enhancement. If all is well the browser can handle much of your application logic and if JavaScript fails for any reason your server knows exactly what to do.

# How does this thing work?
If you look at the source for Rill [here](https://github.com/rill-js/rill/tree/master/src) you will quickly notice there is ZERO browser specific code. This is all thanks to [@rill/http](https://github.com/rill-js/http) which is node's [HTTP.createServer](https://nodejs.org/api/http.html#http_http_createserver_requestlistener) ported to the browser.

In the browser it works by listening for internal link clicks, form submissions and browser history changes. It will then create a [Rill Context](https://github.com/rill-js/rill/blob/master/docs/api/context.md) for each of these events and emit it through the router, similar to how receiving a request works in [nodejs](https://nodejs.org).

It supports everything you'd expect from a client side [nodejs](https://nodejs.org) server. This includes redirects, refreshes, cookies, scrolling and url updates using the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History).

# Example

### Create an app

```javascript
/**
 * The following code can run 100% in the browser or in nodejs.
 * Examples use es2015/2016 with Babel and JSX but this is optional.
 */

import rill from 'rill'
const app = rill()
```

### Setup middleware

```javascript
// Universal form data parsing middleware.
import bodyParser from '@rill/body'
app.use(bodyParser())

// Universal react rendering middleware.
import reactRenderer from '@rill/react'
app.use(reactRenderer())

// Example Logger
app.use(async ({ req }, next)=> {
	const start = new Date

	// Rill uses promises for control flow.
	// ES2016 async functions work great as well!
	await next()

	const ms = new Date - start
	console.log(`${req.method} ${req.url} - ${ms}`)
})
```

### Setup a page

```javascript
// Respond to a GET request.
app.get('/todos', async ({ res })=> {
	// Fetch a todolist from some service.
	const todolist = await MyTodoListService.getAllTodos()

	// Directly set React virtual dom to the body thanks to @rill/react.
	// (Checkout @rill/html for universal html diffing).
	res.body = (
		<html>
			<head>
				<title>My App</title>
				<meta name="description" content="Rill Application">
			</head>
			<body>
				<form action="/add-todo" method="POST">
					<h1>Just a plain old form</h1>
					<input type="text" name="todo"/>
					<button type="submit">Add Todo</button>
				</form>

				{todolist.length
					? todolist.map(renderTodo)
					: 'No todos to display.'
				}
				<script src="/app.js"/>
			</body>
		</html>
	)
})
```

### Handle a form submission
```javascript
// Respond to a POST request.
app.post('/add-todo', async ({ req, res })=> {
	// We handle form submissions with Rill the same way one would with any other node framework.
	// Here we are simply adding the todo via some service.
	await MyTodoListService.addTodo({ text: req.body.todo })
	// And then we redirect back (same as res.redirect('/todos'))
	res.redirect('back')
})
```

### Start app

```javascript
// Start a regular http server.
// In the browser any form submissions or link clicks will intercepted by @rill/http.
app.listen({ port: 80 })
```

## See Also

* [koa-client](https://github.com/kentjs/koa-client) - Koa clone that runs in the browser, inspired this package.
* [monorouter](https://github.com/matthewwithanm/monorouter) - Another isomorphic router that partially inspired this package.
* [submit-form](https://github.com/DylanPiercey/submit-form) - Manually trigger Rill navigation in the browser.
* [isbrowser](https://github.com/DylanPiercey/isbrowser) - A browserify transform to remove server-side code.

## Contributions

* Use `npm test` to run tests.

## License

[MIT](https://tldrlegal.com/license/mit-license)
