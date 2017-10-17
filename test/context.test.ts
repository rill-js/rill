import * as assert from "assert";
import * as agent from "supertest";
import Rill from "../src";
import { respond } from "./util";

describe("Context", () => {
  describe("#fail", () => {
    it("should throw an http error with provided code", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.fail(400);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(400);
    });

    it("should fail without a number error code", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              assert.throws(
                () => {
                  ctx.fail("hello");
                },
                TypeError,
                "Rill#ctx.fail: Status code must be a number."
              );
            })
          )
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(200);
    });
  });

  describe("#assert", () => {
    it("should throw an http error with falsey values", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.assert(false, 400);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(400);
    });

    it("should not throw an http error with truthy values", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.assert(true, 400);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(200);
    });

    it("should fail without a number error code", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              assert.throws(
                () => {
                  ctx.assert(true, "hello");
                },
                TypeError,
                "Rill#ctx.assert: Status code must be a number."
              );
            })
          )
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(200);
    });
  });
});
