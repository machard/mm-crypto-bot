import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import TickSource from '../lib/TickSource';
import sharedTicker from '../lib/sharedTicker';
import _ from 'lodash';
import num from 'num';
import moment from 'moment';
import fs from 'fs';

export default class EMAs extends CachedBatchedZippedStream {

  constructor(base, quote, granularity, periods, price, { fx, fxPrecision, savingKey }) {
    const label = `${base}-${quote}-${granularity}`;

    const sources = [
      new TickSource(sharedTicker, granularity * 1000),
      price
    ];
    if (fx)
      sources.push(fx);

    super(
      `source:emas:${label}`,
      ...sources
    );

    this.fxPrecision = fxPrecision;
    this.base = base;
    this.quote = quote;
    this.productId = `${base}-${quote}`;
    this.granularity = granularity;
    this.periods = periods;
    this.multipliers = _.map(periods, period => (2 / (period + 1)));
    this.label = label;
    this.savingKey = savingKey;

    this.lastEmas = null;

    this.executionReport.addKey('init-from-api');
  }

  name() {
    return this.label;
  }

  startWith(lastEmas) {
    this.lastEmas = lastEmas;
    this.initiating = false;
    this.initiated = true;

    if (this.savingKey)
      fs.writeFile(`/tmp/ema-${this.savingKey}-${this.label}`, JSON.stringify(this.lastEmas), () => {});

    this.write(lastEmas.emas);
  }

  initFromAPI(price, fx) {
    console.log('init ema from api', this.label);
    this.executionReport.increment('init-from-api');

    this.getHistoricRates((err, rates) => {
      if (err || !rates) {
        this.debug('err in ema', err || rates);
        return setTimeout(() => this.init(), 1000);
      }

      const now = Date.now();
      if (now - rates[0][0] * 1000 < this.granularity * 1000)
        rates.shift();

      if (rates.length < 2) {
        console.log('no period')
        this.debug('no periods', rates.length, this.periods);
        return setTimeout(() => this.init(), 1000);
      }


      if (_.some(this.periods, period => rates.length < period + 1)) {
        console.log('not enough periods', rates.length, this.periods);
        this.debug('not enough periods', rates.length, this.periods);
        //return setTimeout(() => this.init(), 1000);
      }

      const emas = _.map(this.periods, (period, i) => {
        // in case not enough go easy
        if (rates.length < period + 1) {
          return _.mean(rates.map(rate => rate[4]));
        }
        let ema = _.mean(rates.slice(period, period * 2).map(rate => rate[4]));
        _.each(rates.slice(0, period).reverse(), rate => {
          ema = (rate[4] - ema) * this.multipliers[i] + ema;
        });
        return ema;
      });

      this.startWith({
        time: _.first(rates)[0] * 1000 + this.granularity * 1000,
        emas: _.map(emas, ema => {
          ema = num(ema);

          if (!fx)
            return ema;

          if (this.fxPrecision)
            return ema.set_precision(Math.max(this.fxPrecision, price._precision + 1)).div(fx);

          return ema.mul(fx);
        })
      });
    });
  }

  init(price, fx) {
    if (!this.savingKey)
      return this.initFromAPI(price, fx);

    fs.readFile(`/tmp/ema-${this.savingKey}-${this.label}`, 'utf8', (err, lastEmas) => {
      try {
        lastEmas = JSON.parse(lastEmas);
      } catch(e) {
        lastEmas = null;
      }

      console.log('ema from file', this.savingKey, this.label, err, lastEmas, lastEmas && Date.now() - lastEmas.time);

      if (err || !lastEmas || (Date.now() - lastEmas.time) > this.granularity * 1000 * _.min(this.periods))
        return this.initFromAPI(price, fx);

      this.startWith(lastEmas);
    });
  }

  processMessage([_tick, price, fx]) {
    var now = Date.now();

    if (this.initiating)
      return;
    if (!this.initiated) {
      this.initiating = true;
      if (!this.lastEmas || (now - this.lastEmas.time) > this.granularity * 1000 * _.min(this.periods))
        this.init(price, fx);
      else
        this.startWith(this.lastEmas);
      return;
    }

    if ((now - this.lastEmas.time) <= this.granularity * 1000)
      return;

    const emas = _.map(this.lastEmas.emas, (ema, i) =>
      (((price.sub(ema)).mul(this.multipliers[i])).add(ema)).set_precision(price._precision + 1)
    );

    this.lastEmas = {
      emas,
      time: Math.max(moment().startOf('minutes').valueOf(), now)
    };

    if (this.savingKey)
      fs.writeFile(`/tmp/ema-${this.savingKey}-${this.label}`, JSON.stringify(this.lastEmas), () => {});

    return emas;
  }
};
