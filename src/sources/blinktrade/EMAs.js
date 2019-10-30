import EMAsBase from '../../filters/EMAs';
import moment from 'moment';
import _ from 'lodash';

export default class EMAs extends EMAsBase {
  initFromAPI(price, fx) {
    this.startWith({
      time: moment().startOf('minutes').valueOf(),
      emas: _.map(this.periods, () => {
        if (!fx)
          return price;

        if (this.fxPrecision)
          return price.set_precision(Math.max(this.fxPrecision, price._precision + 1)).div(fx);

        return price.mul(fx);
      })
    });
  }
};
