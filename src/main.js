import SetQueue from 'set-queue'

const isCancelled = Symbol('SagaObservableCancellation')

const build_config = config => ({
  promise: Promise,
  onCancel: undefined,
  // next = always return the same promise until next is available
  // shift = shift the promise on each next(), returning in the called order
  queueStyle: 'next',
  // any time a new promise is created - if factory is given the promise is 
  // sent to the factory with 'pull' or 'push' and the promise instance. 
  configFactory: undefined,
  ...config
})

const buildQueues = () => ({
  actions:  new SetQueue(),
  dispatch: new SetQueue(),
})

const handleGetNextPromise = function handlingNextPromise(i) {
  let promise
  if ( this.isCancelled === isCancelled ) return
  if ( this.promises.current ) {
    promise = this.promises.current
  } else {
    promise = new this.config.promise(
      (resolve, reject) => (
        this.queues.dispatch.add({ resolve, reject })
      )
    )
    if (this.config.promiseFactory) { promise = this.config.promiseFactory(promise) }
    if ( this.config.queueStyle === 'next' ) {
      promise = promise.then(r => {
        delete this.promises.current
        return r
      }).catch(e => {
        delete this.promises.current
        throw e
      })
      this.promises.current = promise
    }
  }
  return promise
}

export default class SagaObservable {

  constructor(config) {
    this.i = 0
    this.promises = {
      current: undefined
    }
    this.config = build_config(config)
    this.queues = buildQueues()
  }

  publish = (...args) => {
    if ( this.isCancelled === isCancelled || ! this.queues ) { return }
    if (this.queues.dispatch.size) {
      return this.queues.dispatch.next().resolve(args)
    } else {
      const promise = new this.config.promise((resolve, reject) => resolve(args))
      this.queues.actions.add(promise)
    }
  }

  // throw a rejection to the next promise rather than a resolution
  throw = reason => {
    if ( this.isCancelled === isCancelled || ! this.queues ) { return }
    if (this.queues.dispatch.size) {
      this.queues.dispatch.next().reject(reason)
    } else {
      const promise = new this.config.promise((resolve, reject) => reject(reason))
      this.queues.actions.add(promise)
    }
    return this
  }

  next = () => {
    if ( this.isCancelled === true || ! this.queues ) { return }
    if (this.queues.actions.size > 0) {
      return this.config.promise.resolve(this.queues.actions.next())
    } else {
      return handleGetNextPromise.call(this)
    }
  }

  cancel = () => {
    if ( this.isCancelled ) { return }
    this.isCancelled = isCancelled
    try {
      if ( typeof this.config.onCancel === 'function' ) {
        this.config.onCancel.call(this)
      }
      if ( this.queues.dispatch.size > 0 ) {
        for ( let waiter of this.queues.dispatch ) {
          waiter.reject(isCancelled)
        }
      }
    } catch (e) {
      console.error(e.message)
    } finally {
      delete this.queues
      delete this.promises.current
      this.next = () => { throw new Error(`[SagaObservable]: ${this.name} next called after Cancellation`) }
      this.publish = (...args) => { console.warn('[SagaObservable]: Publish Received after Cancellation ', this.name, args) }
      return this.cancelled()
    }
  }

  cancelled = () => this.isCancelled
}


