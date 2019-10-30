import Sample from './Sample';
import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import noComparaisonCheck from '../lib/noComparaisonCheck';


export default class Metrics extends Sample {
  constructor(sources, interval = 1000) {
    super(noComparaisonCheck(
      new CachedBatchedZippedStream(
        'metrics',
        sources
      )
    ), interval);
  }
}
