import TransformedStream from '../../lib/TransformedStream';
import { ecarts } from './level.calculs';

export default class Ecarts extends TransformedStream {

  constructor(conf) {
    super('filters:ecarts:', conf);
  }

  name() {
    return 'ecarts';
  }

  processMessage(conf) {
    return ecarts(conf);
  }
};
