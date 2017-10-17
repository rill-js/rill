import { byteLength } from "byte-length";
import { check as checkType } from "content-check";
import { isBuffer as checkBuffer, isStream as checkStream } from "is-typeof";
import * as statuses from "statuses";
import * as T from "./_types";
import { Context } from "./context";

/**
 * @description
 * Runs general clean up on a request context and ends it with proper headers and status codes.
 *
 * @param ctx The Rill Context to send a response for.
 * @internal
 */
export function respond({ req, res }: Context): void {
  let { body } = res;
  const { original } = res;
  const isStream = checkStream(body);
  const isBuffer = checkBuffer(body);

  if (
    // Allow skipping response.
    res.respond === false ||
    // Skip request ended externally.
    original.headersSent
  ) {
    return;
  }

  // Apply default statuses.
  if (Number(res.status) === 404) {
    if (res.get("Location")) {
      // Ensure redirect status.
      res.status = 302;
    } else if (body) {
      // Default the status to 200 if there is substance to the response.
      res.status = 200;
    }
  }

  // Default status message based on status code.
  res.message = res.message || statuses[res.status];

  // Ensure no content-type for empty responses.
  if (req.method === "HEAD" || statuses.empty[res.status] || !body) {
    body = null;
    res.remove("Content-Type");
    res.remove("Content-Length");
  } else {
    // Attempt to guess content type.
    if (!res.get("Content-Type")) {
      res.set("Content-Type", checkType(body));
    }
    // Stringify objects that are not buffers.
    if (typeof body === "object" && !isStream && !isBuffer) {
      body = JSON.stringify(body);
    }
    // Attempt to guess content-length.
    if (!res.get("Content-Length") && !isStream) {
      res.set("Content-Length", String(byteLength(body)));
    }
  }

  // Send off headers.
  original.writeHead(res.status, res.message, removeEmptyHeaders(res.headers));
  if (res.end === false) {
    // Allow for requests to stay open.
    return;
  }
  // Finish response.
  if (isStream) {
    body.pipe(original);
  } else {
    original.end(body);
  }
}

/**
 * @description
 * Utility to remove empty values from an object.
 *
 * @example
 * removeEmptyHeaders({ a: [], b: null, c: 0 }) // -> { c: 0 }
 *
 * @param obj The http headers to send.
 * @internal
 */
function removeEmptyHeaders(obj: T.Headers): T.Headers {
  for (const key in obj) {
    if (obj[key] == null || obj[key].length === 0) {
      delete obj[key];
    }
  }

  return obj;
}
