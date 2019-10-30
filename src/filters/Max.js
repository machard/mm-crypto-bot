import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import TickSource from '../lib/TickSource';
import sharedTicker from '../lib/sharedTicker';
import _ from 'lodash';
import num from 'num';

export default class Max extends CachedBatchedZippedStream {

  constructor(value, time, noClearingOnLag) {
    super(`filters:max:${value.name()}`, value, new TickSource(sharedTicker));

    this.value = value;
    this.time = time;
    this.noClearingOnLag = noClearingOnLag;
  }

  lastValues = [];
  lastTime = null;

  cleanExtraState() {
    if (this.noClearingOnLag)
      return;
    this.lastValues = [];
    this.lastTime = null;
  }

  name() {
    return `max:${this.value.name()}`;
  }

  processMessage([value, tickSource]) {
    var now = Date.now();
    this.lastTime = this.lastTime || now;

    while (this.lastValues.length && (this.lastValues[0].ts + this.time) < now)
      this.lastValues.shift();

    this.lastValues.push({
      ts: now,
      value
    });

    let max;

    _.each(this.lastValues, v => {
      if (v.value.gt(max))
        max = v.value;
    });

    this.lastTime = now;

    return max;
  }
};
