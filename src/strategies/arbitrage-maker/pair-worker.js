import path from 'path';
import _ from 'lodash';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import noComparaisonCheck from '../../lib/noComparaisonCheck';
import Picker from '../../filters/Picker';
import Metrics from '../../filters/Metrics';
import IPCClientProcess from '../../lib/IPCClientProcess';
import IPCServerProcess from '../../lib/IPCServerProcess';
import ProcessSource from '../../lib/ProcessSource';
import sharedTicker from '../../lib/sharedTicker';
import ChildProcess from '../../lib/ChildProcess';
import { runningHours } from '../../utils';
import processOutput from '../../lib/processOutput';
import Conf from '../../lib/Conf';
import Ticker from '../../lib/Ticker';
import OrderBook from '../../models/Book';
import InvestValue from './InvestValue';
import Algo from './Algo';
import AtLeast from '../../filters/AtLeast';
import Engine from '../lib/Engine';

const {
  name,
  source,
  base,
  quote,
  bookData,
  taker,
  sheetId,
  params,
  investment
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

const marketData = new ProcessSource(
  bookData.id,
  new IPCClientProcess(bookData.id),
  ({ book }, delay) => {
    const orderbook = new OrderBook();
    orderbook.state(book);

    return {
      delay,
      book: orderbook
    };
  },
  sharedTicker,
  { relayLag: true, onlyWriteLast: true }
);

const book = new Picker(marketData, 'book');

const marketDataTaker = new ProcessSource(
  taker.id,
  new IPCClientProcess(taker.id),
  ({ book }, delay) => {
    return {
      delay,
      book
    };
  },
  sharedTicker,
  { relayLag: true, onlyWriteLast: true }
);

const bookTransmissionTaker = new Picker(marketDataTaker, 'book');

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
const pairInvestment = new InvestValue(conf, { sheetId, ...investment });
const algo = new Algo(
  base,
  quote,
  conf,
  balance,
  pairInvestment,
  bookTransmissionTaker
);
//algo.LIVE_DEBUG = true;
const engine = new Engine(
  `bot:coinbase:arnaud:${label}`,
  conf,
  orders,
  book,
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


///////
/// datas relayed
//////

const ipcServer = new IPCServerProcess(`${name}-${label}`);

processOutput(
  // realtime
  new AtLeast(new CachedBatchedZippedStream('datarelay', [
    balance,
    balance.getBalanceTruthSource(),
    pairInvestment
  ])),
  ipcServer,
  ([balance, balanceTruth, pairInvestment]) => ({
    balance,
    balanceTruth,
    balanceEquilibre: pairInvestment
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
      sheetId: sheetId,
      range: `trades-maker-${base}-${quote}!A1`
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
  delay: new Picker(marketData, 'delay'),
  delayTaker: new Picker(marketDataTaker, 'delay'),

  book,
  bookTransmissionTaker,

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
      tags: ['orders', 'arbitrage-maker', name, `${base}-${quote}`],
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
      tags: ['price', 'arbitrage-maker', name, `${base}-${quote}`],
      values: {
        minAskTaker: parseFloat(metrics.bookTransmissionTaker.asks[0][0]),
        maxBidTaker: parseFloat(metrics.bookTransmissionTaker.bids[0][0]),
        minAsk: metrics.book.minAsk(),
        maxBid: metrics.book.maxBid(),
        ..._.mapValues(metrics.algo, order => order.price)
      }
    },
    {
      tags: ['time', 'arbitrage-maker', name, `${base}-${quote}`],
      values: _.pick(metrics, [
        'delay',
        'delayTaker'
      ])
    },
    {
      tags: ['runningHours', 'arbitrage-maker', name, `${base}-${quote}`],
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
        marketDataTaker.getExecutionReport().getSource(),
        ..._.map(executor.fixs, fix => fix.getExecutionReport().getSource())
      ]
    )
  ),
  logger,
  ([metrics, orders, executor, balance, marketData, marketDataTaker, ...fixs]) => ([
    {
      tags: ['alerts', 'arbitrage-maker', name, `${base}-${quote}`],
      values: {
        metrics: _.pick(metrics, [
          'lag',
          'unlag'
        ])
      }
    },
    {
      tags: ['badevents', 'arbitrage-maker', name, `${base}-${quote}`],
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
      tags: ['throughoutput-in', 'arbitrage-maker', name, `${base}-${quote}`],
      values: {
        marketData: _.pick(marketData, [
          'message-added-to-queue',
          'message'
        ]),
        marketDataTaker: _.pick(marketDataTaker, [
          'message-added-to-queue',
          'message'
        ])
      }
    },
    {
      tags: ['throughoutput-out', 'arbitrage-maker', name, `${base}-${quote}`],
      values: {
        executor: _.pick(executor, [
          'commands'
        ])
      }
    }
  ])
);
