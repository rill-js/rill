var assert = require('assert')
var agent = require('supertest')
var util = require('./util')
var Rill = require('../src')
var respond = util.respond

describe('Response', function () {
  describe('#cookie', function () {
    it('should set cookie', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.cookie('a', 1, { httpOnly: true })
      })).listen())

      request.get('/').expect(200).expect('set-cookie', 'a=1; HttpOnly').end(done)
    })
  })

  describe('#clearCookie', function () {
    it('should clear cookie', function (done) {
      var unsetCookie = ''
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.clearCookie('a')
        unsetCookie = ctx.res.get('Set-Cookie')[0]
        ctx.res.status = 200
      })).listen())

      request
      .get('/')
      .expect(200)
      .expect(function (res) {
        assert.equal(res.headers['set-cookie'], unsetCookie, 'clears cookie')
      })
      .end(done)
    })
  })

  describe('#set', function () {
    it('should set a header', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.set('X-Custom-Header', 1)
      })).listen())

      request
        .get('/')
        .expect(200)
        .expect('x-custom-header', '1')
        .end(done)
    })
  })

  describe('#append', function () {
    it('should append a header', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.set('X-Custom-Header', 1)
        ctx.res.append('X-Custom-Header', 2)
        ctx.res.append('X-Custom-Header', 3)
      })).listen())

      request
        .get('/')
        .expect(200)
        .expect('x-custom-header', '1, 2, 3')
        .end(done)
    })
  })

  describe('#get', function () {
    it('should get a header', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.set('X-Custom-Header', 1)
        assert.equal(ctx.res.get('X-Custom-Header'), 1)
      })).listen())

      request
        .get('/')
        .expect(200)
        .expect('x-custom-header', '1')
        .end(done)
    })
  })

  describe('#remove', function () {
    it('should remove a header', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.set('X-Custom-Header', 1)
        ctx.res.remove('X-Custom-Header')
        assert.equal(ctx.res.get('X-Custom-Header'), null)
      })).listen())

      request
        .get('/')
        .expect(200)
        .end(done)
    })
  })

  describe('#redirect', function () {
    it('should set a redirect', function (done) {
      var request = agent(Rill()
      .use(function (ctx) {
        ctx.res.redirect('http://localhost/test')
      }).listen())

      request
        .get('/')
        .expect(302)
        .end(done)
    })

    it('should be able to set a different redirect status', function (done) {
      var request = agent(Rill()
      .use(function (ctx) {
        ctx.res.status = 301
        ctx.res.redirect('http://localhost/test')
      }).listen())

      request
        .get('/')
        .redirects(0)
        .expect(301)
        .end(done)
    })

    it('should redirect to a referrer with "back"', function (done) {
      var request = agent(Rill()
      .use(function (ctx) {
        ctx.res.redirect('back')
      }).listen())

      request
        .get('/')
        .redirects(0)
        .set('referer', 'http://google.ca/')
        .expect('location', 'http://google.ca/')
        .expect(302)
        .end(done)
    })

    it('should error without a url', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        assert.throws(function () {
          ctx.res.redirect()
        }, TypeError, 'Rill#ctx.res.redirect: Cannot redirect, url not specified and alternative not provided.')
      })).listen())

      request
        .get('/')
        .expect(200)
        .end(done)
    })
  })

  describe('#refresh', function () {
    it('should refresh the browser', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.refresh()
      })).listen({ port: 3001 }))

      request
        .get('/')
        .expect(200)
        .expect('refresh', '0; url=http://127.0.0.1:3001/')
        .end(done)
    })

    it('should refresh to a referrer with "back"', function (done) {
      var request = agent(Rill()
      .use(respond(200, function (ctx) {
        ctx.res.refresh(5, 'back')
      })).listen())

      request
        .get('/')
        .redirects(0)
        .set('referer', 'http://google.ca/')
        .expect('refresh', '5; url=http://google.ca/')
        .expect(200)
        .end(done)
    })
  })
})
