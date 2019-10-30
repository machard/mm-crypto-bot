import AuthWS from './AuthWS';
import num from 'num';
import _ from 'lodash';

export default class FundingBalance extends AuthWS {
  constructor(currency) {
    super([
      'wallet'
    ]);

    this.currency = currency;
  }

  update() {
    this.send([
      0,
      'calc',
      null,
      [
        [`wallet_funding_${this.currency}`]
      ]
    ]);
  }

  onBalance(wallets) {
    _.each(wallets, ([type, currency, balance, _, balanceAvailable]) => {
      if (type === 'funding' && currency === this.currency && balanceAvailable !== null) {
        this.lag(false);
        this.write(num(balanceAvailable));
        this.makeTick();
      }
    });
  }

  onMessage(data) {
    data = super.onMessage(data);

    if (_.get(data, 'data.1') === 'ws') {
      this.onBalance(data.data[2]);
      this.update();
    }

    if (_.get(data, 'data.1') === 'wu')
      this.onBalance([data.data[2]]);
  }
};
