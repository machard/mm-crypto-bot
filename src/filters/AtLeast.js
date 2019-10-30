import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import TickSource from '../lib/TickSource';
import sharedTicker from '../lib/sharedTicker';

export default class AtLeast extends CachedBatchedZippedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(value, interval) {
    super('atleast', value, new TickSource(sharedTicker, interval));
  }

  processMessage([value]) {
    return value;
  }

  name() {
    return `atleast`;
  }
};
