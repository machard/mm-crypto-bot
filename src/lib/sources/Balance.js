import SyncedTransformedStream from '../../lib/SyncedTransformedStream';
import MergedSource from '../../lib/MergedSource';
import sharedTicker from '../../lib/sharedTicker';
import Source from '../../lib/Source';

export default class Balance extends SyncedTransformedStream {

  constructor(currency, mytrades) {
    const label = currency + ':mytrades';
    const source = new MergedSource(`mergedsource:balance:${label}`, mytrades);

    super(
      `balance:${label}`,
      source
    );

    this.currency = currency;
    this.label = label;
    this.balanceTruth = new Source('balancetruth', sharedTicker);
    this.balanceTruth.lag(false);

    this.tradeSource = new Source('tradeSource', source.getTicker());
    this.tradeSource.lag(this.isLagging());
    this.onUnlag(
      () => this.tradeSource.lag(false)
    );
    this.onLag(
      () => this.tradeSource.lag(true)
    );

    setInterval(() => this.makeBalanceTruth(), 5 * 60 * 1000);
    this.onUnlag(() => {
      this.balanceTruth.write(this.getState());
      sharedTicker.tick();
    });
  }

  name() {
    return this.label;
  }

  getTradeSource() {
    return this.tradeSource;
  }
  getBalanceTruthSource() {
    return this.balanceTruth;
  }
  makeBalanceTruth() {
    this.getSyncData((err, data) => {
      if (err)
        return;
      this.balanceTruth.write(this.getSyncState(data));
      sharedTicker.tick();
    });
  }

  processMessage(balance, trade) {
    if (trade.feeCurrency === this.currency)
      balance = balance.sub(trade.feeValue);

    if (trade.base === this.currency) {
      if (trade.side === 'sell')
        balance = balance.sub(trade.$size);
      else
        balance = balance.add(trade.$size);

      trade = trade.set('balanceBase', balance);
    }

    if (trade.quote === this.currency) {
      const value = trade.$size.mul(trade.price);
      if (trade.side === 'sell')
        balance = balance.add(value);
      else
        balance = balance.sub(value);

      trade = trade.set('balanceQuote', balance);
    }

    if (trade.feeCurrency === this.currency)
      trade = trade.set('balanceFee', balance);

    this.tradeSource.write(trade);

    return balance;
  }

  getSyncData(callback) {
    // to extend
  }

  getSyncState(account) {
    // to extend
  }

  getReplayDatas(balance, queue, account) {
    return queue;
  }
};
