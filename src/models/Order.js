import {Record} from 'immutable';
import num from 'num';

const OrderBase = Record({
  price: num(0),
  // https://github.com/facebook/immutable-js/issues/424
  $size: num(0),
  side: null,
  tag: null,
  options: {},
  receivedAt: 0,
  base: null,
  quote: null,
  symbol: null,

  id: null,
  'filled_size': num(0),
  fixIndex: null,
  opts: {}
});

export default OrderBase;
