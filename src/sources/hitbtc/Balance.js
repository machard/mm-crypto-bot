import BalanceBase from '../../lib/sources/Balance';
import _ from 'lodash';
import num from 'num';
import client from './client';

export default class Balance extends BalanceBase {
  getSyncData(callback) {
    client({
      command: 'trading/balance',
      method: 'GET',
      auth: true
    }, (err, data) => {
      var account = _.find(data, {currency: this.currency});

      if (!account)
        err = err || 'no account';

      callback(err, account);
    });
  }

  getSyncState(account) {
    return num(account.available).add(account.reserved);
  }
};
