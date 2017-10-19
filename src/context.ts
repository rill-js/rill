import HttpError from "@rill/error";
import { IncomingMessage, ServerResponse } from "@rill/http";
import { Request } from "./request";
import { Response } from "./response";

export class Context {
  /** The current request. */
  public req: Request;
  /** The current response. */
  public res: Response;
  /** Local data/state for rendering the request. */
  public locals: any = {};
  /** Allow tools to attach methods/properties. */
  [x: string]: any;

  /**
   * @description
   * Creates an incoming message context.
   *
   * @example
   * require('http').createServer((req, res) => {
   *   const ctx = new Context(req, res)
   * })
   *
   * @param req An rill/http IncomingMessage.
   * @param res An rill/http ServerResponse.
   */
  constructor(req: IncomingMessage, res: ServerResponse) {
    this.req = new Request(this, req);
    this.res = new Response(this, res);
    this.fail = this.fail.bind(this);
    this.assert = this.assert.bind(this);
  }

  /**
   * @description
   * Throw an http during the current request and update the status and message on the response.
   *
   * @example
   * context.fail(400, 'Password is required')
   *
   * @throws {HttpError}
   *
   * @param statusCode The http status code to use for the error.
   * @param statusMessage The http status message to use for the error.
   * @param metaData An object to merge on to the error.
   */
  public fail(
    statusCode: number,
    statusMessage?: string,
    metaData?: any
  ): void {
    if (typeof statusCode !== "number") {
      throw new TypeError("Rill#ctx.fail: Status code must be a number.");
    }

    const error = new HttpError(statusCode, statusMessage, metaData);
    this.res.status = error.code;
    this.res.message = error.message;
    throw error;
  }

  /**
   * @description
   * If a value is falsey throw an http during the current request and update the status and message on the response.
   *
   * @example
   * context.assert(password.length > 5, 400, 'Password must be at least 5 characters long')
   *
   * @throws {HttpError}
   *
   * @param value The value to test for truthyness.
   * @param statusCode The http status code to use for the error.
   * @param statusMessage The http status message to use for the error.
   * @param metaData An object to merge on to the error.
   */
  public assert(
    value: any,
    statusCode: number,
    statusMessage?: string,
    metaData?: any
  ): void {
    if (typeof statusCode !== "number") {
      throw new TypeError("Rill#ctx.assert: Status code must be a number.");
    }

    if (!value) {
      this.fail(statusCode, statusMessage, metaData);
    }
  }
}
