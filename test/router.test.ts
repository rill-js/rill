import * as https from "@rill/https";
import * as assert from "assert";
import * as fs from "fs";
import * as getPort from "get-port";
import * as path from "path";
import * as agent from "supertest";
import Rill from "../src";
import { respond } from "./util";

describe("Router", () => {
  describe("#listen", () => {
    it("should listen for a request and callback function when started", done => {
      new Rill()
        .listen(function() {
          (agent(this) as any)
            .get("/")
            .expect(404)
            .end(done);
        })
        .unref();
    });

    it("should use provided port", () => {
      return getPort().then(port => {
        new Rill().listen({ port }).unref();
        return (agent("localhost:" + port) as any).get("/").expect(404);
      });
    });

    it("should use https server with tls option", () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      const server = new Rill()
        .listen({
          tls: {
            cert: fs.readFileSync(path.join(__dirname, "/cert/cert.pem")),
            key: fs.readFileSync(path.join(__dirname, "/cert/privkey.pem"))
          }
        })
        .unref();
      const request = agent(server) as any;

      assert.ok(
        server instanceof (https as any).Server,
        "should be an https server."
      );

      return request.get("/").expect(404);
    });
  });

  describe("#setup", () => {
    it("should run setup functions", done => {
      const app = new Rill();

      app.setup(
        // Ignores falsey values
        false,
        // provides self.
        self => {
          assert.equal(self, app, "should provide the app");
          done();
        }
      );
    });

    it("should should error with an invalid setup", () => {
      assert.throws(
        () => {
          new Rill().setup("hello" as any);
        },
        TypeError,
        "Rill#setup: Setup must be a function or falsey."
      );
    });
  });

  describe("#use", () => {
    it("should run middleware", () => {
      const request = agent(
        new Rill()
          .use(respond(200))
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(200);
    });
  });

  describe("#at", () => {
    it("should match a pathname", () => {
      const request = agent(
        new Rill()
          .at("/test", respond(200))
          .listen()
          .unref()
      ) as any;

      return Promise.all([
        request.get("/").expect(404),
        request.get("/test").expect(200)
      ]);
    });

    it("should match a pathname", () => {
      const request = agent(
        new Rill()
          .at("/test", respond(200))
          .listen()
          .unref()
      ) as any;

      return Promise.all([
        request.get("/").expect(404),
        request.get("/test").expect(200)
      ]);
    });

    it("should mount a pathname", () => {
      const request = agent(
        new Rill()
          .at(
            "/test/*",
            new Rill().at("/1/*", new Rill().at("/2", respond(200)))
          )
          .at("/test2/*", respond(200))
          .listen()
          .unref()
      ) as any;

      return Promise.all([
        request.get("/test").expect(404),
        request.get("/test/1").expect(404),
        request.get("/test/1/2").expect(200),
        request.get("/test2").expect(200)
      ]);
    });

    it("should error without a pathname", () => {
      assert.throws(
        () => {
          // tslint:disable-next-line
          new Rill().at((() => {}) as any);
        },
        TypeError,
        "Rill#at: Path name must be a string."
      );
    });
  });

  describe("#host", () => {
    it("should match a hostname", () => {
      const request = agent(
        new Rill()
          .host("*test.com", respond(200))
          .listen()
          .unref()
      ) as any;

      return Promise.all([
        request.get("/").expect(404),
        request
          .get("/")
          .set("host", "fake.com")
          .expect(404),
        request
          .get("/")
          .set("host", "test.com")
          .expect(200),
        request
          .get("/")
          .set("host", "www.test.com")
          .expect(200)
      ]);
    });

    it("should mount a subdomain/hostname", () => {
      const request = agent(
        new Rill()
          .host(
            "*.test.com",
            new Rill().host("*.api", new Rill().host("test", respond(200)))
          )
          .listen()
          .unref()
      ) as any;

      return Promise.all([
        request.get("/").expect(404),
        request
          .get("/")
          .set("host", "test.com")
          .expect(404),
        request
          .get("/")
          .set("host", "api.test.com")
          .expect(404),
        request
          .get("/")
          .set("host", "test.api.test.com")
          .expect(200)
      ]);
    });

    it("should error without a hostname", () => {
      assert.throws(
        () => {
          // tslint:disable-next-line
          new Rill().host((() => {}) as any);
        },
        TypeError,
        "Rill#host: Host name must be a string."
      );
    });
  });

  describe("#|METHOD|", () => {
    it("should match a method", () => {
      const request = agent(
        new Rill()
          .post(respond(200))
          .listen()
          .unref()
      ) as any;

      return Promise.all([
        request.get("/").expect(404),
        request.post("/").expect(200)
      ]);
    });

    it("should match a method and a pathname", () => {
      const request = agent(
        new Rill()
          .get("/test", respond(200))
          .listen()
          .unref()
      ) as any;

      return Promise.all([
        request.get("/test").expect(200),
        request.get("/").expect(404)
      ]);
    });
  });

  describe("#handler", () => {
    it("should return 500 status on unknown error", () => {
      const request = agent(
        new Rill()
          .use(() => {
            throw new Error("Fail");
          })
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(500);
    });

    it("should default status to 200 with body", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.body = "hello";
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect(res => {
          assert.equal(res.text, "hello", "should have sent response body.");
        });
    });

    it("should default status to 302 on redirect", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.set("Location", "localhost");
          })
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(302);
    });

    it("should respond as json with object body", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.body = { hello: "world" };
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect("content-type", "application/json; charset=UTF-8")
        .expect("content-length", "17");
    });

    it("should respond with content-type for stream body", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.body = fs.createReadStream(
              require.resolve("../package.json")
            );
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect("content-type", "application/json");
    });

    it("should be able to override content-type and content-length", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.set("Content-Type", "application/custom");
            ctx.res.set("Content-Length", "20");
            ctx.res.body = { hello: "world" };
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect("content-type", "application/custom")
        .expect("content-length", "20");
    });

    it("should omit empty headers", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.set("X-Test-Header", null);
            ctx.res.status = 200;
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect(res => {
          assert.ok(
            !("X-Test-Header" in res.headers),
            "headers should not have empty value"
          );
        });
    });

    it("should be able to manually respond with original response", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            const res = ctx.res.original;
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("hello");
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect(res => {
          assert.equal(res.text, "hello", "should have manual text response");
        });
    });

    it("should be able to manually respond with respond=false", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            const res = ctx.res.original;
            ctx.res.respond = false;

            // Respond later manually.
            setTimeout(() => {
              res.writeHead(200, { "Content-Type": "text/plain" });
              res.end("hello");
            }, 10);
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect(res => {
          assert.equal(res.text, "hello", "should have manual text response");
        });
    });

    it("should be able to manually end request with end=false", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              const res = ctx.res.original;
              ctx.res.end = false;
              setTimeout(() => {
                // Manually end later.
                res.end("hello");
              }, 10);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect(res => {
          assert.equal(res.text, "hello", "should have manual text response");
        });
    });
  });
});
