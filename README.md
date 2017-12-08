[![Build Status](https://travis-ci.org/lev-kuznetsov/noni.svg?branch=master)](https://travis-ci.org/lev-kuznetsov/noni)

Expressive message passing framework inspired by koa.

Using with AMQP:

```
import {connect} from 'amqplib'
import {amqp, Context} from 'noni'

let connection = await connect('amqp://localhost')
let channel = await connection.createChannel()

// Create a publisher, publisher is a function that accepts
// an object which will become body of the message. Factory
// accepts middleware array as the first argument and
// destination options as the second. AMQP publisher
// middleware has the message as a Buffer, amqp.assemble
// middleware will stringify and convert to buffer contents
// of context.body setting appropriate content headers.
let publisher = amqp.publisher([amqp.assemble], {channel, exchange: 'e', route: 'r'})

// Register a consumer applying successive middlewares to
// received message. AMQP consumer middleware has the message
// as type Message of amqplib, amqp.parse middleware will
// parse the message the message in the buffer as a JSON
// string according to the content headers.
let consumer = await amqp.consumer([
  amqp.parse,
  async <T>(context: Context<T>): Promise<any> => {
    console.log('Received', context.body)
  }
], {channel, exchange: 'e', route: 'r'})

// Publish a message
publisher({foo: 'bar'})
```

Using with AWS (only SQS is supported at the moment, no SNS)

```
import {SQS} from 'aws-sdk'
import {aws, Context} from 'noni'

let publisher = aws.publisher([aws.assemble], {queue: 'q'})

let consumer = await aws.consumer([
  aws.parse,
  async <T>(context: Context<T>): Promise<any> => {
    console.log('Received', context.body)
  }
], {queue: 'q'})

publisher({foo: 'bar'})
```
