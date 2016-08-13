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
 * Examples use es2015/2016 with Babel and JSX but this is optional.
 */

import Rill from 'rill'
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

### Contributions

* Use `npm test` to run tests.

Please feel free to create a PR!
