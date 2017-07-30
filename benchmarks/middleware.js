'use strict'

const Rill = require('..')
const app = new Rill()

// number of middleware

let n = parseInt(process.env.MW || '1', 10)
console.log(`  ${n} middleware`)

while (n--) {
  app.use((ctx, next) => next())
}

const body = Buffer.from('Hello World')

app.use(({ res }, next) => next().then(() => { res.body = body }))

app.listen({ port: 3333 })
