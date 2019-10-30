import num from 'num';
import processOutput from '../lib/processOutput';
import sharedTicker from '../lib/sharedTicker';
import Metrics from '../filters/Metrics';
import Div from '../filters/Div';
import Sub from '../filters/Sub';
import Sum from '../filters/Sum';
import Picker from '../filters/Picker';
import Sample from '../filters/Sample';
import IPCClientProcess from '../lib/IPCClientProcess';
import ProcessSource from '../lib/ProcessSource';
import OrderBook from '../models/Book';
import HigherBid from '../filters/HigherBid';
import SmallerAsk from '../filters/SmallerAsk';

const {
  id,
  bookData,
  followFrom,
  withoutOffset,
  minSize
} = JSON.parse(process.argv[2]);

////
// Market Datas
////

const marketData = new ProcessSource(
  bookData.id,
  new IPCClientProcess(bookData.id),
  ({ book, ema }) => {
    const orderbook = new OrderBook();
    orderbook.state(book);

    return {
      book: orderbook,
      ema: num(ema)
    };
  },
  sharedTicker,
  { relayLag: true, onlyWriteLast: true }
);
const middle = new SmallerAsk(new Picker(marketData, 'book'), minSize);
const ema = new Picker(marketData, 'ema');

const marketDataFollowFrom = new ProcessSource(
  followFrom.id,
  new IPCClientProcess(followFrom.id),
  ({ book, ema }) => {
    const orderbook = new OrderBook();
    orderbook.state(book);

    return {
      book: orderbook,
      ema: num(ema)
    };
  },
  sharedTicker,
  { relayLag: true, onlyWriteLast: true }
);
const middleFF = new HigherBid(new Picker(marketDataFollowFrom, 'book'), minSize);
const emaFF = new Picker(marketDataFollowFrom, 'ema');

////
// Analysis
////

const offset = new Sample(new Sub(
  ema,
  emaFF
), 60 * 1000);
const ref = withoutOffset ? middleFF : new Sum(middleFF, offset);
const ecartPercent = new Div(new Sub(ref, middle), ref, 4);

const metrics = new Metrics({
  ecartPercent
});
metrics.value.LIVE_DEBUG = true;

processOutput(
  metrics,
  new IPCClientProcess('logs'),
  (metrics) => ({
    [`analysis-${id}-${bookData.id}-${followFrom.id}`]: metrics
  })
);
