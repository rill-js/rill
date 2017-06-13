/**
 * Creates a middleware that responds with a status code and runs a function.
 */
exports.respond = function respond (status, test) {
  return function (ctx) {
    ctx.res.status = status
    if (typeof test === 'function') test(ctx)
  }
}
