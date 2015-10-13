var URL       = require("url");
var Cookies   = require("@rill/cookies");
var HttpError = require("@rill/error");
var Request   = require("./request");
var Response  = require("./response");

module.exports = Context;

function Context (app, req, res) {
	this.app      = app;
	this.req      = req;
	this.res      = res;
	this.request  = new Request(this);
	this.response = new Response(this);

	this.cookies           =
	this.request.cookies   =
	this.response.cookies  = new Cookies(req.headers.cookie);

	this.request.redirect  =
	this.response.redirect = this.redirect.bind(this);
}

var context = Context.prototype;

context.throw = function throwHttp (code, message, meta) {
	error = new HttpError(code, message, meta);
	this.response.status = error.code;
	throw error;
};

context.assert = function assertHttp (val, code, message, meta) {
	if (!val) this.throw(code, message, meta);
};

context.redirect = function redirect (url, alt) {
	alt = URL.resolve(this.request.href, alt || "/");
	url = URL.resolve(this.request.href, url);

	this.response.headers["location"] = (url === "back")
		? this.response.headers["referrer"] || alt
		: url;
}

context.refresh = function refresh (url, delay) {
	delay = delay || 0;
	url   = URL.resolve(this.request.href, url || this.request.href);

	this.response.headers["refresh"] = delay + "; url=" + url;
};