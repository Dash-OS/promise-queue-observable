# promise-queue-observable

A Queue implemented on top of the simple [SetQueue](https://github.com/Dash-OS/set-queue) 
package.  It implements a two-sided queue using promises where any number of publishers 
can dispatch events to any number of consumers.

```js
import PromiseQueue from 'promise-queue-observable'

const observer = new PromiseQueue({
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