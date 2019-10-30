import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import _ from 'lodash';
import num from 'num';

const min = (n1, n2) => n1.lt(n2) ? n1 : n2;

export default class Algo extends CachedBatchedZippedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(base, quote, conf, balance, pairInvestment, bookTaker) {
    super('algo:arnaud', [
      conf,
      balance,
      pairInvestment,
      bookTaker
    ]);

    this.base = base;
    this.quote = quote;
  }

  processMessage([
    conf,
    balance,
    pairInvestment,
    bookTransmissionTaker
  ]) {


    const opts = {
      pairInvestment
    };

    let leftToBuy = pairInvestment.sub(balance);
    let leftToSell = num(balance);

    let orders = _.reduce(bookTransmissionTaker.bids, (orders, [price, size, id], i) => {
      const $size = num(min(
        leftToBuy,
        size
      )).set_precision(conf.minSize._precision);

      leftToBuy = leftToBuy.sub($size);

      return {
        ...orders,
        [`buy-${i}`]: {
          $size: $size,
          price: num(price).mul(1 - parseFloat(conf.arbitrageEcart)),
          side: 'buy',
          opts,
          emergency: num(price).mul(conf.emergencyEcart),
          tag: `buy-${i}`,
          base: this.base,
          quote: this.quote
        }
      };
    }, {});

    orders = _.reduce(bookTransmissionTaker.asks, (orders, [price, size, id], i) => {
      const $size = num(min(
        leftToSell,
        size
      )).set_precision(conf.minSize._precision);

      leftToSell = leftToSell.sub($size);

      return {
        ...orders,
        [`sell-${i}`]: {
          $size: $size,
          price: num(price).mul(1 + parseFloat(conf.arbitrageEcart)),
          side: 'sell',
          opts,
          emergency: num(price).mul(conf.emergencyEcart),
          tag: `sell-${i}`,
          base: this.base,
          quote: this.quote
        }
      };
    }, orders);

    return orders;
  }

};
