import __ from 'highland';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';
import debug from 'debug';
import Ticker from './Ticker';
import ExecutionReport from './ExecutionReport';
import Book from '../models/Book';
var debugSource = require('debug')('lib:source');

export default class Source {
  stream = __();
  ee = new EventEmitter();
  lagging = true;
  lastData = null;
  buffer = [];
  sourcesTicked = {};
  ticker = new Ticker();

  constructor(name, ...tickers) {
    this.debug = debug(name);
    this.__debug_name = name;
    tickers = _.flatten(tickers);
    // this stream may never have any consumer so we dont want an overflow
    this.stream.resume();

    if (name !== '__executionreport__') {
      this.executionReport = new ExecutionReport(['lag', 'unlag']);
      this.onLag(() => this.executionReport.increment('lag'));
      this.onUnlag(() => this.executionReport.increment('unlag'));
    }

    _.each(tickers, (ticker, i) => {
      ticker.onTickDone(() => {
        this.sourcesTicked[i] = true;
        if (_.keys(this.sourcesTicked).length === tickers.length && _.every(_.values(this.sourcesTicked))) {
          this.sourcesTicked = {};
          this.processTick();
        }
      });
    });
  }

  get() {
    return this.stream.fork();
  }

  getExecutionReport() {
    return this.executionReport;
  }

  isPlainObjectEqual(objA, objB) {
    var keysA = Object.keys(objA);
    var keysB = Object.keys(objB);

    if (keysA.length !== keysB.length)
      return false;

    // Test for A's keys different from B.
    var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
    for (var i = 0; i < keysA.length; i++)
      if (!bHasOwnProperty(keysA[i]) || !this.isEqual(objA[keysA[i]], objB[keysA[i]]))
        return false;

    return true;
  }

  isEqual(a, b) {
    if (this.DISABLE_COMPARAISON_CHECK)
      return false;

    if (a instanceof Book)
      return false;

    return (a === b) ||
      ((a || {}).get_precision && (b || {}).get_precision && a.eq(b)) ||
      (_.isObjectLike(a) && _.isObjectLike(b) && this.isPlainObjectEqual(a, b));
  }

  write(data) {
    if (this.lagging)
      return;

    var useless = !data || this.isEqual(data, this.lastData);

    if (useless)
      return;

    this.lastData = data;

    this.debug('write', !this.DISABLE_DATA_DEBUG ? data : null);

    this.buffer.push(data);
  }

  clearBuffer() {
    this.buffer = [];
  }

  processTick() {
    if (this.isPaused())
      return;

    const toSend = this.buffer;
    this.buffer = [];

    // if something in the buffer to send in this tick
    while (toSend.length)
      this.stream.write(toSend.shift());

    //this.debug('process tick');

    this.ticker.tick();
  }

  getTicker() {
    return this.ticker;
  }

  pauseHandles = {};

  pause(handle) {
    this.pauseHandles[handle] = true;
  }

  resume(handle) {
    if (!this.pauseHandles[handle])
      return;

    delete this.pauseHandles[handle];
  }

  isPaused() {
    return !!_.keys(this.pauseHandles).length;
  }

  lag(b) {
    if (b === this.lagging)
      return;

    debugSource(`lagging ${this.__debug_name}`, b);
    this.debug('lagging', b);

    this.lagging = b;

    if (b) {
      this.buffer = [];
      this.lastData = null;
      this.pauseHandles = {};
      this.ee.emit('lag');
    } else
      this.ee.emit('unlag');
  }

  isLagging() {
    return this.lagging;
  }

  onLag(handler) {
    return this.ee.addListener('lag', handler);
  }

  onUnlag(handler) {
    return this.ee.addListener('unlag', handler);
  }
};
