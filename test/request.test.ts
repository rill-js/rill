import * as assert from "assert";
import * as agent from "supertest";
import Rill from "../src";
import { respond } from "./util";

describe("Request", () => {
  it("should attach params", () => {
    const request = agent(
      new Rill()
        .at(
          "/test/:name",
          respond(200, ctx => {
            assert.deepEqual(ctx.req.params, { name: "hi" });
          })
        )
        .listen()
        .unref()
    ) as any;

    return request.get("/test/hi");
  });

  it("should attach repeating params", () => {
    const request = agent(
      new Rill()
        .at(
          "/test/:name*",
          respond(200, ctx => {
            assert.deepEqual(ctx.req.params.name, ["1", "2", "3"]);
          })
        )
        .listen()
        .unref()
    ) as any;

    return request.get("/test/1/2/3");
  });

  it("should default to empty params", () => {
    const request = agent(
      new Rill()
        .at(
          "/test/:name*",
          respond(200, ctx => {
            assert.deepEqual(ctx.req.params, { name: [] });
          })
        )
        .listen()
        .unref()
    ) as any;

    return request.get("/test/");
  });

  it("should attach a subdomain", () => {
    const request = agent(
      new Rill()
        .host(
          ":name.test.com",
          respond(200, ctx => {
            assert.equal(ctx.req.subdomains.length, 1);
            assert.equal(ctx.req.subdomains[0], "hi");
            assert.equal(ctx.req.subdomains.name, "hi");
          })
        )
        .listen()
        .unref()
    ) as any;

    return Promise.all([
      request
        .get("/")
        .set("host", "hi.test.com")
        .expect(200),
      request
        .get("/")
        .set("host", "test.com")
        .expect(404)
    ]);
  });

  it("should attach a repeating subdomain", () => {
    const request = agent(
      new Rill()
        .host(
          ":name*.test.com",
          respond(200, ctx => {
            assert.equal(ctx.req.subdomains.length, 3);
            assert.equal(ctx.req.subdomains[2], "1");
            assert.equal(ctx.req.subdomains[1], "2");
            assert.equal(ctx.req.subdomains[0], "3");
            assert.deepEqual(ctx.req.subdomains.name, ["1", "2", "3"]);
          })
        )
        .listen()
        .unref()
    ) as any;

    return Promise.all([
      request
        .get("/")
        .set("host", "1.2.3.test.com")
        .expect(200),
      request
        .get("/")
        .set("host", "abc.com")
        .expect(404)
    ]);
  });

  it("should default to empty subdomains", () => {
    const request = agent(
      new Rill()
        .host(
          ":name*.test.com",
          respond(200, ctx => {
            assert.deepEqual(ctx.req.subdomains.name, []);
          })
        )
        .listen()
        .unref()
    ) as any;

    return request
      .get("/")
      .set("host", ".test.com")
      .expect(200);
  });

  it("should attach cookies", () => {
    const request = agent(
      new Rill()
        .use(
          respond(200, ctx => {
            assert.deepEqual(ctx.req.cookies, { a: "1", b: "2" });
          })
        )
        .listen()
        .unref()
    ) as any;

    return request
      .get("/")
      .set("cookie", "a=1;b=2")
      .expect(200);
  });

  it("should attach a nested querystring", () => {
    const query = {
      a: {
        b: {
          c: "1"
        }
      },
      d: "2"
    };

    const request = agent(
      new Rill()
        .use(
          respond(200, ctx => {
            assert.deepEqual(ctx.req.query, query);
          })
        )
        .listen()
        .unref()
    ) as any;

    return request
      .get("/")
      .query(query)
      .expect(200);
  });

  describe("#get", () => {
    it("should get header", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              assert.equal(
                ctx.req.get("cookie"),
                "a=1;b=2",
                "should have cookie header"
              );
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .set("cookie", "a=1;b=2")
        .expect(200);
    });
  });
});
