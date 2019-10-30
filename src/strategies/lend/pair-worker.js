import path from 'path';
import _ from 'lodash';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import noComparaisonCheck from '../../lib/noComparaisonCheck';
import Metrics from '../../filters/Metrics';
import Min from '../../filters/Min';
import Max from '../../filters/Max';
import Algo from './Algo';
import IPCClientProcess from '../../lib/IPCClientProcess';
import { runningHours } from '../../utils';
import processOutput from '../../lib/processOutput';

const {
  currency,
  source
} = JSON.parse(process.argv[2]);

/////
// Source custom classes
/////

const FundingRate = require(path.resolve(`./dist/sources/${source}/FundingRate`)).default;
const FundingBalance = require(path.resolve(`./dist/sources/${source}/FundingBalance`)).default;
const FundingOffers = require(path.resolve(`./dist/sources/${source}/FundingOffers`)).default;

const fr = new FundingRate(currency);
const fb = new FundingBalance(currency);
const fo = new FundingOffers(currency);
const frMin = new Min(fr, 30 * 60 * 1000, true);
const frMax = new Max(fr, 30 * 60 * 1000, true);
const algo = new Algo(fo, fb, frMin, frMax);

const metrics = new Metrics({
  frMin,
  frMax,
  fb
});
//metrics.value.LIVE_DEBUG = true;

const logger = new IPCClientProcess('logs');

processOutput(
  metrics,
  logger,
  (metrics) => ([
    {
      tags: ['lending', 'metrics', source, currency],
      values: {
        frMin: metrics.frMin * 100,
        frMax: metrics.frMax * 100
      }
    },
    {
      tags: ['runningHours', 'lending', source, currency],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);
processOutput(
  noComparaisonCheck(
    new CachedBatchedZippedStream(
      `bot:lending:reports:${source}:${currency}`,
      [
        metrics.getExecutionReport().getSource()
      ]
    )
  ),
  logger,
  ([metrics]) => ([
    {
      tags: ['alerts', 'lending', source, currency],
      values: {
        metrics: _.pick(metrics, [
          'lag',
          'unlag'
        ])
      }
    },
    {
      tags: ['badevents', 'lending', source, currency],
      values: {
        metrics: _.pick(metrics, [
          'lag'
        ])
      }
    }
  ])
);
