/**
 * Creates a middleware that responds with a status code and runs a function.
 */
export function respond(status: number, test?: (...arg: any[]) => any) {
  return ctx => {
    ctx.res.status = status;
    if (typeof test === "function") {
      test(ctx);
    }
  };
}
