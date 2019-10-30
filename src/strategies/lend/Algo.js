import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import _ from 'lodash';
import num from 'num';


export default class Algo extends CachedBatchedZippedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(fundOffers, balance, minRate, maxRate) {
    super('algo:lend', [
      fundOffers,
      balance,
      minRate,
      maxRate
    ]);

    this.fundOffers = fundOffers;
    this.balance = balance;

    this.updateStep = 0;
    let balanceInterval;
    this.onUnlag(() => {
      balanceInterval = setInterval(() => {
        this.updateStep = 0;
        balance.update();
      }, 5 * 60 * 1000);
    });
    this.onLag(() => {
      clearInterval(balanceInterval);
    });
  }

  processMessage([
    fundOffers,
    balance,
    minRate,
    maxRate
  ]) {
    console.log('available', balance.toString());
    console.log('offers', fundOffers.count());
    console.log('update step', this.updateStep);

    if (
      this.updateStep === 0
      && fundOffers.count() > 0
    )
      fundOffers.forEach((offer, id) => {
        this.fundOffers.close(id);
      });
    else if (
      this.updateStep === 0
      && fundOffers.count() === 0
    ) {
      this.balance.update();
      this.updateStep = 1;
    } else if (
      this.updateStep === 1 &&
      balance.gte(50)
    ) {
      this.fundOffers.open({
        amount: balance,
        period: _.random(2, 5, false),
        rate: (
          (minRate.mul(0.25))
            .add(maxRate.mul(1.75))
        ).div(2)
      });
      this.balance.update();
    }
  }

};
