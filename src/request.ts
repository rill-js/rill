import { IncomingMessage, Types as HttpT } from "@rill/http";
import { parse as parseCookie } from "cookie";
import { normalize as toField } from "header-field";
import { parse as parseQS } from "mini-querystring";
import { parse as parseURL, parts as URL_PARTS } from "mini-url";
import * as T from "./_types";
import { Context } from "./context";

export class Request {
  /** The context for the request. */
  public ctx: Context;
  /** The original IncomingMessage */
  public original: IncomingMessage;
  /** The path part of the url (eg: /a/b?c=d#e). */
  public path: string;
  /** The method for the request (eg: /a/b?c=d#e). */
  public method: string;
  /** The http headers for the request (eg: GET). */
  public headers: T.Headers;
  /** True if the request is https. */
  public secure: boolean;
  /** The path parameters object. */
  public params: any;
  /** The parsed request cookies. */
  public cookies: any;
  /** The origin part of the request. */
  public origin: string;
  /** The protocol for the request (eg: http). */
  public protocol: string;
  /** The hostname for the request (eg: google.ca). */
  public hostname: string;
  /** The pathname for the request (eg: /a/b). */
  public pathname: string;
  /** The raw querystring for the request (eg: ?c=d). */
  public search: string;
  /** The hostname + the port for the request. (eg: google.ca:443) */
  public host: string;
  /** The port used for the request. */
  public port: string;
  /** The hash part of the request (eg: #e). */
  public hash: string;
  /** The entire URL for the request (eg: http://google.ca/a/b?c=d#e) */
  public href: string;
  /** The requestee's IP address. */
  public ip: string;
  /** A placeholder for the parsed request body (see @rill/body). */
  public body: any;
  /** A placeholder for the parsed request files (see @rill/body). */
  public files: any;
  /** The parsed search object from above (eg: { c: "d" }). */
  public query: any;
  /** A list of subdomains (after the top level domain) for the request. */
  public subdomains: string[];
  // @internal
  public matchPath: string;
  // @internal
  public matchHost: string;

  /**
   * @description
   * Wrapper around nodejs `IncomingMessage` that has pre parsed url
   * and other conveniences.
   *
   * @param ctx The related Rill Context for the request.
   * @param original The original IncomingMessage from rill/http.
   */
  constructor(ctx: Context, original: IncomingMessage) {
    const { connection: conn, headers } = original;
    const secure = conn.encrypted;
    const protocol = secure ? "https" : "http";
    this.path = original.url;
    this.method = original.method;
    this.origin = protocol + "://" + original.headers.host;
    this.headers = headers;
    this.secure = secure;
    /* istanbul ignore next */
    const parsed = (process as any).browser
      ? (original as any)._options.parsed
      : parseURL(original.url, this.origin);
    this.cookies = headers.cookie ? parseCookie(headers.cookie) : {};
    /* istanbul ignore next */
    this.ip =
      conn.remoteAddress ||
      original.socket.remoteAddress ||
      ((conn as any).socket && (conn as any).socket.remoteAddress);
    // Attach url parts.
    for (const part of URL_PARTS) {
      this[part] = parsed[part];
    }
    this.matchPath = this.pathname;
    this.matchHost = this.hostname;
    this.subdomains = String(this.hostname)
      .split(".")
      .reverse()
      .slice(2);
    this.query = parseQS(this.search, true);
    this.params = {};
  }

  /**
   * @description
   * Utility to retrieve a header from the request.
   *
   * @example
   * request.get('Host') // -> 'test.com'
   *
   * @param name The name of the request header to get.
   */
  public get(name: string): string | string[] {
    return this.headers[toField(name)];
  }
}
