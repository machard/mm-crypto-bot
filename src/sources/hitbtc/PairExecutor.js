import Executor from '../../lib/sources/Executor';
import FIX from './FIX';
import { HB_API_KEY, HB_API_SECRET } from './constants';

export default class PairExecutor extends Executor {
  constructor(base, quote) {
    const productId = `${base}${quote}`;

    super(i => new FIX({
      user: HB_API_KEY,
      pass: HB_API_SECRET,
      productId
    }), 1, { rateLimit: 100 });
  }
};
