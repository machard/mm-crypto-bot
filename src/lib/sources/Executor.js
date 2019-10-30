import _ from 'lodash';
import TransformedStream from '../../lib/TransformedStream';
import Source from '../../lib/Source';
import MergedSource from '../../lib/MergedSource';
import sharedTicker from '../../lib/sharedTicker';

export default class Executor extends TransformedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(fixFactory, nb, opts) {
    fixFactory = process.env.DISABLE_FIX ? () => {
      const fix = new Source('fakefix', sharedTicker);
      setInterval(() => {
        fix.lag(false);
        fix.write({ heartbeat: true });
        sharedTicker.tick();
      }, 1000);
      return fix;
    } : fixFactory;
    opts.rateLimit = process.env.DISABLE_FIX ? 0 : opts.rateLimit;

    const fixs = _.map(
      _.range(nb),
      i => fixFactory(i)
    );

    super('source:coinbase:executor', new MergedSource(
      'source:coinbase:executor:merged',
      fixs
    ));

    this.getExecutionReport().addKey('rate-limit');
    this.getExecutionReport().addKey('commands');

    this.fixs = fixs;
    this.requests = _.map(_.range(nb), () => ([]));
    this.opts = opts;
  }

  name() {
    return 'executor';
  }

  processMessage(message) {
    return message;
  }

  rateLimit(fixIndex, order) {
    this.getExecutionReport().increment('rate-limit');

    const requests = this.requests[fixIndex];
    const wait = requests.length ? (Date.now() - requests[0].time) : 1000;

    setTimeout(() => {
      this.write({
        rateLimit: order
      });
      sharedTicker.tick();
    }, wait);
  }

  isFixReady(fixIndex) {
    return this.requests[fixIndex].length < this.opts.rateLimit;
  }

  getFixIndex(order) {
    let fixIndex;
    let min = Infinity;
    const now = Date.now();
    _.each(this.requests, (requests, i) => {
      _.remove(requests, (item) =>
        (now - item.time) >= 1000
      );
      if (requests.length < min) {
        fixIndex = i;
        min = requests.length;
      }
    });

    if (this.opts.stickyFix && order.fixIndex !== null)
      fixIndex = order.fixIndex;

    return fixIndex;
  }

  buy(order) {
    const fixIndex = this.getFixIndex(order);

    if (!this.isFixReady(fixIndex))
      return this.rateLimit(fixIndex, order);

    this.fixs[fixIndex].buy(order);
    this.requests[fixIndex].push({ time: Date.now() });
    this.getExecutionReport().increment('commands');

    this.write({
      fixIndex: order,
      index: fixIndex
    });
  }

  sell(order) {
    const fixIndex = this.getFixIndex(order);

    if (!this.isFixReady(fixIndex))
      return this.rateLimit(fixIndex, order);

    this.fixs[fixIndex].sell(order);
    this.requests[fixIndex].push({ time: Date.now() });
    this.getExecutionReport().increment('commands');

    this.write({
      fixIndex: order,
      index: fixIndex
    });
  }

  cancel(order) {
    const fixIndex = this.getFixIndex(order);

    if (!this.isFixReady(fixIndex))
      return this.rateLimit(fixIndex, order);

    this.fixs[fixIndex].cancel(order);
    this.requests[fixIndex].push({ time: Date.now() });
    this.getExecutionReport().increment('commands');
  }
};
