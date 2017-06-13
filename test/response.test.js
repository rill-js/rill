var assert = require('assert')
var agent = require('supertest')
var util = require('./util')
var Rill = require('../src')
var respond = util.respond

describe('Response', function () {
  describe('#cookie', function () {
    it('should set cookie', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.cookie('a', 1, { httpOnly: true })
        })).listen())

      return request
        .get('/')
        .expect(200)
        .expect('set-cookie', 'a=1; HttpOnly')
    })
  })

  describe('#clearCookie', function () {
    it('should clear cookie', function () {
      var unsetCookie = ''
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.clearCookie('a')
          unsetCookie = ctx.res.get('Set-Cookie')[0]
          ctx.res.status = 200
        })).listen())

      return request
        .get('/')
        .expect(200)
        .expect(function (res) {
          assert.equal(res.headers['set-cookie'], unsetCookie, 'clears cookie')
        })
    })
  })

  describe('#set', function () {
    it('should set a header', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.set('X-Custom-Header', 1)
        })).listen())

      return request
        .get('/')
        .expect(200)
        .expect('x-custom-header', '1')
    })
  })

  describe('#append', function () {
    it('should append a header', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.set('X-Custom-Header', 1)
          ctx.res.append('X-Custom-Header', 2)
          ctx.res.append('X-Custom-Header', 3)
        })).listen())

      return request
        .get('/')
        .expect(200)
        .expect('x-custom-header', '1, 2, 3')
    })
  })

  describe('#get', function () {
    it('should get a header', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.set('X-Custom-Header', 1)
          assert.equal(ctx.res.get('X-Custom-Header'), 1)
        })).listen())

      return request
        .get('/')
        .expect(200)
        .expect('x-custom-header', '1')
    })
  })

  describe('#remove', function () {
    it('should remove a header', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.set('X-Custom-Header', 1)
          ctx.res.remove('X-Custom-Header')
          assert.equal(ctx.res.get('X-Custom-Header'), null)
        })).listen())

      return request
        .get('/')
        .expect(200)
    })
  })

  describe('#redirect', function () {
    it('should set a redirect', function () {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.redirect('http://localhost/test')
        }).listen())

      return request
        .get('/')
        .expect(302)
    })

    it('should be able to set a different redirect status', function () {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.status = 301
          ctx.res.redirect('http://localhost/test')
        }).listen())

      return request
        .get('/')
        .redirects(0)
        .expect(301)
    })

    it('should redirect to a referrer with "back"', function () {
      var request = agent(Rill()
        .use(function (ctx) {
          ctx.res.redirect('back')
        }).listen())

      return request
        .get('/')
        .redirects(0)
        .set('referer', 'http://google.ca/')
        .expect('location', 'http://google.ca/')
        .expect(302)
    })

    it('should error without a url', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          assert.throws(function () {
            ctx.res.redirect()
          }, TypeError, 'Rill#ctx.res.redirect: Cannot redirect, url not specified and alternative not provided.')
        })).listen())

      return request
        .get('/')
        .expect(200)
    })
  })

  describe('#refresh', function () {
    it('should refresh the browser', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.refresh()
        })).listen({ port: 3001 }))

      return request
        .get('/')
        .expect(200)
        .expect('refresh', '0; url=http://127.0.0.1:3001/')
    })

    it('should refresh to a referrer with "back"', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          ctx.res.refresh(5, 'back')
        })).listen())

      return request
        .get('/')
        .redirects(0)
        .set('referer', 'http://google.ca/')
        .expect('refresh', '5; url=http://google.ca/')
        .expect(200)
    })
  })
})
