import EMAsBase from '../../filters/EMAs';
import _ from 'lodash';
import client from './client';

const mapGranularity = {
  60: 'M1',
  300: 'M5',
  900: 'M15',
  3600: 'H1'
};

export default class EMAs extends EMAsBase {
  getHistoricRates(callback) {
    client({
      command: `public/candles/${this.base}${this.quote}`,
      method: 'GET',
      qs: {
        limit: 350,
        period: mapGranularity[this.granularity]
      }
    }, (err, rates) => {
      if (err || !rates || !rates.slice)
        return callback(err || rates);

      console.log(rates);

      rates = _.map(rates, ({ timestamp, open, close, max, min, volume, volumeQuote}) => [
        (new Date(timestamp)).getTime() / 1000,
        parseFloat(min),
        parseFloat(max),
        parseFloat(open),
        parseFloat(close),
        parseFloat(volume)
      ]);

      callback(null, rates);
    });
  }
};
