import BalanceBase from '../../lib/sources/Balance';
import _ from 'lodash';
import num from 'num';
import client from './client';

export default class Balance extends BalanceBase {
  getSyncData(callback) {
    client('balance', [], (err, data) => {
      var account = data && _.get(data, '0.3');

      if (!account) {
        err = err || 'no account';
        console.log(err);
      }

      callback(err, account);
    });
  }

  getSyncState(account) {
    return num(account[this.currency] / 1e8);
  }
};
