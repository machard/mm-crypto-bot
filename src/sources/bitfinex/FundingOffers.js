import AuthWS from './AuthWS';
import { Map } from 'immutable';
import num from 'num';
import _ from 'lodash';

export default class FundingBalance extends AuthWS {
  constructor(currency) {
    super([
      `funding-f${currency}`
    ]);

    this.currency = currency;
    this.offers = new Map();

    let aliveInterval;
    this.onUnlag(() => {
      aliveInterval = setInterval(() => {
        this.writeDown();
      }, 5 * 60 * 1000);
    });
    this.onLag(() => {
      clearInterval(aliveInterval);
    });
  }

  writeDown() {
    this.lag(false);
    this.write(this.offers);
    this.makeTick();
  }

  onSnapshot(s) {
    this.offers = new Map();
    _.each(s, ([id, _1, created, _3, amount]) => {
      this.offers = this.offers.set(id, new Map({ created, amount: num(amount)}));
    });
    this.writeDown();
  }

  onNew([id, _1, created, _3, amount]) {
    this.offers = this.offers.set(id, new Map({ created, amount: num(amount)}));
    this.writeDown();
  };

  onUpdate([id, _1, created, _3, amount]) {
    this.offers = this.offers.setIn([id, amount], num(amount));
    this.writeDown();
  };

  onClose([id, _1, created, _3, amount]) {
    this.offers = this.offers.remove(id);
    this.writeDown();
  };

  close(id) {
    console.log('close', id);

    this.send([
      0,
      'foc',
      null,
      { id }
    ]);
  }

  open({ amount, rate, period }) {
    console.log('open');

    this.send([
      0,
      'fon',
      null,
      {
        type: 'LIMIT',
        symbol: `f${this.currency}`,
        amount: amount.toString(),
        rate: rate.toString(),
        period,
        flags: 0
      }
    ]);
  }

  onMessage(data) {
    data = super.onMessage(data);

    if (_.get(data, 'data.1') === 'fos')
      return this.onSnapshot(data.data[2]);

    if (_.get(data, 'data.1') === 'fon')
      return this.onNew(data.data[2]);

    if (_.get(data, 'data.1') === 'fou')
      return this.onUpdate(data.data[2]);

    if (_.get(data, 'data.1') === 'foc')
      return this.onClose(data.data[2]);
  }
};
