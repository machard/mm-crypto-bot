import {Record} from 'immutable';
import num from 'num';

const OrderBase = Record({
  amount: num(0),
  currency: null,
  destination: null,

  opts: {}
});

export default OrderBase;
