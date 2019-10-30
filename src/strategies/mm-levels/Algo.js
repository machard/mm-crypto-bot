import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import { algo } from './level.calculs';

/// Price => PRICE * 0.7 / 100 | PRICE *0.5 / 100 | PRICE * 0.7 / 100

export default class Arnaud extends CachedBatchedZippedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(base, quote, conf, ref, balance, deltaMultiplierMap, ecarts) {
    super('algo:arnaud', [
      conf,
      ref,
      balance,
      deltaMultiplierMap,
      ecarts
    ]);

    this.base = base;
    this.quote = quote;
  }

  processMessage(args) {
    return algo(this.base, this.quote, ...args);
  }

};
