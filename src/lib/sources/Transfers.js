import { List, Record } from 'immutable';
import Source from '../../lib/Source';
import sharedTicker from '../../lib/sharedTicker';

export default class Transfers extends Source {
  constructor(client) {
    super('transfers', sharedTicker);

    this.client = client;

    this.withdrawalSeq = 0;
    this.withdrawalSource = new Source('withdrawals', sharedTicker);
    this.withdrawalSource.lag(this.isLagging());
    this.onUnlag(
      () => this.withdrawalSource.lag(false)
    );
    this.onLag(
      () => this.withdrawalSource.lag(true)
    );

    this.executionReport.addKey('initWithdrawal');
    this.executionReport.addKey('failedWithdrawal');
    this.executionReport.addKey('reportWithdrawal');

    this.state = new Record({
      pendingWithdrawals: new List([])
    })();
  }

  name() {
    return 'transfers';
  }

  getWithdrawalSource() {
    return this.withdrawalSource;
  }

  /// ACTIONS

  withdraw(withdrawal) {
    this.client.withdraw(withdrawal, (err) => {
      if (err)
        return this.failedWithdrawal(withdrawal);

      this.confirmWithdrawal(withdrawal);
    });
    this.addWithdrawal(withdrawal);
  }

  // HANDLERS

  addWithdrawal(withdrawal) {
    this.executionReport.increment('initWithdrawal');

    this.state = this.state
      .setIn(
        ['pendingWithdrawals'],
        this.state.pendingWithdrawals.push(withdrawal)
      );
  }

  confirmWithdrawal(withdrawal) {
    this.executionReport.increment('reportWithdrawal');

    this.state = this.state
      .setIn(
        ['pendingWithdrawals'],
        this.state.pendingWithdrawals.remove(
          this.state.pendingWithdrawals.indexOf(withdrawal)
        )
      );

    this.write(this.state);

    this.withdrawalSeq += 1;
    this.withdrawalSource.write(
      withdrawal
        .set('seq', this.withdrawalSeq)
    );

    sharedTicker.tick();
  }

  failedWithdrawal(withdrawal) {
    this.executionReport.increment('failedWithdrawal');

    this.state = this.state
      .setIn(
        ['pendingWithdrawals'],
        this.state.pendingWithdrawals.remove(
          this.state.pendingWithdrawals.indexOf(withdrawal)
        )
      );

    this.write(this.state);

    sharedTicker.tick();
  }
};
