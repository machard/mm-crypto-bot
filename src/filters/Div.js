import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import num from 'num';

export default class Div extends CachedBatchedZippedStream {

  constructor(s1, s2, precision) {
    super('div', s1, s2);
    this.precision = precision;
  }

  name() {
    return 'div';
  }

  processMessage([s1, s2]) {
    return s1.set_precision(this.precision).div(s2);
  }
};