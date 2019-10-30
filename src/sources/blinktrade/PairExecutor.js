import Executor from '../../lib/sources/Executor';
import FIX from './FIX';
import { BLINKTRADE_FIX_ACCESS } from './constants';

export default class PairExecutor extends Executor {
  constructor(base, quote) {
    const productId = `${base}${quote}`;

    super(i => new FIX({
      'brokerId': BLINKTRADE_FIX_ACCESS[`${productId}-${i}`].brokerId,
      'username': BLINKTRADE_FIX_ACCESS[`${productId}-${i}`].username,
      'password': BLINKTRADE_FIX_ACCESS[`${productId}-${i}`].password
    }), 4, { rateLimit: 12 });
  }
};
