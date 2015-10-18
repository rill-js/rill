module.exports = Response;

/**
 * Wrapper around nodejs `ServerResponse`.
 *
 * @constructor
 * @param {Context} ctx - The context for the response.
 */
function Response (ctx) {
	var self = this;
	var res  = ctx.res;

	this.headers = res.headers = { "x-powered-by": "Rill" };
	this.status  = 404;
	this.body    = undefined;

	res.once("finish", function () { self.finished = true; });
}