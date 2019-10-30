import _ from 'lodash';
import IPCClientProcess from '../../lib/IPCClientProcess';
import sharedTicker from '../../lib/sharedTicker';
import ProcessSource from '../../lib/ProcessSource';

export default class PairExecutor extends ProcessSource {
  constructor(base, quote) {
    super(
      'coinbase-shared-fix-input',
      new IPCClientProcess(`coinbase-shared-fix-${base}-${quote}`),
      v => v,
      sharedTicker
    );

    this.executionReport.addKey('rate-limit');
    this.executionReport.addKey('commands');

    _.each(['buy', 'sell', 'cancel'], (action) => {
      this[action] = (order) => {
        this.executionReport.increment('commands');
        this.ps.command({ action, order });
      };
    });

    this.fixs = [];
  }

  write(data) {
    if (data.rateLimit)
      this.executionReport.increment('rate-limit');

    super.write(data);
  }
};
