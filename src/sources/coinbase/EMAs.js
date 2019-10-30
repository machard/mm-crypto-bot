import EMAsBase from '../../filters/EMAs';
import { publicClient } from './client';

export default class EMAs extends EMAsBase {
  getHistoricRates(callback) {
    publicClient(this.productId).getProductHistoricRates({
      granularity: this.granularity
    }, (err, r, rates) => {
      if (err || !rates || !rates.slice) {
        return callback(err || rates);
      }

      callback(null, rates);
    });
  }
};
