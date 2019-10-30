import _ from 'lodash';
import num from 'num';
import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';

export default class Sum extends CachedBatchedZippedStream {

  constructor(...sources) {
    super('sum', sources);
  }

  name() {
    return 'sum';
  }

  processMessage(sources) {
    var sum = num(0);
    _.each(sources, v => sum = sum.add(v));
    return sum;
  }
};
