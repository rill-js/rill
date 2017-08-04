<h1 align="center">
  <!-- Logo -->
  <a href="https://rill.site" alt="Rill">
    <img src="https://cdn.rawgit.com/rill-js/rill/master/Rill-Logo.svg" width="300" alt="Rill Logo"/>
  </a>

  <br/>

  <!-- Stability -->
  <a href="https://nodejs.org/api/documentation.html#documentation_stability_index">
    <img src="https://img.shields.io/badge/stability-stable-brightgreen.svg?style=flat-square" alt="API stability"/>
  </a>
  <!-- Standard -->
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="Standard"/>
  </a>
  <!-- NPM version -->
  <a href="https://npmjs.org/package/rill">
    <img src="https://img.shields.io/npm/v/rill.svg?style=flat-square" alt="NPM version"/>
  </a>
  <!-- Travis build -->
  <a href="https://travis-ci.org/rill-js/rill">
  <img src="https://img.shields.io/travis/rill-js/rill.svg?style=flat-square" alt="Build status"/>
  </a>
  <!-- Coveralls coverage -->
  <a href="https://coveralls.io/github/rill-js/rill">
    <img src="https://img.shields.io/coveralls/rill-js/rill.svg?style=flat-square" alt="Test Coverage"/>
  </a>
  <!-- File size -->
  <a href="https://github.com/rill-js/rill/blob/master/dist/rill.js">
    <img src="https://badge-size.herokuapp.com/rill-js/rill/master/dist/rill.js?style=flat-square" alt="File size"/>
  </a>
  <!-- Downloads -->
  <a href="https://npmjs.org/package/rill">
    <img src="https://img.shields.io/npm/dm/rill.svg?style=flat-square" alt="Downloads"/>
  </a>
  <!-- Gitter chat -->
  <a href="https://gitter.im/rill-js/rill">
    <img src="https://img.shields.io/gitter/room/rill-js/rill.svg?style=flat-square" alt="Gitter Chat"/>
  </a>
  <!-- Saucelabs -->
  <a href="https://saucelabs.com/u/rill-js">
    <img src="https://saucelabs.com/browser-matrix/rill-js.svg" alt="Sauce Test Status"/>
  </a>
</h1>

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

# Browser support
All modern browsers are supported including IE10+. IE9 is also supported with a [History API polyfill](https://github.com/devote/HTML5-History-API).

Older browsers will also need to polyfill the Promise API, checkout [es6-promise](https://github.com/stefanpenner/es6-promise) for a good polyfill, babel-polyfill also covers this.

# Community

* [API Documentation](https://rill.site/application#docs)
* [Examples](https://github.com/rill-js/todomvc)
* [Wiki](https://github.com/rill-js/rill/wiki)
* [Middleware List](https://github.com/rill-js/rill/wiki/Middleware)
* [Gitter Community](https://gitter.im/rill-js/rill)
* [Reddit Community](https://www.reddit.com/r/Rill)

# Articles

* [Universal web application framework - Interview with Dylan Piercey](https://survivejs.com/blog/rill-interview/)
* [Isomorphic Javascript, let’s make it easier.](https://medium.com/@pierceydylan/isomorphic-javascript-it-just-has-to-work-b9da5b0c8035)
* [How to make universal JavaScript applications — Part 1](https://medium.com/@pierceydylan/how-to-make-universal-javascript-applications-part-1-90e9032bc471)
* [Browsers, Servers, and APIs](https://medium.com/@iamjohnhenry/browsers-servers-and-apis-2f7b10523f39)
* [Why Everyone is Talking About Isomorphic](https://medium.com/capital-one-developers/why-everyone-is-talking-about-isomorphic-universal-javascript-and-why-it-matters-38c07c87905#.mdd84j28m)
* [Isomorphic JavaScript: The Future of Web Apps](https://medium.com/airbnb-engineering/isomorphic-javascript-the-future-of-web-apps-10882b7a2ebc)

# Why Rill?
Rill is the answer to a simple question; Can I run my [Express](https://github.com/expressjs/express) style router in the browser? Turns out you can and it works awesome.

It brings a common interface to many typical app like features in both the browser and [nodejs](https://nodejs.org). Many isomorphic frameworks have crazy abstractions and learning curves but with Rill, if you understand [Express](https://github.com/expressjs/express) or [Koa](https://github.com/koajs/koa), you already know how the routing works! In Rill you get to program much of your application logic using the same api (client or server) including routing, rendering, data fetching and more are easily shared.

Rill also works perfectly as a stand alone [nodejs](https://nodejs.org) server or a stand alone browser framework. This allows for easy progressive enhancement. If all is well the browser can handle much of your application logic and if JavaScript fails for any reason your server knows exactly what to do.

# How does this thing work?
If you look at the source for Rill [here](https://github.com/rill-js/rill/tree/master/src) you will quickly notice there is ZERO browser specific code. This is all thanks to [@rill/http](https://github.com/rill-js/http) which is node's [HTTP.createServer](https://nodejs.org/api/http.html#http_http_createserver_requestlistener) ported to the browser.

In the browser it works by listening for internal link clicks, form submissions and browser history changes. It will then create a [Rill Context](https://rill.site/context#docs) for each of these events and emit it through the router, similar to how receiving a request works in [nodejs](https://nodejs.org).

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

* [isbrowser](https://github.com/DylanPiercey/isbrowser) - A browserify transform to remove server-side code.
* [isomorphic-fetch](https://github.com/matthew-andrews/isomorphic-fetch) - Universal http requests using WHATWG fetch.
* [isomorphic-form-data](https://github.com/form-data/isomorphic-form-data) - Send multipart form data universally (able to send files and works with fetch).
* [scroll-behavior](https://github.com/DylanPiercey/scroll-behaviour) - @rill/http will automatically try to use the "smooth" [scroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior) when scrolling to targets on link clicks. This will polyfill that across modernish browsers.
* [submit-form](https://github.com/DylanPiercey/submit-form) - Manually trigger Rill navigation in the browser.

## Prior Art

* [koa-client](https://github.com/kentjs/koa-client) - Koa clone that runs in the browser, inspired this package.
* [monorouter](https://github.com/matthewwithanm/monorouter) - Another isomorphic router that partially inspired this package.

## Contributions

* Use `npm test` to run tests.

## License

[MIT](https://tldrlegal.com/license/mit-license)
