import EMAsBase from '../../filters/EMAs';
import _ from 'lodash';
import client from './client';

const mapGranularity = {
  60: '1m',
  300: '5m',
  900: '15m',
  3600: '1h',
  21600: '6h',
  86400: '1D'
};

export default class EMAs extends EMAsBase {
  getHistoricRates(callback) {
    client(2, 'candles', [{
      timeframe: mapGranularity[this.granularity],
      symbol: `t${this.base}${this.quote}`,
      section: 'hist?limit=350'

    }], (err, rates) => {
      if (err || !rates || !rates.slice)
        return callback(err || rates);

      rates = _.map(rates, ([ts, open, close, high, low, volume]) => [ts / 1000, low, high, open, close, volume]);

      callback(null, rates);
    });
  }
};
