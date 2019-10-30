import EventEmitter from 'eventemitter3';

export default class Ticker {
  ee = new EventEmitter();

  constructor(opts = {}) {
    this.opts = opts;
  }

  _tick() {
    this.ee.emit('tickdone');
    this.ticking = false;
  }

  tick() {
    if (this.ticking)
      return;
    this.ticking = true;
    if (this.opts.batch)
      setImmediate(() => this._tick());
    else
      this._tick();
  }

  onTickDone(handler) {
    return this.ee.addListener('tickdone', handler);
  }
};
