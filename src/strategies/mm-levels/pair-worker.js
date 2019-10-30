import num from 'num';
import _ from 'lodash';
import path from 'path';
import Algo from './Algo';
import noComparaisonCheck from '../../lib/noComparaisonCheck';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import Ticker from '../../lib/Ticker';
import Engine from '../lib/Engine';
import processOutput from '../../lib/processOutput';
import ChildProcess from '../../lib/ChildProcess';
import Conf from '../../lib/Conf';
import sharedTicker from '../../lib/sharedTicker';
import InvestValue from './InvestValue';
import Metrics from '../../filters/Metrics';
import Sub from '../../filters/Sub';
import Compute from '../../filters/Compute';
import Picker from '../../filters/Picker';
import OrderBook from '../../models/Book';
import Sample from '../../filters/Sample';
import Middle from '../../filters/Middle';
import HigherBid from '../../filters/HigherBid';
import SmallerAsk from '../../filters/SmallerAsk';
import AtLeast from '../../filters/AtLeast';
import Ecarts from './Ecarts';
import DeltaMultiplierMap from './DeltaMultiplierMap';
import IPCClientProcess from '../../lib/IPCClientProcess';
import IPCServerProcess from '../../lib/IPCServerProcess';
import ProcessSource from '../../lib/ProcessSource';
import { runningHours } from '../../utils';

const {
  name,
  mainCurrency,
  sheetId,
  pair: {tradeOn, bookData, followFrom, params, investments},
  source
} = JSON.parse(process.argv[2]);

/////
// Source custom classes
/////

const Orders = require(path.resolve(`./dist/sources/${source}/Orders`)).default;
const Fee = require(path.resolve(`./dist/sources/${source}/Fee`)).default;
const Balance = require(path.resolve(`./dist/sources/${source}/Balance`)).default;
const PairExecutor = require(path.resolve(`./dist/sources/${source}/PairExecutor`)).default;
const label = `${tradeOn}-${mainCurrency}`;

/////
// Conf
/////

const conf = new Conf({ sheetId, ...params }, sharedTicker);

////
// Market Datas
////

const marketData = new ProcessSource(
  bookData.id,
  new IPCClientProcess(bookData.id),
  ({ book, ema }, delay) => {
    const orderbook = new OrderBook();
    orderbook.state(book);

    return {
      delay,
      book: orderbook,
      ema: num(ema)
    };
  },
  sharedTicker,
  { relayLag: true, onlyWriteLast: true }
);

const book = new Picker(marketData, 'book');
const middle = new Middle(book);
const minAskTo = new SmallerAsk(book);
const maxBidTo = new HigherBid(book);
const emaTo = new Picker(marketData, 'ema');

const marketDataFollowFrom = new ProcessSource(
  followFrom.id,
  new IPCClientProcess(followFrom.id),
  ({ book, ema }, delay) => {
    const orderbook = new OrderBook();
    orderbook.state(book);

    return {
      delay,
      book: orderbook,
      ema: num(ema)
    };
  },
  sharedTicker,
  { relayLag: true, onlyWriteLast: true }
);

const middleFf = new Middle(new Picker(marketDataFollowFrom, 'book'));
const emaFf = new Picker(marketDataFollowFrom, 'ema');

const offset = new Sample(new Sub(
  emaTo,
  emaFf
), 60 * 1000);
const ref = new Compute(
  ([conf, middleFf, offset]) => (conf.noOffset && conf.noOffset.gt(0)) ? middleFf : middleFf.add(offset),
  conf,
  middleFf,
  offset
);


//////
// Order Manager, Balance, Trades
//////

const executor = new PairExecutor(tradeOn, mainCurrency);
const orders = new Orders(tradeOn, mainCurrency, executor);
const balance = new Balance(tradeOn, [new Fee(orders.getTradeSource(), conf)]);
const trades = balance.getTradeSource();

//////
// Algo
/////

