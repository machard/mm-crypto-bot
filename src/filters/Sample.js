import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import TickSource from '../lib/TickSource';
import sharedTicker from '../lib/sharedTicker';

export default class Sample extends CachedBatchedZippedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(value, interval) {
    super(`filters:sample`, value, new TickSource(sharedTicker, interval));
  
    this.value = value;
  }

  name() {
    return `sample`;
  }

  processMessage([value, tickSource]) {
    if (tickSource.ping === this.lastPing)
      return;
    this.lastPing = tickSource.ping;

    return value;
  }

};
