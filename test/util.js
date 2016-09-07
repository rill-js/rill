/**
* Converts an array of promises to a node js style callback.
*/
exports.when = function when (promises, done) {
  Promise
    .all(promises)
    .then(done.bind(null, null))
    .catch(done)
}

/**
 * Creates a middleware that responds with a status code and runs a function.
 */
exports.respond = function respond (status, test) {
  return function (ctx) {
    ctx.res.status = status
    if (typeof test === 'function') test(ctx)
  }
}
