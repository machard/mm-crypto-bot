import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import TickSource from '../lib/TickSource';
import sharedTicker from '../lib/sharedTicker';
import _ from 'lodash';
import num from 'num';

export default class MovingAverage extends CachedBatchedZippedStream {

  constructor(value, time, interval, initFn) {
    super(`filters:movingaverage:${value.name()}`, value, new TickSource(sharedTicker, interval));

    this.value = value;
    this.time = time;
    this.initFn = initFn;
    this.initiated = !initFn;
    this.initiatedTime = 0;
  }

  lastValues = [];
  lastSum = num(0);
  lastSumWeight = num(0);
  lastTime = null;

  cleanExtraState() {
    this.lastValues = [];
    this.lastSum = num(0);
    this.lastSumWeight = num(0);
    this.initiated = !this.initFn;
    this.initiating = false;
    this.initiatedTime = 0;
    this.initiatedValue = 0;
    clearTimeout(this.initTO);
  }

  name() {
    return `mv${this.value.name()}`;
  }

  startWith(value) {
    this.initiating = false;
    this.initiated = true;
    this.initiatedTime = Date.now();
    this.initiatedValue = value;
  }

  init() {
    this.initFn((err, value) => {
      if (err) {
        this.initTO = setTimeout(() => this.init(), 1000);
        return;
      }

      this.startWith(value);
    });
  }

  processMessage([value, tickSource]) {
    var now = Date.now();

    if (this.initiating)
      return;
    if (!this.initiated) {
      this.initiating = true;
      if (!this.lastValue || (now - this.lastTime) > this.time)
        this.init();
      else
        this.startWith(this.lastValue);
      return;
    }

    if (tickSource.ping === this.lastPing)
      return;
    this.lastPing = tickSource.ping;

    var v;

    if (this.lastValues.length) {
      v = _.last(this.lastValues);
      v.weight = now - v.ts;
      this.lastSum = this.lastSum.add(v.value.mul(v.weight));
      this.lastSumWeight = this.lastSumWeight.add(v.weight);
    }

    while (this.lastValues.length && (this.lastValues[0].ts + this.time) < now) {
      v = this.lastValues.shift();
      this.lastSum = this.lastSum.sub(v.value.mul(v.weight));
      this.lastSumWeight = this.lastSumWeight.sub(v.weight);
    }

    this.lastValues.push({
      ts: now,
      value
    });

    let weightInit, sumInit;
    if (now - this.initiatedTime < this.time) {
      weightInit = num(this.time - (now - this.initiatedTime));
      sumInit = weightInit.mul(this.initiatedValue);
    } else {
      weightInit = num(0);
      sumInit = num(0);
    }

    const currentWeight = this.lastSumWeight.add(weightInit);

    if (currentWeight.eq(0))
      return null;

    const result = (this.lastSum.add(sumInit)).div(currentWeight);

    this.lastValue = result;
    this.lastTime = now;

    return result;
  }
};
