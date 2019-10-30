import _ from 'lodash';
import Source from './Source';
import Ticker from './Ticker';
import EventEmitter from 'eventemitter3';

const reportTicker = new Ticker({ batch: true });
const erEmitter = new EventEmitter();
setInterval(() => erEmitter.emit('go'), 1000);

export default class ExecutionReport {

  constructor(keys = []) {
    this.source = new Source('__executionreport__', reportTicker);
    this.source.DISABLE_COMPARAISON_CHECK = true;

    this.source.lag(false);

    this.keys = keys;
    this.reset();

    erEmitter.on('go', () => {
      this.source.write(
        _.reduce(
          this.keys,
          (output, key) => {
            if (this.values[key] !== 0)
              output = _.set(output, key, this.values[key]);
            return output;
          },
          {}
        )
      );
      this.reset();
      reportTicker.tick();
    });
  }

  reset() {
    this.values = _.reduce(this.keys, (values, key) => _.set(values, key, 0), {});
  }

  addKey(key) {
    this.keys.push(key);
    this.values[key] = 0;
  }

  increment(key, value =  1) {
    this.values[key] = this.values[key] + value;
  }
  setValue(key, value) {
    this.values[key] = value;
  }
  getSource() {
    return this.source;
  }
}
