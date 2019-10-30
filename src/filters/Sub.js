import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';

export default class Sub extends CachedBatchedZippedStream {

  constructor(s1, s2) {
    super('sub', s1, s2);
  }

  name() {
    return 'sub';
  }

  processMessage([s1, s2]) {
    return s1.sub(s2);
  }
};
