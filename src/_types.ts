import { Types as ChainT } from "@rill/chain";
import {
  IncomingMessage,
  Server,
  ServerResponse,
  Types as HttpT
} from "@rill/http";
import { TlsOptions as _TlsOptions } from "tls";
import Rill from "./";
import Context from "./context";

export namespace Types {
  export type Headers = HttpT.Headers;

  export interface StringMap {
    [x: string]: string | string[];
  }

  export interface StringOrNumberMap {
    [x: string]: string | string[];
    [x: number]: string | string[];
  }

  export interface StringMapNested {
    [x: string]: string | string[] | StringMapNested;
  }

  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/cookie/index.d.ts
  export interface CookieOptions {
    /**
     * Specifies the value for the Domain Set-Cookie attribute. By default, no
     * domain is set, and most clients will consider the cookie to apply to only
     * the current domain.
     */
    domain?: string;
    /**
     * Specifies the `Date` object to be the value for the `Expires`
     * `Set-Cookie` attribute. By default, no expiration is set, and most
     * clients will consider this a "non-persistent cookie" and will delete it
     * on a condition like exiting a web browser application.
     *
     * *Note* the cookie storage model specification states that if both
     * `expires` and `maxAge` are set, then `maxAge` takes precedence, but it is
     * possible not all clients by obey this, so if both are set, they should
     * point to the same date and time.
     */
    expires?: Date;
    /**
     * Specifies the boolean value for the `HttpOnly` `Set-Cookie` attribute.
     * When truthy, the `HttpOnly` attribute is set, otherwise it is not. By
     * default, the `HttpOnly` attribute is not set.
     *
     * *Note* be careful when setting this to true, as compliant clients will
     * not allow client-side JavaScript to see the cookie in `document.cookie`.
     */
    httpOnly?: boolean;
    /**
     * Specifies the number (in seconds) to be the value for the `Max-Age`
     * `Set-Cookie` attribute. The given number will be converted to an integer
     * by rounding down. By default, no maximum age is set.
     *
     * *Note* the cookie storage model specification states that if both
     * `expires` and `maxAge` are set, then `maxAge` takes precedence, but it is
     * possible not all clients by obey this, so if both are set, they should
     * point to the same date and time.
     */
    maxAge?: number;
    /**
     * Specifies the value for the `Path` `Set-Cookie` attribute. By default,
     * the path is considered the "default path".
     */
    path?: string;
    /**
     * Specifies the boolean or string to be the value for the `SameSite`
     * `Set-Cookie` attribute.
     *
     * - `true` will set the `SameSite` attribute to `Strict` for strict same
     * site enforcement.
     * - `false` will not set the `SameSite` attribute.
     * - `'lax'` will set the `SameSite` attribute to Lax for lax same site
     * enforcement.
     * - `'strict'` will set the `SameSite` attribute to Strict for strict same
     * site enforcement.
     */
    sameSite?: boolean | "lax" | "strict";
    /**
     * Specifies the boolean value for the `Secure` `Set-Cookie` attribute. When
     * truthy, the `Secure` attribute is set, otherwise it is not. By default,
     * the `Secure` attribute is not set.
     *
     * *Note* be careful when setting this to `true`, as compliant clients will
     * not send the cookie back to the server in the future if the browser does
     * not have an HTTPS connection.
     */
    secure?: boolean;
    /**
     * Specifies a function that will be used to encode a cookie's value. Since
     * value of a cookie has a limited character set (and must be a simple
     * string), this function can be used to encode a value into a string suited
     * for a cookie's value.
     *
     * The default function is the global `encodeURIComponent`, which will
     * encode a JavaScript string into UTF-8 byte sequences and then URL-encode
     * any that fall outside of the cookie range.
     */
    encode?(val: string): string;
  }

  export type SetupFunction = (app: Rill) => any;
  export type SetupArg = SetupFunction | false | void;

  export type NextFunction = ChainT.NextFunction;
  export type MiddlewareFunction = ChainT.MiddlewareFunction<Context>;
  export type MiddlewareArg = ChainT.MiddlewareArg<Context>;
  export type Stack = ChainT.Stack<Context>;

  export type HttpRequestHandler = (
    this: Server,
    req: IncomingMessage,
    res?: ServerResponse
  ) => any;
  export type HttpListenHandler = (this: Server) => any;

  export type MethodShortcut = (
    pathname: string | MiddlewareArg,
    ...middlewares: MiddlewareArg[]
  ) => Rill;

  export type TlsOptions = _TlsOptions;
  export interface ListenOptions {
    ip?: string;
    port?: number;
    backlog?: number;
    tls?: TlsOptions;
  }
}
