import _ from 'lodash';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import { deltaMultiplierMap } from './level.calculs';

export default class DeltaMultiplierMap extends CachedBatchedZippedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(conf, investValue, middle) {
    super('deltamultipliermap:arnaud', [
      conf,
      investValue,
      middle
    ]);
  }

  getParams() {
    return this.params;
  }

  processMessage(args) {
    return deltaMultiplierMap(...args);
  }

};
