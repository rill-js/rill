import { ServerResponse } from "@rill/http";
import { serialize as stringifyCookie } from "cookie";
import { normalize as normalizeHeader } from "header-field";
import { parse as parseURL } from "mini-url";
import * as statuses from "statuses";
import * as T from "./_types";
import Context from "./context";

export default class Response {
  /** The status code for the response (eg: 404) */
  public status?: number;
  /** The status message for the response (eg: Not Found) */
  public message?: string;
  /** An object with all of the http headers for the response. */
  public headers: T.Headers;
  /** The body to send out at the end of the request. */
  public body: any;
  /** This is set to true once the response has been sent. */
  public finished: boolean;
  /** Set this to false to disable sending any response. */
  public respond: boolean;
  /** Set this to false to disable ending the request after sending headers. */
  public end: boolean;
  /** Allow tools to attach methods/properties. */
  [x: string]: any;

  /**
   * @description
   * Wrapper around nodejs `ServerResponse`.
   *
   * @param ctx The related Rill Context for the response.
   * @param original The original ServerResponse from rill/http.
   */
  constructor(public ctx: Context, public original: ServerResponse) {
    this.headers = {};
    this.finished = false;
    this.respond = this.end = true;
    original.once("finish", () => (this.finished = true));
  }

  /**
   * Utility to retrieve a header from the response headers.
   *
   * @example
   * response.get('Content-Type')
   */
  public get(name: string): string | string[] | undefined {
    return this.headers[normalizeHeader(name)];
  }

  /**
   * Utility to overwrite a header on the response headers.
   *
   * @example
   * response.set('Content-Type', 'text/html')
   */
  public set(name: string, value: string | string[]): void {
    this.headers[normalizeHeader(name)] = value;
  }

  /**
   * Utility to add or set a header on the response headers.
   *
   * @example
   * response.append('Set-Cookie', 'a=1')
   * response.append('Set-Cookie', 'b=1')
   * response.get('Set-Cookie') // -> ['a=1', 'b=1']
   */
  public append(name: string, value: string | string[]): void {
    name = normalizeHeader(name);
    const { headers } = this;
    let cur = headers[name];

    if (cur == null) {
      cur = [];
    } else if (!Array.isArray(cur)) {
      cur = [cur];
    }

    headers[name] = cur.concat(value);
  }

  /**
   * Utility to remove a header from the response headers.
   *
   * @example
   * response.remove('Content-Type')
   */
  public remove(name: string): void {
    delete this.headers[normalizeHeader(name)];
  }

  /**
   * Appends to the current set-cookie header, adding a new cookie with options.
   *
   * @example
   * response.cookie('auth-token', 'abc123', { httoOnly: true })
   *
   * @param {string} name - The name of the cookie.
   * @param {*} value - The value for the cookie.
   * @param {object} [options] - Options for the cookie.
   * @return {void}
   */
  public cookie(name: string, value: any, options?: any) {
    this.append("Set-Cookie", stringifyCookie(name, value, options));
  }

  /**
   * Deletes a cookie from the current set-cookie header.
   *
   * @example
   * response.clearCookie('auth-token')
   */
  public clearCookie(name: string, options: any): void {
    this.append(
      "Set-Cookie",
      stringifyCookie(name, "", { ...options, expires: new Date() })
    );
  }

  /**
   * Attaches location headers relative to the current request to perform a redirect.
   * Will redirect to the referrer if "back" is supplied as a url.
   *
   * @example
   * response.redirect('/home') // redirect back to home page.
   */
  public redirect(url: string, alt?: string): void {
    const { req } = this.ctx;

    // Back uses request referrer header as a url.
    url = url === "back" ? (req.get("Referrer") as string) : url;
    // Default url to alternative.
    url = url || alt;

    if (!url) {
      throw new TypeError(
        "Rill#ctx.res.redirect: Cannot redirect, url not specified and alternative not provided."
      );
    }

    if (!statuses.redirect[this.status]) {
      this.status = 302;
    }

    this.set("Location", parseURL(url, req.href).href);
  }

  /**
   * Attaches refresh headers relative to the current request to perform a timed refresh of the page.
   * Will refresh to the referrer if "back" is supplied as a url.
   *
   * @example
   * response.refresh(2, '/home') // redirect the user home after 2 seconds.
   */
  public refresh(delay: number | string = 0, url?: string, alt?: string): void {
    const { req } = this.ctx;
    // Back uses request referrer header as a url.
    url = url === "back" ? (req.get("Referrer") as string) : url;
    // Default url to alternative.
    url = url || alt || req.href;

    this.set("Refresh", delay + "; url=" + parseURL(url, req.href).href);
  }
}
