import * as assert from "assert";
import * as agent from "supertest";
import Rill from "../src";
import { respond } from "./util";

describe("Response", () => {
  describe("#cookie", () => {
    it("should set cookie", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.res.cookie("a", 1, { httpOnly: true });
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect("set-cookie", "a=1; HttpOnly");
    });
  });

  describe("#clearCookie", () => {
    it("should clear cookie", () => {
      let unsetCookie = "";
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.res.clearCookie("a");
              unsetCookie = ctx.res.get("Set-Cookie")[0];
              ctx.res.status = 200;
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect(res => {
          assert.equal(res.headers["set-cookie"], unsetCookie, "clears cookie");
        });
    });
  });

  describe("#set", () => {
    it("should set a header", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.res.set("X-Custom-Header", 1);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect("x-custom-header", "1");
    });
  });

  describe("#append", () => {
    it("should append a header", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.res.set("X-Custom-Header", 1);
              ctx.res.append("X-Custom-Header", 2);
              ctx.res.append("X-Custom-Header", 3);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect("x-custom-header", "1, 2, 3");
    });
  });

  describe("#get", () => {
    it("should get a header", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.res.set("X-Custom-Header", 1);
              assert.equal(ctx.res.get("X-Custom-Header"), 1);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .expect(200)
        .expect("x-custom-header", "1");
    });
  });

  describe("#remove", () => {
    it("should remove a header", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.res.set("X-Custom-Header", 1);
              ctx.res.remove("X-Custom-Header");
              assert.equal(ctx.res.get("X-Custom-Header"), null);
            })
          )
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(200);
    });
  });

  describe("#redirect", () => {
    it("should set a redirect", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.redirect("http://localhost/test");
          })
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(302);
    });

    it("should be able to set a different redirect status", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.status = 301;
            ctx.res.redirect("http://localhost/test");
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .redirects(0)
        .expect(301);
    });

    it("should redirect to a referrer with 'back'", () => {
      const request = agent(
        new Rill()
          .use(ctx => {
            ctx.res.redirect("back");
          })
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .redirects(0)
        .set("referer", "http://google.ca/")
        .expect("location", "http://google.ca/")
        .expect(302);
    });

    it("should error without a url", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              assert.throws(
                () => {
                  ctx.res.redirect();
                },
                TypeError,
                "Rill#ctx.res.redirect: Cannot redirect, url not specified and alternative not provided."
              );
            })
          )
          .listen()
          .unref()
      ) as any;

      return request.get("/").expect(200);
    });
  });

  describe("#refresh", () => {
    it("should refresh the browser", () => {
      const server = new Rill()
        .use(
          respond(200, ctx => {
            ctx.res.refresh();
          })
        )
        .listen()
        .unref();
      const request = agent(server) as any;

      return request
        .get("/")
        .expect(200)
        .expect(
          "refresh",
          "0; url=http://127.0.0.1:" + (server as any).address().port + "/"
        );
    });

    it("should refresh to a referrer with 'back'", () => {
      const request = agent(
        new Rill()
          .use(
            respond(200, ctx => {
              ctx.res.refresh(5, "back");
            })
          )
          .listen()
          .unref()
      ) as any;

      return request
        .get("/")
        .redirects(0)
        .set("referer", "http://google.ca/")
        .expect("refresh", "5; url=http://google.ca/")
        .expect(200);
    });
  });
});
