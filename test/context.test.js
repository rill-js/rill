var assert = require('assert')
var agent = require('supertest')
var util = require('./util')
var Rill = require('../src')
var respond = util.respond

describe('Context', function () {
  describe('#fail', function () {
    it('should throw an http error with provided code', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) { ctx.fail(400) }))
        .listen())

      return request
        .get('/')
        .expect(400)
    })

    it('should fail without a number error code', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          assert.throws(function () {
            ctx.fail('hello')
          }, TypeError, 'Rill#ctx.fail: Status code must be a number.')
        }))
        .listen())

      return request
        .get('/')
        .expect(200)
    })
  })

  describe('#assert', function () {
    it('should throw an http error with falsey values', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) { ctx.assert(false, 400) }))
        .listen())

      return request
        .get('/')
        .expect(400)
    })

    it('should not throw an http error with truthy values', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) { ctx.assert(true, 400) }))
        .listen())

      return request
        .get('/')
        .expect(200)
    })

    it('should fail without a number error code', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          assert.throws(function () {
            ctx.assert(true, 'hello')
          }, TypeError, 'Rill#ctx.assert: Status code must be a number.')
        }))
        .listen())

      return request
        .get('/')
        .expect(200)
    })
  })
})
