import path from 'path';
import _ from 'lodash';
import num from 'num';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import noComparaisonCheck from '../../lib/noComparaisonCheck';
import IPCServerProcess from '../../lib/IPCServerProcess';
import Middle from '../../filters/Middle';
import AtLeast from '../../filters/AtLeast';
import Compute from '../../filters/Compute';
import Picker from '../../filters/Picker';
import Metrics from '../../filters/Metrics';
import IPCClientProcess from '../../lib/IPCClientProcess';
import ProcessSource from '../../lib/ProcessSource';
import sharedTicker from '../../lib/sharedTicker';
import { runningHours } from '../../utils';
import { convertPrice } from './utils';
import processOutput from '../../lib/processOutput';

const conf = JSON.parse(process.argv[2]);

const XX = require(path.resolve(`./dist/sources/${conf.source}/XX`)).default;
const Book = require(path.resolve(`./dist/sources/${conf.source}/Book`)).default;
const EMAs = require(path.resolve(`./dist/sources/${conf.source}/EMAs`)).default;

const xx = new XX(conf.base, conf.quote, conf.level);
const timedrift = new Picker(xx, 'timedrift');
const book = new Book(conf.base, conf.quote, xx, conf.depth);
const middle = new Middle(book);
const ema = new EMAs(conf.base, conf.quote, 60, [60], middle, { savingKey: `${conf.source}-${conf.id}` });
const bookTransmission = new Compute(([book]) => book.prepareOrderBookTransmission(conf.depth), book);

processOutput(
  new AtLeast(new CachedBatchedZippedStream(
    'coinbase:marketData',
    bookTransmission,
    new Picker(ema, '0')
  )),
  new IPCServerProcess(`${conf.source}-${conf.id}`),
  ([ book, ema ]) => {
    return {
      book,
      ema
    };
  },
  { onlySendLast: true }
);

///////////////////
// Converted versions
///////////////////

const convertedEmasReports = {};

_.map(conf.convert, convert => {
  const fx = new ProcessSource(
    convert.id,
    new IPCClientProcess(convert.id),
    ({ fx }) => num(fx),
    sharedTicker,
  );
  const bookTransmissionFx = new Compute(
    ([fx, bookTransmission]) =>
      _.mapValues(bookTransmission, side =>
        _.map(side, ([price, size, id]) => ([
          convertPrice(price, fx, convert),
          size,
          id
        ]))
      ),
    fx,
    bookTransmission
  );
  const ema = new EMAs(
    conf.base,
    conf.quote,
    60,
    [60],
    new Compute(([price, fx]) => convertPrice(price, fx, convert), middle, fx),
    {
      fx: fx,
      fxPrecision: convert.precision,
      savingKey: `${conf.source}-${conf.id}-${convert.id}`
    }
  );

  processOutput(
    new AtLeast(new CachedBatchedZippedStream(
      'marketData',
      bookTransmissionFx,
      new Picker(ema, '0')
    )),
    new IPCServerProcess(`${conf.source}-${conf.id}-${convert.id}`),
    ([ book, ema ]) => {
      return {
        book,
        ema
      };
    },
    { onlySendLast: true }
  );

  convertedEmasReports[`ema-${convert.id}`] = ema.getExecutionReport().getSource();
});


////////////
// LOGS
////////////

const logger = new IPCClientProcess('logs');

processOutput(
  new Metrics([
    timedrift
  ]),
  logger,
  ([ timedrift ]) => ([
    {
      tags: ['time', 'marketdata', conf.source, `${conf.base}-${conf.quote}`],
      values: {
        timedrift
      }
    },
    {
      tags: ['runningHours', 'marketdata', conf.source, `${conf.base}-${conf.quote}`],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);

processOutput(
  noComparaisonCheck(
    new CachedBatchedZippedStream(
      `${conf.source}-${conf.id}-reports`,
      {
        book: book.getExecutionReport().getSource(),
        xx: xx.getExecutionReport().getSource(),
        ema: ema.getExecutionReport().getSource(),
        ...convertedEmasReports
      }
    )
  ),
  logger,
  (reports) => ([
    {
      tags: ['badevents', 'marketdata', conf.source, `${conf.base}-${conf.quote}`],
      values: reports
    }
  ])
);

