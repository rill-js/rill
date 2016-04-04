var assert = require("assert");
var agent  = require("supertest");
var Rill   = require("../src");

describe("Rill", function () {
	it("should accept a request", function (done) {
		var request = agent(Rill()
			.use(respond(200))
			.listen()
		);

		request
			.get("/")
			.expect(200)
			.end(done);
	});

	it("should match a pathname", function (done) {
		var request = agent(Rill()
			.at("/test", respond(200))
			.listen()
		);

		when([
			request
				.get("/")
				.expect(404),
			request
				.get("/test")
				.expect(200)
		], done);
	});

	it("should mount a pathname", function (done) {
		var request = agent(Rill()
			.at("/test/*", Rill()
				.at("/1/*", Rill()
					.at("/2", respond(200))
				)
			)
			.listen()
		);

		when([
			request
				.get("/test")
				.expect(404),
			request
				.get("/test/1")
				.expect(404),
			request
				.get("/test/1/2")
				.expect(200)
		], done);
	});

	it("should attach params", function (done) {
		var request = agent(Rill()
			.at("/test/:name", respond(200, function (ctx) {
				assert.deepEqual(ctx.req.params, { name: "hi" });
			}))
			.listen()
		);

		request
			.get("/test/hi")
			.end(done);
	});

	it("should attach repeating params", function (done) {
		var request = agent(Rill()
			.at("/test/:name*", respond(200, function (ctx) {
				assert.deepEqual(ctx.req.params, { name: ["1", "2", "3"] });
			}))
			.listen()
		);

		request
			.get("/test/1/2/3")
			.end(done);
	});

	it("should match a hostname", function (done) {
		var request = agent(Rill()
			.host("*test.com", respond(200))
			.listen()
		);

		when([
			request
				.get("/")
				.expect(404),
			request
				.get("/")
				.set("host", "fake.com")
				.expect(404),
			request
				.get("/")
				.set("host", "test.com")
				.expect(200),
			request
				.get("/")
				.set("host", "www.test.com")
				.expect(200),
		], done);
	});

	it("should mount a subdomain/hostname", function (done) {
		var request = agent(Rill()
			.host("*.test.com", Rill()
				.host("*.api", Rill()
					.host("test", respond(200))
				)
			)
			.listen()
		);

		when([
			request
				.get("/")
				.expect(404),
			request
				.get("/")
				.set("host", "test.com")
				.expect(404),
			request
				.get("/")
				.set("host", "api.test.com")
				.expect(404),
			request
				.get("/")
				.set("host", "test.api.test.com")
				.expect(200),
		], done);
	});

	it("should attach a subdomain", function (done) {
		var request = agent(Rill()
			.host(":name.test.com", respond(200, function (ctx) {
				assert.equal(ctx.req.subdomains.length, 1);
				assert.equal(ctx.req.subdomains[0], "hi");
				assert.equal(ctx.req.subdomains.name, "hi");
			}))
			.listen()
		);

		when([
			request
				.get("/")
				.set("host", "hi.test.com")
				.expect(200),
		], done);
	});

	it("should attach a repeating subdomain", function (done) {
		var request = agent(Rill()
			.host(":name*.test.com", respond(200, function (ctx) {
				assert.equal(ctx.req.subdomains.length, 3);
				assert.equal(ctx.req.subdomains[2], "1");
				assert.equal(ctx.req.subdomains[1], "2");
				assert.equal(ctx.req.subdomains[0], "3");
				assert.deepEqual(ctx.req.subdomains.name, ["1", "2", "3"]);
			}))
			.listen()
		);

		when([
			request
				.get("/")
				.set("host", "1.2.3.test.com")
				.expect(200),
		], done);
	});

	it("should match a method", function (done) {
		var request = agent(Rill()
			.post(respond(200))
			.listen()
		);

		when([
			request
				.get("/")
				.expect(404),
			request
				.post("/")
				.expect(200)
		], done);
	});

	it("should parse cookies", function (done) {
		var request = agent(Rill()
			.use(respond(200, function (ctx) {
				assert.deepEqual(ctx.req.cookies, { a: "1", b: "2" });
			}))
			.listen()
		);

		request
			.get("/")
			.set("cookie", "a=1;b=2")
			.expect(200)
			.end(done);
	});

	it("should serialize cookies", function (done) {
		var request = agent(Rill()
			.use(respond(200, function (ctx) {
				ctx.res.cookie("a", 1, { httpOnly: true });
			}))
			.listen()
		);

		request
			.get("/")
			.expect(200)
			.expect("set-cookie", "a=1; httponly")
			.end(done);
	});

	it("should parse a nested querystring", function (done) {
		var query = {
			a: {
				b: {
					c: "1"
				}
			},
			d: "2"
		};

		var request = agent(Rill()
			.use(respond(200, function (ctx) {
				assert.deepEqual(ctx.req.query, query)
			}))
			.listen()
		);

		request
			.get("/")
			.query(query)
			.expect(200)
			.end(done);
	});

	it("should be able to throw an http error", function (done) {
		var request = agent(Rill()
			.use(respond(200, function (ctx) { ctx.throw(400); }))
			.listen()
		);

		request
			.get("/")
			.expect(400)
			.end(done);
	});

});

function respond (status, test) {
	return function (ctx) {
		ctx.res.status = status;
		if (typeof test === "function") test(ctx);
	};
}

function when (promises, done) {
	Promise
		.all(promises)
		.then(done.bind(null, null))
		.catch(done);
}
