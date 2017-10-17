import chain from "@rill/chain";
import HttpError from "@rill/error";
import {
  createServer,
  IncomingMessage,
  METHODS,
  Server,
  ServerResponse
} from "@rill/http";
import { createServer as createSecureServer } from "@rill/https";
import * as extend from "just-extend";
import { parse, tokensToRegExp } from "path-to-regexp";
import * as T from "./_types";
import attachDocument from "./attach";
import { Context } from "./context";
import { respond } from "./respond";

export { T as Types };
export default class Rill {
  /** The current middleware stack. */
  public stack: T.MiddlewareArg[] = [];
  /** Attaches middleware that only run on OPTION requests. */
  public options: T.MethodShortcut;
  /** Attaches middleware that only run on HEAD requests. */
  public head: T.MethodShortcut;
  /** Attaches middleware that only run on GET requests. */
  public get: T.MethodShortcut;
  /** Attaches middleware that only run on PUT requests. */
  public put: T.MethodShortcut;
  /** Attaches middleware that only run on POST requests. */
  public post: T.MethodShortcut;
  /** Attaches middleware that only run on PATCH requests. */
  public patch: T.MethodShortcut;
  /** Attaches middleware that only run on DELETE requests. */
  public delete: T.MethodShortcut;

  /**
   * @description
   * Creates a universal app that will run middleware for a incoming request.
   *
   * @example
   * const app = Rill()
   */
  constructor() {
    /* istanbul ignore next */
    if (!(this instanceof Rill)) {
      return new Rill();
    }
  }

  /**
   * @description
   * Takes the current middleware stack, chains it together and
   * returns a valid handler for a node js style server request.
   *
   * @example
   * const app = Rill()
   * app.use(...)
   * require('http').createServer(app.handler()).listen()
   */
  public handler(): T.HttpRequestHandler {
    const fn = chain(this.stack);

    /**
     * Handles a node js server request and pushes it through a rill server.
     *
     * @param {http.IncomingMessage} req - The http request.
     * @param {http.ServerResponse} res - The http response.
     * @return {void}
     */
    return (req: IncomingMessage, res: ServerResponse): void => {
      res.statusCode = 404;
      const ctx = new Context(req, res);

      fn(ctx)
        .catch(err => {
          if (Number(ctx.res.status) === 404) {
            ctx.res.status = 500;
          }
          /* istanbul ignore next */
          if (!(err instanceof HttpError)) {
            // tslint:disable-next-line
            console && console.error && console.error(err);
          }
        })
        .then(() => respond(ctx));
    };
  }

  /**
   * @description
   * Creates a node server from the Rill server.
   *
   * @example
   * app.createServer().listen(3000)
   *
   * @param tls Optional HTTPS/TLS options (key, cert, etc).
   */
  public createServer(tls?: any): Server {
    const handler = this.handler();
    const server = tls
      ? createSecureServer(tls, handler)
      : createServer(handler);
    // Setup link hijacking in the browser.
    /* istanbul ignore next */
    attachDocument(server);
    return server;
  }

  /**
   * @description
   * Creates a node server from the current Rill server and starts listening for http requests.
   *
   * @example
   * rill().use(...).listen({ port: 3000 })
   *
   * @param options An object with configuration for binding the server to a port and ip.
   * @param onListening A function that is called once the server has started.
   */
  public listen(
    options?: T.ListenOptions | T.HttpListenHandler,
    onListening?: T.HttpListenHandler
  ): Server {
    // Make options optional.
    if (typeof options === "function") {
      onListening = options;
      options = undefined;
    }

    options = (options || {}) as T.ListenOptions;
    options.port = options.port != null ? options.port : 0;

    return this.createServer(options.tls).listen(
      options.port,
      options.ip,
      options.backlog,
      onListening
    );
  }

  /**
   * @description
   * Simple syntactic sugar for functions that
   * wish to modify the current rill instance.
   *
   * @example
   * app.setup(self => {
   *  // Modify the current app.
   *  self.use(...)
   *  self.modified = true
   * })
   *
   * @param setups A list of functions to run during initialization.
   */
  public setup(...setups: T.SetupArg[]): Rill {
    for (const setup of setups) {
      if (!setup) {
        continue;
      } else if (typeof setup === "function") {
        setup(this);
      } else {
        throw new TypeError("Rill#setup: Setup must be a function or falsey.");
      }
    }

    return this;
  }

  /**
   * @description
   * Append new middleware to the current rill application stack.
   *
   * @example
   * rill.use(fn1, fn2)
   *
   * @param middlewares A list of middleware to add to the app.
   */
  public use(...middlewares: T.MiddlewareArg[]): Rill {
    this.stack = [...this.stack, ...middlewares];
    return this;
  }

