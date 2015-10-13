module.exports = Response;

function Response (ctx) {
	var res  = ctx.res;
	var self = this;

	this.headers = res.headers = { "x-powered-by": "Rill" };
	this.status  = 404;
	this.body    = undefined;

	res.once("finish", function () { self.finished = true; });
}