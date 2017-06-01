# promise-queue-observable

A Queue implemented on top of the simple [SetQueue](https://github.com/Dash-OS/set-queue) 
package.  It implements a two-sided queue using promises where any number of publishers 
can dispatch events to any number of consumers.

```js
import PromiseQueue from 'promise-queue-observable'

const observer = new PromiseQueue({
  /* Default Configuration */
  // Feel free to provide a different Promise implementation.
  promise: Promise,
  /* optional callback made when the Queue is cancelled through observer.cancel()
     the callback is made with the PromiseQueue instances this binding.
  */
  onCancel: undefined,
  /* queueStyle allows you to adjust how the queue is handled.  When 'next' (default)
     any calls to observer.next() will return the same promise until a new value has 
     been resolved.  
     
     If queueStyle is 'shift' then each call to observer.next() will return a new 
     promise that will resolve after all other promises ahead of it have been 
     resolved.
  */
  queueStyle: 'next',
  /* any time a new promise is created - if promiseFactory is given the promise is 
     sent to the factory with 'pull' or 'push' and the promise instance.
     expects the promise as a response.  this is used to modify the promise to make 
     it operate with 3rd party libraries like redux-saga's cancellation.
     (type, Promise)
  */
  promiseFactory: undefined,
  /* Log Errors ?
  */
  log: false,
})
```



### Simple Example

```js
import PromiseQueue from 'promise-queue-observable'

// Create an Observable
const observable = new PromiseQueue()

// consumers request promises - this promise will resolve when a 
// publisher provides a value.
observable.next()
  .then(result => {
    console.log(result) ; // [1, 2, 3]
  })
  .catch(e => {
    console.log(e) ; 
  })
  
observable.next()
  .then(result => {
    console.log(result) ; // [1, 2, 3]
  })
  .catch(e => {
    console.log(e) ; 
  })

// ... sometime later
observable.publish(1, 2, 3)
observable.publish(2, 3, 4)
observable.throw(new Error('some error'))

observable.next()
  .then(result => {
    console.log(result) ; // [2, 3, 4]
  })
  .catch(e => {
    console.log(e) ;
  })
  
observable.next()
  .then(result => {
    console.log(result)
  })
  .catch(e => {
    console.log(e.message) ; // some error
  })
```

### Shift Example

```js
import PromiseQueue from 'promise-queue-observable'

// Create an Observable
const observable = new PromiseQueue({
  queueStyle: 'shift'
})


// consumers request promises - this promise will resolve when a 
// publisher provides a value.
observable.next()
  .then(result => {
    console.log(result) ; // [1, 2, 3]
  })
  .catch(e => {
    console.log(e) ; 
  })
  
observable.next()
  .then(result => {
    console.log(result) ; // [2, 3, 4]
  })
  .catch(e => {
    console.log(e) ; 
  })

// ... sometime later
observable.publish(1, 2, 3)
observable.publish(2, 3, 4)
observable.throw(new Error('some error'))

observable.next()
  .then(result => {
    console.log(result) ;
  })
  .catch(e => {
    console.log(e) ; // some error
  })
  
observable.next()
  .then(result => {
    console.log(result) ; // [ 5, 6, 7 ]
  })
  .catch(e => {
    console.log(e.message) ;
  })
  
setTimeout(() => observable.publish(5, 6, 7), 5000)
```

### Promisifying Callbacks

Below we are iterating the observables value and composing them over time 
until the observable is cancelled (or we don't return getNextEvent).  The 
initial caller receives the final results.

```js
import PromiseQueue from 'promise-queue-observable'

// Create an Observable
const observable = new PromiseQueue({ 
  log: true,
  onCancel: function handlePromiseQueueCancellation() {
    // handle cancellation however needed
  }
})

const getNextEvent = prev => (
  observable.cancelled() 
    ? prev
    : observable.next().then(value => {
      console.log('value: ', value)
      console.log('prev:  ', prev)
      return getNextEvent([ ...prev || [], ...e ])
    }).catch(e => {
      console.log('Error! ', e)
    })
)

getNextEvent().then(r => {
  console.log('result ', r)
  if ( ! observable.cancelled() ) {
    observable.cancel() ; // cleanup the queues and prevent publishers from 
                          // continually publishing to a queue that no one
                          // will ever consume by accident.
  }
})

// works geat for things like window.addEventListener, etc.
setTimeout(() => observable.publish(1), 1000)
setTimeout(() => observable.publish(2), 3000)
setTimeout(() => observable.publish(3), 2000)
setTimeout(() => observable.publish(4), 6000)
setTimeout(() => observable.cancel(), 3000)

/*
value:  [ 1 ]
prev:   undefined
value:  [ 3 ]
prev:   [ 1 ]
value:  [ 2 ]
prev:   [ 1, 3 ]
result  [ 1, 3, 2 ]
[SagaObservable]: Publish Received after Cancellation  undefined [ 4 ]
*/
```