  /**
   * @description
   * Use middleware at a specific pathname.
   *
   * @example
   * rill.at("/test", (ctx, next) => ...)
   *
   * @param pathname The pathname to match before running the middlewares.
   * @param middlewares A list of middlewares to add to the app.
   */
  public at(pathname: string, ...middlewares: T.MiddlewareArg[]): Rill {
    if (typeof pathname !== "string") {
      throw new TypeError("Rill#at: Path name must be a string.");
    }

    const keys = [];
    const reg = toReg(pathname, keys, { end: false, delimiter: "/" });
    const fn = chain(middlewares);

    return this.use((ctx, next) => {
      const matchPath = ctx.req.matchPath;
      const matches = matchPath.match(reg);
      // Check if we matched the whole path.
      if (!matches || matches[0] !== matchPath) {
        return next();
      }

      // Check if params match.
      for (let i = keys.length; i--; ) {
        const key = keys[i];
        let match: string | string[] = matches[i + 1];
        if (key.repeat) {
          match = match == null ? [] : match.split("/");
        }

        ctx.req.params[key.name] = match;
      }

      // Update path for nested routes.
      const matched = matches[matches.length - 1] || "";
      if (ctx.req.matchPath !== matched) {
        ctx.req.matchPath = "/" + matched;
      }

      // Run middleware.
      return fn(ctx, () => {
        // Reset nested pathname before calling later middleware.
        ctx.req.matchPath = matchPath;
        // Run sibling middleware.
        return next();
      });
    });
  }

  /**
   * @description
   * Use middleware at a specific hostname.
   *
   * @example
   * app.host("test.com", (ctx, next) => ...)
   * 
   * @param hostname The hostname to match before running the middlewares.
   * @param middlewares A list of middlewares to add to the app.
   */
  public host(hostname: string, ...middlewares: T.MiddlewareArg[]): Rill {
    if (typeof hostname !== "string") {
      throw new TypeError("Rill#host: Host name must be a string.");
    }

    const keys = [];
    const reg = toReg(hostname, keys, { strict: true, delimiter: "." });
    const fn = chain(middlewares);

    return this.use((ctx, next) => {
      const matchHost = ctx.req.matchHost;
      const matches = matchHost.match(reg);

      // Check if we matched the whole hostname.
      if (!matches || matches[0] !== matchHost) {
        return next();
      }

      // Here we check for the dynamically matched subdomains.
      for (let i = keys.length; i--; ) {
        const key = keys[i];
        let match: string | string[] = matches[i + 1];
        if (key.repeat) {
          match = match == null ? [] : match.split(".");
        }

        (ctx.req.subdomains as any)[key.name] = match;
      }

      // Update hostname for nested routes.
      const matched = matches[matches.length - 1] || "";
      if (ctx.req.matchHost !== matched) {
        ctx.req.matchHost = matched;
      }

      // Run middleware.
      return fn(ctx, () => {
        // Reset nested hostname.
        ctx.req.matchHost = matchHost;
        // Run sibling middleware.
        return next();
      });
    });
  }
}

// Attach all http verbs as shortcut methods.
METHODS.forEach(method => {
  const name = method.toLowerCase();

  /**
   * Use middleware on |method| requests at an (optional) pathname.
   *
   * @example
   * app.|method|('/test', ...)
   */
  Rill.prototype[name] = handleMethodMiddleware;
  function handleMethodMiddleware(
    pathname: string | T.MiddlewareArg,
    ...middlewares: T.MiddlewareArg[]
  ): Rill {
    if (typeof pathname !== "string") {
      middlewares.unshift(pathname);
      pathname = undefined;
    }

    const fn = chain(middlewares);

    if (pathname) {
      return this.at(pathname, matchMethod);
    } else {
      return this.use(matchMethod);
    }

    function matchMethod(ctx: Context, next: T.NextFunction) {
      if (ctx.req.method !== method) {
        return next();
      }
      return fn(ctx, next);
    }
  }
});

/**
 * Small wrapper around path to regexp that treats a splat param "/*" as optional.
 * This makes mounting easier since typically when you do a path like "/test/*" you also want to treat "/test" as valid.
 */
function toReg(pathname: string, keys: any[], options: any): RegExp {
  // First parse path into tokens.
  const tokens = parse(pathname);

  // Find the last token (checking for splat params).
  const splat: any = tokens[tokens.length - 1];

  // Check if the last token is a splat and make it optional.
  if (splat && splat.asterisk) {
    splat.optional = true;
  }

  // Convert the tokens to a regexp.
  const re = tokensToRegExp(tokens, options);

  // Assign keys to from regexp.
  re.keys = keys;
  for (let i = 0, len = tokens.length; i < len; i++) {
    if (typeof tokens[i] === "object") {
      keys.push(tokens[i]);
    }
  }

  return re;
}

// Support commonjs and esmodules.
module.exports = extend(exports.default, exports);
