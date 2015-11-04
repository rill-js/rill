# Rill
Expressive HTTP middleware for node.js and the browser.
Rill brings cascading middleware to the browser and enables truly isomorphic web applications. It makes apps enjoyable to write with a simpler top down mental model of your app and free progressive enhancement.

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

# Example

```javascript
const Rill = require("rill");
const app  = Rill();

app.use(function ({ req, res }, next) {
	const start = new Date;

	// Rill uses promises for control flow.
	// ES2016 async functions work great as well!
	next().then(function () {
		const ms = new Date - start;
		console.log(`${req.method} ${req.url} - ${ms}`);
	});
});

app.use(function ({ res }) {
	res.body = 'Hello world.';
});
```

### Contributions

* Use gulp to run tests.

Please feel free to create a PR!
