import path from 'path';
import num from 'num';
import _ from 'lodash';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import noComparaisonCheck from '../../lib/noComparaisonCheck';
import Picker from '../../filters/Picker';
import Metrics from '../../filters/Metrics';
import IPCClientProcess from '../../lib/IPCClientProcess';
import ProcessSource from '../../lib/ProcessSource';
import sharedTicker from '../../lib/sharedTicker';
import ChildProcess from '../../lib/ChildProcess';
import { runningHours } from '../../utils';
import processOutput from '../../lib/processOutput';
import Conf from '../../lib/Conf';
import Ticker from '../../lib/Ticker';
import Algo from './Algo';
import EngineMarket from '../lib/EngineMarket';

const {
  name,
  source,
  base,
  quote,
  maker,
  sheetId,
  params
} = JSON.parse(process.argv[2]);

/////
// Source custom classes
/////

const Orders = require(path.resolve(`./dist/sources/${source}/Orders`)).default;
const Fee = require(path.resolve(`./dist/sources/${source}/Fee`)).default;
const Balance = require(path.resolve(`./dist/sources/${source}/Balance`)).default;
const PairExecutor = require(path.resolve(`./dist/sources/${source}/PairExecutor`)).default;
const label = `${base}-${quote}`;

/////
// Conf
/////

const conf = new Conf({ sheetId, ...params}, sharedTicker);


// MARKET DATA

const makerData = new ProcessSource(
  maker.id,
  new IPCClientProcess(maker.id),
  ({ balance, balanceTruth, balanceEquilibre }, delay) => {
    return {
      delay,
      balance: balanceEquilibre && num(balance),
      balanceTruth: balanceEquilibre && num(balanceTruth),
      pairInvestment: balanceEquilibre && num(balanceEquilibre)
    };
  },
  sharedTicker,
  { relayLag: true, onlyWriteLast: true }
);

const balanceMaker = new Picker(makerData, 'balance');
const balanceMakerTruth = new Picker(makerData, 'balanceTruth');
const pairInvestment = new Picker(makerData, 'pairInvestment');

//////
// Order Manager, Balance, Trades
//////

const executor = new PairExecutor(base, quote);
const orders = new Orders(base, quote, executor);
const balance = new Balance(base, [new Fee(orders.getTradeSource(), conf)]);
const trades = balance.getTradeSource();

//////
// Algo
/////

// changing this will need change in the trade analysis
const algo = new Algo(
  base,
  quote,
  conf,
  balance,
  balanceMaker,
  pairInvestment
);
//algo.LIVE_DEBUG = true;
const engine = new EngineMarket(
  `bot:coinbase:arnaud:${label}`,
  conf,
  orders,
  algo
);

/////
// External API
////

const api = new ProcessSource(
  'api',
  new IPCClientProcess('api'),
  command => {
    if (command.target !== 'pair-worker')
      return null;
    if (command.name && command.name !== name)
      return null;
    if (command.pair && command.pair !== `${base}-${quote}`)
      return null;
    return command;
  },
  new Ticker(),
);
api.DISABLE_COMPARAISON_CHECK = true;
api.get().each((command) => {
  if (command.command === 'reset-conf') {
    orders.resync();
    conf.resync();
  }
});

/////
// LOGS
/////

processOutput(
  trades,
  new ChildProcess(
    path.resolve('./dist/recorders/long-term-log.js'),
    {
      sheetId: sheetId,
      range: `trades-taker-${base}-${quote}!A1`
    }
  ),
  trade => {
    trade = trade.toJS();
    const opts = trade.opts;
    delete trade.opts;
    trade = {
      ...trade,
      ...opts
    };
    return _.values(trade);
  }
);

const metrics = new Metrics({
  delayMaker: new Picker(makerData, 'delay'),

  pairInvestment,
  balanceMaker,
  balanceMakerTruth,
  balance,
  balanceTruth: balance.getBalanceTruthSource(),

  orders,

  algo,

  engine
});
//metrics.value.LIVE_DEBUG = true;

const logger = new IPCClientProcess('logs');

processOutput(
  metrics,
  logger,
  (metrics) => ([
    {
      tags: ['orders', 'arbitrage-taker', name, `${base}-${quote}`],
      values: {
        ready: {
          sell: metrics.orders.ready.filter(o => o.side === 'sell').count(),
          buy: metrics.orders.ready.filter(o => o.side === 'buy').count()
        },
        adding: metrics.orders.adding.count(),
        deleting: metrics.orders.deleting.count(),
        byPrice: metrics.orders.byPrice.count(),
        byTag: metrics.orders.byTag.count(),
        byPriceDeep: metrics.orders.byPrice.reduce((count, m) => count + m.count(), 0),
        byTagDeep: metrics.orders.byTag.reduce((count, m) => count + m.count(), 0)
      }
    },
    {
      tags: ['balance', 'arbitrage-taker', name, `${base}-${quote}`, base],
      values: _.pick(metrics, [
        'balance',
        'balanceTruth',
        'pairInvestment',
        'balanceMaker',
        'balanceMakerTruth'
      ])
    },
    {
      tags: ['time', 'arbitrage-taker', name, `${base}-${quote}`],
      values: _.pick(metrics, [
        'delayMaker'
      ])
    },
    {
      tags: ['runningHours', 'arbitrage-taker', name, `${base}-${quote}`],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);
processOutput(
  noComparaisonCheck(
    new CachedBatchedZippedStream(
      `bot:${name}:reports:${label}`,
      [
        metrics.getExecutionReport().getSource(),
        orders.getExecutionReport().getSource(),
        executor.getExecutionReport().getSource(),
        balance.getExecutionReport().getSource(),
        makerData.getExecutionReport().getSource(),
        ..._.map(executor.fixs, fix => fix.getExecutionReport().getSource())
      ]
    )
  ),
  logger,
  ([metrics, orders, executor, balance, makerData, ...fixs]) => ([
    {
      tags: ['alerts', 'arbitrage-taker', name, `${base}-${quote}`],
      values: {
        metrics: _.pick(metrics, [
          'lag',
          'unlag'
        ])
      }
    },
    {
      tags: ['badevents', 'arbitrage-taker', name, `${base}-${quote}`],
      values: {
        metrics: _.pick(metrics, [
          'lag'
        ]),
        orders: _.pick(orders, [
          'sync-error',
          'failedAddOrder',
          'failedRemoveOrder',
          'no-ready'
        ]),
        balance: _.pick(balance, [
          'sync-error'
        ]),
        executor: _.pick(executor, [
          'rate-limit'
        ]),
        ..._.reduce(fixs, (fixsBadevents, fix, i) => ({
          ...fixsBadevents,
          [`fix${i}`]: fix
        }), {})
      }
    },
    {
      tags: ['throughoutput-in', 'arbitrage-taker', name, `${base}-${quote}`],
      values: {
        marketData: _.pick(makerData, [
          'message-added-to-queue',
          'message'
        ])
      }
    },
    {
      tags: ['throughoutput-out', 'arbitrage-taker', name, `${base}-${quote}`],
      values: {
        executor: _.pick(executor, [
          'commands'
        ])
      }
    }
  ])
);
