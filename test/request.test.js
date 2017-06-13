var assert = require('assert')
var agent = require('supertest')
var util = require('./util')
var Rill = require('../src')
var respond = util.respond

describe('Request', function () {
  it('should attach params', function () {
    var request = agent(Rill()
      .at('/test/:name', respond(200, function (ctx) {
        assert.deepEqual(ctx.req.params, { name: 'hi' })
      })).listen())

    return request.get('/test/hi')
  })

  it('should attach repeating params', function () {
    var request = agent(Rill()
      .at('/test/:name*', respond(200, function (ctx) {
        assert.deepEqual(ctx.req.params.name, ['1', '2', '3'])
      })).listen())

    return request.get('/test/1/2/3')
  })

  it('should default to empty params', function () {
    var request = agent(Rill()
      .at('/test/:name*', respond(200, function (ctx) {
        assert.deepEqual(ctx.req.params, { name: [] })
      })).listen())

    return request.get('/test/')
  })

  it('should attach a subdomain', function () {
    var request = agent(Rill()
      .host(':name.test.com', respond(200, function (ctx) {
        assert.equal(ctx.req.subdomains.length, 1)
        assert.equal(ctx.req.subdomains[0], 'hi')
        assert.equal(ctx.req.subdomains.name, 'hi')
      })).listen())

    return Promise.all([
      request.get('/').set('host', 'hi.test.com').expect(200),
      request.get('/').set('host', 'test.com').expect(404)
    ])
  })

  it('should attach a repeating subdomain', function () {
    var request = agent(Rill()
      .host(':name*.test.com', respond(200, function (ctx) {
        assert.equal(ctx.req.subdomains.length, 3)
        assert.equal(ctx.req.subdomains[2], '1')
        assert.equal(ctx.req.subdomains[1], '2')
        assert.equal(ctx.req.subdomains[0], '3')
        assert.deepEqual(ctx.req.subdomains.name, ['1', '2', '3'])
      })).listen())

    return Promise.all([
      request.get('/').set('host', '1.2.3.test.com').expect(200),
      request.get('/').set('host', 'abc.com').expect(404)
    ])
  })

  it('should default to empty subdomains', function () {
    var request = agent(Rill()
      .host(':name*.test.com', respond(200, function (ctx) {
        assert.deepEqual(ctx.req.subdomains.name, [])
      })).listen())

    return request.get('/').set('host', '.test.com').expect(200)
  })

  it('should attach cookies', function () {
    var request = agent(Rill()
      .use(respond(200, function (ctx) {
        assert.deepEqual(ctx.req.cookies, { a: '1', b: '2' })
      })).listen())

    return request.get('/').set('cookie', 'a=1;b=2').expect(200)
  })

  it('should attach a nested querystring', function () {
    var query = {
      a: {
        b: {
          c: '1'
        }
      },
      d: '2'
    }

    var request = agent(Rill()
      .use(respond(200, function (ctx) {
        assert.deepEqual(ctx.req.query, query)
      })).listen())

    return request.get('/').query(query).expect(200)
  })

  describe('#get', function () {
    it('should get header', function () {
      var request = agent(Rill()
        .use(respond(200, function (ctx) {
          assert.equal(ctx.req.get('cookie'), 'a=1;b=2', 'should have cookie header')
        })).listen())

      return request.get('/').set('cookie', 'a=1;b=2').expect(200)
    })
  })
})
