module.exports = Response;

function Response (ctx) {
	var res  = ctx.res;
	var self = this;

	this.status  = res.statusCode || res.status || 404;
	this.headers = res.headers = { "x-powered-by": "Rill" };
	this.body    = undefined;

	res.once("finish", function () { self.finished = true; });
}