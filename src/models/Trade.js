import {Record} from 'immutable';
import num from 'num';

const TradeBase = Record({
  id: null,
  seq: null,
  price: num(0),
  // https://github.com/facebook/immutable-js/issues/424
  $size: num(0),
  fee: num(0),
  feeValue: null,
  side: null,
  ts: null,
  base: null,
  balanceBase: null,
  quote: null,
  balanceQuote: null,
  feeCurrency: null,
  balanceFee: null,
  taker: null,
  blank1: null,

  opts: {}
});

export default TradeBase;