// changing this will need change in the trade analysis
const pairInvestment = new InvestValue(ref, conf, { sheetId, ...investments });
const maxInvestValue = new Picker(pairInvestment, 'maxInvestValue');
const middleBaseBalance = new Picker(pairInvestment, 'middleBaseBalance');
const ecarts = new Ecarts(conf);
const deltaMultiplierMap = new DeltaMultiplierMap(conf, maxInvestValue, middleBaseBalance);
const algo = new Algo(
  tradeOn,
  mainCurrency,
  conf,
  ref,
  balance,
  deltaMultiplierMap,
  ecarts
);
//algo.LIVE_DEBUG = true;
const engine = new Engine(
  `bot:coinbase:arnaud:${label}`,
  conf,
  orders,
  book,
  algo
);
//engine.LIVE_DEBUG = true;

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
    if (command.pair && command.pair !== `${tradeOn}-${mainCurrency}`)
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


///////
/// datas relayed
//////

const ipcServer = new IPCServerProcess(`${name}-${label}`);

processOutput(
  // realtime
  trades,
  ipcServer,
  data => ({ mytrades: data })
);

processOutput(
  // not realtime
  new Metrics([
    middle,
    pairInvestment
  ]),
  ipcServer,
  ([middle, pairInvestment]) => ({
    middle,
    ...pairInvestment
  }),
);

processOutput(
  // realtime
  new AtLeast(new CachedBatchedZippedStream('datarelay', [
    balance,
    balance.getBalanceTruthSource(),
    new Picker(pairInvestment, 'middleBaseBalance')
  ])),
  ipcServer,
  ([balance, balanceTruth, middleBaseBalance]) => ({
    balance,
    balanceTruth,
    balanceEquilibre: middleBaseBalance.mul(2)
  }),
);

/////
// LOGS
/////

processOutput(
  trades,
  new ChildProcess(
    path.resolve('./dist/recorders/long-term-log.js'),
    {
      sheetId,
      range: `trades-${tradeOn}-${mainCurrency}!A1`
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

const logger = new IPCClientProcess('logs');

const metrics = new Metrics({
  delay: new Picker(marketData, 'delay'),
  delayTheo: new Picker(marketDataFollowFrom, 'delay'),

  offset,

  minAskTo,
  maxBidTo,
  middleFf,
  emaTo,
  emaFf,
  ref,


  maxInvestValue,
  middleBaseBalance,
  balance,
  balanceTruth: balance.getBalanceTruthSource(),

  orders,

  engine
});
//metrics.value.LIVE_DEBUG = true;

processOutput(
  metrics,
  logger,
  (metrics) => ([
    {
      tags: ['orders', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
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
      tags: ['price', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
      values: _.pick(metrics, [
        'minAskTo',
        'maxBidTo',
        'middleFf',
        'emaTo',
        'emaFf',
        'ref'
      ])
    },
    {
      tags: ['balance', 'mm-levels', name, `${tradeOn}-${mainCurrency}`, tradeOn],
      values: _.pick(metrics, [
        'balance',
        'balanceTruth',
        'maxInvestValue',
        'middleBaseBalance'
      ])
    },
    {
      tags: ['offset', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
      values: _.pick(metrics, [
        'offset'
      ])
    },
    {
      tags: ['time', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
      values: _.pick(metrics, [
        'delay',
        'delayTheo'
      ])
    },
    {
      tags: ['runningHours', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
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
        marketData.getExecutionReport().getSource(),
        marketDataFollowFrom.getExecutionReport().getSource(),
        ..._.map(executor.fixs, fix => fix.getExecutionReport().getSource())
      ]
    )
  ),
  logger,
  ([metrics, orders, executor, balance, marketData, marketDataFollowFrom, ...fixs]) => ([
    {
      tags: ['alerts', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
      values: {
        metrics: _.pick(metrics, [
          'lag',
          'unlag'
        ])
      }
    },
    {
      tags: ['badevents', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
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
      tags: ['throughoutput-in', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
      values: {
        marketData: _.pick(marketData, [
          'message-added-to-queue',
          'message'
        ]),
        marketDataFollowFrom: _.pick(marketDataFollowFrom, [
          'message-added-to-queue',
          'message'
        ])
      }
    },
    {
      tags: ['throughoutput-out', 'mm-levels', name, `${tradeOn}-${mainCurrency}`],
      values: {
        executor: _.pick(executor, [
          'commands'
        ])
      }
    }
  ])
);

