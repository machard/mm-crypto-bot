import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';

export default class Compute extends CachedBatchedZippedStream {

  constructor(fn, ...sources) {
    super('sub', sources);
    this.fn = fn;
  }

  name() {
    return 'compute';
  }

  processMessage(sources) {
    return this.fn(sources);
  }
};
