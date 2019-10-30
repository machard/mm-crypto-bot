import BalanceBase from '../../lib/sources/Balance';
import _ from 'lodash';
import num from 'num';
import client from './client';

export default class Balance extends BalanceBase {
  getSyncData(callback) {
    client.getAccounts((err, r, data) => {
      var account = _.find(data, {
        currency: this.currency
      });

      if (!account)
        err = err || 'no account';

      callback(err, account);
    });
  }

  getSyncState(account) {
    return num(account.balance);
  }
};
