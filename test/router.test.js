var fs = require('fs')
var path = require('path')
var assert = require('assert')
var agent = require('supertest')
var https = require('@rill/https')
var util = require('./util')
var Rill = require('../src')
var respond = util.respond
var when = util.when

describe('Router', function () {
  describe('#listen', function () {
    it('should listen for a request', function (done) {
      Rill().listen(function () {
        agent(this)
          .get('/')
          .expect(404)
          .end(done)
      })
    })

    it('should use provided port', function (done) {
      Rill().listen({ port: 3000 }, function () {
        agent('localhost:3000')
          .get('/')
          .expect(404)
          .end(done)
      })
    })

    it('should use https server with tls option', function (done) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      var server = Rill().listen({ tls: {
        key: fs.readFileSync(path.join(__dirname, '/cert/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, '/cert/cert.pem'))
      } }, function () {
        agent(this)
          .get('/')
          .expect(404)
          .end(done)
      })
      assert.ok(server instanceof https.Server, 'should be an https server.')
    })
  })

  describe('#setup', function () {
    it('should run setup functions', function (done) {
      const app = Rill()

      app.setup(
        // Ignores falsey values
        false,
        // provides self.
        function (self) {
          assert.equal(self, app, 'should provide the app')
          done()
        }
      )
    })

    it('should should error with an invalid setup', function () {
      assert.throws(function () {
        Rill().setup('hello')
      }, TypeError, 'Rill#setup: Setup must be a function or falsey.')
    })
  })

  describe('#use', function () {
    it('should run middleware', function (done) {
      var request = agent(Rill()
        .use(respond(200))
        .listen())

      request
        .get('/')
        .expect(200)
        .end(done)
    })
  })

  describe('#at', function () {
    it('should match a pathname', function (done) {
      var request = agent(Rill().at('/test', respond(200)).listen())

      when([
        request.get('/').expect(404),
        request.get('/test').expect(200)
      ], done)
    })

    it('should match a pathname', function (done) {
      var request = agent(Rill().at('/test', respond(200)).listen())

      when([
        request.get('/').expect(404),
        request.get('/test').expect(200)
      ], done)
    })

    it('should mount a pathname', function (done) {
      var request = agent(Rill()
      .at('/test/*', Rill()
      .at('/1/*', Rill()
      .at('/2', respond(200)))).listen())

      when([
        request.get('/test').expect(404),
        request.get('/test/1').expect(404),
        request.get('/test/1/2').expect(200)
      ], done)
    })

    it('should error without a pathname', function () {
      assert.throws(function () {
        Rill().at(function () {})
      }, TypeError, 'Rill#at: Path name must be a string.')
    })
  })

  describe('#host', function () {
    it('should match a hostname', function (done) {
      var request = agent(Rill().host('*test.com', respond(200)).listen())

      when([
        request.get('/').expect(404),
        request.get('/').set('host', 'fake.com').expect(404),
        request.get('/').set('host', 'test.com').expect(200),
        request.get('/').set('host', 'www.test.com').expect(200)
      ], done)
    })

    it('should mount a subdomain/hostname', function (done) {
      var request = agent(Rill()
        .host('*.test.com', Rill()
          .host('*.api', Rill()
            .host('test', respond(200)))).listen())

      when([
        request.get('/').expect(404),
        request.get('/').set('host', 'test.com').expect(404),
        request.get('/').set('host', 'api.test.com').expect(404),
        request.get('/').set('host', 'test.api.test.com').expect(200)
      ], done)
    })

    it('should error without a hostname', function () {
      assert.throws(function () {
        Rill().host(function () {})
      }, TypeError, 'Rill#host: Host name must be a string.')
    })
  })

  describe('#|METHOD|', function () {
    it('should match a method', function (done) {
      var request = agent(Rill().post(respond(200)).listen())

      when([
        request.get('/').expect(404),
        request.post('/').expect(200)
      ], done)
    })

    it('should match a method and a pathname', function (done) {
      var request = agent(Rill().get('/test', respond(200)).listen())

      when([
        request.get('/test').expect(200),
        request.get('/').expect(404)
      ], done)
    })
  })

  describe('#handler', function () {
    it('should return 500 status on unkown error', function (done) {
      var request = agent(Rill()
        .use(function () {
          throw new Error('Fail')
        })
        .listen())

      request
        .get('/')
        .expect(500)
        .end(done)
    })

    it('should default status to 200 with body', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.body = 'hello'
        })
        .listen())

      request
        .get('/')
        .expect(200)
        .expect(function (res) {
          assert.equal(res.text, 'hello', 'should have sent response body.')
        })
        .end(done)
    })

    it('should default status to 302 on redirect', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.set('Location', 'localhost')
        })
        .listen())

      request
        .get('/')
        .expect(302)
        .end(done)
    })

    it('should respond as json with object body', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.body = { hello: 'world' }
        })
        .listen())

      request
        .get('/')
        .expect(200)
        .expect('content-type', 'application/json; charset=UTF-8')
        .expect('content-length', '17')
        .end(done)
    })

    it('should respond with content-type for stream body', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.body = fs.createReadStream(__filename)
        })
        .listen())

      request
        .get('/')
        .expect(200)
        .expect('content-type', 'application/javascript')
        .end(done)
    })

    it('should be able to override content-type and content-length', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.set('Content-Type', 'application/custom')
          ctx.res.set('Content-Length', 20)
          ctx.res.body = { hello: 'world' }
        })
        .listen())

      request
        .get('/')
        .expect(200)
        .expect('content-type', 'application/custom')
        .expect('content-length', '20')
        .end(done)
    })

    it('should omit empty headers', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.set('X-Test-Header', null)
          ctx.res.status = 200
        })
        .listen())

      request
        .get('/')
        .expect(200)
        .expect(function (res) {
          assert.ok(!('X-Test-Header' in res.headers), 'headers should not have empty value')
        })
        .end(done)
    })

    it('should be able to manually respond with original response', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          var res = ctx.res.original
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('hello')
        })
        .listen())

      request
        .get('/')
        .expect(200)
        .expect(function (res) {
          assert.equal(res.text, 'hello', 'should have manual text response')
        })
        .end(done)
    })

    it('should be able to manually respond with respond=false', function (done) {
      var request = agent(Rill()
        .use(function (ctx) {
          var res = ctx.res.original
          ctx.res.respond = false

          // Respond later manually.
          setTimeout(function () {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('hello')
          }, 10)
        })
        .listen())

      request
        .get('/')
        .expect(200)
        .expect(function (res) {
          assert.equal(res.text, 'hello', 'should have manual text response')
        })
        .end(done)
    })

    it('should be able to manually end request with end=false', function (done) {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          var res = ctx.res.original
          ctx.res.end = false
          setTimeout(function () {
            // Manually end later.
            res.end('hello')
          }, 10)
        }))
        .listen())

      request
        .get('/')
        .expect(200)
        .expect(function (res) {
          assert.equal(res.text, 'hello', 'should have manual text response')
        })
        .end(done)
    })
  })
})
