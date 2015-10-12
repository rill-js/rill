var assert = require("assert");
var Rill   = require("../src");

describe("Rill", function () {
	it("should load", function () {
		var app = Rill()
			.host("test.com", function hi (req, res) {
				return req.name;
			});

		var server = Rill()
			.get("/test", function hi (req, res) {})

		app.at("/test", server);

		app.handler();
	});
});